import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  ShieldAlert, 
  Sparkles
} from 'lucide-react';
import api from '../services/api';

export default function AcademicGuardian() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);

  // Simulator controls
  const [simDays, setSimDays] = useState(1);
  const [simulation, setSimulation] = useState(null);

  // Fetch initial snapshot and run default 1-day simulation
  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapRes = await api.get('/student/snapshot');
        setSnapshot(snapRes.data);

        // Run default simulation
        const simRes = await api.post('/student/simulate', { days_count: 1 });
        setSimulation(simRes.data);
      } catch (err) {
        console.warn('Failed to load academic snapshot:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSimulate = async (days = simDays) => {
    try {
      const payload = { days_count: parseInt(days) };
      const res = await api.post('/student/simulate', payload);
      setSimulation(res.data);
    } catch (err) {
      console.warn('Simulation error:', err.message);
    }
  };

  const onDaysChange = (newDays) => {
    setSimDays(newDays);
    handleSimulate(newDays);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>Loading Academic Snapshot...</div>;
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header */}
      <div style={{
        padding: '28px 32px',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, var(--bg-surface) 100%)',
        border: '1px solid var(--accent-glow)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 6 }}>
            <Sparkles size={16} /> MAIN DIFFERENTIATOR FEATURE
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.6 }}>
            KIT Academic Guardian — Know Before You Miss
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 800, marginTop: 4 }}>
            Empowering students to simulate upcoming leave impacts, evaluate strict Anna University / KIT 75% attendance regulations, and avoid examination debarment before taking leave.
          </p>
        </div>

        <div style={{
          padding: '10px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border)',
          textAlign: 'right',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>REGULATION BASE</span>
          <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>Autonomous Handbook 2026</strong>
        </div>
      </div>

      {/* 1. Academic Snapshot Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {/* CGPA */}
        <div style={{
          padding: 24,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>CUMULATIVE GPA (CGPA)</span>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 4px' }}>
            {snapshot?.academics?.cgpa ?? 8.2} <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/ 10</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
            {snapshot?.academics?.standing_label || 'First Class'} • Good Academic Standing
          </div>
        </div>

        {/* Standing Arrears */}
        <div style={{
          padding: 24,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>STANDING ARREARS</span>
          <div style={{
            fontSize: 36,
            fontWeight: 800,
            color: (snapshot?.academics?.standing_arrears || 0) === 0 ? 'var(--success)' : 'var(--danger)',
            margin: '8px 0 4px',
          }}>
            {snapshot?.academics?.standing_arrears ?? 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {(snapshot?.academics?.standing_arrears || 0) === 0 ? 'Zero arrears (Eligible for all drives)' : 'Backlog clearing required'}
          </div>
        </div>

        {/* Current Attendance */}
        <div style={{
          padding: 24,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>CURRENT ATTENDANCE</span>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 4px' }}>
            {snapshot?.attendance?.overall_percentage ?? 76}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontWeight: 700,
              background: (snapshot?.attendance?.overall_percentage || 76) >= 75 ? 'var(--warning-bg)' : 'var(--danger-bg)',
              color: (snapshot?.attendance?.overall_percentage || 76) >= 75 ? 'var(--warning)' : 'var(--danger)',
            }}>
              {snapshot?.attendance?.status || 'Borderline'}
            </span>
          </div>
        </div>

        {/* Placement Status */}
        <div style={{
          padding: 24,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>PLACEMENT ELIGIBILITY</span>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', margin: '8px 0 4px' }}>
            {snapshot?.placement?.eligible_drives_count ?? 3}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Active campus drives match your profile
          </div>
        </div>
      </div>

      {/* 2. Interactive Attendance What-If Simulator */}
      <section style={{
        padding: 32,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingDown size={22} color="var(--accent)" /> Attendance What-If Simulator
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Project exact attendance changes and exam restrictions using real timetable slots and the formula: <br />
              <code style={{ color: 'var(--accent)', fontSize: 12 }}>Projected Attendance = Attended Classes / (Held Classes + Additional Missed Classes) × 100</code>
            </p>
          </div>

          {/* Quick Day Presets */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 5].map((d) => (
              <button
                key={d}
                onClick={() => onDaysChange(d)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: simDays === d ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                  color: simDays === d ? '#fff' : 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: 13,
                  border: '1px solid var(--border)',
                }}
              >
                {d} Day{d > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Simulation Result Comparison Box */}
        {simulation && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            marginBottom: 24,
          }}>
            {/* Current vs Projected Cards */}
            <div style={{
              padding: 20,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>CURRENT ATTENDANCE</span>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
                {simulation.current_attendance.percentage}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {simulation.current_attendance.attended} attended / {simulation.current_attendance.held} held
              </div>
            </div>

            <div style={{
              padding: 20,
              borderRadius: 'var(--radius-md)',
              background: simulation.verdict_level === 'safe'
                ? 'var(--success-bg)'
                : simulation.verdict_level === 'warning'
                ? 'var(--warning-bg)'
                : 'var(--danger-bg)',
              border: `1px solid ${
                simulation.verdict_level === 'safe'
                  ? 'var(--success)'
                  : simulation.verdict_level === 'warning'
                  ? 'var(--warning)'
                  : 'var(--danger)'
              }`,
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: simulation.verdict_level === 'safe'
                  ? 'var(--success)'
                  : simulation.verdict_level === 'warning'
                  ? 'var(--warning)'
                  : 'var(--danger)',
              }}>
                PROJECTED ATTENDANCE ({simDays} DAY{simDays > 1 ? 'S' : ''} MISSED)
              </span>
              <div style={{
                fontSize: 32,
                fontWeight: 800,
                color: simulation.verdict_level === 'safe'
                  ? 'var(--success)'
                  : simulation.verdict_level === 'warning'
                  ? 'var(--warning)'
                  : 'var(--danger)',
                margin: '4px 0',
              }}>
                {simulation.projected_attendance.percentage}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                {simulation.projected_attendance.attended} attended / {simulation.projected_attendance.held} held ({simulation.projected_attendance.classes_missed} classes missed)
              </div>
            </div>

            {/* Verdict Card */}
            <div style={{
              padding: 20,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 4 }}>
                {simulation.passes_75_rule ? (
                  <CheckCircle2 size={18} color="var(--success)" />
                ) : (
                  <AlertTriangle size={18} color="var(--danger)" />
                )}
                <span style={{ color: simulation.passes_75_rule ? 'var(--success)' : 'var(--danger)' }}>
                  {simulation.passes_75_rule ? 'Compliant with 75% Rule' : 'Falls into Condonation / Detention Zone'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {simulation.verdict}
              </p>
              {simulation.recovery_classes_needed > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                  ⚡ You will need to attend {simulation.recovery_classes_needed} consecutive classes without absence to regain 75% attendance.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Exam Conflict Alert Banner */}
        {simulation?.exam_conflicts && simulation.exam_conflicts.length > 0 && (
          <div style={{
            padding: 16,
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <ShieldAlert size={28} color="var(--danger)" />
            <div>
              <strong style={{ color: 'var(--danger)', fontSize: 14 }}>
                CRITICAL EXAMINATION CONFLICT DETECTED!
              </strong>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>
                An official assessment is scheduled on {simulation.exam_conflicts[0].date}: <strong>{simulation.exam_conflicts[0].title}</strong>. 
                Under KIT Regulation 6.2, unexcused absence during CIA assessments results in 0 marks.
              </div>
            </div>
          </div>
        )}

        {/* Timetable Breakdown of Simulated Missed Dates */}
        {simulation?.dates_breakdown && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Detailed Schedule for Simulated Absence Dates
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {simulation.dates_breakdown.map((d, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 14,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                      {d.date} ({d.title})
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                      {d.classes_missed > 0 ? `${d.classes_missed} periods scheduled` : d.note}
                    </span>
                  </div>

                  {d.classes && d.classes.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {d.classes.map((cls, cIdx) => (
                        <span
                          key={cIdx}
                          style={{
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          P{cls.period}: {cls.subject_code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. Subject-wise Attendance Table */}
      <section style={{
        padding: 32,
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
          Subject-wise Attendance Breakdown
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>CODE</th>
                <th style={{ padding: '12px 16px' }}>SUBJECT NAME</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>HELD</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>ATTENDED</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>ABSENT</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>OD</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>PERCENTAGE</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {(snapshot?.attendance?.subjects || []).map((sub) => (
                <tr key={sub.subject_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {sub.subject_code}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>
                    {sub.subject_name}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>{sub.classes_held}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                    {sub.classes_attended}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--danger)' }}>
                    {sub.classes_absent}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--accent)' }}>
                    {sub.classes_od || 0}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: sub.percentage >= 75 ? 'var(--text-primary)' : 'var(--danger)' }}>
                    {sub.percentage}%
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: sub.percentage >= 75 ? 'var(--success-bg)' : 'var(--danger-bg)',
                      color: sub.percentage >= 75 ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {sub.percentage >= 75 ? 'Safe' : 'At Risk (< 75%)'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
