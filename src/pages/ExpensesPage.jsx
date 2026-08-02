import { useEffect, useMemo, useState } from 'react'
import { getExpenses, saveExpense } from '../api'
import { PROPERTIES } from '../data'
import { exportExpenses } from '../utils/exportExpenses'

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))

const today = () => new Date().toISOString().slice(0, 10)

export default function ExpensesPage() {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState({ entry_date: today(), description: '', amount: '', property: PROPERTIES[0] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('All properties')

  async function refreshExpenses() {
    setLoading(true)
    try {
      setEntries(await getExpenses())
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshExpenses()
  }, [])

  const filteredEntries = useMemo(() => {
    if (propertyFilter === 'All properties') return entries
    return entries.filter((entry) => entry.property === propertyFilter)
  }, [entries, propertyFilter])

  const totalAmount = useMemo(() => filteredEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0), [filteredEntries])

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    if (!form.entry_date) {
      setMessage('Please select a date.')
      return
    }
    if (!form.description.trim()) {
      setMessage('Please enter a description.')
      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setMessage('Please enter a valid amount.')
      return
    }

    setSaving(true)
    try {
      await saveExpense({
        entry_date: form.entry_date,
        description: form.description.trim(),
        amount: Number(form.amount),
        property: form.property === 'All properties' ? PROPERTIES[0] : form.property,
      })
      setForm({ entry_date: today(), description: '', amount: '', property: PROPERTIES[0] })
      setMessage('Expense saved successfully.')
      await refreshExpenses()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="records expense-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">EXPENSES</p>
          <h2>Expense tracker</h2>
        </div>
        <span>{loading ? 'Loading…' : `${entries.length} records`}</span>
      </div>

      <form className="expense-form" onSubmit={submit}>
        <label>
          Date
          <input type="date" value={form.entry_date} onChange={(event) => setForm((current) => ({ ...current, entry_date: event.target.value }))} />
        </label>
        <label>
          Property
          <select value={form.property} onChange={(event) => setForm((current) => ({ ...current, property: event.target.value }))}>
            {PROPERTIES.map((property) => <option key={property} value={property}>{property}</option>)}
          </select>
        </label>
        <label>
          Description
          <input type="text" value={form.description} placeholder="e.g. Staff food" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </label>
        <label>
          Amount
          <input type="number" min="0" step="0.01" value={form.amount} placeholder="0" onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
        </label>
        <button className="text-button" disabled={saving}>{saving ? 'Saving…' : 'Submit expense'}</button>
      </form>

      {message && <p className="message">{message}</p>}

      <div className="expense-summary">
        <div className="expense-toolbar">
          <label>
            Filter by property
            <select value={propertyFilter} onChange={(event) => setPropertyFilter(event.target.value)}>
              <option value="All properties">All properties</option>
              {PROPERTIES.map((property) => <option key={property} value={property}>{property}</option>)}
            </select>
          </label>
          <button className="export-button" onClick={() => exportExpenses(filteredEntries, propertyFilter === 'All properties' ? 'Down-da-village-Expenses' : `Down-da-village-Expenses-${propertyFilter}`)}>Export Excel</button>
        </div>
        <div className="expense-total-card">
          <small>Total expenses</small>
          <strong>{money(totalAmount)}</strong>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Property</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length ? filteredEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.entry_date}</td>
                <td>{entry.property || '—'}</td>
                <td>{entry.description}</td>
                <td>{money(entry.amount)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="empty">No expenses yet. Add the first expense above.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
