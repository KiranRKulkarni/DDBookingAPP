import * as XLSX from 'xlsx'

const today = new Date().toISOString().slice(0, 10)

export function exportDailyMovement(bookings) {
  const rows = bookings.flatMap((booking) => {
    const rowsForBooking = []
    const nights = Math.round((new Date(`${booking.check_out}T00:00:00`) - new Date(`${booking.check_in}T00:00:00`)) / 86400000)
    const exportRow = (movement, actual) => ({
      Date: today,
      Movement: movement,
      Property: booking.property,
      'Room/Cottage No.': booking.room_number,
      'Guest Name': booking.guest_name,
      Mobile: booking.mobile || '',
      'OTA/Source': booking.source,
      'Check-In': booking.check_in,
      'Check-Out': booking.check_out,
      Nights: nights,
      Adults: booking.adults,
      Children: booking.children,
      'Gross Amount (₹)': Number(booking.gross_amount || 0),
      'Extra Charges (₹)': Number(booking.extra_charges || 0),
      'Discount (₹)': Number(booking.discount || 0),
      'Commission (₹)': Number(booking.commission || 0),
      'TDS (₹)': Number(booking.tds || 0),
      'Net Payable (₹)': Number(booking.gross_amount || 0) + Number(booking.extra_charges || 0) - Number(booking.discount || 0) - Number(booking.commission || 0) - Number(booking.tds || 0),
      'Advance Paid (₹)': Number(booking.advance_paid || 0),
      'Payment Status': booking.payment_status,
      'Payment Method': booking.payment_method || '',
      'Paid To': booking.paid_to || '',
      'Settlement Status': booking.settlement_status,
      'Actual time': actual ? new Date(actual).toLocaleString('en-IN') : 'Not completed',
      'Stay Status': booking.stay_status,
    })
    if (booking.check_in === today) rowsForBooking.push(exportRow('Check-in', booking.checked_in_at))
    if (booking.check_out === today) rowsForBooking.push(exportRow('Check-out', booking.checked_out_at))
    if (booking.check_in < today && booking.check_out > today && booking.stay_status !== 'checked_out' && booking.stay_status !== 'cancelled') rowsForBooking.push(exportRow('In house', booking.checked_in_at))
    return rowsForBooking
  })
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Date: today, Movement: 'No arrivals or check-outs today' }])
  sheet['!cols'] = [{ wch: 13 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 13 }, { wch: 13 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 17 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 17 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 23 }, { wch: 16 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Daily movement')
  XLSX.writeFile(workbook, `Down-da-village-Daily-Movement-${today}.xlsx`)
}
