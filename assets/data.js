/* Frontend display data. NOTE: cars and bookings come from the REST API;
 * these constants are only for labels, selects and rules display. */

const CITIES = [
  { id: 'delhi', name: 'Delhi NCR' },
  { id: 'mumbai', name: 'Mumbai' },
  { id: 'bangalore', name: 'Bengaluru' },
  { id: 'pune', name: 'Pune' },
  { id: 'jaipur', name: 'Jaipur' }
];

const CAR_TYPES = ['Hatchback', 'Sedan', 'SUV', 'MPV', 'Luxury'];

const EXTRAS = [
  { id: 'gps', label: 'GPS Navigation', perDay: 150, flat: 0, desc: 'Live navigation device mounted in the car' },
  { id: 'childSeat', label: 'Child Seat', perDay: 100, flat: 0, desc: 'Certified child seat (up to 6 years)' },
  { id: 'insurance', label: 'Zero-Dep Insurance', perDay: 0, flat: 299, desc: 'Reduces liability in case of damage (flat fee)' }
];

const RULES = {
  maxRentalDays: 30,
  gstPercent: 18,
  coupon: { code: 'DRIVE10', percentOffBase: 10, maxDiscount: 500 },
  cancelWindowNote: 'Free cancellation until 24 hours before pickup'
};
