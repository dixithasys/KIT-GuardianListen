import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function TeacherClasses() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(1);
  const [attendanceSheet, setAttendanceSheet] = useState(null);

  const loadSheet = useCallback(async (classId) => {
    try {
      const sheetRes = await api.get(`/teacher/classes/${classId}/attendance`);
      setAttendanceSheet(sheetRes.data);
    } catch (err) {
      console.warn('Sheet error:', err.message);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const clsRes = await api.get('/teacher/classes');
        setClasses(clsRes.data);
        if (clsRes.data.length > 0) {
          const firstId = clsRes.data[0].class_id;
          setSelectedClassId(firstId);
          loadSheet(firstId);
        }
      } catch (err) {
        console.warn('Teacher classes error:', err.message);
      }
    };
    loadData();
  }, [loadSheet]);

  const handleSelectClass = (id) => {
    setSelectedClassId(id);
    loadSheet(id);
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{
        padding: '24px 28px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
          Class Roster & Attendance Sheets
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Monitor class attendance percentages and identify students at risk of exam debarment.
        </p>

        {/* Class Selection Tabs */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          {classes.map((c) => (
            <button
              key={c.class_id}
              onClick={() => handleSelectClass(c.class_id)}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-md)',
                background: selectedClassId === c.class_id ? 'var(--accent)' : 'var(--bg-surface-elevated)',
                color: selectedClassId === c.class_id ? '#fff' : 'var(--text-primary)',
                fontWeight: 600,
                fontSize: 13,
                border: '1px solid var(--border)',
              }}
            >
              Class {c.class_code} ({c.role_type})
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Roster Table */}
      {attendanceSheet && (
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          padding: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              Attendance Sheet — Class {attendanceSheet.class_code}
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              As of: {attendanceSheet.as_of_date}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>STUDENT ID</th>
                  <th style={{ padding: '12px 16px' }}>LOGIN ID</th>
                  <th style={{ padding: '12px 16px' }}>FULL NAME</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>CLASSES HELD</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>ATTENDED</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>ABSENT</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>OD</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>PERCENTAGE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>STANDING</th>
                </tr>
              </thead>
              <tbody>
                {(attendanceSheet.students || []).map((s) => (
                  <tr key={s.student_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>#{s.student_id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.student_login}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{s.student_name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{s.classes_held}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{s.classes_attended}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--danger)' }}>{s.classes_absent}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--accent)' }}>{s.classes_od || 0}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: s.percentage >= 75 ? 'var(--text-primary)' : 'var(--danger)' }}>
                      {s.percentage}%
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: s.percentage >= 75 ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: s.percentage >= 75 ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {s.percentage >= 75 ? 'Eligible' : 'At Risk (< 75%)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
