function time(value) {
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function SessionPanel({ sessions, onRevoke, busySessionId }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Active Sessions</h2>
        <span>Login/session management</span>
      </div>

      <ul className="notifications">
        {sessions.length === 0 && <li>No active sessions found.</li>}
        {sessions.map((session) => (
          <li key={session.id}>
            <p><strong>{session.userAgent}</strong></p>
            <small>IP: {session.ipAddress}</small>
            <small>Last used: {time(session.lastUsedAt)}</small>
            <small>Expires: {time(session.expiresAt)}</small>
            <button
              type="button"
              className="subtle-button"
              disabled={busySessionId === session.id}
              onClick={() => onRevoke(session.id)}
            >
              {busySessionId === session.id ? 'Revoking...' : 'Revoke'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}