import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import api from '../services/api';

export default function Approvals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  // Reject Modal State
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Approve Modal State
  const [approveModalId, setApproveModalId] = useState(null);
  const [approveComment, setApproveComment] = useState('Approved by Class Advisor.');

  const loadRequests = async () => {
    try {
      const res = await api.get('/teacher/requests');
      setRequests(res.data);
    } catch (err) {
      console.warn('Approvals load error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async () => {
    if (!approveModalId) return;
    try {
      await api.post(`/teacher/requests/${approveModalId}/approve`, {
        comment: approveComment,
      });
      setApproveModalId(null);
      await loadRequests();
      setActionMsg(`Request #${approveModalId} successfully approved.`);
    } catch (err) {
      alert(err.message || 'Failed to approve request.');
    }
  };

  const handleReject = async () => {
    if (!rejectModalId || !rejectReason.trim()) return;
    try {
      await api.post(`/teacher/requests/${rejectModalId}/reject`, {
        reason: rejectReason,
      });
      setRejectModalId(null);
      setRejectReason('');
      await loadRequests();
      setActionMsg(`Request #${rejectModalId} rejected.`);
    } catch (err) {
      alert(err.message || 'Failed to reject request.');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>Loading Approvals Queue...</div>;
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{
        padding: '24px 28px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            Student Absence & OD Approvals
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Review, endorse, or reject student requests in accordance with KIT regulations.
          </p>
        </div>
      </div>

      {actionMsg && (
        <div style={{
          padding: 12,
          borderRadius: 'var(--radius-md)',
          background: 'var(--accent-light)',
          color: 'var(--accent)',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {actionMsg}
        </div>
      )}

      {/* Requests Table */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        padding: 24,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
          All Student Requests
        </h2>

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            No requests currently in the queue.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {requests.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: 20,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>
                      {r.student_name} ({r.class_code})
                    </span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: r.status === 'approved' ? 'var(--success-bg)' : r.status === 'pending' ? 'var(--warning-bg)' : 'var(--danger-bg)',
                      color: r.status === 'approved' ? 'var(--success)' : r.status === 'pending' ? 'var(--warning)' : 'var(--danger)',
                      textTransform: 'uppercase',
                    }}>
                      {r.status}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{r.id}</span>
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong>Type:</strong> {r.type.toUpperCase().replace('_', ' ')} • <strong>Dates:</strong> {r.from_date} to {r.to_date}
                    {r.event_name && <span> • <strong>Event:</strong> {r.event_name}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    <strong>Reason:</strong> "{r.reason}"
                  </div>

                  {r.decision_note && (
                    <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, fontWeight: 500 }}>
                      Note: {r.decision_note}
                    </div>
                  )}
                </div>

                {/* Action buttons if pending */}
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => setApproveModalId(r.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--success)',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <CheckCircle2 size={16} /> Approve
                    </button>
                    <button
                      onClick={() => setRejectModalId(r.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--danger)',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {approveModalId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20,
        }}>
          <div style={{
            maxWidth: 480,
            width: '100%',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: 24,
            boxShadow: 'var(--shadow-xl)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Approve Request #{approveModalId}
            </h3>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
              Advisor Endorsement Comment (Optional)
            </label>
            <input
              type="text"
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              style={{ width: '100%', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setApproveModalId(null)}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                style={{ padding: '8px 20px', borderRadius: 'var(--radius-md)', background: 'var(--success)', color: '#fff', fontWeight: 600 }}
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20,
        }}>
          <div style={{
            maxWidth: 480,
            width: '100%',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: 24,
            boxShadow: 'var(--shadow-xl)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Reject Request #{rejectModalId}
            </h3>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
              Mandatory Reason for Rejection *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Missing event proof or internal assessment conflict"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: '100%', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setRejectModalId(null)}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                style={{ padding: '8px 20px', borderRadius: 'var(--radius-md)', background: 'var(--danger)', color: '#fff', fontWeight: 600 }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
