export const PROPERTY_ROOMS = {
  'DD Cottages': Array.from({ length: 15 }, (_, index) => String(index + 101)),
  'DD Villa': ['Villa 01', 'Villa 02', 'Villa 03', 'Villa 04'],
  'DD Serenity Cottages': ['01', '02', '03', '04', '05']
}
export const ROOMS = Object.values(PROPERTY_ROOMS).flat()
export const PROPERTIES = ['DD Cottages', 'DD Villa', 'DD Serenity Cottages']
export const SOURCES = ['Goibibo', 'MakeMyTrip', 'Airbnb', 'Booking.com', 'Direct', 'Walk-in', 'Phone']
export const PAYMENT_STATUSES = ['Paid', 'Partially Paid', 'Pending']
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Online OTA']
export const PAID_TO = ['Hotel', 'OTA', 'Owner', 'Manager']
export const SETTLEMENT_STATUSES = ['Pending', 'Settled']
