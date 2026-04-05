import { useMemo, useState } from 'react';
import { TRAVEL_LOCATIONS } from '../constants/locations';

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

export default function Marketplace({
  listings,
  filters,
  setFilters,
  onPurchase,
  busyKey,
  userId,
  locationOptions = []
}) {
  const [buyers, setBuyers] = useState({});
  const [buyModal, setBuyModal] = useState(null);
  const [buyError, setBuyError] = useState('');
  const hasSearch = filters.routeFrom.trim() && filters.routeTo.trim() && filters.journeyDate;

  const visibleListings = useMemo(
    () => listings.filter((listing) => listing.status === 'AVAILABLE' && listing.sellerId !== userId),
    [listings, userId]
  );
  const locations = useMemo(
    () => Array.from(new Set([...TRAVEL_LOCATIONS, ...locationOptions].map((value) => (value || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [locationOptions]
  );
  const fromOptions = useMemo(() => locations.filter((location) => location !== filters.routeTo), [locations, filters.routeTo]);
  const toOptions = useMemo(() => locations.filter((location) => location !== filters.routeFrom), [locations, filters.routeFrom]);

  const handlePurchase = async () => {
    if (!buyModal) {
      return;
    }
    setBuyError('');
    const buyerContact = buyers[buyModal.id]?.buyerContact || '';
    const pickupPoint = buyers[buyModal.id]?.pickupPoint || '';
    const droppingPoint = buyers[buyModal.id]?.droppingPoint || '';
    const passengerGender = buyers[buyModal.id]?.passengerGender || '';

    if (!pickupPoint || !droppingPoint) {
      setBuyError('Pickup and dropping points are required.');
      return;
    }

    await onPurchase(buyModal.id, { buyerContact, pickupPoint, droppingPoint, passengerGender: passengerGender || null });
    setBuyers((prev) => ({ ...prev, [buyModal.id]: { buyerContact: '' } }));
    setBuyModal(null);
  };

  return (
    <section className="panel marketplace">
      <div className="panel-head">
        <h2>Reselling Tickets</h2>
        <span>Book from resale inventory separately from primary bookings</span>
      </div>

      <div className="filters">
        <select
          value={filters.routeFrom}
          onChange={(event) => setFilters((prev) => ({ ...prev, routeFrom: event.target.value, routeTo: prev.routeTo === event.target.value ? '' : prev.routeTo }))}
        >
          <option value="">From city</option>
          {fromOptions.map((location) => (
            <option key={`resale-from-${location}`} value={location}>{location}</option>
          ))}
        </select>
        <select
          value={filters.routeTo}
          onChange={(event) => setFilters((prev) => ({ ...prev, routeTo: event.target.value, routeFrom: prev.routeFrom === event.target.value ? '' : prev.routeFrom }))}
        >
          <option value="">To city</option>
          {toOptions.map((location) => (
            <option key={`resale-to-${location}`} value={location}>{location}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.journeyDate || ''}
          onChange={(event) => setFilters((prev) => ({ ...prev, journeyDate: event.target.value }))}
        />
      </div>

      <div className="listing-grid">
        {!hasSearch && <p className="empty">Search using From, To, and Date to view resale tickets.</p>}
        {hasSearch && visibleListings.length === 0 && <p className="empty">No resale tickets found for these filters.</p>}

        {hasSearch && visibleListings.map((listing) => (
            <article key={listing.id} className="listing-card">
              <header>
                <h3>{listing.routeFrom} to {listing.routeTo}</h3>
                <span>{listing.sourcePlatform}</span>
              </header>

              <div className="listing-meta">
                <p><strong>Travel:</strong> {listing.travelName || listing.operatorName}</p>
                <p><strong>Bus:</strong> {listing.busNumber || 'N/A'} {listing.busType ? `(${listing.busType})` : ''}</p>
                <p><strong>Operator:</strong> {listing.operatorName}</p>
                <p><strong>Seat:</strong> {listing.seatNumber}</p>
                <p><strong>Departure:</strong> {dateTime(listing.departureTime)}</p>
                <p><strong>Original Fare:</strong> {money(listing.originalFare)}</p>
                <p><strong>Listed Price:</strong> {money(listing.resalePrice)}</p>
                <p><strong>Estimated Platform Fee:</strong> {money(listing.platformFee || 0)}</p>
                <p><strong>Estimated Traveller Charge:</strong> {money(listing.travellerCommission || 0)}</p>
                <p><strong>Total Amount You Pay:</strong> {money(listing.buyerFinalPrice || listing.resalePrice)}</p>
                <p><strong>Seller:</strong> {listing.sellerName}</p>
              </div>

              <button type="button" onClick={() => setBuyModal(listing)} disabled={busyKey === `buy-${listing.id}`}>
                {busyKey === `buy-${listing.id}` ? 'Processing...' : 'Buy Ticket'}
              </button>
            </article>
        ))}
      </div>

      {buyModal && (
        <div className="popup-wrap" role="dialog" aria-modal="true">
          <div className="popup-card booking-popup">
            <h3>Confirm Resale Ticket Purchase</h3>
            <p>{buyModal.routeFrom} to {buyModal.routeTo} | Seat {buyModal.seatNumber}</p>
            <div className="price-card">
              <p><strong>Seat Number:</strong> {buyModal.seatNumber}</p>
              <p><strong>Listed Price:</strong> {money(buyModal.resalePrice)}</p>
              <p><strong>Platform Fee:</strong> {money(buyModal.platformFee || 0)}</p>
              <p><strong>Traveller Charge:</strong> {money(buyModal.travellerCommission || 0)}</p>
              <p><strong>Total Amount to Pay Now:</strong> {money(buyModal.buyerFinalPrice || buyModal.resalePrice)}</p>
            </div>
            <label>
              Passenger Gender (Optional)
              <select
                value={buyers[buyModal.id]?.passengerGender || ''}
                onChange={(event) =>
                  setBuyers((prev) => ({
                    ...prev,
                    [buyModal.id]: { ...prev[buyModal.id], passengerGender: event.target.value }
                  }))
                }
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </label>
            {(buyModal.pickupPoints || []).length > 0 ? (
              <label>
                Pickup Point
                <select
                  value={buyers[buyModal.id]?.pickupPoint || ''}
                  onChange={(event) =>
                    setBuyers((prev) => ({
                      ...prev,
                      [buyModal.id]: { ...prev[buyModal.id], pickupPoint: event.target.value }
                    }))
                  }
                >
                  <option value="">Select pickup point</option>
                  {(buyModal.pickupPoints || []).map((item) => (
                    <option key={`${item.point}-${item.date}-${item.time}`} value={item.point}>
                      {item.point} {item.date || ''} {item.time ? `(${item.time})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Pickup Point
                <input
                  placeholder="Enter pickup point"
                  value={buyers[buyModal.id]?.pickupPoint || ''}
                  onChange={(event) =>
                    setBuyers((prev) => ({
                      ...prev,
                      [buyModal.id]: { ...prev[buyModal.id], pickupPoint: event.target.value }
                    }))
                  }
                />
              </label>
            )}
            {(buyModal.droppingPoints || []).length > 0 ? (
              <label>
                Dropping Point
                <select
                  value={buyers[buyModal.id]?.droppingPoint || ''}
                  onChange={(event) =>
                    setBuyers((prev) => ({
                      ...prev,
                      [buyModal.id]: { ...prev[buyModal.id], droppingPoint: event.target.value }
                    }))
                  }
                >
                  <option value="">Select dropping point</option>
                  {(buyModal.droppingPoints || []).map((item) => (
                    <option key={`${item.point}-${item.date}-${item.time}`} value={item.point}>
                      {item.point} {item.date || ''} {item.time ? `(${item.time})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                Dropping Point
                <input
                  placeholder="Enter dropping point"
                  value={buyers[buyModal.id]?.droppingPoint || ''}
                  onChange={(event) =>
                    setBuyers((prev) => ({
                      ...prev,
                      [buyModal.id]: { ...prev[buyModal.id], droppingPoint: event.target.value }
                    }))
                  }
                />
              </label>
            )}
            <label>
              Buyer Contact (Optional)
              <input
                placeholder="Phone or email"
                value={buyers[buyModal.id]?.buyerContact || ''}
                onChange={(event) =>
                  setBuyers((prev) => ({
                    ...prev,
                    [buyModal.id]: { ...prev[buyModal.id], buyerContact: event.target.value }
                  }))
                }
              />
            </label>
            <div className="popup-actions">
              <button type="button" className="subtle-button" onClick={() => {
                setBuyModal(null);
                setBuyError('');
              }}>Cancel</button>
              <button type="button" onClick={handlePurchase} disabled={busyKey === `buy-${buyModal.id}`}>
                {busyKey === `buy-${buyModal.id}` ? 'Confirming...' : 'Confirm Purchase'}
              </button>
            </div>
            {buyError && <small className="field-error">{buyError}</small>}
          </div>
        </div>
      )}
    </section>
  );
}
