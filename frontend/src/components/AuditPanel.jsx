function time(value) {
  return new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AuditPanel({ logs, loading, hasMore, onView, onLoadMore, visible }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Audit Trail</h2>
        <span>Server transaction logs</span>
      </div>

      {!visible && (
        <button type="button" onClick={onView} disabled={loading}>
          {loading ? 'Loading...' : 'View Audit Logs'}
        </button>
      )}

      {visible && (
        <>
          <ul className="notifications">
            {logs.length === 0 && <li>No audit entries yet.</li>}
            {logs.map((entry) => (
              <li key={entry.id}>
                <p>
                  <strong>{entry.action}</strong> - {entry.message || 'No detail'}
                </p>
                <small>{entry.actorEmail} | {entry.statusCode} | {time(entry.createdAt)}</small>
              </li>
            ))}
          </ul>

          <div className="popup-actions">
            {hasMore && (
              <button type="button" onClick={onLoadMore} disabled={loading}>
                {loading ? 'Loading...' : 'Load Next Chunk'}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
