import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AuthCursorShell from '../components/AuthCursorShell';
import { api } from '../api';
import { TRAVEL_LOCATIONS } from '../constants/locations';
import { useTheme } from '../ThemeContext';

function buildJourneyQuery(filters) {
  const params = new URLSearchParams();
  if (filters.routeFrom) params.set('routeFrom', filters.routeFrom);
  if (filters.routeTo) params.set('routeTo', filters.routeTo);
  if (filters.journeyDate) params.set('journeyDate', filters.journeyDate);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildResaleQuery(filters) {
  const params = new URLSearchParams({ status: 'AVAILABLE' });
  if (filters.routeFrom) params.set('routeFrom', filters.routeFrom);
  if (filters.routeTo) params.set('routeTo', filters.routeTo);
  if (filters.journeyDate) params.set('journeyDate', filters.journeyDate);
  return `?${params.toString()}`;
}

function todayLocalDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dateTime(value) {
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function money(value) {
  return Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
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

  if (preferredDeck === 'LOWER') return { lower: sorted, upper: [] };
  if (preferredDeck === 'UPPER') return { lower: [], upper: sorted };
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
    rows.push({
      key: `row-${row + 1}`,
      leftWindow: windowSeats[row * 2] || null,
      rightInner: normalSeats[row] || null,
      rightWindow: windowSeats[row * 2 + 1] || null
    });
  }
  return rows;
}

export default function LoginPage({ accountType = 'USER' }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { mode, setMode } = useTheme();
  const isTravel = accountType === 'TRAVEL';
  const themeOrder = ['system', 'light', 'dark'];
  const themeNext = themeOrder[(themeOrder.indexOf(mode) + 1) % themeOrder.length];
  const themeLabel = mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'System';

  const initial = useMemo(() => (
    isTravel
      ? { email: 'travel@travelswap.com', password: 'Travel123' }
      : { email: 'seller@travelswap.com', password: 'Seller123' }
  ), [isTravel]);

  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(isTravel);
  const [journeyFilters, setJourneyFilters] = useState({ routeFrom: '', routeTo: '', journeyDate: '' });
  const [resaleFilters, setResaleFilters] = useState({ routeFrom: '', routeTo: '', journeyDate: '' });
  const [locations, setLocations] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [resaleListings, setResaleListings] = useState([]);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [resaleLoading, setResaleLoading] = useState(false);
  const [seatLoading, setSeatLoading] = useState(false);
  const [publicError, setPublicError] = useState('');
  const [seatPreview, setSeatPreview] = useState(null);
  const [selectedGuestSeats, setSelectedGuestSeats] = useState([]);
  const [activeDeck, setActiveDeck] = useState('LOWER');
  const minDate = useMemo(() => todayLocalDate(), []);

  const title = isTravel ? 'Travel Operator Sign In' : 'User Sign In';
  const altLoginPath = isTravel ? '/login' : '/travel/login';
  const registerPath = isTravel ? '/travel/register' : '/register';

  const validate = () => {
    const nextErrors = {};
    if (!form.email.includes('@')) {
      nextErrors.email = 'Enter a valid email.';
    }
    if (!form.password || form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }
    return nextErrors;
  };

  const clearInvalid = (nextErrors) => {
    setForm((prev) => {
      const next = { ...prev };
      Object.keys(nextErrors).forEach((field) => {
        if (field !== '_form') {
          next[field] = '';
        }
      });
      return next;
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      clearInvalid(validationErrors);
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      await login(form.email, form.password, accountType);
      navigate('/dashboard');
    } catch (requestError) {
      const message = requestError.message || 'Unable to sign in.';
      const nextErrors = { password: message };
      setErrors(nextErrors);
      clearInvalid(nextErrors);
    } finally {
      setBusy(false);
    }
  };

  const allLocations = useMemo(
    () => Array.from(new Set([...TRAVEL_LOCATIONS, ...locations].map((value) => (value || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [locations]
  );

  const journeyFromOptions = useMemo(() => allLocations.filter((location) => location !== journeyFilters.routeTo), [allLocations, journeyFilters.routeTo]);
  const journeyToOptions = useMemo(() => allLocations.filter((location) => location !== journeyFilters.routeFrom), [allLocations, journeyFilters.routeFrom]);
  const resaleFromOptions = useMemo(() => allLocations.filter((location) => location !== resaleFilters.routeTo), [allLocations, resaleFilters.routeTo]);
  const resaleToOptions = useMemo(() => allLocations.filter((location) => location !== resaleFilters.routeFrom), [allLocations, resaleFilters.routeFrom]);
  const decks = useMemo(() => splitDecks(seatPreview?.seats || [], seatPreview?.preferredDeck || 'BOTH'), [seatPreview]);
  const lowerRows = useMemo(() => buildDeckRows(decks.lower || []), [decks]);
  const upperRows = useMemo(() => buildDeckRows(decks.upper || []), [decks]);
  const availableDecks = useMemo(() => {
    const next = [];
    if (lowerRows.length > 0) next.push('LOWER');
    if (upperRows.length > 0) next.push('UPPER');
    return next;
  }, [lowerRows.length, upperRows.length]);

  useEffect(() => {
    if (isTravel) return;
    api.getJourneyLocations().then((data) => setLocations(data || [])).catch(() => {});
  }, [isTravel]);

  useEffect(() => {
    if (isTravel) return;
    const hasJourneySearch = journeyFilters.routeFrom && journeyFilters.routeTo && journeyFilters.journeyDate;
    if (!hasJourneySearch) {
      setJourneys([]);
      return;
    }
    setJourneyLoading(true);
    setPublicError('');
    const timer = setTimeout(() => {
      api.getJourneys(buildJourneyQuery(journeyFilters))
        .then((data) => setJourneys(data || []))
        .catch((requestError) => setPublicError(requestError.message))
        .finally(() => setJourneyLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [isTravel, journeyFilters]);

  useEffect(() => {
    if (isTravel) return;
    const hasResaleSearch = resaleFilters.routeFrom && resaleFilters.routeTo && resaleFilters.journeyDate;
    if (!hasResaleSearch) {
      setResaleListings([]);
      return;
    }
    setResaleLoading(true);
    setPublicError('');
    const timer = setTimeout(() => {
      api.getListings(buildResaleQuery(resaleFilters))
        .then((data) => setResaleListings((data || []).filter((item) => item.status === 'AVAILABLE')))
        .catch((requestError) => setPublicError(requestError.message))
        .finally(() => setResaleLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [isTravel, resaleFilters]);

  const persistGuestFilters = (type, payload) => {
    sessionStorage.setItem('ts_public_journey_filters', JSON.stringify(journeyFilters));
    sessionStorage.setItem('ts_public_resale_filters', JSON.stringify(resaleFilters));
    sessionStorage.setItem('ts_pending_action', JSON.stringify({ type, payload }));
    if (!isTravel) {
      setShowLoginForm(true);
    }
    setErrors((prev) => ({ ...prev, _form: 'Please sign in to confirm booking or purchase. Your selected search/details are preserved.' }));
  };

  const openSeatPreview = async (journey) => {
    setSeatLoading(true);
    setPublicError('');
    try {
      const plan = await api.getJourneySeats(journey.id);
      setSeatPreview(plan);
      setSelectedGuestSeats([]);
      setActiveDeck(plan.preferredDeck === 'UPPER' ? 'UPPER' : 'LOWER');
    } catch (requestError) {
      setPublicError(requestError.message);
    } finally {
      setSeatLoading(false);
    }
  };

  useEffect(() => {
    if (!seatPreview) return;
    if (availableDecks.includes(activeDeck)) return;
    setActiveDeck(availableDecks[0] || 'LOWER');
  }, [seatPreview, availableDecks, activeDeck]);

  const toggleGuestSeat = (seatNumber) => {
    setSelectedGuestSeats((prev) => (
      prev.includes(seatNumber) ? prev.filter((item) => item !== seatNumber) : [...prev, seatNumber]
    ));
  };

  const renderSeat = (seat) => {
    if (!seat) {
      return <div className="seat-cell"><div className="seat-placeholder" /></div>;
    }
    const isMaleBooked = !seat.available && seat.bookedGender === 'MALE';
    const isFemaleBooked = !seat.available && seat.bookedGender === 'FEMALE';
    const isSelected = selectedGuestSeats.includes(seat.seatNumber);
    return (
      <div className="seat-cell">
        <button
          type="button"
          className={`seat-btn ${seat.available ? 'available' : 'booked'} ${seat.windowSeat ? 'window-seat' : ''} ${isMaleBooked ? 'male-booked' : ''} ${isFemaleBooked ? 'female-booked' : ''} ${isSelected ? 'selected' : ''}`}
          disabled={!seat.available}
          onClick={() => toggleGuestSeat(seat.seatNumber)}
          title={`${seat.seatNumber} (${seat.windowSeat ? 'Window Seat' : 'Normal'})`}
        >
          {seat.seatNumber}
        </button>
        <small className={`seat-caption ${seat.available ? 'fare' : 'sold'}`}>
          {seat.available ? (seat.windowSeat ? 'Window Seat' : 'Normal') : 'Sold'}
        </small>
      </div>
    );
  };

  return (
    <AuthCursorShell>
      <div className="guest-landing">
        {!isTravel && (
          <div className="guest-landing-toolbar">
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={() => setMode(themeNext)}
              title={`Theme: ${themeLabel}. Click to switch.`}
              aria-label={`Theme: ${themeLabel}. Click to switch.`}
            >
              Theme: {themeLabel}
            </button>
            <button type="button" onClick={() => setShowLoginForm(true)}>Login</button>
          </div>
        )}

        {isTravel && (
          <section className="auth-card guest-login-card">
            <div className="auth-top-actions">
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={() => setMode(themeNext)}
                title={`Theme: ${themeLabel}. Click to switch.`}
                aria-label={`Theme: ${themeLabel}. Click to switch.`}
              >
                Theme: {themeLabel}
              </button>
            </div>
            <p className="tag">TravelSwap Access</p>
            <h1>{title}</h1>
            <p className="auth-copy">Use a TRAVEL account to manage buses and journey schedules.</p>

            <form onSubmit={onSubmit} className="auth-form">
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
                {errors.email && <small className="field-error">{errors.email}</small>}
              </label>

              <label>
                Password
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                />
                {errors.password && <small className="field-error">{errors.password}</small>}
              </label>
              <label>
                <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show Password
              </label>

              <button type="submit" disabled={busy}>
                {busy ? (
                  <span className="loading-inline">
                    <span className="spinner spinner-sm" aria-hidden="true" />
                    <span>Signing in...</span>
                  </span>
                ) : 'Sign In'}
              </button>
              {errors._form && <small className="field-error">{errors._form}</small>}
            </form>

            <p className="auth-foot">
              Need travel operator account? <Link to={registerPath}>Create account</Link>
            </p>
            <p className="auth-foot">
              Switch portal: <Link to={altLoginPath}>User Login</Link>
            </p>
            <p className="auth-foot">
              Forgot password? <Link to="/forgot-password">Reset here</Link>
            </p>
          </section>
        )}

        {!isTravel && (
          <section className="auth-card guest-explore-card">
            <section className="promo-hero">
              <div className="promo-hero-content">
                <p className="promo-badge">TravelSwap Live</p>
                <h2>Book Fast. Resell Smart.</h2>
                <p className="promo-copy">Ticket not found in emergency? Try reselling tickets.</p>
                <p className="promo-copy">Last-minute travel? Grab verified seats in minutes.</p>
              </div>
            </section>

            <div className="promo-cards">
              <article className="promo-card">
                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80" alt="Traveller profile" />
                <div>
                  <h4>Urgent Trip</h4>
                  <p>Missed regular inventory? Check resale first.</p>
                </div>
              </article>
              <article className="promo-card">
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80" alt="Traveller profile" />
                <div>
                  <h4>Instant Seat Match</h4>
                  <p>Search by route and date, confirm after login.</p>
                </div>
              </article>
              <article className="promo-card">
                <img src="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=200&q=80" alt="Traveller profile" />
                <div>
                  <h4>Better Recovery</h4>
                  <p>Can’t travel? Resell your ticket, reduce loss.</p>
                </div>
              </article>
            </div>

            <div className="panel-head">
              <h2>Explore Buses</h2>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h3>Book Seats</h3>
                <span>Primary inventory</span>
              </div>
              <div className="filters">
                <div className="route-swap-row">
                  <select value={journeyFilters.routeFrom} onChange={(event) => setJourneyFilters((prev) => ({ ...prev, routeFrom: event.target.value, routeTo: prev.routeTo === event.target.value ? '' : prev.routeTo }))}>
                    <option value="">From city</option>
                    {journeyFromOptions.map((item) => <option key={`guest-book-from-${item}`} value={item}>{item}</option>)}
                  </select>
                  <button type="button" className="swap-icon-btn" onClick={() => setJourneyFilters((prev) => ({ ...prev, routeFrom: prev.routeTo || '', routeTo: prev.routeFrom || '' }))}>↔</button>
                  <select value={journeyFilters.routeTo} onChange={(event) => setJourneyFilters((prev) => ({ ...prev, routeTo: event.target.value, routeFrom: prev.routeFrom === event.target.value ? '' : prev.routeFrom }))}>
                    <option value="">To city</option>
                    {journeyToOptions.map((item) => <option key={`guest-book-to-${item}`} value={item}>{item}</option>)}
                  </select>
                </div>
                <input type="date" min={minDate} value={journeyFilters.journeyDate} onChange={(event) => setJourneyFilters((prev) => ({ ...prev, journeyDate: event.target.value }))} />
              </div>
              <div className="listing-grid">
                {journeyLoading && <p className="empty">Loading buses...</p>}
                {!journeyLoading && journeys.slice(0, 5).map((journey) => (
                  <article key={`guest-journey-${journey.id}`} className="listing-card">
                    <header><h3>{journey.routeFrom} to {journey.routeTo}</h3><span>{journey.travelName}</span></header>
                    <div className="listing-meta">
                      <p><strong>Bus:</strong> {journey.busNumber} ({journey.busType})</p>
                      <p><strong>Departure:</strong> {dateTime(journey.departureTime)}</p>
                      <p><strong>Fare:</strong> {money(journey.baseFare)}</p>
                      <p><strong>Seats Left:</strong> {journey.availableSeats}</p>
                    </div>
                    <div className="guest-card-actions">
                      <button type="button" className="subtle-button" onClick={() => openSeatPreview(journey)}>
                        {seatLoading ? 'Loading Seats...' : 'Choose Seats'}
                      </button>
                      <button type="button" onClick={() => persistGuestFilters('BOOK', { journeyId: journey.id })}>Login to Book</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h3>Reselling Tickets</h3>
                <span>Last-minute swaps</span>
              </div>
              <div className="filters">
                <div className="route-swap-row">
                  <select value={resaleFilters.routeFrom} onChange={(event) => setResaleFilters((prev) => ({ ...prev, routeFrom: event.target.value, routeTo: prev.routeTo === event.target.value ? '' : prev.routeTo }))}>
                    <option value="">From city</option>
                    {resaleFromOptions.map((item) => <option key={`guest-resale-from-${item}`} value={item}>{item}</option>)}
                  </select>
                  <button type="button" className="swap-icon-btn" onClick={() => setResaleFilters((prev) => ({ ...prev, routeFrom: prev.routeTo || '', routeTo: prev.routeFrom || '' }))}>↔</button>
                  <select value={resaleFilters.routeTo} onChange={(event) => setResaleFilters((prev) => ({ ...prev, routeTo: event.target.value, routeFrom: prev.routeFrom === event.target.value ? '' : prev.routeFrom }))}>
                    <option value="">To city</option>
                    {resaleToOptions.map((item) => <option key={`guest-resale-to-${item}`} value={item}>{item}</option>)}
                  </select>
                </div>
                <input type="date" min={minDate} value={resaleFilters.journeyDate} onChange={(event) => setResaleFilters((prev) => ({ ...prev, journeyDate: event.target.value }))} />
              </div>
              <div className="listing-grid">
                {resaleLoading && <p className="empty">Loading resale tickets...</p>}
                {!resaleLoading && resaleListings.slice(0, 5).map((listing) => (
                  <article key={`guest-listing-${listing.id}`} className="listing-card">
                    <header><h3>{listing.routeFrom} to {listing.routeTo}</h3><span>{listing.sourcePlatform}</span></header>
                    <div className="listing-meta">
                      <p><strong>Travel:</strong> {listing.travelName || listing.operatorName}</p>
                      <p><strong>Seat:</strong> {listing.seatNumber}</p>
                      <p><strong>Departure:</strong> {dateTime(listing.departureTime)}</p>
                      <p><strong>Total Payable:</strong> {money(listing.buyerFinalPrice || listing.resalePrice)}</p>
                    </div>
                    <button type="button" onClick={() => persistGuestFilters('BUY_RESALE', { listingId: listing.id })}>Login to Buy</button>
                  </article>
                ))}
              </div>
            </div>
            {publicError && <small className="field-error">{publicError}</small>}
          </section>
        )}
      </div>
      {!isTravel && showLoginForm && (
        <div className="popup-wrap" role="dialog" aria-modal="true">
          <section className="auth-card guest-login-card">
            <div className="auth-top-actions">
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={() => setMode(themeNext)}
                title={`Theme: ${themeLabel}. Click to switch.`}
                aria-label={`Theme: ${themeLabel}. Click to switch.`}
              >
                Theme: {themeLabel}
              </button>
              <button type="button" className="subtle-button" onClick={() => setShowLoginForm(false)}>Close</button>
            </div>
            <p className="tag">TravelSwap Access</p>
            <h1>{title}</h1>
            <p className="auth-copy">Explore buses and resale tickets instantly. Login only when you confirm booking/purchase.</p>

            <form onSubmit={onSubmit} className="auth-form">
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
                {errors.email && <small className="field-error">{errors.email}</small>}
              </label>

              <label>
                Password
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                />
                {errors.password && <small className="field-error">{errors.password}</small>}
              </label>
              <label>
                <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show Password
              </label>

              <button type="submit" disabled={busy}>
                {busy ? (
                  <span className="loading-inline">
                    <span className="spinner spinner-sm" aria-hidden="true" />
                    <span>Signing in...</span>
                  </span>
                ) : 'Sign In'}
              </button>
              {errors._form && <small className="field-error">{errors._form}</small>}
            </form>

            <p className="auth-foot">
              Need user account? <Link to={registerPath}>Create account</Link>
            </p>
            <p className="auth-foot">
              Switch portal: <Link to={altLoginPath}>Travel Login</Link>
            </p>
            <p className="auth-foot">
              Forgot password? <Link to="/forgot-password">Reset here</Link>
            </p>
          </section>
        </div>
      )}
      {seatPreview && (
        <div className="popup-wrap" role="dialog" aria-modal="true">
          <div className="popup-card booking-popup">
            <h3>Select Seats Before Login</h3>
            <p>{seatPreview.routeFrom} to {seatPreview.routeTo} | {seatPreview.travelName} | {seatPreview.busNumber}</p>
            <p>Departure: {dateTime(seatPreview.departureTime)}</p>
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
            <div className="deck-columns">
              {availableDecks.includes('LOWER') && (availableDecks.length === 1 || activeDeck === 'LOWER') && (
                <section className="deck-card">
                  <div className="deck-card-head"><h4>Lower Deck</h4></div>
                  <div className="deck-grid">
                    {lowerRows.map((row) => (
                      <div key={`guest-lower-${row.key}`} className="sleeper-row">
                        {renderSeat(row.leftWindow)}
                        <div className="aisle-gap" aria-hidden="true" />
                        {renderSeat(row.rightInner)}
                        {renderSeat(row.rightWindow)}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {availableDecks.includes('UPPER') && (availableDecks.length === 1 || activeDeck === 'UPPER') && (
                <section className="deck-card">
                  <div className="deck-card-head"><h4>Upper Deck</h4></div>
                  <div className="deck-grid">
                    {upperRows.map((row) => (
                      <div key={`guest-upper-${row.key}`} className="sleeper-row">
                        {renderSeat(row.leftWindow)}
                        <div className="aisle-gap" aria-hidden="true" />
                        {renderSeat(row.rightInner)}
                        {renderSeat(row.rightWindow)}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
            <div className="popup-actions">
              <button type="button" className="subtle-button" onClick={() => setSeatPreview(null)}>Close</button>
              <button
                type="button"
                onClick={() => {
                  persistGuestFilters('BOOK_WITH_SEATS', { journeyId: seatPreview.journeyId, seatNumbers: selectedGuestSeats });
                  setSeatPreview(null);
                }}
                disabled={selectedGuestSeats.length === 0}
              >
                Login to Confirm {selectedGuestSeats.length > 0 ? `(${selectedGuestSeats.length} seats)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthCursorShell>
  );
}
