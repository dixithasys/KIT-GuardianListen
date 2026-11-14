import React from 'react';
import { Shield, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      marginTop: 'auto',
      padding: '32px 24px 20px',
      fontSize: 13,
      color: 'var(--text-muted)',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 24,
        marginBottom: 24,
      }}>
        {/* Col 1 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>
            <Shield size={18} color="var(--accent)" />
            <span>KIT Guardian — Autonomous AI Assistant</span>
          </div>
          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Knotopian Institute of Technology (KIT) is an autonomous premier engineering institution affiliated with Anna University.
          </p>
        </div>

        {/* Col 2 */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: 8, fontWeight: 600 }}>Emergency & Admissions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={14} /> <span>+91 422 2619000 / Admissions Helpline</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={14} /> <span>admissions@kit.ac.in</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={14} /> <span>Knotopian Campus, Coimbatore, TN 641042</span>
            </div>
          </div>
        </div>

        {/* Col 3 */}
        <div>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: 8, fontWeight: 600 }}>System Verification</h4>
          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Connected to <strong>KIT Core Academic System v1.0.0</strong>. Powered by Amazon Bedrock & Academic Guardian Attendance Engine.
          </p>
        </div>
      </div>

      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          © 2026 Knotopian Institute of Technology. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <span>Tagline: Your campus. Your voice. Your next move.</span>
        </div>
      </div>
    </footer>
  );
}
