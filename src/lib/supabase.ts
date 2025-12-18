import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'admin' | 'owner' | 'driver' | 'user';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  district?: string;
  province?: string;
  status: 'active' | 'inactive';
}

export interface Bus {
  id: string;
  owner_id: string;
  name: string;
  plate_number: string;
  bus_type: 'ac' | 'non_ac' | 'sleeper' | 'semi_sleeper' | 'luxury';
  total_seats: number;
  amenities?: string[];
  from_city: string;
  to_city: string;
  status: 'active' | 'maintenance' | 'inactive';
}

export interface Trip {
  id: string;
  bus_id: string;
  driver_id?: string;
  trip_date: string;
  departure_time: string;
  arrival_time: string;
  price_per_seat: number;
  available_seats: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  bus?: Bus;
}

export interface WeeklyTimetable {
  id: string;
  bus_id: string;
  driver_id?: string;
  day_of_week: number; // 1=Monday, 7=Sunday
  departure_time: string;
  arrival_time: string;
  price_per_seat: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bus?: Bus;
}

export interface Booking {
  id: string;
  user_id: string;
  trip_id: string;
  passenger_name: string;
  passenger_email: string;
  passenger_phone: string;
  seat_numbers: number[];
  total_amount: number;
  booking_status: 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'paid' | 'refunded';
  booking_reference: string;
  created_at: string;
  trip?: Trip;
}

export interface Ticket {
  id: string;
  booking_id: string;
  ticket_number: string;
  tracking_pin: string;
  qr_code?: string;
  issued_at: string;
  booking?: Booking;
}

export interface GPSLog {
  id: string;
  bus_id: string;
  trip_id?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: string;
}

// Helper functions for day conversion
export const getDayName = (dayNumber: number): string => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayNumber - 1] || 'Unknown';
};

export const getDayNumber = (dayName: string): number => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const index = days.indexOf(dayName.toLowerCase());
  return index >= 0 ? index + 1 : 0;
};

export const getCurrentDayNumber = (): number => {
  const today = new Date();
  const day = today.getDay();
  // Convert Sunday (0) to 7, and keep Monday (1) to Saturday (6) as is
  return day === 0 ? 7 : day;
};

// Function to calculate available seats for a specific date and timetable
export const calculateAvailableSeats = async (
  busId: string, 
  date: string, 
  departureTime: string, 
  totalSeats: number
): Promise<number> => {
  try {

    // Get existing trip for this specific date
    const { data: existingTrip, error: tripError } = await supabase
      .from('trips')
      .select('available_seats')
      .eq('bus_id', busId)
      .eq('trip_date', date)
      .eq('departure_time', departureTime)
      .maybeSingle();

    if (tripError) {
      console.error('Error fetching trip:', tripError);
      return totalSeats; // Default to full capacity on error
    }

    if (!existingTrip) {
      // No trip exists yet, return full capacity
      return totalSeats;
    }

    return existingTrip.available_seats || totalSeats;
  } catch (error) {
    console.error('Error calculating available seats:', error);
    return totalSeats; // Default to full capacity on error
  }
};

// Function to get or create a trip for a specific date
export const getOrCreateTrip = async (
  timetable: WeeklyTimetable,
  date: string
): Promise<string | null> => {
  try {
    // Check if trip already exists
    let { data: existingTrip, error: tripError } = await supabase
      .from('trips')
      .select('id, available_seats')
      .eq('bus_id', timetable.bus_id)
      .eq('trip_date', date)
      .eq('departure_time', timetable.departure_time)
      .maybeSingle();

    if (tripError) {
      console.error('Error checking existing trip:', tripError);
      return null;
    }

    if (!existingTrip) {
      // Trip doesn't exist, create it
      const { data: newTrip, error: createError } = await supabase
        .from('trips')
        .insert([{
          bus_id: timetable.bus_id,
          driver_id: timetable.driver_id,
          trip_date: date,
          departure_time: timetable.departure_time,
          arrival_time: timetable.arrival_time,
          price_per_seat: timetable.price_per_seat,
          available_seats: timetable.bus?.total_seats || 40,
          status: 'scheduled'
        }])
        .select('id')
        .single();

      if (createError || !newTrip) {
        console.error('Error creating trip:', createError);
        return null;
      }

      return newTrip.id;
    }

    return existingTrip.id || null;
  } catch (error) {
    console.error('Error in getOrCreateTrip:', error);
    return null;
  }
};

// Function to clean up old trips (optional - can be called periodically)
export const cleanupOldTrips = async (): Promise<void> => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Delete trips older than yesterday
    const { error } = await supabase
      .from('trips')
      .delete()
      .lt('trip_date', yesterdayStr);

    if (error) {
      console.error('Error cleaning up old trips:', error);
    } else {
      console.log('Old trips cleaned up successfully');
    }
  } catch (error) {
    console.error('Error in cleanupOldTrips:', error);
  }
};