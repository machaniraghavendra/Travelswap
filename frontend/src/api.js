import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './authStorage';

const API_BASE = 'https://travelswap.onrender.com/api';
let refreshInFlight = null;

async function parseError(response) {
  const error = await response.json().catch(() => ({}));
  return error.message || `Request failed with status ${response.status}`;
}

async function refreshAccessToken() {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('Session expired. Please sign in again.');
  }

  refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const payload = await response.json();
      setTokens(payload.accessToken, payload.refreshToken);
      return payload.accessToken;
    })
    .catch((error) => {
      clearTokens();
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

async function request(path, options = {}, config = { auth: true, retry: true }) {
  const headers = { ...(options.headers || {}) };
  if (!headers['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (config.auth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401 && config.auth && config.retry && getRefreshToken()) {
    await refreshAccessToken();
    return request(path, options, { auth: config.auth, retry: false });
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function authRequest(path, body) {
  return request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  }, { auth: false, retry: false });
}

export const api = {
  baseUrl: API_BASE,

  register: (payload) => authRequest('/auth/register', payload),
  login: (payload) => authRequest('/auth/login', payload),
  forgotPassword: (payload) => authRequest('/auth/forgot-password', payload),
  resetPassword: (payload) => request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  }, { auth: false, retry: false }),
  me: () => request('/auth/me'),
  sessions: () => request('/auth/sessions'),
  revokeSession: (sessionId) => request(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),

  logout: async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return;
    }

    try {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        headers: { 'Content-Type': 'application/json' }
      }, { auth: false, retry: false });
    } finally {
      clearTokens();
    }
  },

  getSummary: () => request('/summary'),
  getListings: (query = '') => request(`/listings${query}`),
  createListing: (body) => request('/listings', { method: 'POST', body: JSON.stringify(body) }),
  purchaseListing: (id, body) => request(`/listings/${id}/purchase`, { method: 'POST', body: JSON.stringify(body) }),
  updatePrice: (id, price) => request(`/listings/${id}/price`, { method: 'PATCH', body: JSON.stringify({ resalePrice: price }) }),
  revokeListing: (id) => request(`/listings/${id}`, { method: 'DELETE' }),
  getJourneys: (query = '') => request(`/journeys${query}`),
  getJourneyLocations: () => request('/journeys/locations'),
  getJourneySeats: (journeyId) => request(`/journeys/${journeyId}/seats`),
  bookJourneySeat: (journeyId, body = {}) => request(`/journeys/${journeyId}/book`, { method: 'POST', body: JSON.stringify(body) }),

  getMyDashboard: () => request('/users/me/dashboard'),
  getMyListings: () => request('/users/me/listings'),
  getMyPurchases: () => request('/users/me/purchases'),
  getMyTickets: () => request('/users/me/tickets'),
  getMyNotifications: (unreadOnly = false, limit = 30) => request(`/users/me/notifications?unreadOnly=${unreadOnly}&limit=${limit}`),
  markMyNotificationRead: (id) => request(`/users/me/notifications/${id}/read`, { method: 'PATCH' }),
  getMyTravels: () => request('/travels'),
  getTravelBuses: (travelId) => request(`/travels/${travelId}/buses`),
  createBus: (travelId, body) => request(`/travels/${travelId}/buses`, { method: 'POST', body: JSON.stringify(body) }),
  updateBus: (travelId, busId, body) => request(`/travels/${travelId}/buses/${busId}`, { method: 'PUT', body: JSON.stringify(body) }),
  getTravelJourneys: () => request('/travel/journeys'),
  getTravelOverview: () => request('/travel/journeys/overview'),
  createJourney: (body) => request('/travel/journeys', { method: 'POST', body: JSON.stringify(body) }),
  updateJourney: (journeyId, body) => request(`/travel/journeys/${journeyId}`, { method: 'PUT', body: JSON.stringify(body) }),

  getAdminOverview: () => request('/admin/overview'),
  getSystemNotifications: () => request('/notifications?limit=30'),
  getProviders: () => request('/providers'),
  getAuditLogs: () => request('/audit/logs?limit=40'),
  getAuditLogsChunk: (offset = 0, limit = 20) => request(`/audit/logs/chunk?offset=${offset}&limit=${limit}`),

  createListingStream: (onMessage, onError) => {
    const token = getAccessToken();
    const streamUrl = new URL(`${API_BASE}/stream/listings`);
    if (token) {
      streamUrl.searchParams.set('token', token);
    }

    const eventSource = new EventSource(streamUrl.toString());
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onMessage(payload);
      } catch {
        onMessage(null);
      }
    };
    eventSource.onerror = onError;

    return eventSource;
  }
};
