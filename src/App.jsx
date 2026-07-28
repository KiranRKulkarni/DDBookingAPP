import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { cancelBooking, checkInBooking, checkOutBooking, getActivityLogs, getBookings, getProfile, getSession, getMembers, isConfigured, logActivity, removeBooking, saveBooking, signIn, signOut, signUp, supabase, updateMember } from './api'
import { PROPERTY_ROOMS } from './data'
import BookingForm from './components/BookingForm'
import OverviewPage from './pages/OverviewPage'
import BookingsPage from './pages/BookingsPage'
import CashCollectionPage from './pages/CashCollectionPage'
import ExpensesPage from './pages/ExpensesPage'
import { formatDisplayDate } from './utils/dateFormat'

const today = new Date().toISOString().slice(0, 10)
const blankBooking = () => ({ property: 'DD Cottages', room_number: '', guest_name: '', mobile: '', source: 'Direct', check_in: today, check_out: '', adults: 1, children: 0, gross_amount: 0, extra_charges: 0, discount: 0, commission: 0, tds: 0, advance_paid: 0, comment: '', payment_status: 'Pending', payment_method: 'UPI', paid_to: 'Hotel', settlement_status: 'Pending', checked_out: false })
const dateKey = (date) => date.toISOString().slice(0, 10)
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))
const overlap = (booking, date) => booking.check_in <= date && date < booking.check_out

function Dashboard({ profile, onSignOut }) {
  const [bookings, setBookings] = useState([])
  const [form, setForm] = useState(blankBooking)
  const [month, setMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checkingIn, setCheckingIn] = useState('')
  const [checkingOut, setCheckingOut] = useState('')
  const [message, setMessage] = useState('')

  async function refresh() {
    setLoading(true)
    try { setBookings(await getBookings()) } catch (error) { setMessage(error.message) } finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])

  // When creating a new booking: if check-in is today and check-out is empty or not after check-in,
  // auto-set check-out to tomorrow. This also covers the case where the initial blank form
  // has today's date prefilled but no checkout.
  // Removed auto-check logic for check-out

  const activeBookings = useMemo(() => bookings.filter((booking) => booking.stay_status !== 'cancelled'), [bookings])
  const cancelledBookingsCount = useMemo(() => bookings.filter((booking) => booking.stay_status === 'cancelled').length, [bookings])
  const totals = useMemo(() => ({
    bookings: bookings.length,
    cancelled: cancelledBookingsCount,
    revenue: activeBookings.reduce((sum, b) => sum + Number(b.gross_amount), 0),
    pending: activeBookings.filter((b) => b.payment_status !== 'Paid').length,
    cash: activeBookings.filter((b) => b.payment_method === 'Cash').reduce((sum, b) => sum + (b.payment_status === 'Paid' ? Number(b.gross_amount || 0) : Number(b.advance_paid || 0)), 0)
  }), [bookings, activeBookings, cancelledBookingsCount])
  const netPayable = Number(form.gross_amount || 0) + Number(form.extra_charges || 0) - Number(form.discount || 0) - Number(form.commission || 0) - Number(form.tds || 0)

  function update(name, value) {
    setForm((current) => {
      if (name === 'property') {
        return { ...current, property: value, room_number: '' }
      }
      // Removed logic for auto-setting check-out based on check-in
      return { ...current, [name]: value }
    })
  }
  const navigate = useNavigate()
  function edit(booking) { setForm({ ...booking }); navigate('/bookings/new'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  async function submit(event) {
    event.preventDefault(); setMessage('')
    if (!form.check_out || form.check_out <= form.check_in) return setMessage('Check-out must be after check-in.')
    const allowedRooms = PROPERTY_ROOMS[form.property] || PROPERTY_ROOMS['DD Cottages']
    const selectedRooms = (form.room_number || '').split(',').map((room) => room.trim()).filter(Boolean).filter((room) => allowedRooms.includes(room))
    if (!selectedRooms.length) return setMessage('Select at least one valid room for the chosen property.')
    const conflicting = bookings.find((b) => b.id !== form.id && b.property === form.property && b.checked_out !== true && b.stay_status !== 'checked_out' && b.check_in < form.check_out && form.check_in < b.check_out && b.room_number.split(',').some((room) => selectedRooms.includes(room)))
    if (conflicting) return setMessage(`One or more selected rooms are already booked for overlapping dates.`)
    setSaving(true)
    try {
      const payload = { ...form, room_number: selectedRooms.join(','), adults: Number(form.adults), children: Number(form.children), gross_amount: Number(form.gross_amount), extra_charges: Number(form.extra_charges), discount: Number(form.discount), commission: Number(form.commission), tds: Number(form.tds), advance_paid: Number(form.advance_paid), comment: form.comment || '' }
      await saveBooking(payload)
      setForm(blankBooking())
      setMessage('Booking saved.')
      await refresh()
      navigate('/bookings')
    } catch (error) { setMessage(error.message) } finally { setSaving(false) }
  }
  async function remove(id) { if (!window.confirm('Delete this booking?')) return; try { await removeBooking(id); await refresh() } catch (error) { setMessage(error.message) } }
  async function cancel(id) { if (!window.confirm('Cancel this booking?')) return; setMessage(''); try { await cancelBooking(String(id)); await refresh() } catch (error) { setMessage(error.message) } }
  async function checkIn(id) { 
    setCheckingIn(id); 
    setMessage(''); 
    try { 
      await checkInBooking(String(id)); 
      await refresh() 
    } catch (error) { 
      setMessage(error.message) 
    } finally { 
      setCheckingIn('') 
    } 
  }
  async function checkOut(id) { setCheckingOut(id); setMessage(''); try { await checkOutBooking(String(id)); await refresh() } catch (error) { setMessage(error.message) } finally { setCheckingOut('') } }

  const handleShowCanceled = () => navigate('/bookings?filter=canceled')
  return <main><header><div className="header-left"><div className="header-title-block"><p className="eyebrow hero-badge"><span className="brand-name">DD Cottages</span> · admin</p><h1>Booking control centre</h1><p className="subtle">Register stays, collect payments, and see every room’s availability.</p></div><div className="account"><span className="connection live">{profile.full_name || profile.email} · {profile.role}</span><button className="text-button" onClick={() => onSignOut({ userId: profile.id, email: profile.email, full_name: profile.full_name })}>Sign out</button></div></div></header><nav className="main-nav"><NavLink to="/" end>Overview</NavLink><NavLink to="/bookings/new" end>New booking</NavLink><NavLink to="/bookings" end>Bookings</NavLink><NavLink to="/cash-collection" end>Cash collection</NavLink><NavLink to="/expenses" end>Expenses</NavLink>{profile.role === 'admin' && <><NavLink to="/members" end>Members</NavLink><NavLink to="/activity-log" end>Activity log</NavLink></>}</nav><Routes><Route path="/" element={<OverviewPage totals={totals} bookings={bookings} month={month} setMonth={setMonth} checkIn={checkIn} checkingIn={checkingIn} checkOut={checkOut} checkingOut={checkingOut} onPaymentFollowUps={() => navigate('/bookings?filter=follow-ups')} onCashCollection={() => navigate('/cash-collection')} onOpenProperty={(property) => navigate(`/bookings?property=${encodeURIComponent(property)}`)} onShowCanceled={handleShowCanceled} />}/><Route path="/bookings/new" element={<BookingForm form={form} update={update} submit={submit} saving={saving} netPayable={netPayable} message={message} cancel={() => setForm(blankBooking())} bookings={bookings}/>}/><Route path="/bookings" element={<BookingsPage bookings={bookings} loading={loading} edit={edit} remove={remove} cancel={cancel} checkIn={checkIn} checkingIn={checkingIn} checkOut={checkOut} checkingOut={checkingOut}/>}/><Route path="/cash-collection" element={<CashCollectionPage bookings={bookings}/>}/><Route path="/expenses" element={<ExpensesPage />}/>{profile.role === 'admin' && <><Route path="/members" element={<Members />}/><Route path="/activity-log" element={<ActivityLog profile={profile} />}/></>}<Route path="*" element={<Navigate to="/" replace/>}/></Routes></main>
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    async function loadAccess(activeSession) {
      try {
        setError('')
        setSession(activeSession)
        setProfile(activeSession ? await getProfile(activeSession.user.id) : null)
      } catch (err) { if (current) setError(err.message) } finally { if (current) setLoading(false) }
    }
    getSession().then(loadAccess).catch((err) => { if (current) { setError(err.message); setLoading(false) } })
    if (!supabase) return undefined
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      void loadAccess(activeSession)
    })
    return () => { current = false; subscription.unsubscribe() }
  }, [])

  if (!isConfigured) return <main><AuthNotice title="Connect Supabase first" message="Add your Supabase URL and publishable key to .env.local, then restart the development server." /></main>
  if (loading) return <main><AuthNotice title="Checking your access" message="Please wait…" /></main>
  if (error) return <main><AuthNotice title="Could not check access" message={error} /></main>
  if (!session) return <AuthScreen />
  if (!profile || profile.status !== 'active') return <main><AuthNotice title="Access request pending" message="Your account is registered. An administrator must approve it before you can view booking data." signOutButton /></main>
  return <BrowserRouter><Dashboard profile={profile} onSignOut={(context) => signOut(context)} /></BrowserRouter>
}

function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [values, setValues] = useState({ fullName: '', email: '', password: '' })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const register = mode === 'register'
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      if (register) {
        await signUp(values)
        setMessage('Registration received. Check your inbox to confirm your email, then wait for an admin to approve access.')
      } else {
        const result = await signIn(values.email, values.password)
        if (result?.user) {
          await logActivity({
            userId: result.user.id,
            email: values.email,
            full_name: values.fullName || '',
            action: 'login',
            details: 'Signed in to DD Cottages',
          })
        }
      }
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  return <main className="auth-page"><section className="auth-card"><p className="eyebrow">DD COTTAGES · MEMBER PORTAL</p><h1>{register ? 'Request team access' : 'Welcome back'}</h1><p className="subtle">{register ? 'Create an account. We will send an email confirmation before an administrator approves access.' : 'Sign in to manage bookings and room availability.'}</p><form onSubmit={submit} className="auth-form">{register && <Field label="Full name" name="fullName" value={values.fullName} onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))} required/>}<Field label="Email address" name="email" value={values.email} onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))} type="email" required/><Field label="Password" name="password" value={values.password} onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))} type="password" minLength="6" required/><button disabled={busy}>{busy ? 'Please wait…' : register ? 'Register and send email' : 'Sign in'}</button></form>{message && <p className="message">{message}</p>}<button className="text-button auth-switch" onClick={() => { setMode(register ? 'login' : 'register'); setMessage('') }}>{register ? 'Already have an account? Sign in' : 'Need access? Register here'}</button></section></main>
}

function AuthNotice({ title, message, signOutButton }) { return <section className="auth-card notice"><p className="eyebrow">DD COTTAGES</p><h1>{title}</h1><p className="subtle">{message}</p>{signOutButton && <button onClick={() => signOut()}>Sign out</button>}</section> }

function Overview({ totals, bookings }) { return <><section className="metrics"><Metric label="Total bookings" value={totals.bookings} /><Metric label="Gross revenue" value={money(totals.revenue)} /><Metric label="Payment follow-ups" value={totals.pending} /></section><section className="records"><p className="eyebrow">OVERVIEW</p><h2>Current booking status</h2><p className="subtle">{bookings.length ? 'Use the Calendar page to inspect room-by-room availability.' : 'No bookings have been added yet.'}</p></section></> }

function LegacyBookingForm() { return null }

function BookingTable({ bookings, loading, edit, remove }) { return <section className="records"><div className="section-heading"><div><p className="eyebrow">RESERVATIONS</p><h2>All stored bookings</h2></div><span>{loading ? 'Loading…' : `${bookings.length} records`}</span></div><div className="table-wrap"><table><thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Source</th><th>Amount</th><th>Payment</th><th></th></tr></thead><tbody>{bookings.length ? bookings.map((b) => <tr key={b.id}><td><strong>{b.guest_name}</strong><small>{b.mobile}</small></td><td>{b.property}<br/>Room {b.room_number}</td><td>{formatDisplayDate(b.check_in)}<br/>{formatDisplayDate(b.check_out)}</td><td>{b.source}</td><td>{money(b.gross_amount)}</td><td><span className={`pill ${b.payment_status.toLowerCase().replaceAll(' ', '-')}`}>{b.payment_status}</span></td><td><button className="text-button" onClick={() => edit(b)}>Edit</button> <button className="text-button danger" onClick={() => remove(b.id)}>Delete</button></td></tr>) : <tr><td colSpan="7" className="empty">No bookings yet. Add the first reservation from the New booking page.</td></tr>}</tbody></table></div></section> }

function Members() {
  const [members, setMembers] = useState([])
  const [message, setMessage] = useState('')
  async function refreshMembers() { try { setMembers(await getMembers()) } catch (error) { setMessage(error.message) } }
  useEffect(() => { refreshMembers() }, [])
  async function changeMember(member, changes) { try { await updateMember(member.id, changes); await refreshMembers() } catch (error) { setMessage(error.message) } }
  return <section className="records members"><div className="section-heading"><div><p className="eyebrow">ADMIN ONLY</p><h2>Member access</h2></div><button className="text-button" onClick={refreshMembers}>Refresh</button></div><p className="subtle">New registrations appear as pending after email confirmation. Activate or suspend access here.</p>{message && <p className="message">{message}</p>}<div className="table-wrap"><table><thead><tr><th>Member</th><th>Role</th><th>Access</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><strong>{member.full_name || 'No name'}</strong><small>{member.email}</small></td><td><select value={member.role} onChange={(event) => changeMember(member, { role: event.target.value })}><option value="staff">Staff</option><option value="admin">Admin</option></select></td><td><select value={member.status} onChange={(event) => changeMember(member, { status: event.target.value })}><option value="pending">Pending</option><option value="active">Active</option><option value="suspended">Suspended</option></select></td></tr>)}</tbody></table></div></section>
}

function ActivityLog({ profile }) {
  const [entries, setEntries] = useState([])
  const [message, setMessage] = useState('')
  async function refresh() {
    try {
      const logs = await getActivityLogs()
      setEntries(logs)
    } catch (error) {
      setMessage(error.message)
    }
  }
  useEffect(() => { void refresh() }, [])
  if (profile.role !== 'admin') return null
  return <section className="records"><div className="section-heading"><div><p className="eyebrow">ADMIN ONLY</p><h2>Activity log</h2></div><button className="text-button" onClick={() => void refresh()}>Refresh</button></div><p className="subtle">Tracks member sign-ins, sign-outs, and related session activity.</p>{message && <p className="message">{message}</p>}<div className="table-wrap"><table><thead><tr><th>User</th><th>Action</th><th>Details</th><th>Time</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td><strong>{entry.full_name || entry.email || 'Unknown user'}</strong><small>{entry.email}</small></td><td>{entry.action}</td><td>{entry.details}</td><td>{entry.created_at ? new Date(entry.created_at).toLocaleString('en-IN') : '—'}</td></tr>)}</tbody></table></div></section>
}

function Calendar({ bookings, month, setMonth }) {
  const days = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))
  const label = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  return <section className="calendar"><div className="section-heading"><div><p className="eyebrow">AVAILABILITY</p><h2>{label}</h2></div><div className="month-controls"><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></div></div><p className="legend"><i></i> Reserved <i className="today"></i> Today <i className="checkout-key"></i> Checkout</p><div className="calendar-scroll"><div className="calendar-grid" style={{ gridTemplateColumns: `78px repeat(${days.length}, 34px)` }}><div className="corner">Room</div>{days.map((day) => <div className={dateKey(day) === today ? 'day today' : 'day'} key={dateKey(day)}>{day.getDate()}</div>)}{ROOMS.map((room) => <div className="calendar-row" key={room}><strong>{room}</strong>{days.map((day) => { const dayKey = dateKey(day); const booking = bookings.find((b) => b.room_number === room && overlap(b, dayKey) && b.stay_status !== 'cancelled'); const checkoutBooking = bookings.find((b) => b.room_number === room && b.check_out === dayKey && b.checked_out !== true && b.stay_status !== 'checked_out' && b.stay_status !== 'cancelled'); const activeBooking = booking || checkoutBooking; const cellClass = checkoutBooking ? 'checkout' : booking ? 'booked' : dayKey === today ? 'today-cell' : ''; const title = activeBooking ? `${activeBooking.guest_name} · ${formatDisplayDate(activeBooking.check_in)} to ${formatDisplayDate(activeBooking.check_out)}${checkoutBooking ? ' · checkout day' : ''}` : 'Available'; return <span title={title} className={cellClass} key={dayKey}>{activeBooking ? '●' : ''}</span> })}</div>)}</div></div><p className="subtle">Reserved dates stay blocked. Checkout days are marked in amber.</p></section>
}
function Metric({ label, value }) { return <article><span>{label}</span><strong>{value}</strong></article> }
function Field({ label, name, value, onChange, ...props }) { return <label>{label}<input name={name} value={value ?? ''} onChange={(e) => onChange(name, e.target.value)} {...props}/></label> }
function Select({ label, name, value, onChange, values }) { return <label>{label}<select name={name} value={value ?? ''} onChange={(e) => onChange(name, e.target.value)}>{values.map((item) => <option key={item}>{item}</option>)}</select></label> }
export default App
