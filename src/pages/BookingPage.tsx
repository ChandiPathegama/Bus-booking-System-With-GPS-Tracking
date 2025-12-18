import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, MapPin, Clock, Ticket, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, type WeeklyTimetable, type Bus, calculateAvailableSeats, getOrCreateTrip } from '../lib/supabase';

interface TimetableWithBus extends WeeklyTimetable {
  bus: Bus;
  available_seats?: number;
}

const BookingPage: React.FC = () => {
  const { tripId } = useParams(); // This will be in format: busId-date-time
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<TimetableWithBus | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [passengerDetails, setPassengerDetails] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (tripId) {
      parseTripIdAndFetch();
    }
  }, [tripId]);

  const parseTripIdAndFetch = async () => {
    try {
      // Parse tripId format: busId_date_time
      const parts = tripId?.split('_');
      if (!parts || parts.length !== 3) {
        console.error('Invalid trip ID format');
        setTimetable(null);
        setLoading(false);
        return;
      }

      const busId = parts[0];
      const date = parts[1]; // Date is already in YYYY-MM-DD format
      const time = parts[2]; // Time is already in HH:MM:SS format

      setSelectedDate(date);

      // Create date object for day calculation
      const selectedDateObj = new Date(date);
      if (isNaN(selectedDateObj.getTime())) {
        console.error('Invalid date format');
        setTimetable(null);
        setLoading(false);
        return;
      }

      // Get day of week from date
      const dayOfWeek = selectedDateObj.getDay();
      const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;

      // Fetch timetable for this bus, day, and time
      const { data, error } = await supabase
        .from('weekly_timetables')
        .select(`
          *,
          buses!inner (*)
        `)
        .eq('bus_id', busId)
        .eq('day_of_week', dayNumber)
        .eq('departure_time', time)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('Error fetching timetable:', error);
        setTimetable(null);
        return;
      }

      // Calculate available seats
      const availableSeats = await calculateAvailableSeats(
        busId,
        date,
        time,
        data.buses.total_seats
      );

      // Check if departure time has passed for today (after we have the data)
      const selectedDateObj2 = new Date(date);
      const today = new Date();
      
      if (selectedDateObj2.toDateString() === today.toDateString()) {
        const [hours, minutes] = time.split(':').map(Number);
        const departureDateTime = new Date(today);
        departureDateTime.setHours(hours, minutes, 0, 0);
        
        if (new Date() > departureDateTime) {
          // Show warning but still allow booking (seats reset after departure)
          console.log('Departure time has passed, but allowing booking as seats reset');
        }
      }
      const timetableData: TimetableWithBus = {
        id: data.id,
        bus_id: data.bus_id,
        driver_id: data.driver_id,
        day_of_week: data.day_of_week,
        departure_time: data.departure_time,
        arrival_time: data.arrival_time,
        price_per_seat: data.price_per_seat,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
        bus: {
          id: data.buses.id,
          owner_id: data.buses.owner_id,
          name: data.buses.name,
          plate_number: data.buses.plate_number,
          bus_type: data.buses.bus_type,
          total_seats: data.buses.total_seats,
          amenities: data.buses.amenities || [],
          from_city: data.buses.from_city,
          to_city: data.buses.to_city,
          status: data.buses.status
        },
        available_seats: availableSeats
      };

      setTimetable(timetableData);
    } catch (error) {
      console.error('Error parsing trip ID or fetching timetable:', error);
      setTimetable(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    if (!passengerDetails.name || !passengerDetails.email || !passengerDetails.phone) {
      alert('Please fill in all passenger details');
      return;
    }

    if (!timetable || !selectedDate) return;

    // Check if seats are available
    if (timetable.available_seats === 0) {
      alert('Sorry, this trip is fully booked.');
      return;
    }

    setBooking(true);

    try {
      // Generate booking reference
      const bookingReference = 'OMN' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

      // Get or create trip for this specific date
      const tripId = await getOrCreateTrip(timetable, selectedDate);
      
      if (!tripId) {
        alert('Failed to process trip. Please try again.');
        return;
      }

      // Update available seats in the trip
      const { error: updateError } = await supabase
        .from('trips')
        .update({ available_seats: (timetable.available_seats || 1) - 1 })
        .eq('id', tripId);

      if (updateError) {
        console.error('Error updating available seats:', updateError);
        alert('Failed to update seat availability. Please try again.');
        return;
      }

      // Create booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          user_id: user.id,
          trip_id: tripId,
          passenger_name: passengerDetails.name,
          passenger_email: passengerDetails.email,
          passenger_phone: passengerDetails.phone,
          seat_numbers: [Math.floor(Math.random() * timetable.bus.total_seats) + 1], // Random seat assignment
          total_amount: timetable.price_per_seat,
          booking_reference: bookingReference
        }])
        .select()
        .single();

      if (bookingError || !bookingData) {
        console.error('Booking error:', bookingError);
        alert('Failed to create booking. Please try again.');
        return;
      }

      // Get the generated ticket
      const { data: ticketData } = await supabase
        .from('tickets')
        .select('*')
        .eq('booking_id', bookingData.id)
        .single();

      if (ticketData) {
        navigate(`/ticket/${ticketData.id}`);
      } else {
        navigate(`/dashboard/user`);
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!timetable) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-2xl font-bold text-dark-800 mb-4">Booking Not Available</h2>
          <p className="text-dark-600 mb-6">
            This bus has either departed or the schedule is no longer available for booking.
          </p>
          <button
            onClick={() => navigate('/search')}
            className="bg-primary-500 text-dark-800 px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/search')}
            className="text-primary-600 hover:text-primary-700 mb-4"
          >
            ← Back to Search
          </button>
          <h1 className="text-3xl font-bold text-dark-800">Book Your Journey</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trip Details & Passenger Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bus Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-dark-800 mb-4">{timetable.bus.name}</h2>
              
              {/* Weekly Schedule Notice */}
              <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <p className="text-sm text-primary-700">
                  📅 <strong>Weekly Schedule:</strong> This bus runs every week on the same schedule. 
                  You're booking for {formatDate(selectedDate)}.
                </p>
              </div>

              {/* Seat Availability Warning */}
              {timetable.available_seats && timetable.available_seats <= 5 && (
                <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
                  <p className="text-sm text-warning-700">
                    ⚠️ <strong>Limited Seats:</strong> Only {timetable.available_seats} seats remaining!
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-dark-400" />
                  <div>
                    <p className="text-sm text-dark-500">From</p>
                    <p className="font-semibold text-dark-800">{timetable.bus.from_city}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-dark-400" />
                  <div>
                    <p className="text-sm text-dark-500">To</p>
                    <p className="font-semibold text-dark-800">{timetable.bus.to_city}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-dark-400" />
                  <div>
                    <p className="text-sm text-dark-500">Departure</p>
                    <p className="font-semibold text-dark-800">{formatTime(timetable.departure_time)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-dark-400" />
                  <div>
                    <p className="text-sm text-dark-500">Arrival</p>
                    <p className="font-semibold text-dark-800">{formatTime(timetable.arrival_time)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-dark-500 mb-2">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {timetable.bus.amenities.map((amenity: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Passenger Details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-dark-800 mb-4">Passenger Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-600 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
                    <input
                      type="text"
                      value={passengerDetails.name}
                      onChange={(e) => setPassengerDetails(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-600 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
                    <input
                      type="email"
                      value={passengerDetails.email}
                      onChange={(e) => setPassengerDetails(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-dark-600 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
                    <input
                      type="tel"
                      value={passengerDetails.phone}
                      onChange={(e) => setPassengerDetails(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="+94 XX XXX XXXX"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <h3 className="text-lg font-bold text-dark-800 mb-4">Booking Summary</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-dark-600">Route</span>
                  <span className="font-semibold">{timetable.bus.from_city} → {timetable.bus.to_city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-600">Date</span>
                  <span className="font-semibold">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-600">Time</span>
                  <span className="font-semibold">{formatTime(timetable.departure_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-600">Available Seats</span>
                  <span className="font-semibold text-primary-600">
                    {timetable.available_seats}/{timetable.bus.total_seats}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-600">Seats</span>
                  <span className="font-semibold">1 Seat</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-600">Price per seat</span>
                  <span className="font-semibold">LKR {timetable.price_per_seat.toLocaleString()}</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span className="text-primary-600">LKR {timetable.price_per_seat.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handleBooking}
                disabled={booking || timetable.available_seats === 0}
                className="w-full bg-primary-500 text-dark-800 py-4 rounded-lg hover:bg-primary-600 transition-all font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Ticket className="h-5 w-5" />
                <span>
                  {booking ? 'Booking...' : 
                   timetable.available_seats === 0 ? 'Fully Booked' : 
                   'Book Seat & Get Ticket'}
                </span>
              </button>

              <p className="text-xs text-dark-500 mt-4 text-center">
                No payment required - Ticket will be issued instantly
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;