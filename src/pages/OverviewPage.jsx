import Calendar from '../components/Calendar'
import TodayBookings from '../components/TodayBookings'
import { PROPERTIES } from '../data'

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))

function Metric({ label, value, note, onClick }) {
  return <article className={onClick ? 'metric-link' : ''} onClick={onClick} onKeyDown={(event) => event.key === 'Enter' && onClick?.()} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}{onClick && <small>View records →</small>}</article>
}

function PropertyCard({ property, bookingsCount, revenue, collections, pending, onClick }) {
  const accentStyles = {
    'DD Cottages': { background: 'linear-gradient(135deg, #eefbf4 0%, #dcefe6 45%, #bcdcc8 100%)', borderColor: '#7cb596', color: '#174b3a' },
    'DD Villa': { background: 'linear-gradient(135deg, #fff7eb 0%, #f8e4c4 45%, #e7c68d 100%)', borderColor: '#d79d41', color: '#6b3f0a' },
    'DD Serenity Cottages': { background: 'linear-gradient(135deg, #f4f3ff 0%, #e1dcff 45%, #c8b7ff 100%)', borderColor: '#8d6eff', color: '#442c7a' }
  }
  const style = accentStyles[property] || { background: 'linear-gradient(135deg, #f8fbff 0%, #e8f1f8 45%, #d4e6f2 100%)', borderColor: '#8db6cb', color: '#204552' }

  return <article className="property-card metric-link" style={style} onClick={onClick} onKeyDown={(event) => event.key === 'Enter' && onClick?.()} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}><div className="property-card-head"><h3>{property}</h3><small>View records →</small></div><div className="property-card-stats"><div><span>Bookings</span><strong>{bookingsCount}</strong></div><div><span>Total collection</span><strong>{money(revenue)}</strong></div><div><span>Cash payments</span><strong>{money(collections)}</strong></div><div><span>Pending</span><strong>{pending}</strong></div></div></article>
}

export default function OverviewPage({ totals, bookings, month, setMonth, checkIn, checkingIn, checkOut, checkingOut, onPaymentFollowUps, onCashCollection, onOpenProperty, onShowCanceled }) {
  const activeBookings = bookings.filter((booking) => booking.stay_status !== 'cancelled')
  const propertyBreakdown = PROPERTIES.map((property) => {
    const propertyBookings = activeBookings.filter((booking) => booking.property === property)
    const collections = propertyBookings.filter((booking) => booking.payment_method === 'Cash').reduce((sum, booking) => sum + (booking.payment_status === 'Paid' ? Number(booking.gross_amount || 0) : Number(booking.advance_paid || 0)), 0)

    return {
      property,
      bookingsCount: propertyBookings.length,
      revenue: propertyBookings.reduce((sum, booking) => sum + Number(booking.gross_amount || 0), 0),
      collections,
      pending: propertyBookings.filter((booking) => booking.payment_status !== 'Paid').length
    }
  })

  return <><section className="metrics"><Metric label="Total bookings" value={totals.bookings} note={totals.cancelled ? `${totals.cancelled} cancelled` : undefined} onClick={totals.cancelled ? onShowCanceled : undefined} /><Metric label="Gross revenue" value={money(totals.revenue)} /><Metric label="Cash collected" value={money(totals.cash)} onClick={onCashCollection}/><Metric label="Payment follow-ups" value={totals.pending} onClick={onPaymentFollowUps}/></section><section className="property-section"><div className="section-heading"><div><p className="eyebrow">PROPERTY VIEW</p><h2>Property-wise overview</h2></div></div><div className="property-cards">{propertyBreakdown.map((item) => <PropertyCard key={item.property} property={item.property} bookingsCount={item.bookingsCount} revenue={item.revenue} collections={item.collections} pending={item.pending} onClick={() => onOpenProperty?.(item.property)} />)}</div></section><TodayBookings bookings={bookings} checkIn={checkIn} checkingIn={checkingIn} checkOut={checkOut} checkingOut={checkingOut}/><Calendar bookings={bookings} month={month} setMonth={setMonth}/></>
}
