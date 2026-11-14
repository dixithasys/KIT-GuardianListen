import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import ChatInterface from '../components/Chat/ChatInterface';
import api from '../services/api';

export default function StudentHome() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const convId = searchParams.get('conv');
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSnapshot = async () => {
      try {
        const res = await api.get('/student/snapshot');
        setSnapshot(res.data);
      } catch (err) {
        console.warn('Failed to load snapshot:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadSnapshot();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>Loading Student Dashboard...</div>;
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Welcome Banner */}
      <div style={{
        padding: '24px 28px',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, var(--bg-surface-elevated) 0%, var(--bg-surface) 100%)',
        border: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
            <Sparkles size={16} /> STUDENT ASSISTANT PORTAL
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Hello, {user?.full_name || 'Student'} 👋
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Class: <strong>{user?.class_code || 'CSE-2A'}</strong> • Dept: <strong>{user?.department || 'CSE'}</strong> • Year: {user?.year_of_study || 2}
          </p>
        </div>

        {/* Quick Guardian Pill */}
        <Link
          to="/student/academic-guardian"
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 15px var(--accent-glow)',
          }}
        >
          <GraduationCap size={18} /> Open Academic Guardian <ArrowRight size={16} />
        </Link>
      </div>

      {/* Snapshot Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
      }}>
        {/* CGPA */}
        <div style={{
          padding: 20,
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>CUMULATIVE GPA</span>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
            {snapshot?.academics?.cgpa ?? 8.2} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ 10</span>
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            background: 'var(--success-bg)',
            color: 'var(--success)',
          }}>
            {snapshot?.academics?.standing_label || 'First Class'}
          </span>
        </div>

        {/* Standing Arrears */}
        <div style={{
          padding: 20,
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>STANDING ARREARS</span>
          <div style={{ fontSize: 32, fontWeight: 800, color: (snapshot?.academics?.standing_arrears || 0) === 0 ? 'var(--success)' : 'var(--danger)', margin: '4px 0' }}>
            {snapshot?.academics?.standing_arrears ?? 0}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {(snapshot?.academics?.standing_arrears || 0) === 0 ? 'All courses cleared' : 'Arrear backlog pending'}
          </span>
        </div>

        {/* Attendance */}
        <div style={{
          padding: 20,
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>OVERALL ATTENDANCE</span>
          <div style={{ fontSize: 32, fontWeight: 800, color: (snapshot?.attendance?.overall_percentage || 76) >= 75 ? 'var(--text-primary)' : 'var(--danger)', margin: '4px 0' }}>
            {snapshot?.attendance?.overall_percentage ?? 76}%
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            background: (snapshot?.attendance?.overall_percentage || 76) >= 75 ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: (snapshot?.attendance?.overall_percentage || 76) >= 75 ? 'var(--success)' : 'var(--danger)',
          }}>
            {snapshot?.attendance?.status || 'Borderline (75% - 79%)'}
          </span>
        </div>

        {/* Placement Drives */}
        <div style={{
          padding: 20,
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>PLACEMENT ELIGIBILITY</span>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', margin: '4px 0' }}>
            {snapshot?.placement?.eligible_drives_count ?? 3} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Drives</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Eligible for Dream & Core categories
          </span>
        </div>
      </div>

      {/* Main Voice Assistant Chat Interface */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            🎙️ Conversational Voice Assistant
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Speak or type your questions below. Actions like applying for OD or leave will be pre-validated by the system.
          </p>
        </div>

        <ChatInterface
          role="student"
          conversationId={convId}
          suggestedQuestions={[
            'How am I doing academically?',
            'What is my CGPA?',
            'What if I miss college tomorrow?',
            'Can I take leave for three days?',
            'Am I eligible for Zoho?',
            'Apply for OD tomorrow',
            'Show my registered subjects',
          ]}
        />
      </div>
    </div>
  );
}
