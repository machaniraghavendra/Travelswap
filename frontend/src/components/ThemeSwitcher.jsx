import { useTheme } from '../ThemeContext';

export default function ThemeSwitcher() {
  const { mode, setMode } = useTheme();
  const order = ['system', 'light', 'dark'];
  const currentIndex = order.indexOf(mode);
  const nextMode = order[(currentIndex + 1) % order.length];

  const icon = mode === 'dark' ? '🌙' : mode === 'light' ? '☀️' : '🖥️';
  const label = mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'System';

  return (
    <div className="theme-switcher">
      <button
        type="button"
        className="theme-toggle-btn"
        onClick={() => setMode(nextMode)}
        title={`Theme: ${label} (click to switch)`}
        aria-label={`Theme: ${label}. Click to switch.`}
      >
        <span className="theme-icon" aria-hidden="true">{icon}</span>
        <span className="theme-text">{label}</span>
      </button>
    </div>
  );
}
