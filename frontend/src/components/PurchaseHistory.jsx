function dateTime(value) {
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function money(value) {
  return Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export default function PurchaseHistory({ tickets }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Purchased Tickets</h2>
        <span>All purchased ticket details</span>
      </div>

      <ul className="notifications">
        {tickets.length === 0 && <li>No purchased tickets yet.</li>}
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <p>
              <strong>{ticket.routeFrom} to {ticket.routeTo}</strong>
            </p>
            <small>Travel: {ticket.travelName || ticket.operatorName} | Bus: {ticket.busNumber || 'N/A'}</small>
            <small>Departure: {dateTime(ticket.departureTime)}</small>
            <small>Seller Price: {money(ticket.resalePrice)} | Buyer Paid: {money(ticket.buyerFinalPrice)}</small>
            <small>Transfer: {ticket.transferCode || 'Pending'}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
