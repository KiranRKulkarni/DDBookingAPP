export const ROOM_CATEGORIES = [
  { name: 'Deluxe Room', rooms: ['01', '02', '03'], location: 'Ground floor' },
  { name: '2BHK Villa', rooms: ['Villa'], location: 'Ground floor' },
  { name: 'Standard Room', rooms: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'], location: 'First and second floors' },
  { name: 'Family Room', rooms: ['B8', 'B9', '101', '102', '103', '104'], location: 'First floor' },
  { name: 'Family Quad Room', rooms: ['C8', 'C9', '201', '202', '203', '204'], location: 'Second floor' },
  { name: 'Deluxe Quad Room', rooms: ['301', '302', 'MH1', 'MH2', 'MH3', 'MH4', 'MH5', 'MH6', 'MH7', 'MH8'], location: 'Third floor' },
]

export const PROPERTY_ROOMS = {
  'Down da village': ROOM_CATEGORIES.flatMap(({ rooms }) => rooms),
}

export function getRoomType(roomNumbers = '') {
  const selectedRooms = String(roomNumbers).split(',').map((room) => room.trim()).filter(Boolean)
  const types = ROOM_CATEGORIES
    .filter(({ rooms }) => selectedRooms.some((room) => rooms.includes(room)))
    .map(({ name }) => name)

  return types.join(', ')
}

export const ROOMS = Object.values(PROPERTY_ROOMS).flat()
export const PROPERTIES = ['Down da village']
export const SOURCES = ['Goibibo', 'MakeMyTrip', 'Airbnb', 'Booking.com', 'Direct', 'Walk-in', 'Phone']
export const PAYMENT_STATUSES = ['Paid', 'Partially Paid', 'Pending']
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Online OTA']
export const PAID_TO = ['Hotel', 'OTA', 'Owner', 'Manager']
export const SETTLEMENT_STATUSES = ['Pending', 'Settled']
