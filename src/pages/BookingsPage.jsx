import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { exportBookings } from '../utils/exportBookings'
import { formatDisplayDate } from '../utils/dateFormat'
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))
const PAGE_SIZE = 30

function BookingsPageUI({ bookings, loading, edit, remove, cancel, checkIn, checkingIn, checkOut, checkingOut }) {
  const [search] = useSearchParams()
  const [selectedProperty, setSelectedProperty] = useState('all')
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedDateRange, setAppliedDateRange] = useState({ from: '', to: '' })
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const handleMenuOpen = (event, bookingId) => {
    event.stopPropagation()
    if (menuOpenId === bookingId) {
      setMenuOpenId(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    setMenuPosition({
      top: rect.bottom + 6,
      left: rect.right - 92
    })
    setMenuOpenId(bookingId)
  }
  const followingUp = search.get('filter') === 'follow-ups'
  const cancelledFilter = ['canceled', 'cancelled'].includes(search.get('filter'))
  const propertyFilter = search.get('property')
  const visibleBookings = followingUp
    ? bookings.filter((booking) => booking.payment_status !== 'Paid')
    : cancelledFilter
      ? bookings.filter((booking) => booking.stay_status === 'cancelled')
      : bookings
  const baseFilteredBookings = propertyFilter
    ? visibleBookings.filter((booking) => booking.property === propertyFilter)
    : selectedProperty === 'all'
      ? visibleBookings
      : visibleBookings.filter((booking) => booking.property === selectedProperty)
  const filteredBookings = useMemo(() => {
    if (!appliedDateRange.from && !appliedDateRange.to) return baseFilteredBookings
    return baseFilteredBookings.filter((booking) => {
      const fromOk = !appliedDateRange.from || booking.check_in >= appliedDateRange.from
      const toOk = !appliedDateRange.to || booking.check_in <= appliedDateRange.to
      return fromOk && toOk
    })
  }, [baseFilteredBookings, appliedDateRange])
  const sortedBookings = useMemo(() => [...filteredBookings].sort((a, b) => {
    const stateRank = (booking) => {
      if (booking.checked_out === true || booking.stay_status === 'checked_out' || booking.stay_status === 'cancelled') return 2
      if (booking.stay_status === 'checked_in') return 0
      return 1
    }
    const stateComparison = stateRank(a) - stateRank(b)
    if (stateComparison !== 0) return stateComparison
    const checkInComparison = (a.check_in || '').localeCompare(b.check_in || '', undefined, { numeric: true })
    if (checkInComparison !== 0) return checkInComparison
    return ((Number(a.room_number) || 0) - (Number(b.room_number) || 0))
  }), [filteredBookings])
  const totals = useMemo(() => sortedBookings.reduce((summary, booking) => {
    if (booking.stay_status === 'cancelled') return summary
    const gross = Number(booking.gross_amount || 0)
    const extra = Number(booking.extra_charges || 0)
    const net = gross + extra - Number(booking.discount || 0) - Number(booking.commission || 0) - Number(booking.tds || 0)
    const remaining = booking.payment_status === 'Paid' ? 0 : Math.max(net - Number(booking.advance_paid || 0), 0)
    return { gross: summary.gross + gross, extra: summary.extra + extra, remaining: summary.remaining + remaining }
  }, { gross: 0, extra: 0, remaining: 0 }), [sortedBookings])
  const pageCount = Math.max(1, Math.ceil(sortedBookings.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visiblePageBookings = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return sortedBookings.slice(start, start + PAGE_SIZE)
  }, [safePage, sortedBookings])
  const today = new Date().toISOString().slice(0, 10)
  const isCheckedOut = (booking) => booking.checked_out === true || booking.stay_status === 'checked_out'
  const isCheckedIn = (booking) => booking.stay_status === 'checked_in'
  const isCancelled = (booking) => booking.stay_status === 'cancelled'
  const canManageStay = (booking) => !isCheckedOut(booking) && !isCancelled(booking)
  const canCheckIn = (booking) => canManageStay(booking) && !isCheckedIn(booking)
  const canCheckOut = (booking) => canManageStay(booking) && isCheckedIn(booking)
  const getPrimaryActionClass = (booking) => {
    if (isCheckedOut(booking)) return 'primary-action is-completed'
    if (isCheckedIn(booking)) return 'primary-action is-checkout'
    return 'primary-action is-checkin'
  }
  const getPrimaryActionLabel = (booking) => {
    if (isCheckedOut(booking)) return 'Checked Out'
    if (isCheckedIn(booking)) return 'Check Out'
    return 'Check In'
  }
  const getPaymentStatusClass = (booking) => {
    const paymentStatus = booking.payment_status || 'Pending'
    return paymentStatus.toLowerCase().replaceAll(' ', '-')
  }
  const getBookingStatusLabel = (booking) => {
    if (isCheckedOut(booking)) return 'Checked Out'
    if (booking.stay_status === 'checked_in') return 'Checked In'
    if (booking.stay_status === 'cancelled') return 'Cancelled'
    if (booking.check_in === today && !isCheckedOut(booking) && booking.stay_status !== 'checked_in' && booking.stay_status !== 'cancelled') return 'Arriving Today'
    return 'Reserved'
  }
  const getBookingStatusClass = (booking) => {
    if (isCheckedOut(booking)) return 'checked-out'
    if (booking.stay_status === 'checked_in') return 'checked-in'
    if (booking.stay_status === 'cancelled') return 'cancelled'
    if (booking.check_in === today && !isCheckedOut(booking) && booking.stay_status !== 'checked_in' && booking.stay_status !== 'cancelled') return 'arriving-today'
    return 'reserved'
  }
  const getRowStatusClass = (booking) => {
    if (isCheckedOut(booking)) return 'status-checked-out'
    if (booking.stay_status === 'checked_in') return 'status-checked-in'
    if (booking.stay_status === 'cancelled') return 'status-cancelled'
    if (booking.check_in === today && !isCheckedOut(booking) && booking.stay_status !== 'checked_in' && booking.stay_status !== 'cancelled') return 'status-arriving-today'
    return 'status-reserved'
  }
  const getStayDetails = (booking) => {
    if (!booking.check_in || !booking.check_out) return { label: '—', nights: 0 }
    const nights = Math.max(1, Math.round((new Date(`${booking.check_out}T00:00:00`) - new Date(`${booking.check_in}T00:00:00`)) / 86400000))
    return { label: `${formatDisplayDate(booking.check_in)} → ${formatDisplayDate(booking.check_out)}`, nights }
  }
  const heading = followingUp
    ? 'Pending and partially paid bookings'
    : cancelledFilter
      ? 'Canceled bookings'
      : propertyFilter
        ? `Bookings for ${propertyFilter}`
        : 'All stored bookings'
  const headingKey = followingUp
    ? 'PAYMENT FOLLOW-UPS'
    : cancelledFilter
      ? 'CANCELLED BOOKINGS'
      : propertyFilter
        ? 'PROPERTY BOOKINGS'
        : 'RESERVATIONS'
  return <section className="records"><div className="section-heading"><div><p className="eyebrow">{headingKey}</p><h2>{heading}</h2>{(followingUp || propertyFilter || cancelledFilter) && <Link className="text-button" to="/bookings">Show all bookings</Link>}</div><div className="table-controls"><label>Property<select value={selectedProperty} onChange={(event) => { setSelectedProperty(event.target.value); setPage(1) }}><option value="all">All properties</option><option value="DD Cottages">DD Cottages</option><option value="DD Serenity Cottages">DD Serenity Cottages</option><option value="DD Valley Cottages">DD Valley Cottages</option></select></label><div className="date-filter-group"><label>From<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label>To<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label><button className="text-button" onClick={() => { setAppliedDateRange({ from: dateFrom, to: dateTo }); setPage(1) }}>Search</button></div><button className="export-button" onClick={() => exportBookings(sortedBookings, followingUp ? 'DD-Cottages-Payment-Follow-Ups' : cancelledFilter ? 'DD-Cottages-Canceled-Bookings' : propertyFilter ? `DD-Cottages-${propertyFilter}` : 'DD-Cottages-All-Bookings')}>Export Excel</button><span>{loading ? 'Loading…' : `${sortedBookings.length} records`}</span></div></div><div className="cash-summary"><div className="cash-metric"><small>Total gross</small><strong>{money(totals.gross)}</strong></div><div className="cash-metric"><small>Total extra</small><strong>{money(totals.extra)}</strong></div><div className="cash-metric"><small>Total remaining</small><strong>{money(totals.remaining)}</strong></div></div><div className="table-wrap"><table><thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Amount</th><th>Extra</th><th>Advance paid</th><th>Remaining</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visiblePageBookings.length ? visiblePageBookings.map((booking) => { const guestName = booking.guest_name || 'Guest'; const guestInitials = guestName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'; const guestPhone = booking.mobile || booking.phone || '—'; const stayDetails = getStayDetails(booking); const net = Number(booking.gross_amount || 0) + Number(booking.extra_charges || 0) - Number(booking.discount || 0) - Number(booking.commission || 0) - Number(booking.tds || 0); const remaining = booking.payment_status === 'Paid' ? 0 : Math.max(net - Number(booking.advance_paid || 0), 0); const isHighlighted = booking.stay_status === 'checked_in' && !isCheckedOut(booking); const rowClassName = [isHighlighted ? 'row-checked-in' : '', getRowStatusClass(booking)].filter(Boolean).join(' ');
 const rowClick = !isCancelled(booking) ? () => edit?.(booking) : undefined
 return <tr key={booking.id} className={rowClassName} onClick={rowClick}><td className="guest-cell"><div className="guest-chip"><div className="guest-avatar">{guestInitials}</div><div className="guest-meta"><strong>{guestName}</strong><small>{guestPhone}</small></div></div></td><td><strong>{booking.room_number || '—'}</strong></td><td><div className="stay-cell"><strong>{stayDetails.label}</strong><small>{stayDetails.nights ? `${stayDetails.nights} ${stayDetails.nights === 1 ? 'Night' : 'Nights'}` : '—'}</small></div></td><td className="money-cell"><strong>{money(booking.gross_amount || 0)}</strong></td><td className="money-cell"><span>{money(booking.extra_charges || 0)}</span></td><td className="money-cell"><span>{money(booking.advance_paid || 0)}</span></td><td className={`money-cell ${remaining > 0 ? 'remaining-due' : ''}`}><strong>{money(remaining)}</strong></td><td><span className={`payment-badge ${isCancelled(booking) ? 'cancelled' : getPaymentStatusClass(booking)}`}>{isCancelled(booking) ? 'Canceled' : (booking.payment_status || 'Pending')}</span></td><td><span className={`status-badge ${getBookingStatusClass(booking)}`}>{getBookingStatusLabel(booking)}</span></td><td className="actions-cell">{isCancelled(booking) ? <button type="button" className="primary-action is-completed" onClick={(event) => { event.stopPropagation(); remove?.(booking.id) }}>Delete</button> : <div className="actions-stack"><button type="button" className={getPrimaryActionClass(booking)} disabled={!canManageStay(booking)} onClick={(event) => { event.stopPropagation(); if (canManageStay(booking)) { isCheckedIn(booking) ? checkOut?.(booking.id) : checkIn?.(booking.id) } }}>{getPrimaryActionLabel(booking)}</button><div className="overflow-menu"><button type="button" className="overflow-trigger" onClick={(event) => { event.stopPropagation(); setMenuOpenId((current) => current === booking.id ? null : booking.id) }}>⋮</button>{menuOpenId === booking.id && <div className="overflow-menu-panel" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => { edit?.(booking); setMenuOpenId(null) }}>View</button><button type="button" onClick={() => { edit?.(booking); setMenuOpenId(null) }}>Edit</button><button type="button" onClick={() => { remove?.(booking.id); setMenuOpenId(null) }}>Delete</button><button type="button" disabled={!canManageStay(booking)} onClick={() => { if (canManageStay(booking)) { cancel?.(booking.id); setMenuOpenId(null) } }}>Cancel booking</button><button type="button" onClick={() => setMenuOpenId(null)}>Print invoice</button></div>}</div></div>}</td></tr> }) : <tr><td colSpan="10" className="empty">No bookings match the current filters.</td></tr>}</tbody></table></div>{pageCount > 1 && <div className="pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page {safePage} of {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div>}</section>}

export default function BookingsPage(props) {
  return <BookingsPageUI {...props} />
}

function LegacyBookingsPage({ bookings, loading, edit, remove, checkOut, checkingOut }) {
  if (!bookings || !Array.isArray(bookings)) {
    console.error('BookingsPage: invalid bookings prop', bookings)
    return <section className="records"><div className="section-heading"><div><p className="eyebrow">ERROR</p><h2>Bookings data not available</h2></div></div><p className="subtle">The bookings data is missing or malformed. Check the developer console for details.</p></section>
  }
  const [search] = useSearchParams()
  const [selectedProperty, setSelectedProperty] = useState('all')
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [appliedDateRange, setAppliedDateRange] = useState({ from: '', to: '' })
  const followingUp = search.get('filter') === 'follow-ups'
  const cancelledFilter = ['canceled', 'cancelled'].includes(search.get('filter'))
  const propertyFilter = search.get('property')
  const visibleBookings = followingUp
    ? bookings.filter((booking) => booking.payment_status !== 'Paid')
    : cancelledFilter
      ? bookings.filter((booking) => booking.stay_status === 'cancelled')
      : bookings
  const baseFilteredBookings = propertyFilter
    ? visibleBookings.filter((booking) => booking.property === propertyFilter)
    : selectedProperty === 'all'
      ? visibleBookings
      : visibleBookings.filter((booking) => booking.property === selectedProperty)
  const filteredBookings = useMemo(() => {
    if (!appliedDateRange.from && !appliedDateRange.to) return baseFilteredBookings
    return baseFilteredBookings.filter((booking) => {
      const checkIn = booking.check_in
      const fromOk = !appliedDateRange.from || checkIn >= appliedDateRange.from
      const toOk = !appliedDateRange.to || checkIn <= appliedDateRange.to
      return fromOk && toOk
    })
  }, [baseFilteredBookings, appliedDateRange])
  const sortedBookings = useMemo(() => [...filteredBookings].sort((a, b) => {
    const checkInComparison = (a.check_in || '').localeCompare(b.check_in || '', undefined, { numeric: true })
    if (checkInComparison !== 0) return checkInComparison
    return ((Number(a.room_number) || 0) - (Number(b.room_number) || 0))
  }), [filteredBookings])
  const totals = useMemo(() => sortedBookings.reduce((summary, booking) => {
    if (booking.stay_status === 'cancelled') return summary
    const gross = Number(booking.gross_amount || 0)
    const extra = Number(booking.extra_charges || 0)
    const net = gross + extra - Number(booking.discount || 0) - Number(booking.commission || 0) - Number(booking.tds || 0)
    const remaining = booking.payment_status === 'Paid' ? 0 : Math.max(net - Number(booking.advance_paid || 0), 0)
    return { gross: summary.gross + gross, extra: summary.extra + extra, remaining: summary.remaining + remaining }
  }, { gross: 0, extra: 0, remaining: 0 }), [sortedBookings])
  const pageCount = Math.max(1, Math.ceil(sortedBookings.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visiblePageBookings = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return sortedBookings.slice(start, start + PAGE_SIZE)
  }, [safePage, sortedBookings])
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

  const rowStatusClass = (booking) => {
    if (isCheckedOut(booking)) return 'status-checked-out'
    if (booking.stay_status === 'checked_in') return 'status-checked-in'
    if (booking.stay_status === 'cancelled') return 'status-cancelled'
    return 'status-reserved'
  }
  const canCheckout = (booking) => !isCheckedOut(booking)
  const heading = followingUp ? 'Pending and partially paid bookings' : propertyFilter ? `Bookings for ${propertyFilter}` : 'All stored bookings'
  const headingKey = followingUp ? 'PAYMENT FOLLOW-UPS' : propertyFilter ? 'PROPERTY BOOKINGS' : 'RESERVATIONS'
  return <section className="records"><div className="section-heading"><div><p className="eyebrow">{headingKey}</p><h2>{heading}</h2>{(followingUp || propertyFilter) && <Link className="text-button" to="/bookings">Show all bookings</Link>}</div><div className="table-controls"><label>Property<select value={selectedProperty} onChange={(event) => { setSelectedProperty(event.target.value); setPage(1) }}><option value="all">All properties</option><option value="DD Cottages">DD Cottages</option><option value="DD Serenity Cottages">DD Serenity Cottages</option><option value="DD Valley Cottages">DD Valley Cottages</option></select></label><div className="date-filter-group"><label>From<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label>To<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label><button className="text-button" onClick={() => { setAppliedDateRange({ from: dateFrom, to: dateTo }); setPage(1) }}>Search</button></div><button className="export-button" onClick={() => exportBookings(sortedBookings, followingUp ? 'DD-Cottages-Payment-Follow-Ups' : propertyFilter ? `DD-Cottages-${propertyFilter}` : 'DD-Cottages-All-Bookings')}>Export Excel</button><span>{loading ? 'Loading…' : `${sortedBookings.length} records`}</span></div></div><div className="cash-summary"><div className="cash-metric"><small>Total gross</small><strong>{money(totals.gross)}</strong></div><div className="cash-metric"><small>Total extra</small><strong>{money(totals.extra)}</strong></div><div className="cash-metric"><small>Total remaining</small><strong>{money(totals.remaining)}</strong></div></div><div className="table-wrap"><table><thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Source</th><th>Amount</th><th>Extra</th><th>Advance paid</th><th>Remaining</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>{visiblePageBookings.length ? visiblePageBookings.map((b) => { const net = Number(b.gross_amount || 0) + Number(b.extra_charges || 0) - Number(b.discount || 0) - Number(b.commission || 0) - Number(b.tds || 0); const remaining = b.payment_status === 'Paid' ? 0 : Math.max(net - Number(b.advance_paid || 0), 0); return <tr key={b.id} className={isOccupied(b) ? 'occupied-row' : ''}><td><strong>{b.guest_name}</strong><small>{b.mobile}</small></td><td className={isOccupied(b) ? 'occupied-room' : ''}>{b.property}<br/>Room {b.room_number}{isOccupied(b) && <small className="occupied-badge">● Occupied</small>}</td><td>{formatDisplayDate(b.check_in)}<br/>{formatDisplayDate(b.check_out)}</td><td>{b.source}</td><td>{money(b.gross_amount)}</td><td>{money(b.extra_charges)}</td><td>{money(b.advance_paid)}</td><td><strong className={remaining > 0 ? 'remaining-due' : 'fully-paid'}>{money(remaining)}</strong></td><td><span className={`pill ${b.payment_status.toLowerCase().replaceAll(' ', '-')}`}>{b.payment_status}</span></td><td><span className={statusClass(b)}>{statusLabel(b)}</span></td><td>{canCheckout(b) && <button className="text-button checkout-action" disabled={checkingOut === b.id} onClick={() => checkOut(b.id)}>{checkingOut === b.id ? 'Checking out…' : 'Check out'}</button>} <button className="text-button edit-action" onClick={() => edit(b)}>Edit</button> <button className="text-button delete-action" onClick={() => remove(b.id)}>Delete</button></td></tr> }) : <tr><td colSpan="11" className="empty">No matching bookings.</td></tr>}</tbody></table></div>{sortedBookings.length > 0 && <div className="pagination"><button className="text-button" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page {safePage} of {pageCount}</span><button className="text-button" disabled={safePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button></div>}</section>
}
