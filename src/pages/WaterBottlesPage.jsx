import { useEffect, useMemo, useState } from 'react'
import {
  deleteWaterBottleEntry,
  getWaterBottleEntries,
  getWaterBottleStock,
  saveWaterBottleEntry,
  saveWaterBottleStock,
  supabase,
} from '../api'

const STORAGE_KEY = 'dd-water-bottles-entries'
const STOCK_STORAGE_KEY = 'dd-water-bottles-stock'
const BOTTLE_PRICE = 30

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default function WaterBottlesPage({ bookings = [], isAdmin = false }) {
  const [entries, setEntries] = useState([])
  const [stockSupplied, setStockSupplied] = useState(0)
  const [stockRecord, setStockRecord] = useState(null)
  const [form, setForm] = useState({ customer_name: '', quantity: '1', entry_date: new Date().toISOString().slice(0, 10), notes: '' })
  const [message, setMessage] = useState('')
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)

  const customerNameSuggestions = useMemo(() => {
    const activeBookings = (bookings || []).filter((booking) => {
      const status = booking?.stay_status
      return status === 'checked_in' || booking?.checked_in === true
    })

    return Array.from(
      new Map(
        activeBookings
          .filter((booking) => booking?.guest_name)
          .map((booking) => {
            const label = `${booking.guest_name} · Room ${booking.room_number || '—'}`
            return [label.toLowerCase(), { value: booking.guest_name, label, roomNumber: booking.room_number || '—' }]
          }),
      ).values(),
    )
  }, [bookings])

  const filteredCustomerSuggestions = useMemo(() => {
    const query = form.customer_name.trim().toLowerCase()
    if (!query) return customerNameSuggestions

    return customerNameSuggestions.filter((suggestion) => {
      const haystack = `${suggestion.value} ${suggestion.label} ${suggestion.roomNumber}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [customerNameSuggestions, form.customer_name])

  useEffect(() => {
    async function loadEntries() {
      try {
        if (supabase) {
          const [remoteEntries, remoteStock] = await Promise.all([getWaterBottleEntries(), getWaterBottleStock()])
          setEntries(remoteEntries || [])
          if (remoteStock) {
            setStockRecord(remoteStock)
            setStockSupplied(Number(remoteStock.supplied_quantity || 0))
          }
          return
        }

        const saved = window.localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setEntries(JSON.parse(saved))
        }
      } catch (error) {
        console.error(error)
      }
    }

    void loadEntries()
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  useEffect(() => {
    try {
      const savedStock = window.localStorage.getItem(STOCK_STORAGE_KEY)
      if (!savedStock) return

      const parsedValue = Number(savedStock)
      if (Number.isFinite(parsedValue) && parsedValue >= 0) {
        setStockSupplied(parsedValue)
      }
    } catch (error) {
      console.error(error)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STOCK_STORAGE_KEY, String(stockSupplied))
  }, [stockSupplied])

  const totals = useMemo(() => {
    const count = entries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0)
    const complimentaryCount = Math.min(count, 2)
    const chargeableCount = Math.max(count - 2, 0)
    const amount = chargeableCount * BOTTLE_PRICE
    const remaining = Math.max(stockSupplied - count, 0)
    return { count, complimentaryCount, chargeableCount, amount, remaining }
  }, [entries, stockSupplied])

  const syncStockToRemote = async (issuedQuantity, suppliedQuantity = stockSupplied) => {
    if (!supabase || !isAdmin) return

    try {
      const nextRecord = await saveWaterBottleStock({
        id: stockRecord?.id,
        supplied_quantity: suppliedQuantity,
        issued_quantity: issuedQuantity,
        remaining_quantity: Math.max(suppliedQuantity - issuedQuantity, 0),
        notes: 'Water bottle stock sync',
        entry_date: form.entry_date,
      })
      setStockRecord(nextRecord)
    } catch (error) {
      console.error(error)
    }
  }

  const addEntry = async (event) => {
    event.preventDefault()
    const customerName = form.customer_name.trim()
    const quantity = Number(form.quantity)

    if (!customerName) {
      setMessage('Enter customer name before saving.')
      return
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMessage('Quantity must be at least 1.')
      return
    }

    const currentIssuedCount = entries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0)
    if (currentIssuedCount + quantity > stockSupplied) {
      setMessage(`Only ${Math.max(stockSupplied - currentIssuedCount, 0)} bottles remain in stock.`)
      return
    }

    const matchedBooking = (bookings || []).find((booking) => {
      const bookingName = booking?.guest_name?.trim().toLowerCase()
      const normalizedCustomerName = customerName.toLowerCase()
      return (
        bookingName === normalizedCustomerName &&
        (booking?.stay_status === 'checked_in' || booking?.checked_in === true)
      )
    })

    const chargeableQuantity = Math.max(quantity - 2, 0)
    const autoNote = quantity > 2
      ? `First 2 complimentary; ${chargeableQuantity} additional bottle${chargeableQuantity === 1 ? '' : 's'} charged.`
      : ''
    const notes = [form.notes.trim(), autoNote].filter(Boolean).join(' | ')

    const nextEntry = {
      customer_name: customerName,
      room_number: matchedBooking?.room_number || '',
      quantity,
      amount: chargeableQuantity * BOTTLE_PRICE,
      entry_date: form.entry_date,
      notes,
      created_at: new Date().toISOString(),
    }

    try {
      if (supabase) {
        const savedEntry = await saveWaterBottleEntry(nextEntry)
        const nextIssuedCount = entries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0) + quantity
        setEntries((current) => [savedEntry, ...current])
        await syncStockToRemote(nextIssuedCount, stockSupplied)
      } else {
        const localEntry = {
          ...nextEntry,
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        }
        setEntries((current) => [localEntry, ...current])
      }

      setForm({ customer_name: '', quantity: '1', entry_date: new Date().toISOString().slice(0, 10), notes: '' })
      setMessage('Water bottle entry saved.')
    } catch (error) {
      console.error(error)
      const localEntry = {
        ...nextEntry,
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      }
      setEntries((current) => [localEntry, ...current])
      setMessage('Saved locally because the remote save failed.')
    }
  }

  const removeEntry = async (id) => {
    const targetEntry = entries.find((entry) => entry.id === id)
    const removedQuantity = Number(targetEntry?.quantity || 0)

    try {
      if (supabase) {
        await deleteWaterBottleEntry(id)
      }
      setEntries((current) => current.filter((entry) => entry.id !== id))
      if (supabase) {
        const nextIssuedCount = entries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0) - removedQuantity
        await syncStockToRemote(Math.max(nextIssuedCount, 0), stockSupplied)
      }
    } catch (error) {
      console.error(error)
      setEntries((current) => current.filter((entry) => entry.id !== id))
    }
  }

  const handleStockSuppliedChange = async (event) => {
    if (!isAdmin) {
      setMessage('Only admins can update the stock.')
      return
    }

    const nextValue = Number(event.target.value)
    const normalizedValue = Number.isFinite(nextValue) && nextValue >= 0 ? Math.floor(nextValue) : 0

    setStockSupplied(normalizedValue)

    if (!supabase) return

    const issuedQuantity = entries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0)
    await syncStockToRemote(issuedQuantity, normalizedValue)
  }

  const handleCustomerNameChange = (event) => {
    setForm((current) => ({ ...current, customer_name: event.target.value }))
    setShowCustomerSuggestions(true)
  }

  const selectCustomerSuggestion = (suggestion) => {
    setForm((current) => ({ ...current, customer_name: suggestion.value }))
    setShowCustomerSuggestions(false)
  }

  return (
    <section className="records water-bottles-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">WATER BOTTLES</p>
          <h2>Track bottles given to customers</h2>
          <p className="subtle">The first two bottles are complimentary. Any additional bottle costs ₹30.</p>
        </div>
      </div>

      <div className="water-summary-grid">
        <article className="summary-card">
          <span>Supplied stock</span>
          <strong>{stockSupplied}</strong>
        </article>
        <article className="summary-card">
          <span>Total issued</span>
          <strong>{totals.count}</strong>
        </article>
        <article className="summary-card">
          <span>Complimentary</span>
          <strong className="pill-soft success-pill">{totals.complimentaryCount}</strong>
        </article>
        <article className="summary-card">
          <span>Chargeable</span>
          <strong className="pill-soft warning-pill">{totals.chargeableCount}</strong>
        </article>
        <article className="summary-card">
          <span>Remaining stock</span>
          <strong>{totals.remaining}</strong>
        </article>
        <article className="summary-card">
          <span>Total amount</span>
          <strong>{formatMoney(totals.amount)}</strong>
        </article>
      </div>

      <div className="water-stock-editor">
        <label>
          Update supplied stock
          <input
            type="number"
            min="0"
            step="1"
            value={stockSupplied}
            onChange={handleStockSuppliedChange}
            disabled={!isAdmin}
          />
        </label>
        <p className="subtle">{isAdmin ? 'The remaining stock updates automatically when bottles are issued.' : 'Only admins can change the supplied stock.'}</p>
      </div>

      <form className="water-form" onSubmit={addEntry}>
        <label className="water-customer-field">
          Customer name
          <input
            value={form.customer_name}
            onChange={handleCustomerNameChange}
            onFocus={() => setShowCustomerSuggestions(true)}
            onBlur={() => window.setTimeout(() => setShowCustomerSuggestions(false), 120)}
            placeholder="Select checked-in guest"
            autoComplete="off"
            required
          />
          {showCustomerSuggestions && filteredCustomerSuggestions.length > 0 && (
            <div className="water-customer-suggestions" role="listbox">
              {filteredCustomerSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.value}-${suggestion.roomNumber}`}
                  type="button"
                  className="water-customer-suggestion"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    selectCustomerSuggestion(suggestion)
                  }}
                >
                  <span className="water-customer-name">{suggestion.value}</span>
                  <span className="water-customer-room">Room {suggestion.roomNumber}</span>
                </button>
              ))}
            </div>
          )}
        </label>
        <label>
          Bottles given
          <input
            type="number"
            min="1"
            step="1"
            value={form.quantity}
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
            required
          />
        </label>
        <label>
          Date
          <input
            type="date"
            value={form.entry_date}
            onChange={(event) => setForm((current) => ({ ...current, entry_date: event.target.value }))}
            required
          />
        </label>
        <label>
          Notes
          <input
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Optional notes"
          />
        </label>
        <button type="submit">Save entry</button>
      </form>

      {message && <p className="message">{message}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Room</th>
              <th>Date</th>
              <th>Bottles</th>
              <th>Price</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.length ? (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td><strong>{entry.customer_name}</strong></td>
                  <td>{entry.room_number || '—'}</td>
                  <td>{entry.entry_date}</td>
                  <td>{entry.quantity}</td>
                  <td>{formatMoney(entry.amount)}</td>
                  <td>{entry.notes || '—'}</td>
                  <td>
                    <button type="button" className="text-button delete-action" onClick={() => removeEntry(entry.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty">
                  No water bottle entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
