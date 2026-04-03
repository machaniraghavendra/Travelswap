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

export default function UpcomingTripCard({ trip }) {
  if (!trip) {
    return (
      <section className="panel upcoming muted-card">
        <div className="panel-head">
          <h2>Upcoming Trip</h2>
        </div>
        <p>No upcoming purchased trip yet.</p>
      </section>
    );
  }

  return (
    <section className="panel upcoming highlight-card">
      <div className="panel-head">
        <h2>Upcoming Trip</h2>
        <span>Highlighted travel plan</span>
      </div>
      <p className="trip-route">{trip.routeFrom} to {trip.routeTo}</p>
      <p><strong>Departure:</strong> {dateTime(trip.departureTime)}</p>
      <p><strong>Operator:</strong> {trip.operatorName}</p>
      <p><strong>Travel:</strong> {trip.travelName || trip.operatorName}</p>
      <p><strong>Bus:</strong> {trip.busNumber || 'N/A'} {trip.busType ? `(${trip.busType})` : ''}</p>
      <p><strong>Seat:</strong> {trip.seatNumber}</p>
      <p><strong>Seller Price:</strong> {money(trip.resalePrice)}</p>
      <p><strong>Total Paid:</strong> {money(trip.buyerFinalPrice)}</p>
      <p><strong>Platform Fee:</strong> {money(trip.platformFee)}</p>
      <p><strong>Traveller Commission:</strong> {money(trip.travellerCommission)}</p>
      <p><strong>Transfer Code:</strong> {trip.transferCode || 'Pending'}</p>
    </section>
  );
}
