import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import api from '../services/api';

export default function Placements() {
  const [drives, setDrives] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [myPlacements, setMyPlacements] = useState([]);
  const [academics, setAcademics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);
  const [confirmingDriveId, setConfirmingDriveId] = useState(null);
  const [submittingDriveId, setSubmittingDriveId] = useState(null);

  const loadData = async () => {
    try {
      const [drivesRes, evalRes, myRes, acadRes] = await Promise.all([
        api.get('/placements/drives'),
        api.get('/placements/evaluations').catch(() => ({ data: { evaluations: [] } })),
        api.get('/placements/me'),
        api.get('/student/academics'),
      ]);
      setDrives(drivesRes.data);
      setEvaluations(evalRes.data?.evaluations || []);
      setMyPlacements(myRes.data);
      setAcademics(acadRes.data);
    } catch (err) {
      console.warn('Placements load error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmRegister = async (driveId, company) => {
    setSubmittingDriveId(driveId);
    setStatusMsg(null);
    try {
      await api.post(`/placements/drives/${driveId}/register`);
      await loadData();
      setConfirmingDriveId(null);
      setStatusMsg({
        type: 'success',
        text: `Successfully registered for ${company}! Check your email for assessment instructions.`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: `Registration Failed: ${err.message}`,
      });
    } finally {
      setSubmittingDriveId(null);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>Loading Placement Drives...</div>;
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Banner */}
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
            KIT Campus Placement Drives
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Your CGPA: <strong>{academics?.cgpa ?? 8.2}</strong> • Standing Arrears: <strong>{academics?.standing_arrears ?? 0}</strong>
          </p>
        </div>

        <div style={{
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--accent-light)',
          color: 'var(--accent)',
          fontWeight: 700,
          fontSize: 13,
        }}>
          Registered Drives: {myPlacements.length}
        </div>
      </div>

      {/* On-screen Inline Feedback Banner */}
      {statusMsg && (
        <div style={{
          padding: 14,
          borderRadius: 'var(--radius-md)',
          background: statusMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: `1px solid ${statusMsg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          color: statusMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Drives Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20,
      }}>
        {drives.map((d) => {
          // Unified 6-criteria evaluation matched with backend AI Agent
          const ev = evaluations.find(e => e.id === d.id);
          const isEligible = ev ? ev.is_eligible : ((academics?.cgpa || 8.2) >= d.min_cgpa && (d.allow_standing_arrears || (academics?.standing_arrears || 0) === 0));
          const failedReasons = ev?.criteria_failed || [];
          const isRegistered = myPlacements.some(p => p.drive_id === d.id);

          return (
            <div
              key={d.id}
              style={{
                padding: 24,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'var(--accent-light)',
                    color: 'var(--accent)',
                    textTransform: 'uppercase',
                  }}>
                    {d.category}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Deadline: {d.deadline}
                  </span>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {d.company}
                </h3>

                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6, margin: '14px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Cut-off CGPA:</span>
                    <strong>Min {d.min_cgpa}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Arrears Permitted:</span>
                    <span>{d.allow_standing_arrears ? 'Allowed' : '0 standing arrears strictly'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Seats Left:</span>
                    <strong>{d.seats_left} / {d.seats_total || d.seats_left}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Eligible Depts:</span>
                    <span>{d.allowed_departments ? d.allowed_departments.join(', ') : 'All'}</span>
                  </div>
                </div>
              </div>

              <div>
                {isRegistered ? (
                  <div style={{
                    padding: 10,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--success-bg)',
                    color: 'var(--success)',
                    fontSize: 13,
                    fontWeight: 700,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}>
                    <CheckCircle2 size={16} /> Registered for Drive
                  </div>
                ) : !isEligible ? (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={14} /> Not Eligible
                    </div>
                    {failedReasons.length > 0 ? (
                      failedReasons.map((r, idx) => (
                        <div key={idx} style={{ fontSize: 11, lineHeight: 1.4, opacity: 0.9 }}>
                          • {r}
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 11 }}>Does not meet criteria requirements.</div>
                    )}
                  </div>
                ) : confirmingDriveId === d.id ? (
                  // In-Screen Inline Confirmation (No window.confirm popup)
                  <div style={{
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--accent)',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                      Confirm registration for {d.company}?
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleConfirmRegister(d.id, d.company)}
                        disabled={submittingDriveId === d.id}
                        style={{
                          flex: 1,
                          padding: '7px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--accent)',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                        }}
                      >
                        {submittingDriveId === d.id ? 'Registering...' : 'Yes, Register'}
                      </button>
                      <button
                        onClick={() => setConfirmingDriveId(null)}
                        style={{
                          flex: 1,
                          padding: '7px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingDriveId(d.id)}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      border: 'none',
                      boxShadow: '0 2px 8px var(--accent-glow)',
                    }}
                  >
                    Register Now
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
