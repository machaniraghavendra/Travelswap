import { useMemo, useState } from 'react';

const initialState = {
  mode: 'OWNED',
  ticketId: '',
  sourcePlatform: 'REDBUS',
  operatorName: '',
  routeFrom: '',
  routeTo: '',
  departureTime: '',
  seatNumber: '',
  originalPnr: '',
  originalFare: '',
  resalePrice: '',
  sellerContact: ''
};

const crossPlatforms = [
  'REDBUS',
  'ABHIBUS',
  'CONFIRMTICKET',
  'KSRRTC',
  'APSRTC',
  'TNRTC'
];

function clearInvalidFields(previous, errors) {
  const next = { ...previous };
  Object.keys(errors).forEach((field) => {
    if (field !== '_form') {
      next[field] = '';
    }
  });
  return next;
}

function dateTime(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ListingForm({ onCreate, busy, tickets }) {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});

  const saleEligibleTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === 'BOOKED'),
    [tickets]
  );

  const selectedTicket = useMemo(
    () => saleEligibleTickets.find((ticket) => String(ticket.id) === form.ticketId) || null,
    [saleEligibleTickets, form.ticketId]
  );

  const validate = () => {
    const nextErrors = {};
    if (form.mode === 'OWNED' && !form.ticketId) {
      nextErrors.ticketId = 'Select one of your booked tickets.';
    }
    if (form.mode === 'CROSS') {
      if (!form.sourcePlatform) nextErrors.sourcePlatform = 'Source platform is required.';
      if (!form.operatorName.trim()) nextErrors.operatorName = 'Operator name is required.';
      if (!form.routeFrom.trim()) nextErrors.routeFrom = 'From city is required.';
      if (!form.routeTo.trim()) nextErrors.routeTo = 'To city is required.';
      if (!form.departureTime) nextErrors.departureTime = 'Departure time is required.';
      if (!form.seatNumber.trim()) nextErrors.seatNumber = 'Seat number is required.';
      if (!form.originalPnr.trim() || form.originalPnr.trim().length < 6) nextErrors.originalPnr = 'PNR must be at least 6 characters.';
      if (!Number(form.originalFare) || Number(form.originalFare) < 1) nextErrors.originalFare = 'Original fare must be at least 1.';
    }
    if (form.resalePrice && Number(form.resalePrice) < 1) {
      nextErrors.resalePrice = 'Override resale price must be at least 1.';
    }
    return nextErrors;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setForm((current) => clearInvalidFields(current, validationErrors));
      return;
    }

    setErrors({});
    const payload = form.mode === 'OWNED'
      ? {
          ticketId: Number(form.ticketId),
          resalePrice: form.resalePrice ? Number(form.resalePrice) : null,
          sellerContact: form.sellerContact || null
        }
      : {
          ticketId: null,
          sourcePlatform: form.sourcePlatform,
          operatorName: form.operatorName.trim(),
          routeFrom: form.routeFrom.trim(),
          routeTo: form.routeTo.trim(),
          departureTime: form.departureTime,
          seatNumber: form.seatNumber.trim(),
          originalPnr: form.originalPnr.trim(),
          originalFare: Number(form.originalFare),
          resalePrice: form.resalePrice ? Number(form.resalePrice) : null,
          sellerContact: form.sellerContact || null
        };

    try {
      await onCreate(payload);
      setForm(initialState);
    } catch (requestError) {
      const message = requestError?.message || 'Unable to list ticket for resale.';
      const lower = message.toLowerCase();
      let field = '_form';
      if (lower.includes('ticket')) field = 'ticketId';
      if (lower.includes('platform')) field = 'sourcePlatform';
      if (lower.includes('operator')) field = 'operatorName';
      if (lower.includes('from')) field = 'routeFrom';
      if (lower.includes('to city') || lower.includes('destination') || lower.includes('route to')) field = 'routeTo';
      if (lower.includes('departure')) field = 'departureTime';
      if (lower.includes('seat')) field = 'seatNumber';
      if (lower.includes('pnr')) field = 'originalPnr';
      if (lower.includes('fare')) field = 'originalFare';
      if (lower.includes('price')) field = 'resalePrice';
      const nextErrors = { [field]: message };
      setErrors(nextErrors);
      setForm((current) => clearInvalidFields(current, nextErrors));
    }
  };

  return (
    <form className="panel listing-form" onSubmit={onSubmit}>
      <div className="panel-head">
        <h2>Sell My Ticket</h2>
        <span>Sell owned tickets or cross-platform purchases</span>
      </div>

      <div className="form-grid">
        <label>
          Sell Type
          <select
            name="mode"
            value={form.mode}
            onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value }))}
          >
            <option value="OWNED">From My Booked Ticket</option>
            <option value="CROSS">Cross-Platform Ticket</option>
          </select>
        </label>

        {form.mode === 'OWNED' && (
          <label>
            My Booked Ticket
            <select
              name="ticketId"
              value={form.ticketId}
              onChange={(event) => setForm((prev) => ({ ...prev, ticketId: event.target.value }))}
            >
              <option value="">Select ticket</option>
              {saleEligibleTickets.map((ticket) => (
                <option key={ticket.id} value={ticket.id}>
                  {ticket.routeFrom} to {ticket.routeTo} | Seat {ticket.seatNumber} | {dateTime(ticket.departureTime)}
                </option>
              ))}
            </select>
            {errors.ticketId && <small className="field-error">{errors.ticketId}</small>}
          </label>
        )}

        {form.mode === 'CROSS' && (
          <>
            <label>
              Source Platform
              <select
                name="sourcePlatform"
                value={form.sourcePlatform}
                onChange={(event) => setForm((prev) => ({ ...prev, sourcePlatform: event.target.value }))}
              >
                {crossPlatforms.map((platform) => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
              {errors.sourcePlatform && <small className="field-error">{errors.sourcePlatform}</small>}
            </label>
            <label>
              Operator Name
              <input
                name="operatorName"
                value={form.operatorName}
                onChange={(event) => setForm((prev) => ({ ...prev, operatorName: event.target.value }))}
              />
              {errors.operatorName && <small className="field-error">{errors.operatorName}</small>}
            </label>
            <label>
              From
              <input
                name="routeFrom"
                value={form.routeFrom}
                onChange={(event) => setForm((prev) => ({ ...prev, routeFrom: event.target.value }))}
              />
              {errors.routeFrom && <small className="field-error">{errors.routeFrom}</small>}
            </label>
            <label>
              To
              <input
                name="routeTo"
                value={form.routeTo}
                onChange={(event) => setForm((prev) => ({ ...prev, routeTo: event.target.value }))}
              />
              {errors.routeTo && <small className="field-error">{errors.routeTo}</small>}
            </label>
            <label>
              Departure Time
              <input
                type="datetime-local"
                name="departureTime"
                value={form.departureTime}
                onChange={(event) => setForm((prev) => ({ ...prev, departureTime: event.target.value }))}
              />
              {errors.departureTime && <small className="field-error">{errors.departureTime}</small>}
            </label>
            <label>
              Seat Number
              <input
                name="seatNumber"
                value={form.seatNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, seatNumber: event.target.value }))}
              />
              {errors.seatNumber && <small className="field-error">{errors.seatNumber}</small>}
            </label>
            <label>
              Original PNR
              <input
                name="originalPnr"
                value={form.originalPnr}
                onChange={(event) => setForm((prev) => ({ ...prev, originalPnr: event.target.value.toUpperCase() }))}
              />
              {errors.originalPnr && <small className="field-error">{errors.originalPnr}</small>}
            </label>
            <label>
              Original Fare (INR)
              <input
                type="number"
                min="1"
                step="0.01"
                name="originalFare"
                value={form.originalFare}
                onChange={(event) => setForm((prev) => ({ ...prev, originalFare: event.target.value }))}
              />
              {errors.originalFare && <small className="field-error">{errors.originalFare}</small>}
            </label>
          </>
        )}

        <label>
          Override Price (Optional)
          <input
            type="number"
            min="1"
            step="0.01"
            name="resalePrice"
            value={form.resalePrice}
            onChange={(event) => setForm((prev) => ({ ...prev, resalePrice: event.target.value }))}
          />
          {errors.resalePrice && <small className="field-error">{errors.resalePrice}</small>}
        </label>

        <label>
          Seller Contact (Optional)
          <input
            name="sellerContact"
            value={form.sellerContact}
            onChange={(event) => setForm((prev) => ({ ...prev, sellerContact: event.target.value }))}
          />
        </label>
      </div>

      {selectedTicket && (
        <p className="muted-note">
          Selected: {selectedTicket.travelName} | {selectedTicket.busNumber} | Paid: INR {Number(selectedTicket.amountPaid || 0).toFixed(2)}
        </p>
      )}
      {errors._form && <small className="field-error">{errors._form}</small>}
      {form.mode === 'OWNED' && saleEligibleTickets.length === 0 && (
        <small className="field-error">You have no BOOKED tickets available for resale. Use Cross-Platform Ticket to list external purchases.</small>
      )}

      <button type="submit" disabled={busy || (form.mode === 'OWNED' && saleEligibleTickets.length === 0)}>
        {busy ? 'Publishing...' : 'Publish Resale Listing'}
      </button>
    </form>
  );
}
