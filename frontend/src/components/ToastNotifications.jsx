export default function ToastNotifications({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast-item ${toast.type || 'info'}`}>
          <p>{toast.message}</p>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => onDismiss(toast.id)}
            aria-label="Close notification"
            title="Close"
          >
            ×
          </button>
        </article>
      ))}
    </div>
  );
}
