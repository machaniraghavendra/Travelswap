import { useMemo, useState } from 'react';
import CollapsiblePanel from './CollapsiblePanel';

function dateTime(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function money(value) {
  return Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export default function UpcomingJourneysPanel({ tickets }) {
  const [active, setActive] = useState(null);

  const upcoming = useMemo(
    () => (tickets || []).filter((ticket) => ticket.status === 'BOOKED' && new Date(ticket.departureTime).getTime() > Date.now()),
    [tickets]
  );

  return (
    <CollapsiblePanel title="Upcoming Journeys" subtitle="Click a card to view full details">
      <div className="summary-grid">
        {upcoming.length === 0 && <p className="empty">No upcoming journeys.</p>}
        {upcoming.map((ticket) => (
          <article key={ticket.id} className="summary-card teal" onClick={() => setActive(ticket)} style={{ cursor: 'pointer' }}>
            <p>{ticket.routeFrom} to {ticket.routeTo}</p>
            <h3>{ticket.seatNumber}</h3>
            <p>{dateTime(ticket.departureTime)}</p>
          </article>
        ))}
      </div>

      {active && (
        <div className="popup-wrap" role="dialog" aria-modal="true">
          <div className="popup-card">
            <h3>Journey Details</h3>
            <p><strong>Route:</strong> {active.routeFrom} to {active.routeTo}</p>
            <p><strong>Departure:</strong> {dateTime(active.departureTime)}</p>
            <p><strong>Travel:</strong> {active.travelName}</p>
            <p><strong>Bus:</strong> {active.busNumber} ({active.busType})</p>
            <p><strong>Seat:</strong> {active.seatNumber}</p>
            <p><strong>Passenger:</strong> {active.passengerName || '-'} ({active.passengerAge || '-'}, {active.passengerGender || '-'})</p>
            <p><strong>Pickup:</strong> {active.pickupPoint || '-'}</p>
            <p><strong>Dropping:</strong> {active.droppingPoint || '-'}</p>
            <p><strong>PNR:</strong> {active.pnr}</p>
            <p><strong>Paid:</strong> {money(active.amountPaid)}</p>
            <div className="popup-actions">
              <button type="button" onClick={() => setActive(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </CollapsiblePanel>
  );
}
