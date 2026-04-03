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

export default function MyResellingTickets({ listings, onUpdatePrice, onRevoke, busyKey }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>My Reselling Tickets</h2>
        <span>Manage only your own resale listings here</span>
      </div>

      <div className="listing-grid">
        {listings.length === 0 && <p className="empty">No active resale tickets from your account.</p>}
        {listings.map((listing) => (
          <article key={listing.id} className="listing-card">
            <header>
              <h3>{listing.routeFrom} to {listing.routeTo}</h3>
              <span>{listing.status}</span>
            </header>
            <div className="listing-meta">
              <p><strong>Travel:</strong> {listing.travelName || listing.operatorName}</p>
              <p><strong>Seat:</strong> {listing.seatNumber}</p>
              <p><strong>Departure:</strong> {dateTime(listing.departureTime)}</p>
              <p><strong>Listed Price:</strong> {money(listing.resalePrice)}</p>
            </div>
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                const raw = new FormData(event.currentTarget).get('price');
                const price = Number(raw);
                if (!price) {
                  return;
                }
                onUpdatePrice(listing.id, price);
              }}
            >
              <input name="price" type="number" min="1" step="0.01" placeholder="Lower override price" />
              <button type="submit" disabled={busyKey === `price-${listing.id}`}>
                {busyKey === `price-${listing.id}` ? 'Updating...' : 'Update Price'}
              </button>
            </form>
            <button
              type="button"
              className="subtle-button danger"
              disabled={busyKey === `revoke-${listing.id}`}
              onClick={() => onRevoke(listing.id)}
            >
              {busyKey === `revoke-${listing.id}` ? 'Revoking...' : 'Revoke Listing'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
