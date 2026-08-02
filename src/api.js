import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const isConfigured = Boolean(url && key && !url.includes('your-project'))
export const supabase = isConfigured ? createClient(url, key) : null

function client() {
  if (!supabase) throw new Error('Connect Supabase before continuing.')
  return supabase
}

export async function getSession() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function signIn(email, password) {
  const { data, error } = await client().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp({ fullName, email, password }) {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
  })
  if (error) throw error
  return data
}

export async function signOut(userContext = {}) {
  const { userId, email, full_name } = userContext
  if (userId) {
    try {
      await logActivity({
        userId,
        email: email || '',
        full_name: full_name || '',
        action: 'logout',
          details: 'Signed out of Down da village',
      })
    } catch (error) {
      console.error(error)
    }
  }
  await client().auth.signOut()
}

export async function getProfile(id) {
  const { data, error } = await client().from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getMembers() {
  const { data, error } = await client().from('profiles').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function logActivity({ userId, email, full_name, action, details = '' }) {
  if (!supabase) return null

  let resolvedUserId = userId
  if (!resolvedUserId) {
    const { data: { user }, error: userError } = await client().auth.getUser()
    if (userError) {
      console.error(userError)
      return null
    }
    resolvedUserId = user?.id
  }

  if (!resolvedUserId) return null

  const { data, error } = await client().rpc('log_activity_entry', {
    p_user_id: resolvedUserId,
    p_email: email || '',
    p_full_name: full_name || '',
    p_action: action,
      p_details: details,
    p_created_at: new Date().toISOString(),
  })

  if (error) {
    console.error(error)
    return null
  }
  return data
}

export async function getActivityLogs() {
  if (!supabase) return []
  const { data, error } = await client().from('activity_logs').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateMember(id, changes) {
  const { data, error } = await client().from('profiles').update(changes).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getBookings() {
  if (!supabase) return []
  const { data, error } = await supabase.from('bookings').select('*').order('check_in', { ascending: true })
  if (error) throw error
  return data
}

export async function getWaterBottleEntries() {
  if (!supabase) return []
  const { data, error } = await supabase.from('water_bottle_entries').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getWaterBottleStock() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('water_bottle_stock')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveWaterBottleStock(stock) {
  if (!supabase) throw new Error('Connect Supabase before saving water bottle stock.')
  const { id, ...values } = stock
  const payload = {
    ...values,
    updated_at: new Date().toISOString(),
  }
  const request = id
    ? supabase.from('water_bottle_stock').update(payload).eq('id', id).select().single()
    : supabase.from('water_bottle_stock').insert(payload).select().single()
  const { data, error } = await request
  if (error) throw error
  return data
}

export async function saveWaterBottleEntry(entry) {
  if (!supabase) throw new Error('Connect Supabase before saving water bottle entries.')
  const { id: _id, ...values } = entry
  const { data, error } = await supabase.from('water_bottle_entries').insert(values).select().single()
  if (error) throw error
  return data
}

export async function deleteWaterBottleEntry(id) {
  if (!supabase) throw new Error('Connect Supabase before deleting water bottle entries.')
  const { error } = await supabase.from('water_bottle_entries').delete().eq('id', id)
  if (error) throw error
}

export async function saveBooking(booking) {
  if (!supabase) throw new Error('Connect Supabase before saving bookings.')
  const { id, ...values } = booking
  const normalizedValues = {
    ...values,
    property: values.property === 'DD Serenity' ? 'DD Serenity Cottages' : values.property,
  }
  const request = id
    ? supabase.from('bookings').update(normalizedValues).eq('id', id).select().single()
    : supabase.from('bookings').insert(normalizedValues).select().single()
  const { data, error } = await request
  if (error) throw error
  return data
}

export async function removeBooking(id) {
  if (!supabase) throw new Error('Connect Supabase before deleting bookings.')
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) throw error
}

export async function cancelBooking(id) {
  if (!id || typeof id !== 'string') throw new Error('Invalid booking ID')
  const { data, error } = await client().from('bookings')
    .update({ stay_status: 'cancelled', checked_out: false })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

export async function checkInBooking(id) {
  if (!id) throw new Error('Booking ID is required')
  const idString = String(id)
  if (typeof idString !== 'string' || idString.includes('[object')) throw new Error(`Invalid booking ID format: ${idString}`)
  const { data, error } = await client().from('bookings')
    .update({ stay_status: 'checked_in', checked_in_at: new Date().toISOString(), checked_out: false })
    .eq('id', idString).select().single()
  if (error) throw error
  return data
}

export async function checkOutBooking(id) {
  if (!id || typeof id !== 'string') throw new Error('Invalid booking ID')
  const { data, error } = await client().from('bookings')
    .update({ stay_status: 'checked_out', checked_out_at: new Date().toISOString(), checked_out: true })
    .eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getCashHandoverEntries() {
  if (!supabase) return []
  const { data, error } = await supabase.from('cash_handover_entries').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function saveCashHandoverEntry(entry) {
  if (!supabase) throw new Error('Connect Supabase before saving handover entries.')
  const { id, ...values } = entry
  const request = id
    ? supabase.from('cash_handover_entries').update(values).eq('id', id).select().single()
    : supabase.from('cash_handover_entries').insert(values).select().single()
  const { data, error } = await request
  if (error) throw error
  return data
}

export async function deleteCashHandoverEntry(id) {
  if (!supabase) throw new Error('Connect Supabase before deleting handover entries.')
  const { error } = await supabase.from('cash_handover_entries').delete().eq('id', id)
  if (error) throw error
}

export async function getExpenses() {
  if (!supabase) return []
  const { data, error } = await supabase.from('expenses').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function saveExpense(expense) {
  if (!supabase) throw new Error('Connect Supabase before saving expenses.')
  const { id, ...values } = expense
  const request = id
    ? supabase.from('expenses').update(values).eq('id', id).select().single()
    : supabase.from('expenses').insert(values).select().single()
  const { data, error } = await request
  if (error) throw error
  return data
}
