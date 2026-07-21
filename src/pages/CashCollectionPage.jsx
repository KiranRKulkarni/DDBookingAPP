import { useEffect, useMemo, useState } from 'react'
import { deleteCashHandoverEntry, getCashHandoverEntries, saveCashHandoverEntry } from '../api'
import { formatDisplayDate } from '../utils/dateFormat'

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))

export default function CashCollectionPage({ bookings }) {
  const cashRecords = useMemo(() => bookings.filter((booking) => booking.payment_method === 'Cash'), [bookings])
  const totalAdvancePaid = cashRecords.reduce((sum, booking) => {
    if (booking.payment_status === 'Paid') return sum + Number(booking.gross_amount || 0)
    return sum + Number(booking.advance_paid || 0)
  }, 0)
  const totalAmount = cashRecords.reduce((sum, booking) => sum + Number(booking.gross_amount || 0), 0)
  const totalRemaining = totalAmount - totalAdvancePaid
  const [handover, setHandover] = useState({
    date: new Date().toISOString().slice(0, 10),
    handoverTo: '',
    amount: totalRemaining,
    notes: ''
  })
  const [handoverEntries, setHandoverEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState(null)
  const [message, setMessage] = useState('')

  const totalHandoverValue = useMemo(() => handoverEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0), [handoverEntries])

  useEffect(() => {
    async function loadEntries() {
      try {
        setLoadingEntries(true)
        const entries = await getCashHandoverEntries()
        setHandoverEntries(entries)
      } catch (error) {
        console.error(error)
        setMessage('Unable to load cash handover entries from Supabase.')
      } finally {
        setLoadingEntries(false)
      }
    }

    loadEntries()
  }, [])

  function updateHandover(name, value) {
    setHandover((current) => ({ ...current, [name]: value }))
  }

  function resetHandoverForm() {
    setHandover((current) => ({ ...current, handoverTo: '', amount: totalRemaining, notes: '' }))
    setEditingEntryId(null)
  }

  async function createHandoverEntry(event) {
    event.preventDefault()

    if (!handover.handoverTo.trim()) {
      setMessage('Enter the person receiving the cash handover.')
      return
    }

    const amount = Number(handover.amount || 0)
    if (!amount || amount <= 0) {
      setMessage('Enter a valid handover amount.')
      return
    }

    try {
      const entry = await saveCashHandoverEntry({
        id: editingEntryId || undefined,
        handover_to: handover.handoverTo.trim(),
        amount,
        notes: handover.notes.trim(),
        entry_date: handover.date
      })

      setHandoverEntries((current) => {
        const updated = editingEntryId
          ? current.map((item) => (item.id === editingEntryId ? entry : item))
          : [entry, ...current]
        return updated
      })
      setMessage(editingEntryId ? `Updated handover entry for ${entry.handover_to}.` : `Cash handover entry created for ${entry.handover_to}.`)
      resetHandoverForm()
    } catch (error) {
      console.error(error)
      setMessage('Unable to save the cash handover entry to Supabase.')
    }
  }

  function startEditingEntry(entry) {
    setEditingEntryId(entry.id)
    setHandover({
      date: entry.entry_date,
      handoverTo: entry.handover_to,
      amount: entry.amount,
      notes: entry.notes || ''
    })
    setMessage(`Editing handover entry for ${entry.handover_to}.`)
  }

  async function removeHandoverEntry(entryId) {
    try {
      await deleteCashHandoverEntry(entryId)
      setHandoverEntries((current) => current.filter((item) => item.id !== entryId))
      if (editingEntryId === entryId) {
        resetHandoverForm()
      }
      setMessage('Cash handover entry deleted.')
    } catch (error) {
      console.error(error)
      setMessage('Unable to delete the cash handover entry from Supabase.')
    }
  }

  return <section className="records cash-page"><div className="section-heading"><div><p className="eyebrow">CASH COLLECTION</p><h2>All cash payment records</h2><p className="subtle">Cash advances received and pending collections.</p></div><div className="cash-summary"><div className="cash-metric"><small>Cash Collected</small><strong>{money(totalAdvancePaid)}</strong></div><div className="cash-metric"><small>Total Bookings</small><strong>{money(totalAmount)}</strong></div><div className="cash-metric"><small>Remaining Due</small><strong>{money(totalRemaining)}</strong></div></div></div><section className="cash-handover-card"><div className="section-heading"><div><p className="eyebrow">CASH HANDOVER</p><h3>Create a cash handover entry</h3></div><span className="cash-total">{money(Number(handover.amount || 0))}</span></div><form onSubmit={createHandoverEntry}><div className="field-grid handover-grid"><label>Handover date<input type="date" name="date" value={handover.date} onChange={(event) => updateHandover('date', event.target.value)} /></label><label>Handover to<input type="text" name="handoverTo" value={handover.handoverTo} onChange={(event) => updateHandover('handoverTo', event.target.value)} placeholder="Name of staff" /></label><label>Amount<input type="number" name="amount" value={handover.amount} onChange={(event) => updateHandover('amount', event.target.value)} /></label><label className="handover-notes">Notes<textarea name="notes" value={handover.notes} onChange={(event) => updateHandover('notes', event.target.value)} rows="3" placeholder="Any remarks about the handover" /></label></div><div className="handover-actions"><button type="submit">{editingEntryId ? 'Save changes' : 'Create handover entry'}</button>{editingEntryId ? <button type="button" className="text-button" onClick={resetHandoverForm}>Cancel</button> : null}</div>{message && <p className="message">{message}</p>}</form></section><section className="cash-handover-card handover-log-card"><div className="section-heading"><div><p className="eyebrow">HANDOVER LOG</p><h3>Recorded cash handovers</h3></div><span className="cash-total">{money(totalHandoverValue)}</span></div>{loadingEntries ? <p className="empty">Loading handover entries…</p> : handoverEntries.length ? <ul className="handover-list">{handoverEntries.map((entry) => <li key={entry.id} className="handover-item"><div><strong>{entry.handover_to}</strong><small>{entry.entry_date}</small></div><div className="handover-amount">{money(entry.amount)}</div>{entry.notes ? <p>{entry.notes}</p> : null}<div className="handover-actions-inline"><button type="button" className="text-button edit-handover-button" onClick={() => startEditingEntry(entry)}>Edit</button><button type="button" className="text-button danger-button" onClick={() => removeHandoverEntry(entry.id)}>Delete</button></div></li>)}</ul> : <p className="empty">No cash handover entries yet.</p>}</section><div className="table-wrap"><table><thead><tr><th>Guest</th><th>Room</th><th>Stay</th><th>Total Amount</th><th>Advance paid</th><th>Remaining</th><th>Payment status</th><th>Paid to</th></tr></thead><tbody>{cashRecords.length ? cashRecords.map((booking) => { const remaining = booking.payment_status === 'Paid' ? 0 : Number(booking.gross_amount || 0) - Number(booking.advance_paid || 0); return <tr key={booking.id}><td><strong>{booking.guest_name}</strong><small>{booking.mobile}</small></td><td>{booking.property}<br/>Room {booking.room_number}</td><td>{formatDisplayDate(booking.check_in)}<br/>{formatDisplayDate(booking.check_out)}</td><td><strong>{money(booking.gross_amount)}</strong></td><td><strong className="advance-paid">{money(booking.advance_paid)}</strong></td><td><strong className={remaining > 0 ? 'remaining-due' : 'fully-paid'}>{money(remaining)}</strong></td><td><span className={`pill ${booking.payment_status.toLowerCase().replaceAll(' ', '-')}`}>{booking.payment_status}</span></td><td>{booking.paid_to || '—'}</td></tr> }) : <tr><td colSpan="8" className="empty">No cash collection records yet.</td></tr>}</tbody></table></div></section>
}
