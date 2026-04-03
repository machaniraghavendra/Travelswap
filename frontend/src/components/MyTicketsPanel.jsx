function money(value) {
  return Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

function dateTime(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function MyTicketsPanel({ tickets }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>My Owned Tickets</h2>
        <span>Book, hold, and sell from this inventory</span>
      </div>

      <ul className="notifications">
        {tickets.length === 0 && <li>No tickets booked yet.</li>}
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <p>
              <strong>{ticket.routeFrom} to {ticket.routeTo}</strong> ({ticket.status})
            </p>
            <small>Travel: {ticket.travelName} | Bus: {ticket.busNumber}</small>
            <small>Departure: {dateTime(ticket.departureTime)} | Seat: {ticket.seatNumber}</small>
            <small>Passenger: {ticket.passengerName || '-'} ({ticket.passengerAge || '-'} yrs)</small>
            <small>Phone: {ticket.passengerPhone || '-'} | Gender: {ticket.passengerGender || '-'} | Pickup: {ticket.pickupPoint || '-'} | Drop: {ticket.droppingPoint || '-'}</small>
            <small>PNR: {ticket.pnr} | Paid: {money(ticket.amountPaid)}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
