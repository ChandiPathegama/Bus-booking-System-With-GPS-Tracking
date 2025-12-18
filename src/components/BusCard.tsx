import React, { useState, useEffect } from 'react';
import { Clock, Users, MapPin, Star, X, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface BusCardProps {
  trip: {
    id: string;
    busName: string;
    from: string;
    to: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    availableSeats: number;
    totalSeats: number;
    price: number;
    rating: number;
    amenities: string[];
    busId: string;
  };
}

interface Rating {
  id: string;
  rating: number;
  comment: string;
  passenger_name: string;
  issued_at: string;
}

const BusCard: React.FC<BusCardProps> = ({ trip }) => {
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [averageRating, setAverageRating] = useState(trip.rating || 0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [displayRating, setDisplayRating] = useState(trip.rating || 0);

  // Fetch rating on component mount
  useEffect(() => {
    fetchBusRating();
  }, [trip.busId]);

  const fetchBusRating = async () => {
    try {
      let busId = trip.busId;
      
      if (!busId && trip.id.includes('_')) {
        busId = trip.id.split('_')[0];
      }

      if (!busId) return;

      // Quick rating calculation without fetching all details
      const { data: tripsData } = await supabase
        .from('trips')
        .select('id')
        .eq('bus_id', busId);

      if (!tripsData || tripsData.length === 0) return;

      const tripIds = tripsData.map(t => t.id);

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id')
        .in('trip_id', tripIds);

      if (!bookingsData || bookingsData.length === 0) return;

      const bookingIds = bookingsData.map(b => b.id);

      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('rating')
        .in('booking_id', bookingIds)
        .not('rating', 'is', null)
        .gte('rating', 1);

      if (ticketsData && ticketsData.length > 0) {
        const avg = ticketsData.reduce((sum, t) => sum + t.rating, 0) / ticketsData.length;
        setDisplayRating(Number(avg.toFixed(1)));
        setTotalRatings(ticketsData.length);
      }
    } catch (error) {
      console.error('Error fetching bus rating:', error);
    }
  };

  const fetchRatings = async () => {
    setLoadingRatings(true);
    try {
      let busId = trip.busId;
      
      if (!busId && trip.id.includes('_')) {
        busId = trip.id.split('_')[0];
      }

      if (!busId) {
        console.error('Bus ID not found');
        setLoadingRatings(false);
        return;
      }

      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('id')
        .eq('bus_id', busId);

      if (tripsError) {
        console.error('Error fetching trips:', tripsError);
        setLoadingRatings(false);
        return;
      }

      if (!tripsData || tripsData.length === 0) {
        setRatings([]);
        setAverageRating(0);
        setTotalRatings(0);
        setLoadingRatings(false);
        return;
      }

      const tripIds = tripsData.map(t => t.id);

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, passenger_name')
        .in('trip_id', tripIds);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        setLoadingRatings(false);
        return;
      }

      if (!bookingsData || bookingsData.length === 0) {
        setRatings([]);
        setAverageRating(0);
        setTotalRatings(0);
        setLoadingRatings(false);
        return;
      }

      const bookingIds = bookingsData.map(b => b.id);

      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, rating, comment, booking_id, issued_at')
        .in('booking_id', bookingIds)
        .not('rating', 'is', null)
        .gte('rating', 1)
        .order('issued_at', { ascending: false });

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        setLoadingRatings(false);
        return;
      }

      if (ticketsData && ticketsData.length > 0) {
        const formattedRatings: Rating[] = ticketsData.map((ticket) => {
          const booking = bookingsData.find(b => b.id === ticket.booking_id);
          return {
            id: ticket.id,
            rating: ticket.rating,
            comment: ticket.comment || 'No comment provided',
            passenger_name: booking?.passenger_name || 'Anonymous',
            issued_at: ticket.issued_at
          };
        });

        setRatings(formattedRatings);

        const avg = formattedRatings.reduce((sum, r) => sum + r.rating, 0) / formattedRatings.length;
        setAverageRating(Number(avg.toFixed(1)));
        setTotalRatings(formattedRatings.length);
        setDisplayRating(Number(avg.toFixed(1)));
      } else {
        setRatings([]);
        setAverageRating(0);
        setTotalRatings(0);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingRatings(false);
    }
  };

  const openRatingsModal = () => {
    setShowRatingsModal(true);
    fetchRatings();
  };

  const closeRatingsModal = () => {
    setShowRatingsModal(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-primary-500 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderLargeStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-6 w-6 ${
              star <= rating
                ? 'text-white fill-current'
                : 'text-white/30'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-dark-800">{trip.busName}</h3>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Star className="h-5 w-5 text-primary-500 fill-current" />
                  <span className="text-lg font-bold text-dark-800">
                    {displayRating > 0 ? displayRating : 'N/A'}
                  </span>
                </div>
                {totalRatings > 0 && (
                  <span className="text-xs text-dark-500 bg-gray-100 px-2 py-1 rounded-full">
                    {totalRatings} review{totalRatings !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-dark-400" />
                <div>
                  <p className="text-sm text-dark-500">Route</p>
                  <p className="font-semibold text-dark-800">{trip.from} → {trip.to}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-dark-400" />
                <div>
                  <p className="text-sm text-dark-500">Departure</p>
                  <p className="font-semibold text-dark-800">{trip.departureTime}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-dark-400" />
                <div>
                  <p className="text-sm text-dark-500">Available Seats</p>
                  <p className="font-semibold text-dark-800">{trip.availableSeats}/{trip.totalSeats}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {trip.amenities.map((amenity, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:ml-6 lg:text-right"><br/>
            <div className="mb-4">
              <p className="text-3xl font-bold text-dark-800">LKR {trip.price.toLocaleString()}</p>
            </div>

            <div className="flex flex-col space-y-2">
              <Link
                to={`/book/${trip.id}`}
                className="bg-primary-500 text-dark-800 px-6 py-3 rounded-lg hover:bg-primary-600 transition-all font-semibold text-center"
              >
                Book Now
              </Link>
              
              <button
                onClick={openRatingsModal}
                className="bg-white border-2 border-primary-500 text-primary-700 px-6 py-3 rounded-lg hover:bg-primary-50 transition-all font-semibold flex items-center justify-center space-x-2"
              >
                <Star className="h-4 w-4" />
                <span>Show Reviews</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ratings Modal */}
      {showRatingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-500 to-primary-600">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <h2 className="text-2xl font-bold">{trip.busName}</h2>
                  <p className="text-primary-100 mt-1">Customer Ratings & Reviews</p>
                </div>
                <button
                  onClick={closeRatingsModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-4 bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-5xl font-bold text-white">
                        {loadingRatings ? '...' : averageRating > 0 ? averageRating : displayRating > 0 ? displayRating : 'N/A'}
                      </span>
                      <div>
                        {renderLargeStars(loadingRatings ? 0 : (averageRating > 0 ? Math.round(averageRating) : Math.round(displayRating)))}
                        <p className="text-primary-100 text-sm mt-1">
                          {loadingRatings ? 'Loading...' : totalRatings > 0 ? `${totalRatings} review${totalRatings !== 1 ? 's' : ''}` : 'No reviews yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {loadingRatings ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                </div>
              ) : ratings.length > 0 ? (
                <div className="space-y-4">
                  {ratings.map((rating) => (
                    <div
                      key={rating.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-dark-800">{rating.passenger_name}</p>
                          <p className="text-xs text-dark-500">{formatDate(rating.issued_at)}</p>
                        </div>
                        {renderStars(rating.rating)}
                      </div>
                      
                      {rating.comment && rating.comment !== 'No comment provided' && (
                        <div className="flex items-start space-x-2 mt-3">
                          <MessageSquare className="h-4 w-4 text-dark-400 mt-0.5 flex-shrink-0" />
                          <p className="text-dark-600 text-sm">{rating.comment}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-dark-600 font-medium">No ratings yet</p>
                  <p className="text-dark-500 text-sm mt-2">Be the first to rate this bus!</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeRatingsModal}
                className="w-full px-6 py-3 bg-primary-500 text-dark-800 rounded-lg hover:bg-primary-600 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BusCard;
