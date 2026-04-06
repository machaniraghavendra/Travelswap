import { useEffect, useMemo, useState } from 'react';
import { TRAVEL_LOCATIONS } from '../constants/locations';
import CollapsiblePanel from './CollapsiblePanel';

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

function isoDate(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function todayLocalDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function pointLabel(item, fallbackDate = '') {
  if (typeof item === 'string') return item;
  const date = item?.date || fallbackDate;
  const time = item?.time || '';
  const dt = [date, time].filter(Boolean).join(' ');
  return `${item?.point || ''}${dt ? ` (${dt})` : ''}`;
}

function pointValue(item) {
  return typeof item === 'string' ? item : item.point;
}

function parseSeatIndex(seatNumber) {
  const match = /^([A-Za-z]+)?(\d+)$/.exec(seatNumber || '');
  if (!match) {
    return { prefix: '', number: Number.MAX_SAFE_INTEGER };
  }
  return { prefix: (match[1] || '').toUpperCase(), number: Number(match[2]) };
}

function sortSeats(a, b) {
  const left = parseSeatIndex(a.seatNumber);
  const right = parseSeatIndex(b.seatNumber);
  if (left.number !== right.number) return left.number - right.number;
  return left.prefix.localeCompare(right.prefix);
}

function splitDecks(seats, preferredDeck) {
  const sorted = [...seats].sort(sortSeats);
  const explicitLower = sorted.filter((seat) => /^L/i.test(seat.seatNumber));
  const explicitUpper = sorted.filter((seat) => /^U/i.test(seat.seatNumber));

  if (explicitLower.length || explicitUpper.length) {
    return {
      lower: explicitLower,
      upper: explicitUpper
    };
  }

  if (preferredDeck === 'LOWER') {
    return { lower: sorted, upper: [] };
  }
  if (preferredDeck === 'UPPER') {
    return { lower: [], upper: sorted };
  }
  const mid = Math.ceil(sorted.length / 2);
  return { lower: sorted.slice(0, mid), upper: sorted.slice(mid) };
}

function buildDeckRows(seats) {
  const sorted = [...seats].sort(sortSeats);
  const windowSeats = sorted.filter((seat) => seat.windowSeat);
  const normalSeats = sorted.filter((seat) => !seat.windowSeat);
  const rows = [];

  const rowCount = Math.max(Math.ceil(windowSeats.length / 2), normalSeats.length);
  for (let row = 0; row < rowCount; row += 1) {
    // Strict mapping: only window seats in outer columns, normal seat in inner column.
    const leftWindow = windowSeats[row * 2] || null;
    const rightWindow = windowSeats[row * 2 + 1] || null;
    const rightInner = normalSeats[row] || null;
    rows.push({
      key: `row-${row + 1}`,
      leftWindow,
      rightInner,
      rightWindow
    });
  }

  return rows;
}

function SeatButton({ seat, selected, onToggle }) {
  if (!seat) {
    return <div className="seat-cell"><div className="seat-placeholder" /></div>;
  }
  const isMaleBooked = !seat.available && seat.bookedGender === 'MALE';
  const isFemaleBooked = !seat.available && seat.bookedGender === 'FEMALE';
  return (
    <div className="seat-cell">
      <button
        type="button"
        className={`seat-btn ${seat.available ? 'available' : 'booked'} ${selected ? 'selected' : ''} ${seat.windowSeat ? 'window-seat' : ''} ${isMaleBooked ? 'male-booked' : ''} ${isFemaleBooked ? 'female-booked' : ''}`}
        disabled={!seat.available}
        onClick={() => onToggle(seat.seatNumber)}
        title={`${seat.seatNumber} (${seat.windowSeat ? 'Window Seat' : 'Normal'})`}
      >
        {seat.seatNumber}
      </button>
      <small className={`seat-caption ${seat.available ? 'fare' : 'sold'}`}>
        {seat.available ? (seat.windowSeat ? 'Window Seat' : 'Normal') : 'Sold'}
      </small>
    </div>
  );
}

export default function JourneyBoard({ journeys, onBook, busyKey, filters, setFilters, onLoadSeatPlan, locationOptions = [], loading = false }) {
  const [seatModal, setSeatModal] = useState(null);
  const [modalError, setModalError] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedPickup, setSelectedPickup] = useState('');
  const [selectedDrop, setSelectedDrop] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [activeDeck, setActiveDeck] = useState('LOWER');

  const hasSearch = filters.routeFrom.trim() && filters.routeTo.trim() && filters.journeyDate;

  const priceBreakdown = useMemo(() => {
    if (!seatModal) return null;
    return {
      total: Number(seatModal.totalPayable || 0)
    };
  }, [seatModal]);

  const decks = useMemo(
    () => splitDecks(seatModal?.seats || [], seatModal?.preferredDeck || 'BOTH'),
    [seatModal]
  );
  const lowerRows = useMemo(() => buildDeckRows(decks.lower || []), [decks]);
  const upperRows = useMemo(() => buildDeckRows(decks.upper || []), [decks]);

  const availableDecks = useMemo(() => {
    const next = [];
    if (lowerRows.length > 0) next.push('LOWER');
    if (upperRows.length > 0) next.push('UPPER');
    return next;
  }, [lowerRows.length, upperRows.length]);

  useEffect(() => {
    if (!seatModal) return;
    const preferred = seatModal.preferredDeck || 'BOTH';
    if (preferred === 'LOWER' && availableDecks.includes('LOWER')) {
      setActiveDeck('LOWER');
      return;
    }
    if (preferred === 'UPPER' && availableDecks.includes('UPPER')) {
      setActiveDeck('UPPER');
      return;
    }
    setActiveDeck(availableDecks[0] || 'LOWER');
  }, [seatModal, availableDecks]);

  const selectedSeatNumbers = useMemo(() => new Set(selectedSeats.map((item) => item.seatNumber)), [selectedSeats]);
  const locations = useMemo(
    () => Array.from(new Set([...TRAVEL_LOCATIONS, ...locationOptions].map((value) => (value || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [locationOptions]
  );
  const fromOptions = useMemo(() => locations.filter((location) => location !== filters.routeTo), [locations, filters.routeTo]);
  const toOptions = useMemo(() => locations.filter((location) => location !== filters.routeFrom), [locations, filters.routeFrom]);
  const minJourneyDate = useMemo(() => todayLocalDate(), []);
  const swapRouteFilters = () => {
    setFilters((prev) => ({
      ...prev,
      routeFrom: prev.routeTo || '',
      routeTo: prev.routeFrom || ''
    }));
  };

  const openSeatPicker = async (journey) => {
    setModalError('');
    setSelectedSeats([]);
    setConfirmStep(false);
    try {
      const plan = await onLoadSeatPlan(journey.id);
      setSeatModal(plan);
      setSelectedPickup(plan.pickupPoints?.length ? pointValue(plan.pickupPoints[0]) : '');
      setSelectedDrop(plan.droppingPoints?.length ? pointValue(plan.droppingPoints[0]) : '');
    } catch (requestError) {
      setModalError(requestError.message);
    }
  };

  const closeModal = () => {
    setSeatModal(null);
    setConfirmStep(false);
    setSelectedSeats([]);
    setSelectedPickup('');
    setSelectedDrop('');
    setModalError('');
    setActiveDeck('LOWER');
  };

  const toggleSeat = (seatNumber) => {
    setSelectedSeats((prev) => {
      const index = prev.findIndex((item) => item.seatNumber === seatNumber);
      if (index >= 0) {
        return prev.filter((item) => item.seatNumber !== seatNumber);
      }
      return [...prev, { seatNumber, passengerName: '', passengerAge: '', passengerPhone: '', passengerGender: '' }];
    });
  };

  const updatePassenger = (seatNumber, key, value) => {
    setSelectedSeats((prev) => prev.map((item) => (item.seatNumber === seatNumber ? { ...item, [key]: value } : item)));
  };

  const proceedConfirmation = () => {
    if (selectedSeats.length === 0) {
      setModalError('Select at least one seat.');
      return;
    }
    if (!selectedPickup || !selectedDrop || selectedPickup === selectedDrop) {
      setModalError('Choose valid pickup and dropping points.');
      return;
    }

    const invalid = selectedSeats.find((seat) => !seat.passengerName.trim() || !Number(seat.passengerAge) || !seat.passengerPhone.trim() || !seat.passengerGender);
    if (invalid) {
      setModalError(`Fill passenger details for seat ${invalid.seatNumber}.`);
      return;
    }

    setModalError('');
    setConfirmStep(true);
  };

  const confirmBooking = async () => {
    if (!seatModal) return;
    try {
      await onBook(seatModal.journeyId, {
        passengers: selectedSeats.map((item) => ({
          seatNumber: item.seatNumber,
          passengerName: item.passengerName.trim(),
          passengerAge: Number(item.passengerAge),
          passengerPhone: item.passengerPhone.trim(),
          passengerGender: item.passengerGender
        })),
        pickupPoint: selectedPickup,
        droppingPoint: selectedDrop
      });
      closeModal();
    } catch (requestError) {
      setModalError(requestError.message);
    }
  };

  const selectedTotal = priceBreakdown ? priceBreakdown.total * selectedSeats.length : 0;

  const renderDeck = (label, rows) => (
    <section className="deck-card">
      <div className="deck-card-head">
        <h4>{label}</h4>
      </div>
      <div className="deck-grid">
        {rows.map((row) => (
          <div key={`${label}-${row.key}`} className="sleeper-row">
            <SeatButton seat={row.leftWindow} selected={selectedSeatNumbers.has(row.leftWindow?.seatNumber)} onToggle={toggleSeat} />
            <div className="aisle-gap" aria-hidden="true" />
            <SeatButton seat={row.rightInner} selected={selectedSeatNumbers.has(row.rightInner?.seatNumber)} onToggle={toggleSeat} />
            <SeatButton seat={row.rightWindow} selected={selectedSeatNumbers.has(row.rightWindow?.seatNumber)} onToggle={toggleSeat} />
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <CollapsiblePanel title="Book Seats" subtitle="Primary booking from travel operators">

      <div className="filters">
        <div className="route-swap-row">
          <select value={filters.routeFrom} onChange={(event) => setFilters((prev) => ({ ...prev, routeFrom: event.target.value, routeTo: prev.routeTo === event.target.value ? '' : prev.routeTo }))}>
            <option value="">From city</option>
            {fromOptions.map((location) => (
              <option key={`from-${location}`} value={location}>{location}</option>
            ))}
          </select>
          <button type="button" className="swap-icon-btn" onClick={swapRouteFilters} aria-label="Swap From and To" title="Swap From and To">
            ↔
          </button>
          <select value={filters.routeTo} onChange={(event) => setFilters((prev) => ({ ...prev, routeTo: event.target.value, routeFrom: prev.routeFrom === event.target.value ? '' : prev.routeFrom }))}>
            <option value="">To city</option>
            {toOptions.map((location) => (
              <option key={`to-${location}`} value={location}>{location}</option>
            ))}
          </select>
        </div>
        <input
          type="date"
          min={minJourneyDate}
          value={filters.journeyDate || ''}
          onChange={(event) => setFilters((prev) => ({ ...prev, journeyDate: event.target.value }))}
        />
      </div>

      {!hasSearch && <p className="empty">Search using From, To, and Date to view available buses and seats.</p>}

      <div className="listing-grid">
        {hasSearch && loading && (
          <p className="empty loading-inline">
            <span className="spinner spinner-sm" aria-hidden="true" />
            <span>Loading available buses and seats...</span>
          </p>
        )}
        {hasSearch && !loading && journeys.length === 0 && <p className="empty">No journey schedules found for these filters.</p>}
        {!loading && journeys.map((journey) => (
          <article key={journey.id} className="listing-card">
            <header>
              <h3>{journey.routeFrom} to {journey.routeTo}</h3>
              <span>{journey.travelName}</span>
            </header>
            <div className="listing-meta">
              <p><strong>Bus:</strong> {journey.busNumber} ({journey.busType})</p>
              <p><strong>Preferred Deck:</strong> {journey.preferredDeck || 'BOTH'}</p>
              <p><strong>Departure:</strong> {dateTime(journey.departureTime)}</p>
              <p><strong>Fare:</strong> {money(journey.baseFare)}</p>
              <p><strong>Seats Left:</strong> {journey.availableSeats}</p>
              <p><strong>Pickup:</strong> {(journey.pickupPoints || []).map((item) => pointLabel(item, isoDate(journey.departureTime))).join(', ') || '-'}</p>
              <p><strong>Dropping:</strong> {(journey.droppingPoints || []).map((item) => pointLabel(item, isoDate(journey.departureTime))).join(', ') || '-'}</p>
            </div>
            <button type="button" onClick={() => openSeatPicker(journey)} disabled={busyKey === `book-${journey.id}`}>
              {busyKey === `book-${journey.id}` ? 'Booking...' : 'Select Seats and Book'}
            </button>
          </article>
        ))}
      </div>

      {seatModal && (
        <div className="popup-wrap" role="dialog" aria-modal="true">
          <div className="popup-card booking-popup">
            <h3>{confirmStep ? 'Confirm Booking' : 'Select Seats and Passenger Details'}</h3>
            <p>{seatModal.routeFrom} to {seatModal.routeTo} | {seatModal.travelName} | {seatModal.busNumber} ({seatModal.busType})</p>
            <p>Departure: {dateTime(seatModal.departureTime)}</p>

            {!confirmStep && (
              <>
                <div className="seat-legend">
                  <span className="legend-chip normal">Available</span>
                  <span className="legend-chip window">Window Seat</span>
                  <span className="legend-chip male">Male Booked</span>
                  <span className="legend-chip female">Female Booked</span>
                </div>

                {availableDecks.length > 1 && (
                  <div className="deck-tabs">
                    <button type="button" className={activeDeck === 'LOWER' ? 'active' : ''} onClick={() => setActiveDeck('LOWER')}>Lower Deck</button>
                    <button type="button" className={activeDeck === 'UPPER' ? 'active' : ''} onClick={() => setActiveDeck('UPPER')}>Upper Deck</button>
                  </div>
                )}

                {availableDecks.length === 0 && <p className="empty">No seats available for this journey.</p>}
                <div className="deck-columns">
                  {availableDecks.length === 1 && availableDecks[0] === 'LOWER' && renderDeck('Lower Deck', lowerRows)}
                  {availableDecks.length === 1 && availableDecks[0] === 'UPPER' && renderDeck('Upper Deck', upperRows)}
                  {availableDecks.length > 1 && activeDeck === 'LOWER' && renderDeck('Lower Deck', lowerRows)}
                  {availableDecks.length > 1 && activeDeck === 'UPPER' && renderDeck('Upper Deck', upperRows)}
                  {availableDecks.length > 1 && !['LOWER', 'UPPER'].includes(activeDeck) && (
                    <>
                      {renderDeck('Lower Deck', lowerRows)}
                      {renderDeck('Upper Deck', upperRows)}
                    </>
                  )}
                </div>

                <div className="form-grid">
                  <label>
                    Pickup Point
                    <select value={selectedPickup} onChange={(event) => setSelectedPickup(event.target.value)}>
                      <option value="">Select pickup point</option>
                      {(seatModal.pickupPoints || []).map((item, index) => (
                        <option key={`pickup-${index}-${pointLabel(item, isoDate(seatModal.departureTime))}`} value={pointValue(item)}>
                          {pointLabel(item, isoDate(seatModal.departureTime))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Dropping Point
                    <select value={selectedDrop} onChange={(event) => setSelectedDrop(event.target.value)}>
                      <option value="">Select dropping point</option>
                      {(seatModal.droppingPoints || []).map((item, index) => (
                        <option key={`drop-${index}-${pointLabel(item, isoDate(seatModal.departureTime))}`} value={pointValue(item)}>
                          {pointLabel(item, isoDate(seatModal.departureTime))}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {selectedSeats.length > 0 && (
                  <div className="listing-grid">
                    {selectedSeats.map((seat) => (
                      <article key={seat.seatNumber} className="listing-card">
                        <h4>Seat {seat.seatNumber}</h4>
                        <div className="form-grid">
                          <label>Passenger Name<input value={seat.passengerName} onChange={(e) => updatePassenger(seat.seatNumber, 'passengerName', e.target.value)} /></label>
                          <label>Age<input type="number" min="1" value={seat.passengerAge} onChange={(e) => updatePassenger(seat.seatNumber, 'passengerAge', e.target.value)} /></label>
                          <label>Phone<input value={seat.passengerPhone} onChange={(e) => updatePassenger(seat.seatNumber, 'passengerPhone', e.target.value)} /></label>
                          <label>
                            Gender
                            <select value={seat.passengerGender} onChange={(e) => updatePassenger(seat.seatNumber, 'passengerGender', e.target.value)}>
                              <option value="">Select gender</option>
                              <option value="MALE">Male</option>
                              <option value="FEMALE">Female</option>
                            </select>
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                <div className="popup-actions">
                  <button type="button" className="subtle-button" onClick={closeModal}>Cancel</button>
                  <button type="button" onClick={proceedConfirmation}>Continue</button>
                </div>
              </>
            )}

            {confirmStep && priceBreakdown && (
              <>
                <div className="price-card">
                  <p><strong>Seats:</strong> {selectedSeats.map((item) => item.seatNumber).join(', ')}</p>
                  <p><strong>Passengers:</strong> {selectedSeats.length}</p>
                  <p><strong>Pickup:</strong> {selectedPickup}</p>
                  <p><strong>Dropping:</strong> {selectedDrop}</p>
                  <p><strong>Per Seat Total:</strong> {money(priceBreakdown.total)}</p>
                  <p><strong>Grand Total:</strong> {money(selectedTotal)}</p>
                </div>
                <div className="popup-actions">
                  <button type="button" className="subtle-button" onClick={() => setConfirmStep(false)}>Back</button>
                  <button type="button" onClick={confirmBooking} disabled={busyKey === `book-${seatModal.journeyId}`}>
                    {busyKey === `book-${seatModal.journeyId}` ? 'Confirming...' : 'Confirm Booking'}
                  </button>
                </div>
              </>
            )}

            {modalError && <small className="field-error">{modalError}</small>}
          </div>
        </div>
      )}
    </CollapsiblePanel>
  );
}
