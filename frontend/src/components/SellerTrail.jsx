function dateTime(value) {
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function money(value) {
  return Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export default function SellerTrail({ listings }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Seller Trail</h2>
        <span>Your listed/sold/revoked ticket history</span>
      </div>

      <ul className="notifications">
        {listings.length === 0 && <li>No listings yet.</li>}
        {listings.map((listing) => (
          <li key={listing.id}>
            <p>
              <strong>{listing.routeFrom} to {listing.routeTo}</strong> ({listing.status})
            </p>
            <small>Travel: {listing.travelName || listing.operatorName} | Bus: {listing.busNumber || 'N/A'}</small>
            <small>Departure: {dateTime(listing.departureTime)}</small>
            <small>Fare: {money(listing.originalFare)} | Seller Payout: {money(listing.resalePrice)}</small>
            <small>Buyer Total: {money(listing.buyerFinalPrice)}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
