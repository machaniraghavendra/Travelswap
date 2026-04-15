import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import NotificationFeed from '../components/NotificationFeed';
import SummaryCards from '../components/SummaryCards';
import SessionPanel from '../components/SessionPanel';
import AuditPanel from '../components/AuditPanel';
import AdminOverviewPanel from '../components/AdminOverviewPanel';
import DashboardNavbar from '../components/DashboardNavbar';
import ToastNotifications from '../components/ToastNotifications';

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
  const [toasts, setToasts] = useState([]);

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

  useEffect(() => {
    if (!message) return;
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type: 'success', message }]);
    setMessage('');
  }, [message]);

  useEffect(() => {
    if (!error) return;
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type: 'error', message: error }]);
    setError('');
  }, [error]);

  return (
    <div className="app-shell">
      <DashboardNavbar
        portalLabel="TravelSwap Admin"
        title="System Control Portal"
        subtitle="Admin-only visibility for system pulse, events, and audit trails."
        user={user}
        onLogout={onLogout}
      />

      <SummaryCards summary={summary} />

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
      <ToastNotifications toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))} />
    </div>
  );
}
