import * as XLSX from 'xlsx'

const nights = (booking) => Math.round((new Date(`${booking.check_out}T00:00:00`) - new Date(`${booking.check_in}T00:00:00`)) / 86400000)

export function exportBookings(bookings, filename = 'DD-Cottages-Bookings') {
  const rows = bookings.map((booking) => ({
    Property: booking.property,
    'Room/Cottage No.': booking.room_number,
    'Guest Name': booking.guest_name,
    Mobile: booking.mobile || '',
    'OTA/Source': booking.source,
    'Check-In': booking.check_in,
    'Check-Out': booking.check_out,
    Nights: nights(booking),
    Adults: booking.adults,
    Children: booking.children,
    'Gross Amount (₹)': Number(booking.gross_amount || 0),
    'Extra Charges (₹)': Number(booking.extra_charges || 0),
    'Discount (₹)': Number(booking.discount || 0),
    'Commission (₹)': Number(booking.commission || 0),
    'TDS (₹)': Number(booking.tds || 0),
    'Net Payable (₹)': Number(booking.gross_amount || 0) + Number(booking.extra_charges || 0) - Number(booking.discount || 0) - Number(booking.commission || 0) - Number(booking.tds || 0),
    'Advance Paid (₹)': Number(booking.advance_paid || 0),
    Comment: booking.comment || '',
    'Payment Status': booking.payment_status,
    'Payment Method': booking.payment_method || '',
    'Paid To': booking.paid_to || '',
    'Settlement Status': booking.settlement_status,
    'Stay Status': booking.stay_status,
    'Checked In At': booking.checked_in_at ? new Date(booking.checked_in_at).toLocaleString('en-IN') : '',
    'Checked Out At': booking.checked_out_at ? new Date(booking.checked_out_at).toLocaleString('en-IN') : '',
  }))
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Notice: 'No bookings match this view.' }])
  sheet['!cols'] = Array.from({ length: 24 }, (_, index) => ({ wch: [16, 18, 26, 16, 16, 13, 13][index] || 15 }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Bookings')
  XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
