export default function SellerPopup({ notification, onClose }) {
  if (!notification) {
    return null;
  }

  return (
    <div className="popup-wrap" role="dialog" aria-modal="true">
      <div className="popup-card">
        <h3>{notification.title}</h3>
        <p>{notification.detail}</p>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}