import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Send, CheckCircle } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TicketDetails {
  id: string;
  booking_id: string;
  rating: number | null;
  comment: string | null;
  booking: {
    trip: {
      bus: {
        name: string;
        from_city: string;
        to_city: string;
      };
      trip_date: string;
      departure_time: string;
    };
  };
}

const RateTripPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails();
    }
  }, [ticketId]);

  const fetchTicketDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          bookings!inner (
            trips!inner (
              trip_date,
              departure_time,
              buses!inner (
                name,
                from_city,
                to_city
              )
            )
          )
        `)
        .eq('id', ticketId)
        .single();

      if (error) {
        console.error('Error fetching ticket:', error);
        setError('Failed to load ticket details');
        return;
      }

      const ticketData: TicketDetails = {
        id: data.id,
        booking_id: data.booking_id,
        rating: data.rating,
        comment: data.comment,
        booking: {
          trip: {
            bus: {
              name: data.bookings.trips.buses.name,
              from_city: data.bookings.trips.buses.from_city,
              to_city: data.bookings.trips.buses.to_city,
            },
            trip_date: data.bookings.trips.trip_date,
            departure_time: data.bookings.trips.departure_time,
          }
        }
      };

      setTicket(ticketData);
      setRating(data.rating || 0);
      setComment(data.comment || '');
    } catch (error) {
      console.error('Error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          rating: rating,
          comment: comment.trim() || null
        })
        .eq('id', ticketId);

      if (error) {
        console.error('Error submitting rating:', error);
        setError('Failed to submit rating. Please try again.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard/user');
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-dark-600">Ticket not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <CheckCircle className="h-16 w-16 text-success-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-dark-800 mb-2">Thank You!</h2>
          <p className="text-dark-600">Your rating has been submitted successfully.</p>
          <p className="text-sm text-dark-500 mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-dark-600 hover:text-dark-800 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </button>

        {/* Trip Details Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-dark-800 mb-4">Rate Your Trip</h1>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="font-bold text-lg text-dark-800 mb-2">{ticket.booking.trip.bus.name}</h2>
            <p className="text-dark-600">
              {ticket.booking.trip.bus.from_city} → {ticket.booking.trip.bus.to_city}
            </p>
            <p className="text-sm text-dark-500 mt-2">
              {formatDate(ticket.booking.trip.trip_date)} at {formatTime(ticket.booking.trip.departure_time)}
            </p>
          </div>
        </div>

        {/* Rating Form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <form onSubmit={handleSubmit}>
            {/* Star Rating */}
            <div className="mb-6">
              <label className="block text-dark-700 font-semibold mb-3">
                How was your experience?
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-12 w-12 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-warning-500 text-warning-500'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-dark-600 mt-2">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label htmlFor="comment" className="block text-dark-700 font-semibold mb-2">
                Share your feedback (optional)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={5}
                maxLength={500}
                placeholder="Tell us about your experience..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-dark-500 mt-1">
                {comment.length}/500 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
                <p className="text-error-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full bg-primary-500 text-white py-3 rounded-lg hover:bg-primary-600 transition-colors font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Submit Rating</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RateTripPage;