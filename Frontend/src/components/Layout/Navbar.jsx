import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Shield, 
  Sun, 
  Moon, 
  LogOut, 
  User, 
  GraduationCap, 
  FileText, 
  Briefcase, 
  Clock, 
  CheckSquare, 
  Users, 
  Mic
} from 'lucide-react';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent) 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 15px var(--accent-glow)',
          }}>
            <Shield size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
                KIT GUARDIAN
              </span>
              <span style={{
                fontSize: 10,
                textTransform: 'uppercase',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: varRadius(4),
                background: 'var(--accent-light)',
                color: 'var(--accent)',
              }}>
                VOICE AI
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Knotopian Institute of Technology
            </div>
          </div>
        </Link>

        {/* Navigation Links based on role */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {role === 'visitor' && (
            <>
              <NavLink to="/" active={isActive('/')} label="Home" />
              <NavLink to="/admissions" active={isActive('/admissions')} label="Admissions" icon={<GraduationCap size={16} />} highlight />
              <NavLink to="/login" active={isActive('/login')} label="Login" icon={<User size={16} />} isPrimary />
            </>
          )}

          {role === 'student' && (
            <>
              <NavLink to="/student" active={isActive('/student')} label="Assistant" icon={<Mic size={16} />} />
              <NavLink 
                to="/student/academic-guardian" 
                active={isActive('/student/academic-guardian')} 
                label="Academic Guardian" 
                icon={<GraduationCap size={16} />} 
                highlight 
              />
              <NavLink to="/student/requests" active={isActive('/student/requests')} label="Requests" icon={<FileText size={16} />} />
              <NavLink to="/student/placements" active={isActive('/student/placements')} label="Placements" icon={<Briefcase size={16} />} />
              <NavLink to="/admissions" active={isActive('/admissions')} label="Admissions" icon={<GraduationCap size={16} />} />
              <NavLink to="/history" active={isActive('/history')} label="History" icon={<Clock size={16} />} />
            </>
          )}

          {role === 'teacher' && (
            <>
              <NavLink to="/teacher" active={isActive('/teacher')} label="Assistant" icon={<Mic size={16} />} />
              <NavLink to="/teacher/approvals" active={isActive('/teacher/approvals')} label="Pending Approvals" icon={<CheckSquare size={16} />} highlight />
              <NavLink to="/teacher/classes" active={isActive('/teacher/classes')} label="My Classes" icon={<Users size={16} />} />
              <NavLink to="/history" active={isActive('/history')} label="History" icon={<Clock size={16} />} />
            </>
          )}
        </nav>

        {/* User Pill, Theme Toggle, & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border)',
              fontSize: 13,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--success)',
              }} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.full_name}
              </span>
              <span style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 4,
                background: 'var(--accent-light)',
                color: 'var(--accent)',
                textTransform: 'capitalize',
              }}>
                {user.role}
              </span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            {isDark ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#7c3aed" />}
          </button>

          {/* Logout Button if authenticated */}
          {user && (
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, active, label, icon, isPrimary, highlight }) {
  let bg = 'transparent';
  let color = 'var(--text-secondary)';
  let border = '1px solid transparent';

  if (active) {
    bg = 'var(--accent-light)';
    color = 'var(--accent)';
    border = '1px solid var(--accent-glow)';
  } else if (isPrimary) {
    bg = 'var(--accent)';
    color = '#fff';
  } else if (highlight) {
    color = 'var(--accent)';
    bg = 'rgba(124, 58, 237, 0.05)';
    border = '1px solid rgba(124, 58, 237, 0.2)';
  }

  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 'var(--radius-md)',
        fontSize: 13,
        fontWeight: active || isPrimary || highlight ? 600 : 500,
        background: bg,
        color: color,
        border: border,
        textDecoration: 'none',
        transition: 'all 0.15s ease',
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function varRadius(val) {
  return `${val}px`;
}

