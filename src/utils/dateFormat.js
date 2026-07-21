export function toLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDisplayDate(value) {
  if (!value) return '—'

  if (value instanceof Date) {
    return formatDisplayDate(toLocalDateKey(value))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`
    }

    const parsedDate = new Date(trimmed)
    if (!Number.isNaN(parsedDate.getTime())) {
      return formatDisplayDate(parsedDate)
    }
  }

  return value
}
