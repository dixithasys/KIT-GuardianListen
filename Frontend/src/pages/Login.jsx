import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginId || !password) return;

    setError('');
    setLoading(true);

    try {
      const user = await login(loginId.trim(), password);
      if (user.role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (id) => {
    setLoginId(id);
    setPassword('Kit@2026');
    setError('');
  };

  return (
    <div style={{
      maxWidth: 480,
      margin: '48px auto',
      padding: '0 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        padding: '36px 32px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent) 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 16px',
            boxShadow: '0 0 20px var(--accent-glow)',
          }}>
            <Shield size={28} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
            KIT Campus Portal
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Sign in with your college credentials to access KIT Guardian
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            padding: 12,
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              Username / Login ID
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                placeholder="e.g. arjun or lakshmi"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                style={{ width: '100%', paddingLeft: 38 }}
              />
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 13 }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', paddingLeft: 38, paddingRight: 40 }}
              />
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 13 }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: 11, color: 'var(--text-muted)' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 15px var(--accent-glow)',
              marginTop: 6,
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Assistant'} <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo Accounts Quick-Fill Section */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Competition Test Accounts (Password: Kit@2026)
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', alignSelf: 'center', width: 60 }}>Students:</span>
              {['arjun', 'priya', 'kavya', 'rahul'].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => fillCredentials(id, 'student')}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {id}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', alignSelf: 'center', width: 60 }}>Teachers:</span>
              {['lakshmi', 'senthil'].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => fillCredentials(id, 'teacher')}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--accent)',
                  }}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        Back to <Link to="/" style={{ color: 'var(--accent)', fontWeight: 600 }}>KIT Public Homepage</Link>
      </div>
    </div>
  );
}
