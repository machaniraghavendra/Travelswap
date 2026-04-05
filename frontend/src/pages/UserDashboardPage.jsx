import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import ListingForm from '../components/ListingForm';
import Marketplace from '../components/Marketplace';
import SessionPanel from '../components/SessionPanel';
import SellerTrail from '../components/SellerTrail';
import PurchaseHistory from '../components/PurchaseHistory';
import UserSummaryCards from '../components/UserSummaryCards';
import SellerPopup from '../components/SellerPopup';
import JourneyBoard from '../components/JourneyBoard';
import MyTicketsPanel from '../components/MyTicketsPanel';
import MyResellingTickets from '../components/MyResellingTickets';
import UpcomingJourneysPanel from '../components/UpcomingJourneysPanel';

function buildListingQuery(filters) {
  const params = new URLSearchParams({ status: 'AVAILABLE' });
  params.set('routeFrom', filters.routeFrom.trim());
  params.set('routeTo', filters.routeTo.trim());
  if (filters.journeyDate) {
    params.set('journeyDate', filters.journeyDate);
  }
  return `?${params.toString()}`;
}
function buildJourneyQuery(filters) {
  const params = new URLSearchParams();
  if (filters.routeFrom.trim()) {
    params.set('routeFrom', filters.routeFrom.trim());
  }
  if (filters.routeTo.trim()) {
    params.set('routeTo', filters.routeTo.trim());
  }
  if (filters.journeyDate) {
    params.set('journeyDate', filters.journeyDate);
  }
  const value = params.toString();
  return value ? `?${value}` : '';
}

export default function UserDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [journeys, setJourneys] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [listings, setListings] = useState([]);
  const [sellerTrail, setSellerTrail] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [popupNotification, setPopupNotification] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [journeyFilters, setJourneyFilters] = useState({ routeFrom: '', routeTo: '', journeyDate: '' });
  const [resaleFilters, setResaleFilters] = useState({ routeFrom: '', routeTo: '', journeyDate: '' });

  const listingQuery = useMemo(() => buildListingQuery(resaleFilters), [resaleFilters]);
  const journeyQuery = useMemo(() => buildJourneyQuery(journeyFilters), [journeyFilters]);
  const hasJourneySearch = useMemo(
    () => Boolean(journeyFilters.routeFrom.trim() && journeyFilters.routeTo.trim() && journeyFilters.journeyDate),
    [journeyFilters.routeFrom, journeyFilters.routeTo, journeyFilters.journeyDate]
  );
  const hasResaleSearch = useMemo(
    () => Boolean(resaleFilters.routeFrom.trim() && resaleFilters.routeTo.trim() && resaleFilters.journeyDate),
    [resaleFilters.routeFrom, resaleFilters.routeTo, resaleFilters.journeyDate]
  );

  const refreshDashboard = useCallback(async () => {
    const [dashboardData, journeyData, ticketsData, listingData, sellerData, purchaseData, sessionData, unreadAlerts, locationsData] = await Promise.all([
      api.getMyDashboard(),
      hasJourneySearch ? api.getJourneys(journeyQuery) : Promise.resolve([]),
      api.getMyTickets(),
      hasResaleSearch ? api.getListings(listingQuery) : Promise.resolve([]),
      api.getMyListings(),
      api.getMyPurchases(),
      api.sessions(),
      api.getMyNotifications(true, 30),
      api.getJourneyLocations()
    ]);

    setDashboard(dashboardData);
    setJourneys(journeyData);
    setTickets(ticketsData);
    setListings(listingData);
    setSellerTrail(sellerData);
    setPurchases(purchaseData);
    setSessions(sessionData);
    setAlerts(unreadAlerts);
    setLocations(locationsData || []);

    const nextPopup = unreadAlerts.find((notification) => notification.category === 'SELLER_REFUND');
    if (nextPopup) {
      setPopupNotification((current) => current || nextPopup);
    }
  }, [hasJourneySearch, hasResaleSearch, journeyQuery, listingQuery]);

  useEffect(() => {
    refreshDashboard().catch((requestError) => setError(requestError.message));
  }, [refreshDashboard]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshDashboard().catch((requestError) => setError(requestError.message));
    }, 250);

    return () => clearTimeout(timer);
  }, [journeyFilters, resaleFilters, refreshDashboard]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshDashboard().catch(() => {
        // no-op; intermittent polling failure shouldn't block UI
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [refreshDashboard]);

  const withAction = async (key, action, successMessage, options = {}) => {
    setBusyKey(key);
    setError('');
    setMessage('');

    try {
      await action();
      await refreshDashboard();
      setMessage(successMessage);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      if (options.rethrow) {
        throw requestError;
      }
      return false;
    } finally {
      setBusyKey('');
    }
  };

  const onCreateListing = (payload) =>
    withAction('create', () => api.createListing(payload), 'Listing published successfully.', { rethrow: true });

  const onBookJourney = (journeyId, payload) =>
    withAction(`book-${journeyId}`, () => api.bookJourneySeat(journeyId, payload), 'Seat booked successfully.');

  const onPurchase = (listingId, buyer) =>
    withAction(`buy-${listingId}`, () => api.purchaseListing(listingId, buyer), `Ticket ${listingId} purchased.`);

  const onUpdatePrice = (listingId, price) =>
    withAction(`price-${listingId}`, () => api.updatePrice(listingId, price), `Listing ${listingId} price updated.`);

  const onRevoke = (listingId) =>
    withAction(`revoke-${listingId}`, () => api.revokeListing(listingId), `Listing ${listingId} revoked.`);

  const onRevokeSession = (sessionId) =>
    withAction(`session-${sessionId}`, () => api.revokeSession(sessionId), 'Session revoked.');

  const onClosePopup = async () => {
    if (!popupNotification) {
      return;
    }

    try {
      await api.markMyNotificationRead(popupNotification.id);
      const remaining = alerts.filter((item) => item.id !== popupNotification.id);
      setAlerts(remaining);
      setPopupNotification(remaining.find((notification) => notification.category === 'SELLER_REFUND') || null);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="tag">TravelSwap User Portal</p>
          <h1>Buy and Sell from One Dashboard</h1>
          <p>Signed in as {user.fullName}. Track your profits/losses, sold trail, purchases, and upcoming trips.</p>
        </div>

        <div className="hero-actions">
          <button type="button" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <UserSummaryCards summary={dashboard} />

      {(message || error) && (
        <div className={error ? 'banner error' : 'banner success'}>{error || message}</div>
      )}

      <main className="layout">
        <section className="left-col">
          <UpcomingJourneysPanel tickets={tickets} />
          <Marketplace
            listings={listings}
            filters={resaleFilters}
            setFilters={setResaleFilters}
            onPurchase={onPurchase}
            busyKey={busyKey}
            userId={user.id}
            locationOptions={locations}
          />
          <MyResellingTickets
            listings={sellerTrail.filter((item) => item.status === 'AVAILABLE')}
            onUpdatePrice={onUpdatePrice}
            onRevoke={onRevoke}
            busyKey={busyKey}
          />
          <JourneyBoard
            journeys={journeys}
            onBook={onBookJourney}
            busyKey={busyKey}
            filters={journeyFilters}
            setFilters={setJourneyFilters}
            onLoadSeatPlan={api.getJourneySeats}
            locationOptions={locations}
          />
          <MyTicketsPanel tickets={tickets} />
          <ListingForm onCreate={onCreateListing} busy={busyKey === 'create'} tickets={tickets} />
        </section>

        <section className="right-col">
          <SellerTrail listings={sellerTrail} />
          <PurchaseHistory tickets={purchases} />
          <section className="panel">
            <div className="panel-head">
              <h2>Seller Alerts</h2>
              <span>Refund notifications after ticket purchase</span>
            </div>
            <ul className="notifications">
              {alerts.length === 0 && <li>No new alerts.</li>}
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <p><strong>{alert.title}</strong></p>
                  <small>{alert.detail}</small>
                </li>
              ))}
            </ul>
          </section>
          <SessionPanel
            sessions={sessions}
            onRevoke={onRevokeSession}
            busySessionId={busyKey.startsWith('session-') ? busyKey.replace('session-', '') : ''}
          />
        </section>
      </main>

      <SellerPopup notification={popupNotification} onClose={onClosePopup} />
    </div>
  );
}
