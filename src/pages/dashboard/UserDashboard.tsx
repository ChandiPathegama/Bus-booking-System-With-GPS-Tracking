import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Ticket, Eye, Navigation, Star, AlertCircle, TrendingUp, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { supabase, type Booking, type Trip, type Bus, type Ticket as TicketType } from '../../lib/supabase';

interface BookingWithDetails extends Booking {
  trip: Trip & {
    bus: Bus;
  };
  tickets?: TicketType[];
}

interface TripUpdate {
  id: string;
  update_type: string;
  actual_time: string;
  status: string;
  message: string;
  created_at: string;
}

interface ActiveTrip extends BookingWithDetails {
  latestUpdate?: TripUpdate;
  hasStarted: boolean;
  hasArrived: boolean;
}

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>([]);
  const [completedTrips, setCompletedTrips] = useState<ActiveTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          trips!inner (
            *,
            buses!inner (*)
          ),
          tickets!left (*)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      const formattedBookings: BookingWithDetails[] = (data || []).map((booking: any) => ({
        id: booking.id,
        user_id: booking.user_id,
        trip_id: booking.trip_id,
        passenger_name: booking.passenger_name,
        passenger_email: booking.passenger_email,
        passenger_phone: booking.passenger_phone,
        seat_numbers: booking.seat_numbers,
        total_amount: booking.total_amount,
        booking_status: booking.booking_status,
        payment_status: booking.payment_status,
        booking_reference: booking.booking_reference,
        created_at: booking.created_at,
        trip: {
          id: booking.trips.id,
          bus_id: booking.trips.bus_id,
          driver_id: booking.trips.driver_id,
          trip_date: booking.trips.trip_date,
          departure_time: booking.trips.departure_time,
          arrival_time: booking.trips.arrival_time,
          price_per_seat: booking.trips.price_per_seat,
          available_seats: booking.trips.available_seats,
          status: booking.trips.status,
          bus: {
            id: booking.trips.buses.id,
            owner_id: booking.trips.buses.owner_id,
            name: booking.trips.buses.name,
            plate_number: booking.trips.buses.plate_number,
            bus_type: booking.trips.buses.bus_type,
            total_seats: booking.trips.buses.total_seats,
            amenities: booking.trips.buses.amenities || [],
            from_city: booking.trips.buses.from_city,
            to_city: booking.trips.buses.to_city,
            status: booking.trips.buses.status
          }
        },
        tickets: booking.tickets || []
      }));

      setBookings(formattedBookings);
      await fetchActiveTrips(formattedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveTrips = async (allBookings: BookingWithDetails[]) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const todaysBookings = allBookings.filter(
        b => b.booking_status === 'confirmed' && b.trip.trip_date === today
      );

      if (todaysBookings.length === 0) {
        setActiveTrips([]);
        setCompletedTrips([]);
        return;
      }

      const tripIds = todaysBookings.map(b => b.trip_id);
      
      const { data: updatesData, error: updatesError } = await supabase
        .from('trip_updates')
        .select('*')
        .in('trip_id', tripIds)
        .order('created_at', { ascending: false });

      if (updatesError) {
        console.error('Error fetching trip updates:', updatesError);
        setActiveTrips(todaysBookings.map(t => ({
          ...t,
          hasStarted: false,
          hasArrived: false
        })));
        return;
      }

      const activeTripsWithUpdates: ActiveTrip[] = todaysBookings.map(booking => {
        const tripUpdates = updatesData?.filter(u => u.trip_id === booking.trip_id) || [];
        const departureUpdate = tripUpdates.find(u => u.update_type === 'departure');
        const arrivalUpdate = tripUpdates.find(u => u.update_type === 'arrival');
        const latestUpdate = tripUpdates[0];

        return {
          ...booking,
          latestUpdate: latestUpdate || undefined,
          hasStarted: !!departureUpdate,
          hasArrived: !!arrivalUpdate
        };
      });

      // Separate active and completed trips
      const active = activeTripsWithUpdates.filter(t => !t.hasArrived);
      const completed = activeTripsWithUpdates.filter(t => t.hasArrived);

      setActiveTrips(active);
      setCompletedTrips(completed);
    } catch (error) {
      console.error('Error fetching active trips:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'completed':
        return 'text-dark-600 bg-dark-50 border-dark-200';
      case 'cancelled':
        return 'text-error-600 bg-error-50 border-error-200';
      default:
        return 'text-dark-600 bg-dark-50 border-dark-200';
    }
  };

  const getUpdateTypeIcon = (updateType: string) => {
    switch (updateType) {
      case 'departure':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'arrival':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'delay':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'breakdown':
      case 'emergency':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'route_change':
        return <MapPin className="h-5 w-5 text-purple-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getUpdateTypeColor = (updateType: string) => {
    switch (updateType) {
      case 'departure':
        return 'bg-green-50 border-green-200';
      case 'arrival':
        return 'bg-blue-50 border-blue-200';
      case 'delay':
        return 'bg-yellow-50 border-yellow-200';
      case 'breakdown':
      case 'emergency':
        return 'bg-red-50 border-red-200';
      case 'route_change':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const hasRating = (booking: BookingWithDetails) => {
    return booking.tickets && booking.tickets.length > 0 && 
           (booking.tickets[0].rating !== null || booking.tickets[0].comment !== null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const confirmedBookings = bookings.filter(b => b.booking_status === 'confirmed');
  const completedBookings = bookings.filter(b => b.booking_status === 'completed');
  const totalSpent = bookings.reduce((sum, booking) => sum + booking.total_amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-800">Welcome back, {user?.name}!</h1>
          <p className="text-dark-600 mt-2">Manage your bookings and travel history</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-500">Active Bookings</p>
                <p className="text-3xl font-bold text-dark-800">{confirmedBookings.length}</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-lg">
                <Calendar className="h-8 w-8 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-500">Completed Trips</p>
                <p className="text-3xl font-bold text-dark-800">{completedBookings.length}</p>
              </div>
              <div className="bg-success-100 p-3 rounded-lg">
                <Eye className="h-8 w-8 text-success-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-500">Total Spent</p>
                <p className="text-3xl font-bold text-dark-800">LKR {totalSpent.toLocaleString()}</p>
              </div>
              <div className="bg-warning-100 p-3 rounded-lg">
                <Ticket className="h-8 w-8 text-warning-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Trips Section */}
        {activeTrips.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg mb-8">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-500 to-primary-600">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Navigation className="h-6 w-6" />
                <span>Active Trips Today</span>
              </h2>
              <p className="text-primary-100 text-sm mt-1">Live status updates for your ongoing trips</p>
            </div>

            <div className="divide-y divide-gray-200">
              {activeTrips.map((trip) => (
                <div key={trip.id} className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-dark-800">{trip.trip.bus.name}</h3>
                          <p className="text-sm text-dark-500">{trip.trip.bus.plate_number}</p>
                        </div>
                        {trip.hasStarted ? (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200 animate-pulse">
                            🚌 In Transit
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                            ⏳ Scheduled
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-dark-500">Route</p>
                          <p className="font-semibold text-dark-800">{trip.trip.bus.from_city} → {trip.trip.bus.to_city}</p>
                        </div>
                        <div>
                          <p className="text-xs text-dark-500">Departure</p>
                          <p className="font-semibold text-dark-800">{formatTime(trip.trip.departure_time)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-dark-500">Arrival</p>
                          <p className="font-semibold text-dark-800">{formatTime(trip.trip.arrival_time)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-dark-500">Seat</p>
                          <p className="font-semibold text-dark-800">#{trip.seat_numbers[0]}</p>
                        </div>
                      </div>

                      {trip.latestUpdate && (
                        <div className={`mt-4 p-4 rounded-lg border-2 ${getUpdateTypeColor(trip.latestUpdate.update_type)}`}>
                          <div className="flex items-start space-x-3">
                            {getUpdateTypeIcon(trip.latestUpdate.update_type)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold text-dark-800 capitalize">
                                  {trip.latestUpdate.update_type.replace('_', ' ')} Update
                                </p>
                                <p className="text-xs text-dark-500">
                                  {formatDateTime(trip.latestUpdate.created_at)}
                                </p>
                              </div>
                              <p className="text-sm text-dark-600">{trip.latestUpdate.message}</p>
                              {trip.latestUpdate.actual_time && (
                                <p className="text-xs text-dark-500 mt-1">
                                  Time: {formatDateTime(trip.latestUpdate.actual_time)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col space-y-2">
                      <a
                        href={`https://tkbs.alpenbyte.com/track?${trip.trip.bus.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium flex items-center justify-center space-x-2"
                      >
                        <Navigation className="h-4 w-4" />
                        <span>Track Live</span>
                      </a>

                      <Link
                        to={`/ticket/${trip.tickets && trip.tickets.length > 0 ? trip.tickets[0].id : trip.id}`}
                        className="px-4 py-2 border-2 border-primary-500 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-medium text-center flex items-center justify-center space-x-2"
                      >
                        <Ticket className="h-4 w-4" />
                        <span>View Ticket</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Completed Trips History */}
        {completedTrips.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg mb-8">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-blue-600" />
                <div className="text-left">
                  <h2 className="text-xl font-bold text-dark-800">Today's Completed Trips</h2>
                  <p className="text-sm text-dark-500">{completedTrips.length} trip{completedTrips.length !== 1 ? 's' : ''} arrived</p>
                </div>
              </div>
              {showHistory ? (
                <ChevronUp className="h-6 w-6 text-dark-400" />
              ) : (
                <ChevronDown className="h-6 w-6 text-dark-400" />
              )}
            </button>

            {showHistory && (
              <div className="divide-y divide-gray-200 border-t border-gray-200">
                {completedTrips.map((trip) => (
                  <div key={trip.id} className="p-6 bg-gray-50">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-dark-800">{trip.trip.bus.name}</h3>
                            <p className="text-sm text-dark-500">{trip.trip.bus.plate_number}</p>
                          </div>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200">
                            ✓ Arrived
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-dark-500">Route</p>
                            <p className="font-semibold text-dark-800">{trip.trip.bus.from_city} → {trip.trip.bus.to_city}</p>
                          </div>
                          <div>
                            <p className="text-xs text-dark-500">Departure</p>
                            <p className="font-semibold text-dark-800">{formatTime(trip.trip.departure_time)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-dark-500">Arrival</p>
                            <p className="font-semibold text-dark-800">{formatTime(trip.trip.arrival_time)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-dark-500">Seat</p>
                            <p className="font-semibold text-dark-800">#{trip.seat_numbers[0]}</p>
                          </div>
                        </div>

                        {trip.latestUpdate && trip.latestUpdate.update_type === 'arrival' && (
                          <div className="mt-4 p-4 rounded-lg border-2 bg-blue-50 border-blue-200">
                            <div className="flex items-start space-x-3">
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-semibold text-dark-800">Arrival Confirmed</p>
                                  <p className="text-xs text-dark-500">
                                    {formatDateTime(trip.latestUpdate.actual_time)}
                                  </p>
                                </div>
                                <p className="text-sm text-dark-600">{trip.latestUpdate.message}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col space-y-2">
                        <Link
                          to={`/ticket/${trip.tickets && trip.tickets.length > 0 ? trip.tickets[0].id : trip.id}`}
                          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium text-center flex items-center justify-center space-x-2"
                        >
                          <Ticket className="h-4 w-4" />
                          <span>View Ticket</span>
                        </Link>

                        {trip.tickets && trip.tickets.length > 0 && (
                          <Link
                            to={`/rate-trip/${trip.tickets[0].id}`}
                            className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 ${
                              hasRating(trip)
                                ? 'border border-warning-500 text-warning-600 hover:bg-warning-50'
                                : 'bg-warning-500 text-white hover:bg-warning-600'
                            }`}
                          >
                            <Star className="h-4 w-4" />
                            <span>{hasRating(trip) ? 'View Rating' : 'Rate Trip'}</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Bookings */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-dark-800">All Bookings</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {bookings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-dark-500 text-lg">No bookings found</p>
                <p className="text-dark-400 mt-2">Start your journey by booking a bus ticket</p>
                <Link
                  to="/search"
                  className="inline-block mt-4 bg-primary-500 text-dark-800 px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors font-semibold"
                >
                  Book Your First Trip
                </Link>
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-dark-800">{booking.trip.bus.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(booking.booking_status)}`}>
                          {booking.booking_status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-dark-400" />
                          <div>
                            <p className="text-sm text-dark-500">Route</p>
                            <p className="font-semibold text-dark-800">{booking.trip.bus.from_city} → {booking.trip.bus.to_city}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-dark-400" />
                          <div>
                            <p className="text-sm text-dark-500">Date</p>
                            <p className="font-semibold text-dark-800">{formatDate(booking.trip.trip_date)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-dark-400" />
                          <div>
                            <p className="text-sm text-dark-500">Time</p>
                            <p className="font-semibold text-dark-800">{formatTime(booking.trip.departure_time)}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-dark-500">Seat</p>
                          <p className="font-semibold text-dark-800">#{booking.seat_numbers[0]}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-primary-600">LKR {booking.total_amount.toLocaleString()}</p>
                        <p className="text-sm text-dark-500">Booked on {formatDate(booking.created_at)}</p>
                      </div>
                    </div>

                    <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col space-y-2">
                      <Link
                        to={`/ticket/${booking.tickets && booking.tickets.length > 0 ? booking.tickets[0].id : booking.id}`}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium text-center flex items-center justify-center space-x-2"
                      >
                        <Ticket className="h-4 w-4" />
                        <span>View Ticket</span>
                      </Link>
                      
                      {booking.booking_status === 'confirmed' && (
                        <a
                          href={`https://tkbs.alpenbyte.com/track?${booking.trip.bus.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border border-primary-500 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-medium flex items-center justify-center space-x-2"
                        >
                          <Navigation className="h-4 w-4" />
                          <span>Track Live</span>
                        </a>
                      )}

                      {booking.booking_status === 'confirmed' && booking.tickets && booking.tickets.length > 0 && (
                        <Link
                          to={`/rate-trip/${booking.tickets[0].id}`}
                          className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 ${
                            hasRating(booking)
                              ? 'border border-warning-500 text-warning-600 hover:bg-warning-50'
                              : 'bg-warning-500 text-white hover:bg-warning-600'
                          }`}
                        >
                          <Star className="h-4 w-4" />
                          <span>{hasRating(booking) ? 'View Rating' : 'Rate Trip'}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
