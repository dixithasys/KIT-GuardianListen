import dotenv from 'dotenv';
dotenv.config();

import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { ragService } from './ragService.js';

const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
const KB_ID = process.env.BEDROCK_KNOWLEDGE_BASE_ID || 'YWT2ROVGKY';

let runtimeClient = null;
if (ACCESS_KEY_ID && SECRET_ACCESS_KEY) {
  try {
    runtimeClient = new BedrockAgentRuntimeClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
  } catch (err) {
    console.warn('[KnowledgeBaseService] Failed to initialize BedrockAgentRuntimeClient:', err.message);
  }
}

/**
 * Extract clean metadata, section name, and page number from chunk text and S3 URI
 */
function parseChunkDetails(result) {
  const text = result.content?.text || '';
  const uri = result.location?.s3Location?.uri || '';
  const score = result.score || 0;

  // Extract friendly document title from URI or content
  let docTitle = 'KIT Official Institutional Document';
  if (uri.includes('admissions-brochure')) {
    docTitle = 'KIT Admissions Brochure 2026-2027';
  } else if (uri.includes('handbook')) {
    docTitle = 'KIT Student Handbook 2026';
  } else if (uri) {
    const filename = uri.split('/').pop() || '';
    docTitle = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Extract page number if explicitly present in document text (e.g., "page 4 of 5" or "page 2")
  let pageNumber = null;
  const pageMatch = text.match(/page\s+(\d+)\s+of\s+\d+/i) || text.match(/page\s+(\d+)/i);
  if (pageMatch) {
    pageNumber = parseInt(pageMatch[1], 10);
  }

  // Extract clean section heading if present
  let sectionHeading = null;
  const knownSections = [
    { title: 'Documents Needed at Admission', regex: /\b(?:5\.\s*)?documents\s+needed\s+at\s+admission\b/i },
    { title: 'How to Apply', regex: /\b(?:3\.\s*)?how\s+to\s+apply\b/i },
    { title: 'Important Dates for Admissions', regex: /\b(?:4\.\s*)?important\s+dates(?:\s+for\s+2027-28\s+admissions)?\b/i },
    { title: 'Scholarships & Merit Awards', regex: /\b(?:6\.\s*)?scholarships\b/i },
    { title: 'Life at KIT Hostels & Campus', regex: /\b(?:7\.\s*)?life\s+at\s+kit\s+hostels\b/i },
    { title: 'Programmes, Eligibility & Fees', regex: /\b(?:2\.\s*)?programmes,\s*eligibility\s+and\s+fees\b/i },
    { title: 'About KIT', regex: /\b(?:1\.\s*)?about\s+kit\b/i },
    { title: 'Frequently Asked Questions', regex: /\b(?:8\.\s*)?frequently\s+asked\s+questions\b/i },
    { title: 'Contact Admissions Office', regex: /\b(?:9\.\s*)?contact\s+the\s+admissions\s+office\b/i },
  ];

  for (const s of knownSections) {
    if (s.regex.test(text)) {
      sectionHeading = s.title;
      break;
    }
  }

  if (!sectionHeading) {
    const genericMatch = text.match(/(?:^|\n|\.\s+)(\d+\.\s+[A-Za-z0-9\s,&/()'-]{3,40}?)(?:\r?\n|(?=[A-Z][a-z]+\s+[a-z]+)|\.|$)/);
    if (genericMatch) {
      sectionHeading = genericMatch[1].trim();
    }
  }

  return {
    text: text.trim(),
    score,
    sourceUri: uri,
    docTitle,
    page: pageNumber,
    section: sectionHeading,
    metadata: result.metadata || {},
  };
}

export const knowledgeBaseService = {
  /**
   * Retrieve relevant passages from Amazon Bedrock Knowledge Base YWT2ROVGKY
   * with automatic fallback to local curated RAG service if unreachable.
   */
  async retrievePassages(query, numberOfResults = 5) {
    if (!query || typeof query !== 'string') {
      return [];
    }

    // 1. Try Amazon Bedrock Knowledge Base
    if (runtimeClient && KB_ID) {
      try {
        const command = new RetrieveCommand({
          knowledgeBaseId: KB_ID,
          retrievalQuery: { text: query },
        });

        const response = await runtimeClient.send(command);
        const rawResults = response.retrievalResults || [];

        if (rawResults.length > 0) {
          const parsed = rawResults
            .slice(0, numberOfResults)
            .map(parseChunkDetails);

          return {
            source: 'aws_bedrock_knowledge_base',
            knowledgeBaseId: KB_ID,
            region: AWS_REGION,
            query,
            passages: parsed,
          };
        }
      } catch (err) {
        console.warn(`[KnowledgeBaseService] Bedrock KB retrieval failed (${err.name || err.message}). Falling back to local RAG knowledge.`);
      }
    }

    // 2. Fallback to local curated RAG knowledge base
    const localResults = await ragService.searchKnowledge(query, null, numberOfResults);
    return {
      source: 'local_rag_fallback',
      knowledgeBaseId: 'local_curated',
      region: 'local',
      query,
      passages: localResults.map(r => ({
        text: r.content,
        score: r.relevance_score,
        sourceUri: 'local://documents/' + r.doc_title,
        docTitle: r.doc_title,
        page: r.page,
        section: r.section,
        metadata: { doc_type: r.doc_type },
      })),
    };
  },

  /**
   * Specific helper to retrieve admission and policy answers
   */
  async searchAdmissionKnowledge(query) {
    return this.retrievePassages(query, 4);
  },
};
