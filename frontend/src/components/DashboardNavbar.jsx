import { useTheme } from '../ThemeContext';

export default function DashboardNavbar({
  portalLabel,
  title,
  subtitle,
  user,
  onLogout
}) {
  const { mode, setMode } = useTheme();
  const order = ['system', 'light', 'dark'];
  const currentIndex = order.indexOf(mode);
  const nextMode = order[(currentIndex + 1) % order.length];
  const modeLabel = mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'System';

  return (
    <header className="dashboard-nav">
      <div className="dashboard-nav-main">
        <p className="tag">{portalLabel}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="dashboard-nav-user">
        <p className="dashboard-user-name">{user?.fullName || 'User'}</p>
        <p className="dashboard-user-meta">{user?.email || ''}</p>
      </div>

      <div className="dashboard-nav-actions">
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
    </header>
  );
}
