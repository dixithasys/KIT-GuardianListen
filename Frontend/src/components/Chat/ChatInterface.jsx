import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  AlertTriangle
} from 'lucide-react';
import VoiceOrb from '../VoiceAssistant/VoiceOrb';
import FormattedMessage from './FormattedMessage';
import api from '../../services/api';

export default function ChatInterface({
  role = 'visitor',
  suggestedQuestions = [],
  conversationId = null,
  onConversationChange,
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [assistantState, setAssistantState] = useState('idle'); // idle | listening | processing | speaking | error
  const [currentConvId, setCurrentConvId] = useState(conversationId);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

  const chatScrollRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Auto-scroll chat container ONLY when new messages arrive (never on mic click or state change)
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  // Load conversation if conversationId is provided
  useEffect(() => {
    if (conversationId) {
      setCurrentConvId(conversationId);
      loadConversationHistory(conversationId);
    } else {
      // Default welcome message if empty
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `**KIT GuardianListen**\n\n*Engineering the Future with Innovation*\n\n**How I can assist you today:**\n\n- 🎓 **Academic Guardian:** "How am I doing academically?", "What is my CGPA?"\n- 📈 **What-If Attendance Simulator:** "What if I miss college tomorrow?", "Can I take leave for 3 days?"\n- 📋 **Leave & OD Requests:** "Apply for OD for hackathon", "Show my pending requests"\n- 💼 **Placements:** "Am I eligible for Zoho?", "Show placement drives"\n- 🏛️ **Visitor & Admissions:** "What courses are available?", "What is the fee for B.Tech CSE?"\n- 👨‍🏫 **Faculty:** "Show pending approvals", "Show my classes"`,
          spoken: 'Welcome to KIT GuardianListen. Engineering the Future with Innovation. How can I assist you today?',
        },
      ]);
    }
  }, [conversationId, role]);

  const loadConversationHistory = async (id) => {
    try {
      const res = await api.get(`/chat/history/${id}`);
      if (res.data && res.data.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.warn('Could not load history:', err.message);
    }
  };

  // Speak text using browser speech synthesis with Indian English or natural voice
  const speakWithBrowser = (text) => {
    if (audioMuted || !text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setAssistantState('idle');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      // Strip markdown, asterisks, headers, bullets
      const clean = text
        .replace(/###|##|#|\*\*|\*|`|\[|\]|\(|\)|_|>|~/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      if (!clean) {
        setAssistantState('idle');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'en-IN';
      utterance.rate = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find(v => v.lang === 'en-IN') ||
                         voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
                         voices.find(v => v.lang.startsWith('en'));
      if (matchVoice) {
        utterance.voice = matchVoice;
      }

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setAssistantState('speaking');
      };
      utterance.onend = () => {
        setIsPlayingAudio(false);
        setAssistantState('idle');
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setAssistantState('idle');
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Browser speech error:', e);
      setIsPlayingAudio(false);
      setAssistantState('idle');
    }
  };

  // Play audio response from backend (Amazon Polly) or browser speech synthesis
  const playAudio = (audioBase64, spokenText) => {
    if (audioMuted) return;

    if (audioBase64) {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        const audio = new Audio(audioBase64);
        audioRef.current = audio;
        setIsPlayingAudio(true);
        setAssistantState('speaking');

        audio.onended = () => {
          setIsPlayingAudio(false);
          setAssistantState('idle');
        };
        audio.onerror = () => {
          console.warn('Audio element error, falling back to speech synthesis');
          speakWithBrowser(spokenText);
        };

        audio.play().catch(e => {
          console.warn('Audio play prevented or failed, speaking with browser:', e);
          speakWithBrowser(spokenText);
        });
        return;
      } catch (e) {
        console.warn('Audio play error, falling back to speech synthesis:', e);
      }
    }

    // When Amazon Polly audio is not returned (e.g. AWS credentials not in .env), speak spokenText!
    speakWithBrowser(spokenText);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    if (assistantState === 'speaking') {
      setAssistantState('idle');
    }
  };

  // Send message to backend
  const sendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || assistantState === 'processing') return;

    stopAudio();
    setInputText('');
    setAssistantState('processing');

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await api.post('/chat/interact', {
        message: text,
        conversation_id: currentConvId,
      });

      const data = res.data;
      if (!currentConvId && data.conversation_id) {
        setCurrentConvId(data.conversation_id);
        if (onConversationChange) onConversationChange(data.conversation_id);
      }

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text_response,
        spoken: data.spoken_response,
        tools_executed: data.tools_executed,
        ui_card: data.ui_card,
        audio_url: data.audio?.audioBase64,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Check for required confirmation
      if (data.confirmation_required && data.confirmation_action) {
        setPendingConfirmation({
          action: data.confirmation_action,
          conversation_id: data.conversation_id,
        });
      }

      // Handle voice playback (Amazon Polly or natural Speech Synthesis)
      playAudio(data.audio?.audioBase64, data.spoken_response || data.text_response);
    } catch (err) {
      setAssistantState('error');
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ **Service Notification:** ${err.message || 'Unable to connect to assistant service.'}`,
        },
      ]);
      setTimeout(() => setAssistantState('idle'), 3500);
    }
  };

  // Handle Confirmed Action
  const handleExecuteConfirmedAction = async (confirmed) => {
    if (!confirmed || !pendingConfirmation) {
      setPendingConfirmation(null);
      return;
    }

    setAssistantState('executing');
    try {
      const res = await api.post('/chat/execute-action', {
        action_type: pendingConfirmation.action.type,
        params: pendingConfirmation.action.params,
        conversation_id: pendingConfirmation.conversation_id || currentConvId,
      });

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ **Action Confirmed and Submitted Successfully!**\n\nResult:\n\`\`\`json\n${JSON.stringify(res.data.result, null, 2)}\n\`\`\``,
        },
      ]);
      setPendingConfirmation(null);
      setAssistantState('idle');
    } catch (err) {
      setAssistantState('error');
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ **Action Execution Failed:** ${err.message}`,
        },
      ]);
      setTimeout(() => setAssistantState('idle'), 3000);
    }
  };

  // Send voice audio recording to backend for Groq Whisper transcription & Bedrock agent execution
  const sendVoiceAudio = async (audioBlob, mimeType) => {
    stopAudio();
    setAssistantState('processing');

    const formData = new FormData();
    const ext = mimeType.includes('wav') ? 'wav' : 'webm';
    formData.append('audio', audioBlob, `speech_recording.${ext}`);
    if (currentConvId) {
      formData.append('conversation_id', currentConvId);
    }

    try {
      let res;
      try {
        // Primary voice endpoint
        res = await api.post('/chat/interact-audio', formData, {
          headers: { 'Content-Type': undefined },
        });
      } catch (firstErr) {
        if (firstErr.message?.includes('404') || firstErr.response?.status === 404) {
          // Fallback route alias
          res = await api.post('/voice/interact-audio', formData, {
            headers: { 'Content-Type': undefined },
          });
        } else {
          throw firstErr;
        }
      }

      const data = res.data;
      if (!currentConvId && data.conversation_id) {
        setCurrentConvId(data.conversation_id);
        if (onConversationChange) onConversationChange(data.conversation_id);
      }

      // 1. Add user transcription to transcript
      if (data.transcript) {
        const userMsg = {
          id: Date.now().toString(),
          role: 'user',
          content: data.transcript,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMsg]);
      }

      // 2. Add assistant response
      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text_response,
        spoken: data.spoken_response,
        tools_executed: data.tools_executed,
        ui_card: data.ui_card,
        audio_url: data.audio?.audioBase64,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // 3. Check for required confirmation
      if (data.confirmation_required && data.confirmation_action) {
        setPendingConfirmation({
          action: data.confirmation_action,
          conversation_id: data.conversation_id,
        });
      }

      // 4. Play audio response (Amazon Polly or natural Speech Synthesis)
      playAudio(data.audio?.audioBase64, data.spoken_response || data.text_response);
    } catch (err) {
      setAssistantState('error');
      const errorMsg = (err.message?.includes('404') || err.response?.status === 404)
        ? 'Audio endpoint returned 404. Please restart the backend server (`npm start` in the Backend terminal) so the newly registered `/api/chat/interact-audio` route is active.'
        : (err.message || 'Unable to process voice audio.');

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ **Speech Recognition Error:** ${errorMsg}`,
        },
      ]);
      setTimeout(() => setAssistantState('idle'), 3500);
    }
  };

  // Microphone recording
  const startRecording = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (assistantState === 'listening') {
      stopRecording(e);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (recordingTimerRef.current) {
          clearTimeout(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        stream.getTracks().forEach((track) => track.stop());
        const recMime = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: recMime });
        if (audioBlob.size > 400) {
          sendVoiceAudio(audioBlob, recMime);
        } else {
          setAssistantState('idle');
        }
      };

      // Emit data chunks every 250ms so audio is guaranteed to be recorded
      mediaRecorder.start(250);
      setAssistantState('listening');

      // Safety timeout: automatically stop and process after 12 seconds of recording
      recordingTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 12000);
    } catch (err) {
      console.warn('Microphone access denied:', err.message);
      alert('Microphone access was not granted or is unavailable. Please type your query in the input box below.');
      setAssistantState('idle');
    }
  };

  const stopRecording = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setAssistantState('processing');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '620px',
      maxHeight: 'calc(100vh - 120px)',
      background: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
    }}>
      {/* Top Bar with Voice Orb & Audio Controls */}
      <div style={{
        flexShrink: 0,
        padding: '16px 20px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface-elevated)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}>
        {/* Voice Orb */}
        <VoiceOrb
          state={assistantState}
          size={95}
          onClick={assistantState === 'listening' ? stopRecording : startRecording}
        />

        {/* Mute / Audio Toggle */}
        <div style={{ position: 'absolute', top: 14, right: 16, display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (isPlayingAudio) stopAudio();
              setAudioMuted(!audioMuted);
            }}
            title={audioMuted ? 'Unmute voice' : 'Mute voice'}
            style={{
              padding: 8,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: audioMuted ? 'var(--text-muted)' : 'var(--accent)',
              cursor: 'pointer',
            }}
          >
            {audioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* Suggested Questions Pills */}
      {suggestedQuestions.length > 0 && (
        <div style={{
          flexShrink: 0,
          minHeight: 48,
          height: 48,
          padding: '0 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          overflowY: 'hidden',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          boxSizing: 'border-box',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, marginRight: 4 }}>
            <Sparkles size={12} /> SUGGESTED:
          </span>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                sendMessage(q);
              }}
              style={{
                flexShrink: 0,
                fontSize: 12,
                height: 30,
                padding: '0 14px',
                borderRadius: '15px',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                lineHeight: 1,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Chat Messages Transcript */}
      <div 
        ref={chatScrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {/* Sender Tag */}
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              {m.role === 'user' ? 'You' : 'KIT Guardian'}
              {m.role === 'assistant' && (
                <button
                  type="button"
                  onClick={() => playAudio(m.audio_url, m.spoken || m.content)}
                  title="Listen to Voice"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 4px',
                    borderRadius: 4,
                  }}
                >
                  <Volume2 size={13} />
                  <span>Listen</span>
                </button>
              )}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: '85%',
              padding: '14px 18px',
              borderRadius: 'var(--radius-lg)',
              background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-surface-elevated)',
              color: m.role === 'user' ? '#ffffff' : 'var(--text-primary)',
              border: m.role === 'user' ? 'none' : '1px solid var(--border)',
              fontSize: 14,
              lineHeight: 1.6,
              boxShadow: 'var(--shadow-sm)',
            }}>
              {m.role === 'user' ? m.content : <FormattedMessage text={m.content} />}
            </div>
          </div>
        ))}

        {/* Pending Action Confirmation Banner */}
        <AnimatePresence>
          {pendingConfirmation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--warning-bg)',
                border: '1px solid var(--warning)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warning)', fontWeight: 700 }}>
                <AlertTriangle size={18} />
                <span>Explicit Action Confirmation Required</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                The assistant has prepared the official request: <strong>{pendingConfirmation.action.type}</strong>. Do you authorize submitting this directly to your Class Advisor?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => handleExecuteConfirmedAction(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--success)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CheckCircle size={15} /> Confirm & Submit
                </button>
                <button
                  onClick={() => handleExecuteConfirmedAction(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <XCircle size={15} /> Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Bottom Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        style={{
          flexShrink: 0,
          padding: '14px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-surface-elevated)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={assistantState === 'listening' ? stopRecording : startRecording}
          title="Click to speak"
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: assistantState === 'listening' ? 'var(--danger)' : 'var(--accent)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: assistantState === 'listening' ? '0 0 15px rgba(239, 68, 68, 0.5)' : '0 0 10px var(--accent-glow)',
            transition: 'all 0.2s',
          }}
        >
          {assistantState === 'listening' ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            assistantState === 'listening'
              ? 'Listening... Click mic to stop and send'
              : 'Ask KIT Guardian anything... (e.g., What if I miss college tomorrow?)'
          }
          disabled={assistantState === 'processing'}
          style={{
            flex: 1,
            height: 42,
          }}
        />

        <button
          type="submit"
          disabled={!inputText.trim() || assistantState === 'processing'}
          style={{
            width: 42,
            height: 42,
            borderRadius: 'var(--radius-md)',
            background: inputText.trim() && assistantState !== 'processing' ? 'var(--accent)' : 'var(--border)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
