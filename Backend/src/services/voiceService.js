import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import Groq, { toFile } from 'groq-sdk';

const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
const POLLY_VOICE_ID = process.env.POLLY_VOICE_ID || 'Kajal';
const POLLY_ENGINE = process.env.POLLY_ENGINE || 'generative';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Initialize Polly Client
let pollyClient = null;
if (ACCESS_KEY_ID && SECRET_ACCESS_KEY) {
  try {
    pollyClient = new PollyClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
  } catch (err) {
    console.warn('[Polly] Initialization warning:', err.message);
  }
}

// Initialize Groq Client
let groqClient = null;
if (GROQ_API_KEY) {
  try {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
  } catch (err) {
    console.warn('[Groq] Initialization warning:', err.message);
  }
}

/**
 * Phonetically normalize common speech-to-text mis-transcriptions for KIT domain
 */
export function normalizeTranscript(text) {
  if (!text) return '';
  let cleaned = text;

  // 0. Specific Whisper acoustic mishearings
  // "these overprites", "the overprites", "overprites", "overwrites" -> "the Zoho drive"
  cleaned = cleaned.replace(/\b(these\s+overprites|the\s+overprites|overprites|overwrites)\b/gi, 'the Zoho drive');

  // AI-ML variations
  cleaned = cleaned.replace(/\b(ai-ml|ai\s+ml|aiml)\b/gi, 'AI-ML');

  // 1. Degree / Course phonetic mis-transcriptions
  // "PTEK", "P-TEK", "PTEC", "P-TEC", "P-TECH", "PTECH", "BTEC", "B-TEC", "B TECH", "BEETECH" -> "B.Tech"
  cleaned = cleaned.replace(/\b(ptek|p-tek|ptec|p-tec|ptech|p-tech|btec|b-tec|b\s*tech|beetech)\b/gi, 'B.Tech');

  // 2. Department phonetic mis-transcriptions
  // "CSU", "C-S-U", "CS E", "CS-E" (in course / fee contexts) -> "CSE"
  cleaned = cleaned.replace(/\b(csu|c-s-u|cs\s+e|cs-e)\b/gi, 'CSE');

  // "radiation" -> "admission" when asking about apply/admission/process
  cleaned = cleaned.replace(/\b(radiation|remission)\b/gi, 'admission');

  // "A-I-D-S", "AI and DS", "AI DS" -> "AI-DS"
  cleaned = cleaned.replace(/\b(a-i-d-s|ai\s+and\s+ds|ai\s+ds)\b/gi, 'AI-DS');

  // "E-C-E", "EC" -> "ECE"
  cleaned = cleaned.replace(/\b(e-c-e|e\s+c\s+e)\b/gi, 'ECE');

  // "soho" -> "zoho"
  cleaned = cleaned.replace(/\bsoho\b/gi, 'Zoho');

  return cleaned;
}

export const voiceService = {
  /**
   * Speech-to-Text: Groq Whisper (model: whisper-large-v3-turbo)
   */
  async transcribeAudio(audioBuffer, mimeType = 'audio/webm') {
    if (!groqClient) {
      if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY is not configured in Backend/.env. Please configure your Groq API key.');
      }
      groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }

    try {
      // Determine file extension from mimeType
      const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
      const fileObj = await toFile(audioBuffer, `audio_input.${ext}`, { type: mimeType });

      const transcription = await groqClient.audio.transcriptions.create({
        file: fileObj,
        model: 'whisper-large-v3-turbo',
        language: 'en',
        prompt: 'Knotopian Institute of Technology, KIT Guardian, B.Tech, CSE, ECE, AI-DS, IT, Mechanical Engineering, admissions, fees, eligibility, attendance, CGPA, OD, handbook, semester, Zoho.',
        response_format: 'json',
      });

      const rawTranscript = transcription.text ? transcription.text.trim() : '';
      const cleaned = normalizeTranscript(rawTranscript);

      return {
        transcript: cleaned,
        raw_transcript: rawTranscript,
        provider: 'groq_whisper_large_v3_turbo',
      };
    } catch (err) {
      console.warn('[VoiceService] Groq Whisper error:', err.message);
      throw new Error(`Speech recognition failed: ${err.message}`);
    }
  },

  /**
   * Text-to-Speech: Amazon Polly (Voice: Kajal, Language: en-IN, Engine: generative -> neural -> standard)
   */
  async synthesizeSpeech(text) {
    if (pollyClient) {
      const enginesToTry = [POLLY_ENGINE, 'neural', 'standard'];
      const cleanText = text.replace(/[#*`_>~]/g, '').trim();

      for (const engine of enginesToTry) {
        try {
          const command = new SynthesizeSpeechCommand({
            Engine: engine,
            LanguageCode: 'en-IN',
            VoiceId: POLLY_VOICE_ID,
            OutputFormat: 'mp3',
            Text: cleanText,
          });

          const response = await pollyClient.send(command);
          const audioArrayBuffer = await response.AudioStream.transformToByteArray();
          const base64Audio = Buffer.from(audioArrayBuffer).toString('base64');
          return {
            format: 'audio/mp3',
            audioBase64: `data:audio/mp3;base64,${base64Audio}`,
            provider: `amazon_polly_${engine}`,
          };
        } catch (err) {
          console.warn(`[VoiceService] Polly engine '${engine}' failed (${err.name || err.message}).`);
        }
      }
    }

    // Fallback when AWS Polly credentials are not supplied
    return {
      format: 'text_caption',
      spokenText: text,
      audioBase64: null,
      provider: 'voice_caption_fallback',
    };
  },
};
