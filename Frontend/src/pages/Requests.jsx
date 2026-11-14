import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Request Modal State
  const [showModal, setShowModal] = useState(false);
  const [reqType, setReqType] = useState('personal_leave'); // 'personal_leave' | 'medical_leave' | 'on_duty'
  const [fromDate, setFromDate] = useState('2026-11-25');
  const [toDate, setToDate] = useState('2026-11-25');
  const [reason, setReason] = useState('');
  const [eventName, setEventName] = useState('');

  // Validation State
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadRequests = async () => {
    try {
      const res = await api.get('/student/requests');
      setRequests(res.data);
    } catch (err) {
      console.warn('Failed to load requests:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleValidate = async () => {
    if (!reason.trim()) return;
    setValidating(true);
    try {
      const res = await api.post('/student/requests/validate', {
        type: reqType,
        from_date: fromDate,
        to_date: toDate,
        half_day: false,
        reason,
        event_name: reqType === 'on_duty' ? eventName : null,
      });
      setValidation(res.data);
    } catch (err) {
      console.warn('Validation error:', err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionMessage('');

    try {
      const payload = {
        type: reqType,
        from_date: fromDate,
        to_date: toDate,
        half_day: false,
        reason,
        event_name: reqType === 'on_duty' ? eventName : null,
      };

      await api.post('/student/requests', payload);
      setShowModal(false);
      setReason('');
      setEventName('');
      setValidation(null);
      await loadRequests();
      setActionMessage('Request submitted successfully for Class Advisor approval.');
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (id) => {
    if (!window.confirm(`Are you sure you want to cancel request #${id}?`)) return;
    try {
      await api.post(`/student/requests/${id}/cancel`);
      await loadRequests();
      setActionMessage(`Request #${id} cancelled.`);
    } catch (err) {
      alert(err.message || 'Failed to cancel request.');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>Loading Leave Requests...</div>;
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner */}
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
            My Leave & On-Duty (OD) Requests
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Submit and track official leave applications with integrated academic attendance verification.
          </p>
        </div>

        <button
          onClick={() => {
            setShowModal(true);
            setValidation(null);
          }}
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
          <Plus size={18} /> New Leave / OD Request
        </button>
      </div>

      {actionMessage && (
        <div style={{
          padding: 12,
          borderRadius: 'var(--radius-md)',
          background: 'var(--accent-light)',
          color: 'var(--accent)',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {actionMessage}
        </div>
      )}

      {/* Requests List Table */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        padding: 24,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
          Application History
        </h2>

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
            No leave requests submitted yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: 18,
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
                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 15 }}>
                      #{r.id} • {r.type.toUpperCase().replace('_', ' ')}
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
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong>Dates:</strong> {r.from_date} to {r.to_date} {r.half_day ? '(Half Day)' : ''}
                    {r.event_name && <span> • <strong>Event:</strong> {r.event_name}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    <strong>Reason:</strong> "{r.reason}"
                  </div>

                  {r.decision_note && (
                    <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, fontWeight: 500 }}>
                      Advisor Note: {r.decision_note}
                    </div>
                  )}
                </div>

                {/* Cancel button if pending or approved */}
                {(r.status === 'pending' || r.status === 'approved') && (
                  <button
                    onClick={() => handleCancelRequest(r.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--danger)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
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
            maxWidth: 580,
            width: '100%',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: 28,
            boxShadow: 'var(--shadow-xl)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                New Absence / OD Application
              </h3>
              <button onClick={() => setShowModal(false)} style={{ fontSize: 20, color: 'var(--text-muted)' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                  Request Type *
                </label>
                <select
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="personal_leave">Personal Leave (Max 3 consecutive days)</option>
                  <option value="medical_leave">Medical Leave (Requires Certificate)</option>
                  <option value="on_duty">On-Duty (OD - Hackathon/Symposium/Sports/Placement)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                    From Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                    To Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {reqType === 'on_duty' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                    Event Title / Host Institution *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Level Hackathon 2026"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                  Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide complete explanation for your class advisor"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Pre-validation Trigger */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={validating || !reason.trim()}
                  style={{
                    fontSize: 12,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-light)',
                    color: 'var(--accent)',
                    fontWeight: 600,
                  }}
                >
                  {validating ? 'Evaluating Regulations...' : '⚡ Pre-validate against 75% Rule & Exams'}
                </button>
              </div>

              {/* Validation Result Box */}
              {validation && (
                <div style={{
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  background: validation.can_proceed ? 'var(--bg-surface-elevated)' : 'var(--danger-bg)',
                  border: `1px solid ${validation.can_proceed ? 'var(--border)' : 'var(--danger)'}`,
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 700, color: validation.can_proceed ? 'var(--success)' : 'var(--danger)', marginBottom: 4 }}>
                    {validation.can_proceed ? '✓ Policy Check Passed' : '⚠️ Action Blocked by Regulation'}
                  </div>
                  <div>Projected Attendance: <strong>{validation.simulation?.projected_attendance?.percentage}%</strong></div>
                  {validation.issues?.map((iss, idx) => (
                    <div key={idx} style={{ color: 'var(--danger)', marginTop: 4 }}>• {iss}</div>
                  ))}
                  {validation.warnings?.map((w, idx) => (
                    <div key={idx} style={{ color: 'var(--warning)', marginTop: 4 }}>• {w}</div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (validation && !validation.can_proceed)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontWeight: 600,
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
