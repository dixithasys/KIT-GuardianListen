import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  CheckSquare, 
  Sparkles, 
  ArrowRight
} from 'lucide-react';
import ChatInterface from '../components/Chat/ChatInterface';
import api from '../services/api';

export default function TeacherHome() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeacherData = async () => {
      try {
        const [clsRes, reqRes] = await Promise.all([
          api.get('/teacher/classes'),
          api.get('/teacher/requests'),
        ]);
        setClasses(clsRes.data);
        setRequests(reqRes.data);
      } catch (err) {
        console.warn('Teacher data load error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadTeacherData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>Loading Faculty Dashboard...</div>;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');

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
            <Sparkles size={16} /> FACULTY & ADVISOR WORKSPACE
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            Welcome, {user?.full_name || 'Professor'} 👋
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Department of {user?.department || 'CSE'} • Assigned Role: {user?.notes || 'Class Advisor'}
          </p>
        </div>

        <Link
          to="/teacher/approvals"
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
          <CheckSquare size={18} /> Review Approvals ({pendingRequests.length}) <ArrowRight size={16} />
        </Link>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
      }}>
        <div style={{
          padding: 20,
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>PENDING LEAVE & OD APPROVALS</span>
          <div style={{ fontSize: 32, fontWeight: 800, color: pendingRequests.length > 0 ? 'var(--warning)' : 'var(--success)', margin: '4px 0' }}>
            {pendingRequests.length}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {pendingRequests.length > 0 ? 'Action required by advisor' : 'All student requests resolved'}
          </span>
        </div>

        <div style={{
          padding: 20,
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>ASSIGNED CLASSES</span>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
            {classes.length}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {classes.map(c => c.class_code).join(', ') || 'CSE-2A'}
          </span>
        </div>

        <div style={{
          padding: 20,
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>ACADEMIC SYSTEM MODE</span>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', margin: '8px 0 4px' }}>
            Autonomous Engine
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Real-time attendance & CIA verification
          </span>
        </div>
      </div>

      {/* Voice Assistant Section */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            🎙️ Faculty Voice Assistant
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Speak or type commands to approve leaves, inspect attendance sheets, or review policy regulations.
          </p>
        </div>

        <ChatInterface
          role="teacher"
          suggestedQuestions={[
            'Show pending leave requests',
            'Which students have requested OD?',
            'Approve request 101',
            'Show my assigned classes',
            'What is the minimum attendance rule for exams?',
          ]}
        />
      </div>
    </div>
  );
}
