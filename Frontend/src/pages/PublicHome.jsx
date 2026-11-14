import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  GraduationCap, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Download,
  AlertCircle
} from 'lucide-react';
import ChatInterface from '../components/Chat/ChatInterface';
import api from '../services/api';

export default function PublicHome() {
  const [searchParams] = useSearchParams();
  const convId = searchParams.get('conv');
  const [collegeInfo, setCollegeInfo] = useState(null);
  const [courses, setCourses] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [today, setToday] = useState(null);

  // Admission Modal State
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    course_code: '',
    twelfth_percent: '',
  });
  const [submitStatus, setSubmitStatus] = useState(null); // 'submitting' | 'success' | 'error'
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    // Fetch public college details
    const loadPublicData = async () => {
      try {
        const [infoRes, coursesRes, docsRes, todayRes] = await Promise.all([
          api.get('/college/info'),
          api.get('/college/courses'),
          api.get('/college/documents'),
          api.get('/college/today'),
        ]);
        setCollegeInfo(infoRes.data);
        setCourses(coursesRes.data);
        setDocuments(docsRes.data);
        setToday(todayRes.data);
      } catch (err) {
        console.warn('Failed to load public data:', err.message);
      }
    };
    loadPublicData();
  }, []);

  const handleDownloadDoc = async (docId, title) => {
    try {
      const res = await api.get(`/college/documents/${docId}/file`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.warn('PDF blob download failed, opening direct URL:', err.message);
      window.open(`http://localhost:5000/api/college/documents/${docId}/file`, '_blank');
    }
  };

  const handleApplyClick = (courseCode) => {
    setFormData(prev => ({ ...prev, course_code: courseCode }));
    setShowAdmissionModal(true);
    setSubmitStatus(null);
  };

  const handleAdmissionSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus('submitting');
    setSubmitError('');

    try {
      const payload = {
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
        course_code: formData.course_code,
        twelfth_percent: parseFloat(formData.twelfth_percent),
      };

      const res = await api.post('/college/admissions', payload);
      setSubmitResult(res.data);
      setSubmitStatus('success');
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit admission application.');
      setSubmitStatus('error');
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 48 }}>
      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: '48px 24px',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(180deg, var(--bg-surface-elevated) 0%, var(--bg-surface) 100%)',
        border: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent-light)',
          color: 'var(--accent)',
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 16,
        }}>
          <Sparkles size={16} /> Autonomous AI-First Engineering Campus
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 54px)',
          fontWeight: 800,
          letterSpacing: -1.2,
          color: 'var(--text-primary)',
          maxWidth: 900,
          margin: '0 auto 16px',
          lineHeight: 1.15,
        }}>
          Your future starts with a <span style={{ color: 'var(--accent)' }}>conversation.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2vw, 19px)',
          color: 'var(--text-secondary)',
          maxWidth: 720,
          margin: '0 auto 32px',
          lineHeight: 1.6,
        }}>
          Explore courses, understand admissions and discover what makes Knotopian Institute of Technology the next step in your journey.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => handleApplyClick('BTECH-CSE')}
            style={{
              padding: '12px 28px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 15px var(--accent-glow)',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <FileText size={18} /> Apply for Admission 2026
          </button>

          <a
            href="#courses"
            style={{
              padding: '12px 28px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 15,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid var(--border)',
            }}
          >
            <GraduationCap size={18} /> View Courses & Fees
          </a>

          <Link
            to="/login"
            style={{
              padding: '12px 28px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 15,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Portal Login <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Main Interactive Assistant Area */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 32,
        alignItems: 'start',
      }}>
        {/* Left: Assistant Orb & Chat */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={22} color="var(--accent)" /> Talk to KIT Guardian
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Ask anything about admissions, eligibility cut-offs, student handbook rules, or campus facilities.
            </p>
          </div>

          <ChatInterface
            role="visitor"
            conversationId={convId}
            suggestedQuestions={[
              'What documents are required for admission?',
              'What is the admission procedure?',
              'What are the important admission deadlines?',
              'What scholarships are available?',
              'What is the fee for B.Tech CSE?',
              'Is hostel accommodation available?',
              'What is the refund policy?',
              'What courses are available?',
              'Explain the attendance regulations.',
              'What are the examination rules?',
            ]}
          />
        </div>

        {/* Right: College Profile & Key Highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* College Card */}
          <div style={{
            padding: 24,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              {collegeInfo?.name || 'Knotopian Institute of Technology (KIT)'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              {collegeInfo?.description || 'Autonomous premier engineering college affiliated with Anna University.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>INSTITUTION CODE</span>
                <strong style={{ color: 'var(--text-primary)' }}>{collegeInfo?.code || 'KIT'}</strong>
              </div>
              <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>TODAY'S ACADEMIC DATE</span>
                <strong style={{ color: 'var(--text-primary)' }}>{today ? `${today.date} (${today.weekday_name})` : '2026-11-21'}</strong>
              </div>
            </div>
          </div>

          {/* Differentiator Highlight: Academic Guardian */}
          <div style={{
            padding: 24,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(168, 85, 247, 0.04) 100%)',
            border: '1px solid var(--accent-glow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>
              <Sparkles size={20} />
              <span>MAIN DIFFERENTIATOR</span>
            </div>
            <h4 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              KIT Academic Guardian — Know Before You Miss
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              Our proprietary simulation engine enables enrolled students to predict the exact impact of leaves or absences on their attendance and examination eligibility before stepping off campus.
            </p>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} color="var(--success)" /> Live CGPA & Standing Arrears Integration
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} color="var(--success)" /> Real Timetable & Exam Calendar Conflict Check
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} color="var(--success)" /> Strict 75% Attendance & Condonation Rule Modeling
              </div>
            </div>
          </div>

          {/* Official Documents Downloads */}
          <div style={{
            padding: 24,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="var(--accent)" /> Official Publications & Handbooks
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    fontSize: 13,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                      {doc.title}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Version {doc.version} • Effective {doc.effective_date}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadDoc(doc.id, doc.title)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--accent-light)',
                      color: 'var(--accent)',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Download size={14} /> PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Courses & Admissions Section */}
      <section id="courses" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            Academic Programmes & Seat Matrix
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
            Accredited four-year undergraduate B.Tech engineering programmes for the academic year 2026-2027.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {courses.map((c) => (
            <div
              key={c.id}
              style={{
                padding: 24,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div>
                <div style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  marginBottom: 10,
                }}>
                  {c.code} • {c.department}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {c.name}
                </h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6, margin: '14px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Min 12th Cutoff:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{c.min_12th_percent}% PCM</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Annual Tuition Fee:</span>
                    <strong style={{ color: 'var(--accent)' }}>₹{c.annual_fee.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Hostel Fee (Optional):</span>
                    <span>₹{c.hostel_fee.toLocaleString()}/yr</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Seats:</span>
                    <span>{c.seats} seats</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleApplyClick(c.code)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: 12,
                }}
              >
                Apply Online <ArrowRight size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Admission Application Modal */}
      {showAdmissionModal && (
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
            maxWidth: 520,
            width: '100%',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: 32,
            boxShadow: 'var(--shadow-xl)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                KIT Admission Application 2026
              </h3>
              <button
                onClick={() => setShowAdmissionModal(false)}
                style={{ fontSize: 20, color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {submitStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={56} color="var(--success)" style={{ margin: '0 auto 16px' }} />
                <h4 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Application Submitted Successfully!
                </h4>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Your application has been registered in the college system.
                </p>
                <div style={{
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  textAlign: 'left',
                  fontSize: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  marginBottom: 24,
                }}>
                  <div><strong>Application ID:</strong> #{submitResult?.id}</div>
                  <div><strong>Applicant Name:</strong> {submitResult?.full_name}</div>
                  <div><strong>Course Code:</strong> {submitResult?.course_code}</div>
                  <div><strong>12th Score:</strong> {submitResult?.twelfth_percent}%</div>
                  <div><strong>Status:</strong> {submitResult?.status}</div>
                </div>
                <button
                  onClick={() => setShowAdmissionModal(false)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontWeight: 600,
                  }}
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdmissionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {submitError && (
                  <div style={{
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <AlertCircle size={16} /> {submitError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Sharma"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="rohan.sharma@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                      Course Code *
                    </label>
                    <select
                      value={formData.course_code}
                      onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                      style={{ width: '100%' }}
                      required
                    >
                      <option value="">Select Programme</option>
                      {courses.map(c => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                      12th PCM Aggregate % *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="50"
                      max="100"
                      required
                      placeholder="e.g. 88.5"
                      value={formData.twelfth_percent}
                      onChange={(e) => setFormData({ ...formData, twelfth_percent: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShowAdmissionModal(false)}
                    style={{
                      padding: '10px 18px',
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
                    disabled={submitStatus === 'submitting'}
                    style={{
                      padding: '10px 24px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  >
                    {submitStatus === 'submitting' ? 'Submitting Application...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
