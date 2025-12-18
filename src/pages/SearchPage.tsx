import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BusCard from '../components/BusCard';
import SearchForm from '../components/SearchForm';
import { supabase, type WeeklyTimetable, type Bus, getDayNumber, calculateAvailableSeats } from '../lib/supabase';

interface TimetableWithBus extends WeeklyTimetable {
  bus: Bus;
  owner_name?: string;
  available_seats?: number;
  average_rating?: number;
  total_ratings?: number;
}

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [timetables, setTimetables] = useState<TimetableWithBus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetables();
  }, [searchParams]);

  const fetchBusRating = async (busId: string) => {
    try {
      // Fetch all ratings for this bus from tickets table
      const { data, error } = await supabase
        .from('tickets')
        .select('rating')
        .eq('bus_id', busId)
        .not('rating', 'is', null);

      if (error) {
        console.error('Error fetching ratings:', error);
        return { average: 0, count: 0 };
      }

      if (!data || data.length === 0) {
        return { average: 0, count: 0 };
      }

      // Calculate average rating
      const totalRating = data.reduce((sum, ticket) => sum + (ticket.rating || 0), 0);
      const averageRating = totalRating / data.length;

      return {
        average: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        count: data.length
      };
    } catch (error) {
      console.error('Error calculating rating:', error);
      return { average: 0, count: 0 };
    }
  };

  const fetchTimetables = async () => {
    try {
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      const date = searchParams.get('date');

      if (!from || !to || !date) {
        setTimetables([]);
        setLoading(false);
        return;
      }

      // Get day of week from the selected date
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay();
      // Convert JavaScript day (0=Sunday) to our system (1=Monday, 7=Sunday)
      const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;

      const { data, error } = await supabase
        .from('weekly_timetables')
        .select(`
          *,
          buses!inner (
            *,
            owners!inner (
              users!inner (name)
            )
          )
        `)
        .eq('day_of_week', dayNumber)
        .eq('is_active', true)
        .eq('buses.status', 'active')
        .eq('buses.from_city', from)
        .eq('buses.to_city', to)
        .order('departure_time');

      if (error) {
        console.error('Error fetching timetables:', error);
        setTimetables([]);
        return;
      }

      // Calculate available seats and fetch ratings for each timetable
      const timetablesWithSeats = await Promise.all(
        (data || []).map(async (timetable: any) => {
          const availableSeats = await calculateAvailableSeats(
            timetable.bus_id,
            date,
            timetable.departure_time,
            timetable.buses.total_seats
          );

          // Fetch rating data for this bus
          const ratingData = await fetchBusRating(timetable.bus_id);

          return {
            id: timetable.id,
            bus_id: timetable.bus_id,
            driver_id: timetable.driver_id,
            day_of_week: timetable.day_of_week,
            departure_time: timetable.departure_time,
            arrival_time: timetable.arrival_time,
            price_per_seat: timetable.price_per_seat,
            is_active: timetable.is_active,
            created_at: timetable.created_at,
            updated_at: timetable.updated_at,
            bus: {
              id: timetable.buses.id,
              owner_id: timetable.buses.owner_id,
              name: timetable.buses.name,
              plate_number: timetable.buses.plate_number,
              bus_type: timetable.buses.bus_type,
              total_seats: timetable.buses.total_seats,
              amenities: timetable.buses.amenities || [],
              from_city: timetable.buses.from_city,
              to_city: timetable.buses.to_city,
              status: timetable.buses.status
            },
            owner_name: timetable.buses.owners?.users?.name || 'Unknown',
            available_seats: availableSeats,
            average_rating: ratingData.average,
            total_ratings: ratingData.count
          };
        })
      );

      setTimetables(timetablesWithSeats);
    } catch (error) {
      console.error('Error fetching timetables:', error);
      setTimetables([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <SearchForm />
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateDuration = (departure: string, arrival: string) => {
    const dep = new Date(`2000-01-01T${departure}`);
    const arr = new Date(`2000-01-01T${arrival}`);
    let diff = arr.getTime() - dep.getTime();
    
    // Handle overnight trips (arrival next day)
    if (diff < 0) {
      diff += 24 * 60 * 60 * 1000; // Add 24 hours
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getDayName = (dayNumber: number): string => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayNumber - 1] || 'Unknown';
  };

  const isTimePassedToday = (date: string, departureTime: string): boolean => {
    const selectedDate = new Date(date);
    const today = new Date();
    
    // Only check if it's today
    if (selectedDate.toDateString() !== today.toDateString()) {
      return false;
    }
    
    const [hours, minutes] = departureTime.split(':').map(Number);
    const departureDateTime = new Date(today);
    departureDateTime.setHours(hours, minutes, 0, 0);
    
    return new Date() > departureDateTime;
  };

  const selectedDate = searchParams.get('date');
  const dayOfWeek = selectedDate ? new Date(selectedDate).getDay() : 0;
  const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
  const dayName = getDayName(dayNumber);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Form */}
        <div className="mb-8">
          <SearchForm />
        </div>

        {/* Results Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-dark-800">
            {timetables.length} buses found from {searchParams.get('from')} to {searchParams.get('to')}
          </h2>
          <p className="text-dark-600 mt-2">
            Journey Date: {selectedDate} ({dayName})
          </p>
          <div className="mt-2 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-sm text-primary-700">
              📅 <strong>Weekly Schedule:</strong> These buses run every {dayName} with the same timetable. 
              Available seats are updated in real-time and reset after departure time.
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {timetables.map((timetable) => {
            const timePassed = isTimePassedToday(selectedDate!, timetable.departure_time);
            
            return (
              <div key={`${timetable.bus_id}-${timetable.id}`} className="relative">
                {timePassed && (
                  <div className="absolute top-4 right-4 z-10 bg-warning-100 text-warning-700 px-3 py-1 rounded-full text-sm font-medium">
                    Departed
                  </div>
                )}
                <BusCard 
                  trip={{
                    id: `${timetable.bus_id}_${selectedDate}_${timetable.departure_time}`, // Create unique ID for booking
                    busName: timetable.bus.name,
                    from: timetable.bus.from_city,
                    to: timetable.bus.to_city,
                    departureTime: formatTime(timetable.departure_time),
                    arrivalTime: formatTime(timetable.arrival_time),
                    duration: calculateDuration(timetable.departure_time, timetable.arrival_time),
                    availableSeats: timetable.available_seats || 0,
                    totalSeats: timetable.bus.total_seats,
                    price: timetable.price_per_seat,
                    rating: timetable.average_rating || 0,
                    totalRatings: timetable.total_ratings || 0,
                    amenities: timetable.bus.amenities || []
                  }} 
                />
              </div>
            );
          })}
        </div>

        {timetables.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
              <div className="text-6xl mb-4">🚌</div>
              <h3 className="text-xl font-semibold text-dark-600 mb-4">
                No buses found for your search
              </h3>
              <p className="text-dark-500 mb-6">
                No buses are scheduled to run on {dayName}s from {searchParams.get('from')} to {searchParams.get('to')}.
              </p>
              <div className="space-y-2 text-sm text-dark-600">
                <p><strong>Try these suggestions:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-left">
                  <li>Check a different day of the week</li>
                  <li>Try alternative routes or nearby cities</li>
                  <li>Contact bus operators for special arrangements</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;