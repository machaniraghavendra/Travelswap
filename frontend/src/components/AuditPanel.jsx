import CollapsiblePanel from './CollapsiblePanel';

function time(value) {
  return new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AuditPanel({ logs, loading, hasMore, onView, onLoadMore, visible }) {
  return (
    <CollapsiblePanel title="Audit Trail" subtitle="Server transaction logs">

      {!visible && (
        <button type="button" onClick={onView} disabled={loading}>
          {loading ? (
            <span className="loading-inline">
              <span className="spinner spinner-sm" aria-hidden="true" />
              <span>Loading...</span>
            </span>
          ) : 'View Audit Logs'}
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
                {loading ? (
                  <span className="loading-inline">
                    <span className="spinner spinner-sm" aria-hidden="true" />
                    <span>Loading...</span>
                  </span>
                ) : 'Load Next Chunk'}
              </button>
            )}
          </div>
        </>
      )}
    </CollapsiblePanel>
  );
}
