import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, MessageSquare, Trash2, ArrowRight } from 'lucide-react';
import api from '../services/api';

export default function History() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();
  const navigate = useNavigate();

  const loadHistory = async () => {
    try {
      const res = await api.get('/chat/history');
      setConversations(res.data);
    } catch (err) {
      console.warn('History load error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation history permanently?')) return;
    try {
      await api.delete(`/chat/history/${id}`);
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete conversation.');
    }
  };

  const handleOpen = (id) => {
    if (role === 'teacher') {
      navigate(`/teacher?conv=${id}`);
    } else {
      navigate(`/student?conv=${id}`);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>Loading Conversation History...</div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{
        padding: '24px 28px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
          Persistent Conversation History
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Your spoken and typed interactions with KIT Guardian are securely preserved in the database.
        </p>
      </div>

      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        padding: 24,
      }}>
        {conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <Clock size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>No conversation history found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => handleOpen(c.id)}
                style={{
                  padding: 18,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <MessageSquare size={16} color="var(--accent)" />
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>
                      {c.title}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'var(--accent-light)',
                      color: 'var(--accent)',
                    }}>
                      {c.message_count || 1} messages
                    </span>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 640, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_message || 'Conversation thread'}
                  </p>

                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Updated: {new Date(c.updated_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    title="Delete Conversation"
                    style={{
                      padding: 8,
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--danger)',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>

                  <div style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                    <ArrowRight size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
