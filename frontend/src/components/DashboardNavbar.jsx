import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../ThemeContext';

export default function DashboardNavbar({
  portalLabel,
  title,
  subtitle,
  user,
  onLogout,
  showQuickNav = false,
  onOpenBookings,
  onOpenHelp
}) {
  const { mode, setMode } = useTheme();
  const order = ['system', 'light', 'dark'];
  const currentIndex = order.indexOf(mode);
  const nextMode = order[(currentIndex + 1) % order.length];
  const modeLabel = mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'System';
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const roleLabel = useMemo(() => {
    const role = String(user?.role || '').replace('ROLE_', '');
    return role || 'USER';
  }, [user?.role]);

  useEffect(() => {
    if (!accountOpen) return undefined;
    const handleClickOutside = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [accountOpen]);

  return (
    <header className="dashboard-nav">
      <div className="dashboard-nav-main">
        <p className="tag">{portalLabel}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {!showQuickNav && (
        <div className="dashboard-nav-user">
          <p className="dashboard-user-name">{user?.fullName || 'User'}</p>
          <p className="dashboard-user-meta">{user?.email || ''}</p>
        </div>
      )}

      <div className="dashboard-nav-actions">
        {showQuickNav && (
          <button type="button" className="nav-pill-btn active" onClick={onOpenBookings}>
            <span className="nav-pill-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 6h13M8 12h13M8 18h13" />
                <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </span>
            Bookings
          </button>
        )}
        {showQuickNav && (
          <button type="button" className="nav-pill-btn" onClick={onOpenHelp}>
            <span className="nav-pill-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.6 9.2a2.4 2.4 0 1 1 4.2 1.6c-.7.7-1.4 1.1-1.4 2.2" />
                <circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none" />
              </svg>
            </span>
            Help
          </button>
        )}
        <div className="account-menu-wrap" ref={accountRef}>
          <button
            type="button"
            className="nav-pill-btn"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((prev) => !prev)}
          >
            <span className="nav-pill-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c1.6-3.4 4-5 7-5s5.4 1.6 7 5" />
              </svg>
            </span>
            Account
          </button>
          {accountOpen && (
            <div className="account-menu-popup" role="menu">
              <p className="account-name">{user?.fullName || 'User'}</p>
              <p className="account-email">{user?.email || ''}</p>
              <p className="account-role">Role: {roleLabel}</p>
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={() => setMode(nextMode)}
                title={`Theme: ${modeLabel}. Click to switch.`}
                aria-label={`Theme: ${modeLabel}. Click to switch.`}
              >
                Theme: {modeLabel}
              </button>
              <button type="button" onClick={onLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
