import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { exportBookings } from '../utils/exportBookings'
import { formatDisplayDate } from '../utils/dateFormat'
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))
export default function BookingsPage({ bookings, loading, edit, remove, checkOut, checkingOut }) {
  const [search] = useSearchParams()
  const [sort, setSort] = useState('room-asc')
  const followingUp = search.get('filter') === 'follow-ups'
  const propertyFilter = search.get('property')
  const visibleBookings = followingUp ? bookings.filter((booking) => booking.payment_status !== 'Paid') : bookings
  const filteredBookings = propertyFilter ? visibleBookings.filter((booking) => booking.property === propertyFilter) : visibleBookings
  const [key, direction] = sort.split('-')
  const sortedBookings = useMemo(() => [...filteredBookings].sort((a, b) => {
    const paymentOrder = { Pending: 1, 'Partially Paid': 2, Paid: 3 }
    const left = key === 'room' ? `${a.property}-${a.room_number}` : paymentOrder[a.payment_status] || 99
    const right = key === 'room' ? `${b.property}-${b.room_number}` : paymentOrder[b.payment_status] || 99
    return (typeof left === 'string' ? left.localeCompare(right, undefined, { numeric: true }) : left - right) * (direction === 'asc' ? 1 : -1)
  }), [filteredBookings, key, direction])
  const today = new Date().toISOString().slice(0, 10)
  const isCheckedOut = (booking) => booking.checked_out === true || booking.stay_status === 'checked_out'
  const isOccupied = (booking) => !isCheckedOut(booking) && booking.stay_status === 'checked_in' && booking.check_in <= today && today < booking.check_out
  const statusLabel = (booking) => {
    if (isCheckedOut(booking)) return 'Checked out'
    if (booking.stay_status === 'checked_in') return 'Checked in'
    if (booking.check_in === today) return 'Arriving today'
    if (booking.check_out === today) return 'Checking out today'
    return 'Reserved'
  }
  const statusClass = (booking) => {
    if (isCheckedOut(booking)) return 'pill checked-out'
    if (booking.stay_status === 'checked_in') return 'pill checked-in'
    if (booking.check_out === today) return 'pill checkout-today'
    if (booking.check_in === today) return 'pill arrival-today'
    return 'pill reserved'
  }
  const canCheckout = (booking) => !isCheckedOut(booking)
  const heading = followingUp ? 'Pending and partially paid bookings' : propertyFilter ? `Bookings for ${propertyFilter}` : 'All stored bookings'
  const headingKey = followingUp ? 'PAYMENT FOLLOW-UPS' : propertyFilter ? 'PROPERTY BOOKINGS' : 'RESERVATIONS'
  return <section className="records"><div className="section-heading"><div><p className="eyebrow">{headingKey}</p><h2>{heading}</h2>{(followingUp || propertyFilter) && <Link className="text-button" to="/bookings">Show all bookings</Link>}</div><div className="table-controls"><label>Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="room-asc">Room: low to high</option><option value="room-desc">Room: high to low</option><option value="payment-asc">Payment: pending first</option><option value="payment-desc">Payment: paid first</option></select></label><button className="export-button" onClick={() => exportBookings(sortedBookings, followingUp ? 'DD-Cottages-Payment-Follow-Ups' : propertyFilter ? `DD-Cottages-${propertyFilter}` : 'DD-Cottages-All-Bookings')}>Export Excel</button><span>{loading ? 'Loading…' : `${sortedBookings.length} records`}</span></div></div><div className="table-wrap"><table><thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Source</th><th>Amount</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>{sortedBookings.length ? sortedBookings.map((b) => <tr key={b.id} className={isOccupied(b) ? 'occupied-row' : ''}><td><strong>{b.guest_name}</strong><small>{b.mobile}</small></td><td className={isOccupied(b) ? 'occupied-room' : ''}>{b.property}<br/>Room {b.room_number}{isOccupied(b) && <small className="occupied-badge">● Occupied</small>}</td><td>{formatDisplayDate(b.check_in)}<br/>{formatDisplayDate(b.check_out)}</td><td>{b.source}</td><td>{money(b.gross_amount)}</td><td><span className={`pill ${b.payment_status.toLowerCase().replaceAll(' ', '-')}`}>{b.payment_status}</span></td><td><span className={statusClass(b)}>{statusLabel(b)}</span></td><td>{canCheckout(b) && <button className="text-button checkout-action" disabled={checkingOut === b.id} onClick={() => checkOut(b.id)}>{checkingOut === b.id ? 'Checking out…' : 'Check out'}</button>} <button className="text-button" onClick={() => edit(b)}>Edit</button> <button className="text-button danger" onClick={() => remove(b.id)}>Delete</button></td></tr>) : <tr><td colSpan="8" className="empty">No matching bookings.</td></tr>}</tbody></table></div></section>
}
