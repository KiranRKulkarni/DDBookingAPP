import {
  PAID_TO,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PROPERTY_ROOMS,
  ROOM_CATEGORIES,
  SETTLEMENT_STATUSES,
  SOURCES,
} from "../data";
const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
const Field = ({ label, name, value, onChange, ...props }) => (
  <label>
    {label}
    <input
      name={name}
      value={value ?? ""}
      onChange={(e) => onChange(name, e.target.value)}
      {...props}
    />
  </label>
);
const Select = ({ label, name, value, onChange, values }) => (
  <label>
    {label}
    <select
      name={name}
      value={value ?? ""}
      onChange={(e) => onChange(name, e.target.value)}
    >
      {values.map((item) => (
        <option key={item}>{item}</option>
      ))}
    </select>
  </label>
);
const Textarea = ({ label, name, value, onChange, ...props }) => (
  <label className="textarea-field">
    {label}
    <textarea
      name={name}
      value={value ?? ""}
      onChange={(e) => onChange(name, e.target.value)}
      {...props}
    />
  </label>
);
const getBookingStatusLabel = (booking = {}) => {
  if (booking.checked_out === true || booking.stay_status === 'checked_out') return 'Checked Out'
  if (booking.stay_status === 'checked_in') return 'Occupied'
  if (booking.stay_status === 'cancelled' || booking.stay_status === 'canceled') return 'Cancelled'
  return 'Reserved'
}
const getBookingStatusClass = (booking = {}) => {
  if (booking.checked_out === true || booking.stay_status === 'checked_out') return 'checked-out'
  if (booking.stay_status === 'checked_in') return 'occupied'
  if (booking.stay_status === 'cancelled' || booking.stay_status === 'canceled') return 'cancelled'
  return 'reserved'
}
function RoomSelector({ value, onChange, bookings = [], form = {} }) {
  const availableRooms =
    PROPERTY_ROOMS[form.property] || PROPERTY_ROOMS["Down da village"];
  const selected = new Set(
    (value || "")
      .split(",")
      .filter(Boolean)
      .filter((room) => availableRooms.includes(room)),
  );
  const roomStatusMap = bookings
    .filter(
      (b) =>
        b.property === form.property &&
        b.id !== form.id &&
        b.checked_out !== true &&
        b.stay_status !== "checked_out" &&
        b.stay_status !== "cancelled" &&
        b.stay_status !== "canceled" &&
        b.check_in < form.check_out &&
        form.check_in < b.check_out,
    )
    .reduce((map, booking) => {
      booking.room_number
        .split(",")
        .filter(Boolean)
        .forEach((room) => {
          if (!availableRooms.includes(room)) return
          if (map[room] === "occupied") return
          map[room] = booking.stay_status === "checked_in" ? "occupied" : "reserved"
        })
      return map
    }, {})
  const toggle = (room) => {
    const next = new Set(selected);
    next.has(room) ? next.delete(room) : next.add(room);
    onChange("room_number", availableRooms.filter((item) => next.has(item)).join(","));
  };
  return (
    <fieldset className="room-selector">
      <legend>Rooms · Down da village</legend>
      <div>
        {ROOM_CATEGORIES.map(({ name, rooms, location }, index) => (
          <section className={`room-category room-category-${index + 1}`} key={name}>
            <header><strong>{name}</strong><small>{location}</small></header>
            <div className="room-category-options">
              {rooms.map((room) => {
                const status = roomStatusMap[room]
                const isUnavailable = status === 'occupied' || status === 'reserved'
                return (
                  <label key={room} className={isUnavailable ? `disabled ${status}` : ""}>
                    <input type="checkbox" checked={selected.has(room)} onChange={() => !isUnavailable && toggle(room)} disabled={isUnavailable} />
                    <span>{room}{isUnavailable && " ●"}</span>
                    {status && <small className="room-status-label">{status === 'occupied' ? 'Occupied' : 'Reserved'}</small>}
                  </label>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      <small>
        {selected.size
          ? `${selected.size} room${selected.size > 1 ? "s" : ""} selected`
          : "No room selected"}
      </small>
    </fieldset>
  );
}

export default function BookingForm({
  form,
  update,
  submit,
  saving,
  netPayable,
  message,
  cancel,
  bookings = [],
}) {
  return (
    <form className="booking-form page-form" onSubmit={submit}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{form.id ? "EDIT BOOKING" : "NEW BOOKING"}</p>
          <h2>{form.id ? form.guest_name : "Add a reservation"}</h2>
          <div className="status-line">
            <span className={`status-badge ${getBookingStatusClass(form)}`}>
              {getBookingStatusLabel(form)}
            </span>
          </div>
        </div>
        {form.id && (
          <button type="button" className="text-button" onClick={cancel}>
            Cancel edit
          </button>
        )}
      </div>
      <div className="field-grid">
        <RoomSelector
          value={form.room_number}
          onChange={update}
          bookings={bookings}
          form={form}
        />
        <Field
          label="Guest name"
          name="guest_name"
          value={form.guest_name}
          onChange={update}
          required
        />
        <Field
          label="Mobile"
          name="mobile"
          value={form.mobile}
          onChange={update}
          type="tel"
        />
        <Select
          label="Source"
          name="source"
          value={form.source}
          onChange={update}
          values={SOURCES}
        />
        <Field
          label="Check-in"
          name="check_in"
          value={form.check_in}
          onChange={update}
          type="date"
          required
        />
        <label>
          Check-out (12pm)
          <Field
            name="check_out"
            value={form.check_out}
            onChange={update}
            type="date"
            min={form.check_in}
            required
          />
        </label>
        <Field
          label="Adults"
          name="adults"
          value={form.adults}
          onChange={update}
          type="number"
          min="1"
          step="1"
        />
        <Field
          label="Children"
          name="children"
          value={form.children}
          onChange={update}
          type="number"
          min="0"
          step="1"
        />
        <Field
          label="Gross amount (₹)"
          name="gross_amount"
          value={form.gross_amount}
          onChange={update}
          type="number"
          min="0"
          step="any"
        />
        <Field
          label="Extra charges (₹)"
          name="extra_charges"
          value={form.extra_charges}
          onChange={update}
          type="number"
          min="0"
          step="any"
        />
        <Field
          label="Discount (₹)"
          name="discount"
          value={form.discount}
          onChange={update}
          type="number"
          min="0"
          step="any"
        />
        <Field
          label="Commission (₹)"
          name="commission"
          value={form.commission}
          onChange={update}
          type="number"
          min="0"
          step="any"
        />
        <Field
          label="TDS (₹)"
          name="tds"
          value={form.tds}
          onChange={update}
          type="number"
          min="0"
          step="any"
        />
        <Field
          label="Advance paid (₹)"
          name="advance_paid"
          value={form.advance_paid}
          onChange={update}
          type="number"
          min="0"
          step="any"
        />
        <Select
          label="Payment status"
          name="payment_status"
          value={form.payment_status}
          onChange={update}
          values={PAYMENT_STATUSES}
        />
        <Select
          label="Payment method"
          name="payment_method"
          value={form.payment_method}
          onChange={update}
          values={PAYMENT_METHODS}
        />
        <Select
          label="Paid to"
          name="paid_to"
          value={form.paid_to}
          onChange={update}
          values={PAID_TO}
        />
        <Select
          label="Settlement"
          name="settlement_status"
          value={form.settlement_status}
          onChange={update}
          values={SETTLEMENT_STATUSES}
        />
        <Textarea
          label="Comment"
          name="comment"
          value={form.comment || ""}
          onChange={update}
          rows="4"
          placeholder="Any notes for the stay or payment follow-up"
        />
      </div>
      <div className="form-footer">
        <span>
          Net payable: <strong>{money(netPayable)}</strong>
        </span>
        <button disabled={saving}>
          {saving ? "Saving…" : form.id ? "Update booking" : "Save booking"}
        </button>
      </div>
      {message && <p className="message">{message}</p>}
    </form>
  );
}
