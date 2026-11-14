import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Volume2, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function VoiceOrb({
  state = 'idle', // 'idle' | 'listening' | 'processing' | 'executing' | 'speaking' | 'error'
  onClick,
  size = 140,
}) {
  // Determine colors and animations based on state
  let gradient = 'radial-gradient(circle, #8b5cf6 0%, #6d28d9 70%, #4c1d95 100%)';
  let glowColor = 'rgba(139, 92, 246, 0.4)';
  let label = 'Tap to Speak';
  let Icon = Mic;

  if (state === 'listening') {
    gradient = 'radial-gradient(circle, #a855f7 0%, #7c3aed 60%, #581c87 100%)';
    glowColor = 'rgba(168, 85, 247, 0.7)';
    label = 'Listening...';
    Icon = Mic;
  } else if (state === 'processing') {
    gradient = 'radial-gradient(circle, #3b82f6 0%, #1d4ed8 70%, #1e3a8a 100%)';
    glowColor = 'rgba(59, 130, 246, 0.6)';
    label = 'Thinking & Querying...';
    Icon = Loader2;
  } else if (state === 'executing') {
    gradient = 'radial-gradient(circle, #06b6d4 0%, #0891b2 70%, #164e63 100%)';
    glowColor = 'rgba(6, 182, 212, 0.6)';
    label = 'Executing Action...';
    Icon = Sparkles;
  } else if (state === 'speaking') {
    gradient = 'radial-gradient(circle, #10b981 0%, #059669 70%, #064e3b 100%)';
    glowColor = 'rgba(16, 185, 129, 0.6)';
    label = 'Assistant Speaking...';
    Icon = Volume2;
  } else if (state === 'error') {
    gradient = 'radial-gradient(circle, #ef4444 0%, #b91c1c 70%, #7f1d1d 100%)';
    glowColor = 'rgba(239, 68, 68, 0.6)';
    label = 'Service Warning';
    Icon = AlertCircle;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* Outer container with interactive trigger */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={(e) => {
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
          if (onClick) onClick(e);
        }}
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {/* Ambient Pulsing Rings */}
        <motion.div
          animate={{
            scale: state === 'listening' || state === 'speaking' ? [1, 1.35, 1] : [1, 1.15, 1],
            opacity: state === 'listening' || state === 'speaking' ? [0.6, 0.15, 0.6] : [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: state === 'listening' ? 1.5 : 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: glowColor,
            filter: 'blur(20px)',
          }}
        />

        {/* Secondary Ripple Ring */}
        {(state === 'listening' || state === 'speaking') && (
          <motion.div
            animate={{
              scale: [1, 1.6],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: `2px solid ${glowColor}`,
            }}
          />
        )}

        {/* The Central Solid Orb */}
        <motion.div
          animate={{
            rotate: state === 'processing' ? 360 : 0,
          }}
          transition={{
            rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
          }}
          style={{
            width: size * 0.85,
            height: size * 0.85,
            borderRadius: '50%',
            background: gradient,
            boxShadow: `0 0 35px ${glowColor}, inset 0 0 20px rgba(255, 255, 255, 0.25)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {state === 'processing' ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <Icon size={size * 0.35} />
            </motion.div>
          ) : (
            <Icon size={size * 0.35} />
          )}
        </motion.div>
      </motion.div>

      {/* State Label & Subtext */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: 0.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}>
          {state === 'speaking' && <AudioWaveBars />}
          <span>{label}</span>
          {state === 'speaking' && <AudioWaveBars />}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {state === 'idle' && 'Click microphone or type below'}
          {state === 'listening' && 'Listening through microphone... Click to submit'}
          {state === 'processing' && 'Reasoning & retrieving real API data...'}
          {state === 'speaking' && 'Audio playing via voice engine'}
        </div>
      </div>
    </div>
  );
}

function AudioWaveBars() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 16 }}>
      {[0.4, 0.8, 0.5, 0.9, 0.6].map((delay, idx) => (
        <motion.div
          key={idx}
          animate={{ height: [4, 16, 6, 14, 4] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: delay * 0.3,
            ease: 'easeInOut',
          }}
          style={{
            width: 3,
            borderRadius: 2,
            background: 'var(--accent)',
          }}
        />
      ))}
    </div>
  );
}
