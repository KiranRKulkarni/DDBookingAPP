const today = new Date().toISOString().slice(0, 10)

export default function TodayBookings({ bookings, checkIn, checkingIn, checkOut, checkingOut }) {
  const isCheckedOut = (booking) => booking.checked_out === true || booking.stay_status === 'checked_out'
  const arrivals = bookings.filter((booking) => booking.check_in === today && !isCheckedOut(booking) && booking.stay_status !== 'checked_in' && booking.stay_status !== 'cancelled')
  const departures = bookings.filter((booking) => booking.check_out === today && !isCheckedOut(booking) && booking.stay_status !== 'checked_out' && booking.stay_status !== 'cancelled')
  const staying = bookings.filter((booking) => !isCheckedOut(booking) && booking.check_in <= today && booking.check_out > today && booking.stay_status !== 'checked_out' && booking.stay_status !== 'cancelled' && (booking.stay_status === 'checked_in' || booking.check_in < today))
  const cancelled = bookings.filter((booking) => booking.stay_status === 'cancelled')
  const activityCount = arrivals.length + departures.length + staying.length + cancelled.length
  return <section className="today-bookings"><div className="section-heading"><div><p className="eyebrow">TODAY · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }).toUpperCase()}</p><h2>Today’s room activity</h2></div><div className="today-actions"><button className="export-button" onClick={() => exportDailyMovement(bookings)}>Daily Report</button><span className="today-count">{activityCount} records</span></div></div><div className="today-columns"><Activity title="Arrivals" items={arrivals} label="Check-in today" action={checkIn} actionLoading={checkingIn} actionLabel="Check in"/><Activity title="In house" items={staying} label="Currently staying"/><Activity title="Check-outs" items={departures} label="Check-out today" checkout action={checkOut} actionLoading={checkingOut} actionLabel="Check out"/><Activity title="Cancellations" items={cancelled} label="Cancelled" className="canceled-activity"/></div></section>
}

function Activity({ title, items, label, checkout, action, actionLoading, actionLabel, className }) {
  return <article className={['activity', checkout && 'checkout-activity', className].filter(Boolean).join(' ')}><p>{title}</p>{items.length ? items.map((item) => <div className="guest" key={item.id}><strong>Room {item.room_number}</strong><span>{item.guest_name}</span><small>{item.mobile || label}</small>{action && <button className={checkout ? 'check-in check-out' : 'check-in'} disabled={actionLoading === item.id} onClick={() => action(item.id)}>{actionLoading === item.id ? `${actionLabel}…` : actionLabel}</button>}</div>) : <small>No {title.toLowerCase()} today</small>}</article>
}
import { exportDailyMovement } from '../utils/exportDailyMovement'
