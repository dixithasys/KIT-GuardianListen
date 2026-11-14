import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Download,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Database,
  Cpu
} from 'lucide-react';
import ChatInterface from '../components/Chat/ChatInterface';
import api from '../services/api';

export default function Admissions() {
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
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [coursesRes, docsRes, todayRes] = await Promise.all([
          api.get('/college/courses'),
          api.get('/college/documents'),
          api.get('/college/today'),
        ]);
        setCourses(coursesRes.data || []);
        setDocuments(docsRes.data || []);
        setToday(todayRes.data || null);
      } catch (err) {
        console.warn('Failed to load admission page data:', err.message);
      }
    };
    loadData();
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
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Header Banner */}
      <section style={{
        padding: '36px 32px',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, var(--bg-surface-elevated) 0%, var(--bg-surface) 100%)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            fontSize: 12,
            fontWeight: 700,
          }}>
            <Database size={14} /> Amazon Bedrock Knowledge Base (YWT2ROVGKY)
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--success)',
            fontSize: 12,
            fontWeight: 700,
          }}>
            <Cpu size={14} /> Nova Pro Reasoning Agent
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 600,
          }}>
            <CheckCircle2 size={14} color="var(--success)" /> Managed Vector Store Synced
          </span>
        </div>

        <div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.8, marginBottom: 8 }}>
            KIT Admissions & Institutional Knowledge Base
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 840, lineHeight: 1.6 }}>
            Ask questions directly from the official <strong>KIT Admissions Brochure 2026-2027</strong> and <strong>Student Handbook</strong>. Every answer is grounded in verified institutional documents with exact citations.
          </p>
        </div>
      </section>

      {/* Main Interactive Assistant Area */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 32,
        alignItems: 'start',
      }}>
        {/* Left: Assistant Chat with Knowledge Base suggested questions */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={22} color="var(--accent)" /> Admissions Voice Assistant
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Speak or type to enquire about eligibility, required certificates, deadlines, fee structures, or regulations.
            </p>
          </div>

          <ChatInterface
            role="visitor"
            suggestedQuestions={[
              'What documents are required for admission?',
              'What is the admission procedure?',
              'What are the important admission deadlines?',
              'What scholarships are available?',
              'What is the fee for B.Tech CSE?',
              'Is hostel accommodation available?',
              'What is the refund policy?',
              'What courses does KIT offer?',
              'What is the minimum 12th percentage required?',
              'Explain the attendance regulations.',
              'What are the examination rules?',
              'What are the college rules for new students?',
            ]}
          />
        </div>

        {/* Right: Key Admissions Grounding & Verified Documents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Official Important Dates Card */}
          <div style={{
            padding: 24,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="var(--accent)" /> Official Admissions Schedule (2027-28)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Applications Open</span>
                <strong style={{ color: 'var(--text-primary)' }}>1 October 2026</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Date to Apply</span>
                <strong style={{ color: 'var(--accent)' }}>31 March 2027</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Update 12th Marks Deadline</span>
                <strong style={{ color: 'var(--text-primary)' }}>15 May 2027</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Merit List Published</span>
                <strong style={{ color: 'var(--text-primary)' }}>25 May 2027</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)' }}>
                <span style={{ color: 'var(--text-muted)' }}>In-Person Counselling</span>
                <strong style={{ color: 'var(--text-primary)' }}>2 June – 7 June 2027</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Classes Commence</span>
                <strong style={{ color: 'var(--success)' }}>15 July 2027</strong>
              </div>
            </div>
          </div>

          {/* Official Verified Documents from RAG */}
          <div style={{
            padding: 24,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="var(--accent)" /> Indexed Institutional Publications
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              The Bedrock Knowledge Base vector store is synchronized with the following official documents:
            </p>
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
                      Version {doc.version} • Vector Indexed
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
                    }}
                  >
                    <Download size={14} /> PDF
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Admissions Office Contact Info */}
          <div style={{
            padding: 20,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            fontSize: 13,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Admissions Office (Main Block)
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
              <MapPin size={16} color="var(--accent)" />
              <span>Knotopian Knowledge City, Coimbatore, Tamil Nadu 641042</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
              <Phone size={16} color="var(--accent)" />
              <span>+91 422 2619000 (9:00 AM – 5:00 PM, Mon–Sat)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
              <Mail size={16} color="var(--accent)" />
              <span>admissions@kit.ac.in</span>
            </div>
          </div>
        </div>
      </section>

      {/* Courses & Seat Intake Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            Undergraduate Programmes & Annual Tuition Fee
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Four-year B.Tech engineering programmes accredited under Anna University Autonomous regulations.
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
                padding: 22,
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
                  {c.code}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {c.name}
                </h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6, margin: '14px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Min 12th PCM:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{c.min_12th_percent}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Annual Tuition:</span>
                    <strong style={{ color: 'var(--accent)' }}>₹{c.annual_fee?.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Hostel (Optional):</span>
                    <span>₹{c.hostel_fee?.toLocaleString()}/yr</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sanctioned Seats:</span>
                    <span>{c.seats}</span>
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
                  border: 'none',
                  cursor: 'pointer',
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
                KIT Admission Application 2026-2027
              </h3>
              <button
                onClick={() => setShowAdmissionModal(false)}
                style={{ fontSize: 20, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
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
                  Your application has been registered in the college system without an application fee.
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
                    border: 'none',
                    cursor: 'pointer',
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
                      cursor: 'pointer',
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
                      border: 'none',
                      cursor: 'pointer',
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

