import express from 'express';
import crypto from 'node:crypto';
import multer from 'multer';
import { bedrockService } from '../services/bedrockService.js';
import { voiceService } from '../services/voiceService.js';
import { historyService } from '../services/historyService.js';
import { executeTool } from '../agents/toolRegistry.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

/**
 * Main conversational assistant endpoint (Text / JSON payload)
 */
router.post(['/interact', '/message'], async (req, res, next) => {
  try {
    const { message, conversation_id, anonymous_session_id } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: { message: 'Message text is required.' } });
    }

    const userId = req.user ? String(req.user.id) : (anonymous_session_id || 'visitor_session');
    const userRole = req.userRole || 'visitor';

    // 1. Get or create conversation in SQLite
    let convId = conversation_id;
    let conversation = null;
    if (convId) {
      conversation = historyService.getConversation(convId, userId);
    }
    if (!conversation) {
      const title = message.length > 40 ? `${message.substring(0, 37)}...` : message;
      const created = historyService.createConversation(userId, userRole, title);
      convId = created.id;
    }

    // 2. Persist user message
    historyService.addMessage(convId, 'user', message);

    // 3. Converse with Agent (Bedrock or Autonomous Agent)
    const agentResult = await bedrockService.converse({
      userMessage: message,
      userRole,
      token: req.token,
      user: req.user,
    });

    // 4. Synthesize spoken response
    let audioData = null;
    try {
      audioData = await voiceService.synthesizeSpeech(agentResult.spokenResponse);
    } catch (ttsErr) {
      console.warn('[VoiceChat] TTS synthesis error:', ttsErr.message);
    }

    // 5. Persist assistant response & tool actions to SQLite
    historyService.addMessage(
      convId,
      'assistant',
      agentResult.textResponse,
      agentResult.toolsExecuted,
      null,
      audioData?.audioBase64 || null
    );

    res.json({
      conversation_id: convId,
      user_role: userRole,
      spoken_response: agentResult.spokenResponse,
      text_response: agentResult.textResponse,
      audio: audioData,
      ui_card: agentResult.uiCard,
      tools_executed: agentResult.toolsExecuted,
      confirmation_required: agentResult.confirmationRequired,
      confirmation_action: agentResult.confirmationAction,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Voice conversational endpoint (Audio upload via multipart/form-data)
 * Flow:
 * 1. Capture audio buffer from MediaRecorder
 * 2. Transcribe via Groq Whisper (model: whisper-large-v3-turbo)
 * 3. Send transcript to Bedrock / Nova Pro Agent
 * 4. Execute college tools as needed
 * 5. Synthesize response via Amazon Polly
 * 6. Return transcript, text, audio & UI cards
 */
router.post(['/interact-audio', '/audio', '/voice', '/interact/audio'], upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: { message: 'No audio file uploaded. Please send audio via multipart/form-data.' } });
    }

    const { conversation_id, anonymous_session_id } = req.body;
    const userId = req.user ? String(req.user.id) : (anonymous_session_id || 'visitor_session');
    const userRole = req.userRole || 'visitor';

    // 1. Transcribe audio with Groq Whisper
    const transcription = await voiceService.transcribeAudio(req.file.buffer, req.file.mimetype || 'audio/webm');
    const userTranscript = transcription.transcript;

    if (!userTranscript || !userTranscript.trim()) {
      return res.status(422).json({
        error: { message: 'No recognizable speech detected. Please speak clearly and try again.' },
        transcript: '',
      });
    }

    // 2. Get or create conversation in SQLite
    let convId = conversation_id;
    let conversation = null;
    if (convId) {
      conversation = historyService.getConversation(convId, userId);
    }
    if (!conversation) {
      const title = userTranscript.length > 40 ? `${userTranscript.substring(0, 37)}...` : userTranscript;
      const created = historyService.createConversation(userId, userRole, title);
      convId = created.id;
    }

    // 3. Persist user transcript in history
    historyService.addMessage(convId, 'user', userTranscript);

    // 4. Converse with Bedrock / Agent pipeline
    const agentResult = await bedrockService.converse({
      userMessage: userTranscript,
      userRole,
      token: req.token,
      user: req.user,
    });

    // 5. Synthesize spoken response via Amazon Polly
    let audioData = null;
    try {
      audioData = await voiceService.synthesizeSpeech(agentResult.spokenResponse);
    } catch (ttsErr) {
      console.warn('[VoiceChat] TTS synthesis error:', ttsErr.message);
    }

    // 6. Persist assistant response & tool actions to SQLite
    historyService.addMessage(
      convId,
      'assistant',
      agentResult.textResponse,
      agentResult.toolsExecuted,
      null,
      audioData?.audioBase64 || null
    );

    res.json({
      conversation_id: convId,
      user_role: userRole,
      transcript: userTranscript,
      spoken_response: agentResult.spokenResponse,
      text_response: agentResult.textResponse,
      audio: audioData,
      ui_card: agentResult.uiCard,
      tools_executed: agentResult.toolsExecuted,
      confirmation_required: agentResult.confirmationRequired,
      confirmation_action: agentResult.confirmationAction,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Standalone Audio Transcription endpoint (Groq Whisper)
 */
router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: { message: 'No audio file uploaded.' } });
    }

    const transcription = await voiceService.transcribeAudio(req.file.buffer, req.file.mimetype || 'audio/webm');
    res.json({
      success: true,
      transcript: transcription.transcript,
      provider: transcription.provider,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Execute confirmed consequential action (e.g. Submitting Leave after student confirmation)
 */
router.post('/execute-action', async (req, res, next) => {
  try {
    const { action_type, params, conversation_id } = req.body;
    if (!action_type) {
      return res.status(400).json({ error: { message: 'action_type is required.' } });
    }

    const idempotencyKey = crypto.randomUUID();
    const result = await executeTool(action_type, req.userRole || 'visitor', {
      token: req.token,
      user: req.user,
      params,
    });

    // Record action in DB
    if (conversation_id) {
      historyService.recordAction(conversation_id, action_type, params, result, 'success', idempotencyKey);
      historyService.addMessage(
        conversation_id,
        'assistant',
        `Action **${action_type}** executed successfully. Result: ${JSON.stringify(result)}`
      );
    }

    res.json({
      success: true,
      action_type,
      result,
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({
      error: { code: 'ACTION_EXECUTION_FAILED', message: err.message },
    });
  }
});

/**
 * Conversation History List
 */
router.get('/history', (req, res) => {
  const userId = req.user ? String(req.user.id) : (req.query.anonymous_session_id || 'visitor_session');
  const list = historyService.getConversations(userId);
  res.json(list);
});

/**
 * Single Conversation with Messages
 */
router.get('/history/:id', (req, res) => {
  const userId = req.user ? String(req.user.id) : (req.query.anonymous_session_id || 'visitor_session');
  const conv = historyService.getConversation(req.params.id, userId);
  if (!conv) {
    return res.status(404).json({ error: { message: 'Conversation not found or unauthorized.' } });
  }
  res.json(conv);
});

/**
 * Delete Conversation
 */
router.delete('/history/:id', (req, res) => {
  const userId = req.user ? String(req.user.id) : (req.query.anonymous_session_id || 'visitor_session');
  const result = historyService.deleteConversation(req.params.id, userId);
  res.json(result);
});

export default router;

