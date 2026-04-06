import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import SessionPanel from '../components/SessionPanel';
import DashboardNavbar from '../components/DashboardNavbar';
import { TRAVEL_LOCATIONS } from '../constants/locations';

function dateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dateTimeView(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function clearInvalid(form, errors) {
  const next = { ...form };
  Object.keys(errors).forEach((field) => {
    if (field !== '_form') next[field] = '';
  });
  return next;
}

function parseSeatInput(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseJourneyPoints(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [point, date, time] = item.split('|').map((part) => (part || '').trim());
      return { point, date, time };
    })
    .filter((item) => item.point && item.date && item.time);
}

function routePointText(points) {
  return (points || []).map((item) => (typeof item === 'string' ? item : `${item.point} (${item.date} ${item.time})`)).join(', ');
}

function routePointInput(points) {
  return (points || []).map((item) => (typeof item === 'string' ? item : `${item.point}|${item.date}|${item.time}`)).join(', ');
}

export default function TravelDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [travels, setTravels] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [travelOverview, setTravelOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [busForm, setBusForm] = useState({
    travelId: '',
    busNumber: '',
    busType: '',
    seatLabels: '',
    windowSeatLabels: '',
    driverName: '',
    driverPhone: '',
    conductorName: '',
    conductorPhone: '',
    amenities: ''
  });
  const [busErrors, setBusErrors] = useState({});
  const [busEditForms, setBusEditForms] = useState({});

  const [journeyForm, setJourneyForm] = useState({
    travelId: '',
    busId: '',
    routeFrom: '',
    routeTo: '',
    pickupPoints: '',
    droppingPoints: '',
    preferredDeck: 'BOTH',
    departureTime: '',
    baseFare: ''
  });
  const [journeyErrors, setJourneyErrors] = useState({});

  const [editForms, setEditForms] = useState({});

  const refresh = useCallback(async () => {
    const [travelData, journeyData, overviewData, sessionData, locationData] = await Promise.all([
      api.getMyTravels(),
      api.getTravelJourneys(),
      api.getTravelOverview(),
      api.sessions(),
      api.getJourneyLocations()
    ]);
    setTravels(travelData);
    setJourneys(journeyData);
    setTravelOverview(overviewData);
    setSessions(sessionData);
    setLocations(locationData || []);

    if (!busForm.travelId && travelData.length > 0) {
      setBusForm((prev) => ({ ...prev, travelId: String(travelData[0].id) }));
    }
    if (!journeyForm.travelId && travelData.length > 0) {
      setJourneyForm((prev) => ({ ...prev, travelId: String(travelData[0].id), busId: '' }));
    }
  }, [busForm.travelId, journeyForm.travelId]);

  useEffect(() => {
    refresh().catch((requestError) => setError(requestError.message));
  }, [refresh]);

  const withAction = async (key, action, successMessage, options = {}) => {
    setBusyKey(key);
    setError('');
    setMessage('');
    try {
      await action();
      await refresh();
      setMessage(successMessage);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      if (options.rethrow) throw requestError;
      return false;
    } finally {
      setBusyKey('');
    }
  };

  const selectedTravelBuses = useMemo(() => {
    const travel = travels.find((item) => String(item.id) === journeyForm.travelId);
    return travel?.buses || [];
  }, [travels, journeyForm.travelId]);
  const routeOptions = useMemo(
    () => Array.from(new Set([...TRAVEL_LOCATIONS, ...locations].map((value) => (value || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [locations]
  );
  const createFromOptions = useMemo(
    () => routeOptions.filter((location) => location !== journeyForm.routeTo),
    [routeOptions, journeyForm.routeTo]
  );
  const createToOptions = useMemo(
    () => routeOptions.filter((location) => location !== journeyForm.routeFrom),
    [routeOptions, journeyForm.routeFrom]
  );

  const bookedSeatsByBus = useMemo(() => {
    const totals = {};
    journeys.forEach((journey) => {
      totals[journey.busId] = (totals[journey.busId] || 0) + Number(journey.bookedSeats || 0);
    });
    return totals;
  }, [journeys]);

  const validateBus = () => {
    const nextErrors = {};
    if (!busForm.travelId) nextErrors.travelId = 'Select travel.';
    if (!busForm.busNumber || busForm.busNumber.trim().length < 3) nextErrors.busNumber = 'Bus number must be at least 3 characters.';
    if (!busForm.busType || busForm.busType.trim().length < 3) nextErrors.busType = 'Bus type must be at least 3 characters.';
    const seatLabels = parseSeatInput(busForm.seatLabels);
    if (seatLabels.length < 10) nextErrors.seatLabels = 'Add at least 10 seat labels.';
    if (!busForm.driverName.trim()) nextErrors.driverName = 'Driver name is required.';
    if (!busForm.driverPhone.trim()) nextErrors.driverPhone = 'Driver phone is required.';
    if (!busForm.conductorName.trim()) nextErrors.conductorName = 'Conductor name is required.';
    if (!busForm.conductorPhone.trim()) nextErrors.conductorPhone = 'Conductor phone is required.';
    if (!busForm.amenities || busForm.amenities.trim().length < 3) nextErrors.amenities = 'Amenities must be at least 3 characters.';
    const windowSeats = parseSeatInput(busForm.windowSeatLabels);
    if (windowSeats.some((seat) => !seatLabels.map((value) => value.toUpperCase()).includes(seat.toUpperCase()))) {
      nextErrors.windowSeatLabels = 'Window seats must be part of seat labels.';
    }
    return nextErrors;
  };

  const validateJourney = () => {
    const nextErrors = {};
    if (!journeyForm.travelId) nextErrors.travelId = 'Select travel.';
    if (!journeyForm.busId) nextErrors.busId = 'Select bus.';
    if (!journeyForm.routeFrom.trim()) nextErrors.routeFrom = 'From city is required.';
    if (!journeyForm.routeTo.trim()) nextErrors.routeTo = 'To city is required.';
    if (journeyForm.routeFrom.trim() && journeyForm.routeTo.trim() && journeyForm.routeFrom.trim().toLowerCase() === journeyForm.routeTo.trim().toLowerCase()) {
      nextErrors.routeTo = 'From and To cannot be same.';
    }
    if (parseJourneyPoints(journeyForm.pickupPoints).length === 0) nextErrors.pickupPoints = 'Add pickup points as Point|YYYY-MM-DD|HH:mm.';
    if (parseJourneyPoints(journeyForm.droppingPoints).length === 0) nextErrors.droppingPoints = 'Add dropping points as Point|YYYY-MM-DD|HH:mm.';
    if (!['LOWER', 'UPPER', 'BOTH'].includes(journeyForm.preferredDeck)) nextErrors.preferredDeck = 'Choose lower, upper, or both.';
    if (!journeyForm.departureTime) nextErrors.departureTime = 'Departure time is required.';
    if (!Number(journeyForm.baseFare) || Number(journeyForm.baseFare) < 1) nextErrors.baseFare = 'Base fare must be at least 1.';
    return nextErrors;
  };

  const submitBus = async (event) => {
    event.preventDefault();
    const errors = validateBus();
    if (Object.keys(errors).length > 0) {
      setBusErrors(errors);
      setBusForm((current) => clearInvalid(current, errors));
      return;
    }
    setBusErrors({});
    try {
      await withAction('bus-create', () => api.createBus(Number(busForm.travelId), {
        busNumber: busForm.busNumber.trim(),
        busType: busForm.busType.trim(),
        seatLabels: parseSeatInput(busForm.seatLabels),
        windowSeatLabels: parseSeatInput(busForm.windowSeatLabels),
        driverName: busForm.driverName.trim(),
        driverPhone: busForm.driverPhone.trim(),
        conductorName: busForm.conductorName.trim(),
        conductorPhone: busForm.conductorPhone.trim(),
        amenities: busForm.amenities.trim()
      }), 'Bus added successfully.', { rethrow: true });
      setBusForm((prev) => ({ ...prev, busNumber: '', busType: '', seatLabels: '', windowSeatLabels: '', driverName: '', driverPhone: '', conductorName: '', conductorPhone: '', amenities: '' }));
    } catch (requestError) {
      const nextErrors = { busNumber: requestError.message };
      setBusErrors(nextErrors);
      setBusForm((current) => clearInvalid(current, nextErrors));
    }
  };

  const startBusEdit = (travelId, bus) => {
    setBusEditForms((prev) => ({
      ...prev,
      [bus.id]: {
        travelId: String(travelId),
        busNumber: bus.busNumber,
        busType: bus.busType,
        seatLabels: (bus.seatLabels || []).join(', '),
        windowSeatLabels: (bus.windowSeatLabels || []).join(', '),
        driverName: bus.driverName || '',
        driverPhone: bus.driverPhone || '',
        conductorName: bus.conductorName || '',
        conductorPhone: bus.conductorPhone || '',
        amenities: bus.amenities,
        error: ''
      }
    }));
  };

  const saveBusEdit = async (busId) => {
    const form = busEditForms[busId];
    if (!form) {
      return;
    }
    const seatLabels = parseSeatInput(form.seatLabels);
    const windowSeatLabels = parseSeatInput(form.windowSeatLabels);
    if (!form.busNumber.trim() || !form.busType.trim() || seatLabels.length < 10 || !form.driverName.trim() || !form.driverPhone.trim() || !form.conductorName.trim() || !form.conductorPhone.trim() || !form.amenities.trim()) {
      setBusEditForms((prev) => ({
        ...prev,
        [busId]: { ...form, error: 'Bus, crew details, amenities and at least 10 seats are required.' }
      }));
      return;
    }
    if (windowSeatLabels.some((seat) => !seatLabels.map((value) => value.toUpperCase()).includes(seat.toUpperCase()))) {
      setBusEditForms((prev) => ({
        ...prev,
        [busId]: { ...form, error: 'Window seats must be part of seat labels.' }
      }));
      return;
    }

    const saved = await withAction(`bus-edit-${busId}`, () => api.updateBus(Number(form.travelId), busId, {
      busNumber: form.busNumber.trim(),
      busType: form.busType.trim(),
      seatLabels,
      windowSeatLabels,
      driverName: form.driverName.trim(),
      driverPhone: form.driverPhone.trim(),
      conductorName: form.conductorName.trim(),
      conductorPhone: form.conductorPhone.trim(),
      amenities: form.amenities.trim()
    }), `Bus ${busId} updated.`);

    if (!saved) {
      setBusEditForms((prev) => ({
        ...prev,
        [busId]: { ...form, error: 'Unable to save bus. Bus can be edited only when there are no journeys on it.' }
      }));
      return;
    }

    setBusEditForms((prev) => {
      const next = { ...prev };
      delete next[busId];
      return next;
    });
  };

  const submitJourney = async (event) => {
    event.preventDefault();
    const errors = validateJourney();
    if (Object.keys(errors).length > 0) {
      setJourneyErrors(errors);
      setJourneyForm((current) => clearInvalid(current, errors));
      return;
    }
    setJourneyErrors({});
    try {
      await withAction('journey-create', () => api.createJourney({
        travelId: Number(journeyForm.travelId),
        busId: Number(journeyForm.busId),
        routeFrom: journeyForm.routeFrom.trim(),
        routeTo: journeyForm.routeTo.trim(),
        pickupPoints: parseJourneyPoints(journeyForm.pickupPoints),
        droppingPoints: parseJourneyPoints(journeyForm.droppingPoints),
        preferredDeck: journeyForm.preferredDeck,
        departureTime: journeyForm.departureTime,
        baseFare: Number(journeyForm.baseFare)
      }), 'Journey schedule created.', { rethrow: true });
      setJourneyForm((prev) => ({
        ...prev,
        busId: '',
        routeFrom: '',
        routeTo: '',
        pickupPoints: '',
        droppingPoints: '',
        preferredDeck: 'BOTH',
        departureTime: '',
        baseFare: ''
      }));
    } catch (requestError) {
      const nextErrors = { _form: requestError.message };
      setJourneyErrors(nextErrors);
      setJourneyForm((current) => clearInvalid(current, nextErrors));
    }
  };

  const startEdit = (journey) => {
    setEditForms((prev) => ({
      ...prev,
      [journey.id]: {
        routeFrom: journey.routeFrom,
        routeTo: journey.routeTo,
        pickupPoints: routePointInput(journey.pickupPoints),
        droppingPoints: routePointInput(journey.droppingPoints),
        preferredDeck: journey.preferredDeck || 'BOTH',
        departureTime: dateTimeInput(journey.departureTime),
        baseFare: String(journey.baseFare),
        error: ''
      }
    }));
  };

  const saveEdit = async (journeyId) => {
    const form = editForms[journeyId];
    if (!form) return;
    if (!form.routeFrom.trim()
      || !form.routeTo.trim()
      || parseJourneyPoints(form.pickupPoints).length === 0
      || parseJourneyPoints(form.droppingPoints).length === 0
      || !form.departureTime
      || !Number(form.baseFare)) {
      setEditForms((prev) => ({
        ...prev,
        [journeyId]: { ...form, error: 'All journey fields are required.' }
      }));
      return;
    }
    if (form.routeFrom.trim().toLowerCase() === form.routeTo.trim().toLowerCase()) {
      setEditForms((prev) => ({
        ...prev,
        [journeyId]: { ...form, error: 'From and To cannot be same.' }
      }));
      return;
    }

    await withAction(`journey-edit-${journeyId}`, () => api.updateJourney(journeyId, {
      routeFrom: form.routeFrom.trim(),
      routeTo: form.routeTo.trim(),
      pickupPoints: parseJourneyPoints(form.pickupPoints),
      droppingPoints: parseJourneyPoints(form.droppingPoints),
      preferredDeck: form.preferredDeck,
      departureTime: form.departureTime,
      baseFare: Number(form.baseFare)
    }), `Journey ${journeyId} updated.`);

    setEditForms((prev) => {
      const next = { ...prev };
      delete next[journeyId];
      return next;
    });
  };

  const onRevokeSession = (sessionId) =>
    withAction(`session-${sessionId}`, () => api.revokeSession(sessionId), 'Session revoked.');

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/travel/login');
    }
  };

  return (
    <div className="app-shell">
      <DashboardNavbar
        portalLabel="TravelSwap Travel Portal"
        title="Journey Operations Dashboard"
        subtitle={
          travelOverview
            ? `Manage buses and journeys. Commission Received: INR ${Number(travelOverview.commissionReceived || 0).toFixed(2)} | Generated: INR ${Number(travelOverview.commissionGenerated || 0).toFixed(2)} | Booked Seats: ${travelOverview.totalBookedSeats || 0}`
            : 'Manage buses and journey schedules for your travel.'
        }
        user={user}
        onLogout={onLogout}
      />

      {(message || error) && (
        <div className={error ? 'banner error' : 'banner success'}>{error || message}</div>
      )}

      <main className="layout">
        <section className="left-col">
          <section className="panel">
            <div className="panel-head">
              <h2>My Travels</h2>
              <span>Travel profiles linked to your account</span>
            </div>
            <ul className="notifications">
              {travels.length === 0 && <li>No travel profile found.</li>}
              {travels.map((travel) => (
                <li key={travel.id}>
                  <p><strong>{travel.name}</strong> ({travel.code})</p>
                  <small>Contact: {travel.contactNumber}</small>
                  <small>Buses: {(travel.buses || []).length}</small>
                  {(travel.buses || []).map((bus) => {
                    const edit = busEditForms[bus.id];
                    return (
                      <div key={bus.id} className="bus-edit-card">
                        <small>{bus.busNumber} ({bus.busType}, {bus.seatCapacity} seats)</small>
                        <small>Window: {(bus.windowSeatLabels || []).join(', ') || '-'}</small>
                        <small>Booked Seats: {bookedSeatsByBus[bus.id] || 0}</small>
                        {!edit && (
                          <button type="button" className="subtle-button" onClick={() => startBusEdit(travel.id, bus)}>
                            Edit Bus
                          </button>
                        )}
                        {edit && (
                          <div className="form-grid">
                            <label>Bus Number<input value={edit.busNumber} onChange={(event) => setBusEditForms((prev) => ({ ...prev, [bus.id]: { ...edit, busNumber: event.target.value } }))} /></label>
                            <label>Bus Type<input value={edit.busType} onChange={(event) => setBusEditForms((prev) => ({ ...prev, [bus.id]: { ...edit, busType: event.target.value } }))} /></label>
                            <label>Seat Labels<input placeholder="A1, A2, B1, B2..." value={edit.seatLabels} onChange={(event) => setBusEditForms((prev) => ({ ...prev, [bus.id]: { ...edit, seatLabels: event.target.value } }))} /></label>
                            <label>Window Seats<input placeholder="A1, B2, C1..." value={edit.windowSeatLabels} onChange={(event) => setBusEditForms((prev) => ({ ...prev, [bus.id]: { ...edit, windowSeatLabels: event.target.value } }))} /></label>
                            <label>Driver Name<input value={edit.driverName} onChange={(event) => setBusEditForms((prev) => ({ ...prev, [bus.id]: { ...edit, driverName: event.target.value } }))} /></label>
                            <label>Driver Phone<input value={edit.driverPhone} onChange={(event) => setBusEditForms((prev) => ({ ...prev, [bus.id]: { ...edit, driverPhone: event.target.value } }))} /></label>
                            <label>Conductor Name<input value={edit.conductorName} onChange={(event) => setBusEditForms((prev) => ({ ...prev, [bus.id]: { ...edit, conductorName: event.target.value } }))} /></label>
                            <label>Conductor Phone<input value={edit.conductorPhone} onChange={(event) => setBusEditForms((prev) => ({ ...prev, [bus.id]: { ...edit, conductorPhone: event.target.value } }))} /></label>
                            <label>Amenities<input value={edit.amenities} onChange={(event) => setBusEditForms((prev) => ({ ...prev, [bus.id]: { ...edit, amenities: event.target.value } }))} /></label>
                            {edit.error && <small className="field-error">{edit.error}</small>}
                            <div className="popup-actions">
                              <button type="button" className="subtle-button" onClick={() => setBusEditForms((prev) => {
                                const next = { ...prev };
                                delete next[bus.id];
                                return next;
                              })}>
                                Cancel
                              </button>
                              <button type="button" onClick={() => saveBusEdit(bus.id)} disabled={busyKey === `bus-edit-${bus.id}`}>
                                {busyKey === `bus-edit-${bus.id}` ? 'Saving...' : 'Save Bus'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Add Bus</h2>
              <span>Only TRAVEL accounts can manage buses</span>
            </div>
            <form className="form-grid" onSubmit={submitBus}>
              <label>
                Travel
                <select value={busForm.travelId} onChange={(event) => setBusForm((prev) => ({ ...prev, travelId: event.target.value }))}>
                  <option value="">Select travel</option>
                  {travels.map((travel) => (
                    <option key={travel.id} value={travel.id}>{travel.name} ({travel.code})</option>
                  ))}
                </select>
                {busErrors.travelId && <small className="field-error">{busErrors.travelId}</small>}
              </label>
              <label>
                Bus Number
                <input value={busForm.busNumber} onChange={(event) => setBusForm((prev) => ({ ...prev, busNumber: event.target.value }))} />
                {busErrors.busNumber && <small className="field-error">{busErrors.busNumber}</small>}
              </label>
              <label>
                Bus Type
                <input value={busForm.busType} onChange={(event) => setBusForm((prev) => ({ ...prev, busType: event.target.value }))} />
                {busErrors.busType && <small className="field-error">{busErrors.busType}</small>}
              </label>
              <label>
                Seat Labels
                <input
                  placeholder="A1, A2, B1, B2..."
                  value={busForm.seatLabels}
                  onChange={(event) => setBusForm((prev) => ({ ...prev, seatLabels: event.target.value }))}
                />
                {busErrors.seatLabels && <small className="field-error">{busErrors.seatLabels}</small>}
              </label>
              <label>
                Window Seat Labels
                <input
                  placeholder="A1, B2, C1..."
                  value={busForm.windowSeatLabels}
                  onChange={(event) => setBusForm((prev) => ({ ...prev, windowSeatLabels: event.target.value }))}
                />
                {busErrors.windowSeatLabels && <small className="field-error">{busErrors.windowSeatLabels}</small>}
              </label>
              <label>
                Driver Name
                <input value={busForm.driverName} onChange={(event) => setBusForm((prev) => ({ ...prev, driverName: event.target.value }))} />
                {busErrors.driverName && <small className="field-error">{busErrors.driverName}</small>}
              </label>
              <label>
                Driver Phone
                <input value={busForm.driverPhone} onChange={(event) => setBusForm((prev) => ({ ...prev, driverPhone: event.target.value }))} />
                {busErrors.driverPhone && <small className="field-error">{busErrors.driverPhone}</small>}
              </label>
              <label>
                Conductor Name
                <input value={busForm.conductorName} onChange={(event) => setBusForm((prev) => ({ ...prev, conductorName: event.target.value }))} />
                {busErrors.conductorName && <small className="field-error">{busErrors.conductorName}</small>}
              </label>
              <label>
                Conductor Phone
                <input value={busForm.conductorPhone} onChange={(event) => setBusForm((prev) => ({ ...prev, conductorPhone: event.target.value }))} />
                {busErrors.conductorPhone && <small className="field-error">{busErrors.conductorPhone}</small>}
              </label>
              <label>
                Amenities
                <input value={busForm.amenities} onChange={(event) => setBusForm((prev) => ({ ...prev, amenities: event.target.value }))} />
                {busErrors.amenities && <small className="field-error">{busErrors.amenities}</small>}
              </label>
              {busErrors._form && <small className="field-error">{busErrors._form}</small>}
              <button type="submit" disabled={busyKey === 'bus-create'}>{busyKey === 'bus-create' ? 'Adding...' : 'Add Bus'}</button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Create Journey</h2>
              <span>Publish primary journey schedules</span>
            </div>
            <form className="form-grid" onSubmit={submitJourney}>
              <label>
                Travel
                <select
                  value={journeyForm.travelId}
                  onChange={(event) => setJourneyForm((prev) => ({ ...prev, travelId: event.target.value, busId: '' }))}
                >
                  <option value="">Select travel</option>
                  {travels.map((travel) => (
                    <option key={travel.id} value={travel.id}>{travel.name} ({travel.code})</option>
                  ))}
                </select>
                {journeyErrors.travelId && <small className="field-error">{journeyErrors.travelId}</small>}
              </label>
              <label>
                Bus
                <select value={journeyForm.busId} onChange={(event) => setJourneyForm((prev) => ({ ...prev, busId: event.target.value }))}>
                  <option value="">Select bus</option>
                  {selectedTravelBuses.map((bus) => (
                    <option key={bus.id} value={bus.id}>{bus.busNumber} ({bus.busType})</option>
                  ))}
                </select>
                {journeyErrors.busId && <small className="field-error">{journeyErrors.busId}</small>}
              </label>
              <label>
                From
                <input list="route-location-options-from-create" value={journeyForm.routeFrom} onChange={(event) => setJourneyForm((prev) => ({ ...prev, routeFrom: event.target.value, routeTo: prev.routeTo === event.target.value ? '' : prev.routeTo }))} />
                {journeyErrors.routeFrom && <small className="field-error">{journeyErrors.routeFrom}</small>}
              </label>
              <label>
                To
                <input list="route-location-options-to-create" value={journeyForm.routeTo} onChange={(event) => setJourneyForm((prev) => ({ ...prev, routeTo: event.target.value, routeFrom: prev.routeFrom === event.target.value ? '' : prev.routeFrom }))} />
                {journeyErrors.routeTo && <small className="field-error">{journeyErrors.routeTo}</small>}
              </label>
              <label>
                Pickup Points
                <input
                  placeholder="Majestic|2026-04-10|18:00, Silk Board|2026-04-10|18:20"
                  value={journeyForm.pickupPoints}
                  onChange={(event) => setJourneyForm((prev) => ({ ...prev, pickupPoints: event.target.value }))}
                />
                {journeyErrors.pickupPoints && <small className="field-error">{journeyErrors.pickupPoints}</small>}
              </label>
              <label>
                Dropping Points
                <input
                  placeholder="Koyambedu|2026-04-10|22:30, Guindy|2026-04-10|22:50"
                  value={journeyForm.droppingPoints}
                  onChange={(event) => setJourneyForm((prev) => ({ ...prev, droppingPoints: event.target.value }))}
                />
                {journeyErrors.droppingPoints && <small className="field-error">{journeyErrors.droppingPoints}</small>}
              </label>
              <label>
                Preferred Deck
                <select value={journeyForm.preferredDeck} onChange={(event) => setJourneyForm((prev) => ({ ...prev, preferredDeck: event.target.value }))}>
                  <option value="BOTH">Both Decks</option>
                  <option value="LOWER">Lower Deck</option>
                  <option value="UPPER">Upper Deck</option>
                </select>
                {journeyErrors.preferredDeck && <small className="field-error">{journeyErrors.preferredDeck}</small>}
              </label>
              <label>
                Departure
                <input type="datetime-local" value={journeyForm.departureTime} onChange={(event) => setJourneyForm((prev) => ({ ...prev, departureTime: event.target.value }))} />
                {journeyErrors.departureTime && <small className="field-error">{journeyErrors.departureTime}</small>}
              </label>
              <label>
                Base Fare
                <input type="number" min="1" step="0.01" value={journeyForm.baseFare} onChange={(event) => setJourneyForm((prev) => ({ ...prev, baseFare: event.target.value }))} />
                {journeyErrors.baseFare && <small className="field-error">{journeyErrors.baseFare}</small>}
              </label>
              {journeyErrors._form && <small className="field-error">{journeyErrors._form}</small>}
              <button type="submit" disabled={busyKey === 'journey-create'}>{busyKey === 'journey-create' ? 'Creating...' : 'Create Journey'}</button>
            </form>
            <datalist id="route-location-options-from-create">
              {createFromOptions.map((location) => (
                <option key={`travel-route-from-${location}`} value={location} />
              ))}
            </datalist>
            <datalist id="route-location-options-to-create">
              {createToOptions.map((location) => (
                <option key={`travel-route-${location}`} value={location} />
              ))}
            </datalist>
          </section>
        </section>

        <section className="right-col">
          <section className="panel">
            <div className="panel-head">
              <h2>Journey Details</h2>
              <span>Update route, departure, fare, and seats</span>
            </div>
            <ul className="notifications">
              {journeys.length === 0 && <li>No journeys created yet.</li>}
              {journeys.map((journey) => {
                const edit = editForms[journey.id];
                return (
                  <li key={journey.id}>
                    <p><strong>{journey.routeFrom} to {journey.routeTo}</strong> ({journey.travelName})</p>
                    <small>{journey.busNumber} | {dateTimeView(journey.departureTime)} | Fare {journey.baseFare}</small>
                    <small>Preferred Deck: {journey.preferredDeck || 'BOTH'}</small>
                    <small>Seats Booked: {journey.bookedSeats || 0} | Seats Left: {journey.availableSeats}</small>
                    <small>Pickup: {routePointText(journey.pickupPoints) || '-'}</small>
                    <small>Dropping: {routePointText(journey.droppingPoints) || '-'}</small>
                    {!edit && (
                      <button type="button" className="subtle-button" onClick={() => startEdit(journey)}>Edit Journey</button>
                    )}
                    {edit && (
                      <div className="form-grid">
                        <label>From<input list={`route-location-options-from-${journey.id}`} value={edit.routeFrom} onChange={(event) => setEditForms((prev) => ({ ...prev, [journey.id]: { ...edit, routeFrom: event.target.value, routeTo: edit.routeTo === event.target.value ? '' : edit.routeTo } }))} /></label>
                        <label>To<input list={`route-location-options-to-${journey.id}`} value={edit.routeTo} onChange={(event) => setEditForms((prev) => ({ ...prev, [journey.id]: { ...edit, routeTo: event.target.value, routeFrom: edit.routeFrom === event.target.value ? '' : edit.routeFrom } }))} /></label>
                        <datalist id={`route-location-options-from-${journey.id}`}>
                          {routeOptions.filter((location) => location !== edit.routeTo).map((location) => (
                            <option key={`edit-from-${journey.id}-${location}`} value={location} />
                          ))}
                        </datalist>
                        <datalist id={`route-location-options-to-${journey.id}`}>
                          {routeOptions.filter((location) => location !== edit.routeFrom).map((location) => (
                            <option key={`edit-to-${journey.id}-${location}`} value={location} />
                          ))}
                        </datalist>
                        <label>Pickup<input value={edit.pickupPoints} onChange={(event) => setEditForms((prev) => ({ ...prev, [journey.id]: { ...edit, pickupPoints: event.target.value } }))} /></label>
                        <label>Dropping<input value={edit.droppingPoints} onChange={(event) => setEditForms((prev) => ({ ...prev, [journey.id]: { ...edit, droppingPoints: event.target.value } }))} /></label>
                        <label>
                          Preferred Deck
                          <select value={edit.preferredDeck} onChange={(event) => setEditForms((prev) => ({ ...prev, [journey.id]: { ...edit, preferredDeck: event.target.value } }))}>
                            <option value="BOTH">Both Decks</option>
                            <option value="LOWER">Lower Deck</option>
                            <option value="UPPER">Upper Deck</option>
                          </select>
                        </label>
                        <label>Departure<input type="datetime-local" value={edit.departureTime} onChange={(event) => setEditForms((prev) => ({ ...prev, [journey.id]: { ...edit, departureTime: event.target.value } }))} /></label>
                        <label>Fare<input type="number" min="1" step="0.01" value={edit.baseFare} onChange={(event) => setEditForms((prev) => ({ ...prev, [journey.id]: { ...edit, baseFare: event.target.value } }))} /></label>
                        {edit.error && <small className="field-error">{edit.error}</small>}
                        <button
                          type="button"
                          disabled={busyKey === `journey-edit-${journey.id}`}
                          onClick={() => saveEdit(journey.id)}
                        >
                          {busyKey === `journey-edit-${journey.id}` ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <SessionPanel
            sessions={sessions}
            onRevoke={onRevokeSession}
            busySessionId={busyKey.startsWith('session-') ? busyKey.replace('session-', '') : ''}
          />
        </section>
      </main>
    </div>
  );
}
