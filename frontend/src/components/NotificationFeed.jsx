function time(value) {
  return new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function NotificationFeed({ notifications, providers, streamState }) {
  return (
    <section className="panel side-panel">
      <div className="panel-head">
        <h2>System Pulse</h2>
        <span className={`stream-pill ${streamState.toLowerCase()}`}>{streamState}</span>
      </div>

      <h4>Provider Integration Layer</h4>
      <ul className="providers">
        {providers.map((provider) => (
          <li key={provider.name}>
            <strong>{provider.name}</strong>
            <small>{provider.integrationState}</small>
          </li>
        ))}
      </ul>

      <h4>Lifecycle Notifications</h4>
      <ul className="notifications">
        {notifications.length === 0 && <li>No events yet.</li>}
        {notifications.map((notification) => (
          <li key={notification.id}>
            <p>{notification.detail}</p>
            <small>{time(notification.createdAt)}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}