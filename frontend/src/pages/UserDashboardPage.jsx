import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import DashboardNavbar from '../components/DashboardNavbar';
import ToastNotifications from '../components/ToastNotifications';

const USER_TAB_ITEMS = [
  { id: 'book-seats', label: 'Book Tickets' },
  { id: 'resell-market', label: 'Reselling Tickets' },
    { id: 'sell-ticket', label: 'Sell Ticket' },
  { id: 'summary', label: 'Summary' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'my-resell', label: 'My Reselling' },
  { id: 'my-tickets', label: 'My Tickets' },
  { id: 'seller-trail', label: 'Seller Trail' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'sessions', label: 'Sessions' }
];

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

function readSavedFilters(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return { routeFrom: '', routeTo: '', journeyDate: '' };
    const parsed = JSON.parse(raw);
    return {
      routeFrom: parsed?.routeFrom || '',
      routeTo: parsed?.routeTo || '',
      journeyDate: parsed?.journeyDate || ''
    };
  } catch {
    return { routeFrom: '', routeTo: '', journeyDate: '' };
  }
}

export default function UserDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [resaleLoading, setResaleLoading] = useState(false);
  const [journeyFilters, setJourneyFilters] = useState(() => readSavedFilters('ts_public_journey_filters'));
  const [resaleFilters, setResaleFilters] = useState(() => readSavedFilters('ts_public_resale_filters'));
  const searchRunRef = useRef(0);
  const initialLoadDoneRef = useRef(false);
  const [toasts, setToasts] = useState([]);
  const activeTab = USER_TAB_ITEMS.some((item) => item.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'book-seats';

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

  const loadBaseData = useCallback(async () => {
    const [dashboardData, ticketsData, sellerData, purchaseData, sessionData, unreadAlerts, locationsData] = await Promise.all([
      api.getMyDashboard(),
      api.getMyTickets(),
      api.getMyListings(),
      api.getMyPurchases(),
      api.sessions(),
      api.getMyNotifications(true, 30),
      api.getJourneyLocations()
    ]);

    setDashboard(dashboardData);
    setTickets(ticketsData);
    setSellerTrail(sellerData);
    setPurchases(purchaseData);
    setSessions(sessionData);
    setAlerts(unreadAlerts);
    setLocations(locationsData || []);

    const nextPopup = unreadAlerts.find((notification) => notification.category === 'SELLER_REFUND');
    if (nextPopup) {
      setPopupNotification((current) => current || nextPopup);
    }
  }, []);

  const loadSearchData = useCallback(async () => {
    const runId = searchRunRef.current + 1;
    searchRunRef.current = runId;
    setJourneyLoading(hasJourneySearch);
    setResaleLoading(hasResaleSearch);

    try {
      const [journeyData, listingData] = await Promise.all([
        hasJourneySearch ? api.getJourneys(journeyQuery) : Promise.resolve([]),
        hasResaleSearch ? api.getListings(listingQuery) : Promise.resolve([])
      ]);

      if (searchRunRef.current === runId) {
        setJourneys(journeyData || []);
        setListings(listingData || []);
      }
    } finally {
      if (searchRunRef.current === runId) {
        setJourneyLoading(false);
        setResaleLoading(false);
      }
    }
  }, [hasJourneySearch, hasResaleSearch, journeyQuery, listingQuery]);

  useEffect(() => {
    if (initialLoadDoneRef.current) {
      return;
    }
    initialLoadDoneRef.current = true;
    Promise.all([loadBaseData(), loadSearchData()]).catch((requestError) => setError(requestError.message));
  }, [loadBaseData, loadSearchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSearchData().catch((requestError) => setError(requestError.message));
    }, 250);

    return () => clearTimeout(timer);
  }, [journeyFilters, resaleFilters, loadSearchData]);

  useEffect(() => {
    sessionStorage.setItem('ts_public_journey_filters', JSON.stringify(journeyFilters));
  }, [journeyFilters]);

  useEffect(() => {
    sessionStorage.setItem('ts_public_resale_filters', JSON.stringify(resaleFilters));
  }, [resaleFilters]);

  useEffect(() => {
    const pending = sessionStorage.getItem('ts_pending_action');
    if (!pending) return;
    sessionStorage.removeItem('ts_pending_action');
    setMessage('Search details restored from guest mode. Continue and confirm your booking or purchase.');
  }, []);

  useEffect(() => {
    if (!message) return;
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type: 'success', message }]);
    setMessage('');
  }, [message]);

  useEffect(() => {
    if (!error) return;
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, type: 'error', message: error }]);
    setError('');
  }, [error]);

  const withAction = async (key, action, successMessage, options = {}) => {
    setBusyKey(key);
    setError('');
    setMessage('');

    try {
      await action();
      await Promise.all([loadBaseData(), loadSearchData()]);
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

  const setActiveTab = (tabId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    setSearchParams(next, { replace: true });
  };

  const renderTabContent = () => {
    if (activeTab === 'summary') return <UserSummaryCards summary={dashboard} />;
    if (activeTab === 'upcoming') return <UpcomingJourneysPanel tickets={tickets} />;
    if (activeTab === 'resell-market') {
      return (
        <Marketplace
          listings={listings}
          filters={resaleFilters}
          setFilters={setResaleFilters}
          onPurchase={onPurchase}
          busyKey={busyKey}
          userId={user.id}
          locationOptions={locations}
          loading={resaleLoading}
        />
      );
    }
    if (activeTab === 'my-resell') {
      return (
        <MyResellingTickets
          listings={sellerTrail.filter((item) => item.status === 'AVAILABLE')}
          onUpdatePrice={onUpdatePrice}
          onRevoke={onRevoke}
          busyKey={busyKey}
        />
      );
    }
    if (activeTab === 'book-seats') {
      return (
        <JourneyBoard
          journeys={journeys}
          onBook={onBookJourney}
          busyKey={busyKey}
          filters={journeyFilters}
          setFilters={setJourneyFilters}
          onLoadSeatPlan={api.getJourneySeats}
          locationOptions={locations}
          loading={journeyLoading}
        />
      );
    }
    if (activeTab === 'my-tickets') return <MyTicketsPanel tickets={tickets} />;
    if (activeTab === 'sell-ticket') return <ListingForm onCreate={onCreateListing} busy={busyKey === 'create'} tickets={tickets} />;
    if (activeTab === 'seller-trail') return <SellerTrail listings={sellerTrail} />;
    if (activeTab === 'purchases') return <PurchaseHistory tickets={purchases} />;
    if (activeTab === 'alerts') {
      return (
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
      );
    }
    if (activeTab === 'sessions') {
      return (
        <SessionPanel
          sessions={sessions}
          onRevoke={onRevokeSession}
          busySessionId={busyKey.startsWith('session-') ? busyKey.replace('session-', '') : ''}
        />
      );
    }
    return <UserSummaryCards summary={dashboard} />;
  };

  return (
    <div className="app-shell">
      <DashboardNavbar
        portalLabel="TravelSwap User Portal"
        title="Buy and Sell from One Dashboard"
        subtitle="Track your profits/losses, sold trail, purchases, and upcoming trips."
        user={user}
        onLogout={onLogout}
        showQuickNav
        onOpenBookings={() => setActiveTab('book-seats')}
        onOpenHelp={() => setActiveTab('alerts')}
      />

      <div className="user-tabs" role="tablist" aria-label="User dashboard sections">
        {USER_TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`user-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="tab-content-shell">
        <section className="tab-content-panel">
          {renderTabContent()}
        </section>
      </main>

      <SellerPopup notification={popupNotification} onClose={onClosePopup} />
      <ToastNotifications toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))} />
    </div>
  );
}
