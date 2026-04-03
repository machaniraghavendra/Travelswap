import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import NotificationFeed from '../components/NotificationFeed';
import SummaryCards from '../components/SummaryCards';
import SessionPanel from '../components/SessionPanel';
import AuditPanel from '../components/AuditPanel';
import AdminOverviewPanel from '../components/AdminOverviewPanel';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [summary, setSummary] = useState(null);
  const [overview, setOverview] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [providers, setProviders] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditHasMore, setAuditHasMore] = useState(true);
  const [auditVisible, setAuditVisible] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [streamState, setStreamState] = useState('CONNECTING');
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refreshDashboard = useCallback(async () => {
    const [summaryData, overviewData, providerData, notificationData, sessionData] = await Promise.all([
      api.getSummary(),
      api.getAdminOverview(),
      api.getProviders(),
      api.getSystemNotifications(),
      api.sessions()
    ]);

    setSummary(summaryData);
    setOverview(overviewData);
    setProviders(providerData);
    setNotifications(notificationData);
    setSessions(sessionData);
  }, []);

  const loadAuditChunk = async (reset = false) => {
    setAuditLoading(true);
    try {
      const offset = reset ? 0 : auditOffset;
      const chunk = await api.getAuditLogsChunk(offset, 20);
      setAuditLogs((prev) => (reset ? chunk.items : [...prev, ...chunk.items]));
      setAuditOffset(offset + chunk.items.length);
      setAuditHasMore(chunk.hasMore);
      setAuditVisible(true);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboard().catch((requestError) => setError(requestError.message));
  }, [refreshDashboard]);

  useEffect(() => {
    const eventSource = api.createListingStream(
      async () => {
        try {
          await refreshDashboard();
          setStreamState('CONNECTED');
        } catch {
          setStreamState('DEGRADED');
        }
      },
      () => setStreamState('RECONNECTING')
    );

    eventSource.onopen = () => setStreamState('CONNECTED');

    return () => {
      eventSource.close();
      setStreamState('DISCONNECTED');
    };
  }, [refreshDashboard]);

  const withAction = async (key, action, successMessage) => {
    setBusyKey(key);
    setError('');
    setMessage('');

    try {
      await action();
      await refreshDashboard();
      setMessage(successMessage);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyKey('');
    }
  };

  const onRevokeSession = (sessionId) =>
    withAction(`session-${sessionId}`, () => api.revokeSession(sessionId), 'Session revoked.');

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="tag">TravelSwap Admin</p>
          <h1>System Control Portal</h1>
          <p>Signed in as {user.fullName}. Admin-only visibility for system pulse, events, and audit trails.</p>
        </div>

        <div className="hero-actions">
          <button type="button" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <SummaryCards summary={summary} />

      {(message || error) && (
        <div className={error ? 'banner error' : 'banner success'}>{error || message}</div>
      )}

      <main className="layout">
        <section className="left-col">
          <AdminOverviewPanel overview={overview} />
          <NotificationFeed notifications={notifications} providers={providers} streamState={streamState} />
        </section>

        <section className="right-col">
          <AuditPanel
            logs={auditLogs}
            loading={auditLoading}
            hasMore={auditHasMore}
            visible={auditVisible}
            onView={() => loadAuditChunk(true)}
            onLoadMore={() => loadAuditChunk(false)}
          />
          <SessionPanel
            sessions={sessions}
            onRevoke={onRevokeSession}
            busySessionId={busyKey.startsWith('session-') ? busyKey.replace('session-', '') : ''}
          />
        </section>
      </main>
    </div>
  );
}
