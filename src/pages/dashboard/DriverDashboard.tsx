import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Users, Navigation, Phone, Calendar, ChevronLeft, ChevronRight, Ticket, CheckCircle, AlertCircle, Search, PlayCircle, StopCircle, MessageSquare, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, type WeeklyTimetable, type Bus, getDayName, getCurrentDayNumber, type Booking, type Ticket as TicketType } from '../../lib/supabase';

interface TimetableWithBus extends WeeklyTimetable {
  bus: Bus;
  bookings?: (Booking & {
    tickets: TicketType[];
  })[];
  tripId?: string;
  hasStarted?: boolean;
  actualDepartureTime?: string;
  actualArrivalTime?: string;
}

interface WeeklySchedule {
  [key: string]: TimetableWithBus[];
}

const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [selectedTripTickets, setSelectedTripTickets] = useState<TimetableWithBus | null>(null);
  const [modalPinInput, setModalPinInput] = useState('');
  const [modalVerificationResult, setModalVerificationResult] = useState<{
    success: boolean;
    message: string;
    passengerDetails?: any;
  } | null>(null);
  const [confirmedPassengers, setConfirmedPassengers] = useState<Set<string>>(new Set());
  const [verifiedTickets, setVerifiedTickets] = useState<Set<string>>(new Set());
  
  // New states for trip updates
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedTripForUpdate, setSelectedTripForUpdate] = useState<TimetableWithBus | null>(null);
  const [updateType, setUpdateType] = useState<string>('');
  const [updateMessage, setUpdateMessage] = useState('');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    if (user) {
      fetchDriverData();
    }
  }, [user]);

  useEffect(() => {
    if (driverId) {
      fetchWeeklySchedule();
    }
  }, [driverId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchDriverData = async () => {
    try {
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (driverError || !driverData) {
        console.error('Driver not found:', driverError);
        setLoading(false);
        return;
      }

      setDriverId(driverData.id);
    } catch (error) {
      console.error('Error fetching driver data:', error);
      setLoading(false);
    }
  };

  const fetchWeeklySchedule = async () => {
    try {
      const { data: timetablesData, error: timetablesError } = await supabase
        .from('weekly_timetables')
        .select(`
          *,
          buses!inner (*)
        `)
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .order('day_of_week')
        .order('departure_time');

      if (timetablesError) {
        console.error('Error fetching timetables:', timetablesError);
        return;
      }

      const schedule: WeeklySchedule = {};
      daysOfWeek.forEach(day => {
        schedule[day] = [];
      });

      for (const timetable of timetablesData || []) {
        const dayName = getDayName(timetable.day_of_week);
        
        const today = new Date().toISOString().split('T')[0];
        
        // Get trip ID and check for updates
        const { data: tripData } = await supabase
          .from('trips')
          .select('id')
          .eq('bus_id', timetable.bus_id)
          .eq('trip_date', today)
          .eq('departure_time', timetable.departure_time)
          .maybeSingle();

        // Get trip updates if trip exists
        let hasStarted = false;
        let actualDepartureTime = null;
        let actualArrivalTime = null;

        if (tripData) {
          const { data: updates } = await supabase
            .from('trip_updates')
            .select('*')
            .eq('trip_id', tripData.id)
            .order('created_at', { ascending: false });

          if (updates && updates.length > 0) {
            const departureUpdate = updates.find(u => u.update_type === 'departure');
            const arrivalUpdate = updates.find(u => u.update_type === 'arrival');
            
            hasStarted = !!departureUpdate;
            actualDepartureTime = departureUpdate?.actual_time;
            actualArrivalTime = arrivalUpdate?.actual_time;
          }
        }

        const timetableWithBus: TimetableWithBus = {
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
          tripId: tripData?.id,
          hasStarted,
          actualDepartureTime,
          actualArrivalTime,
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
          bookings: []
        };

        // Fetch bookings
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            id,
            user_id,
            trip_id,
            passenger_name,
            passenger_email,
            passenger_phone,
            seat_numbers,
            total_amount,
            booking_status,
            payment_status,
            booking_reference,
            created_at,
            trips!inner(
              id,
              trip_date,
              departure_time,
              bus_id
            )
          `)
          .eq('trips.bus_id', timetable.bus_id)
          .eq('trips.trip_date', today)
          .eq('trips.departure_time', timetable.departure_time)
          .eq('booking_status', 'confirmed');

        if (bookingsData) {
          timetableWithBus.bookings = bookingsData.map((booking: any) => ({
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
            tickets: []
          }));
        }

        schedule[dayName].push(timetableWithBus);
      }

      setWeeklySchedule(schedule);
    } catch (error) {
      console.error('Error fetching weekly schedule:', error);
    } finally {
      setLoading(false);
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

  const formatWeekRange = (date: Date) => {
    const start = getStartOfWeek(date);
    const end = getEndOfWeek(date);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (date: Date) => {
    const startOfWeek = getStartOfWeek(date);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return endOfWeek;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  const handleUpdateLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location updated:', position.coords);
          alert('Location updated successfully!');
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not get your location. Please enable GPS.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const toggleGPS = () => {
    setGpsEnabled(!gpsEnabled);
    if (!gpsEnabled) {
      handleUpdateLocation();
    }
  };

  const getCurrentDayName = () => {
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[today.getDay()];
  };

  const getTodaysSchedule = () => {
    const todayName = getCurrentDayName();
    return weeklySchedule[todayName] || [];
  };

  const shouldShowViewTickets = (departureTime: string, arrivalTime: string): boolean => {
    const now = currentTime;
    
    const [depHours, depMinutes] = departureTime.split(':').map(Number);
    const departureDateTime = new Date(now);
    departureDateTime.setHours(depHours, depMinutes, 0, 0);
    
    const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number);
    const arrivalDateTime = new Date(now);
    arrivalDateTime.setHours(arrHours, arrMinutes, 0, 0);
    
    if (arrivalDateTime < departureDateTime) {
      arrivalDateTime.setDate(arrivalDateTime.getDate() + 1);
    }
    
    const thirtyMinutesBefore = new Date(departureDateTime.getTime() - 30 * 60 * 1000);
    const oneHourAfterArrival = new Date(arrivalDateTime.getTime() + 60 * 60 * 1000);
    
    return now >= thirtyMinutesBefore && now <= oneHourAfterArrival;
  };

  const getTripStatus = (departureTime: string, arrivalTime: string, hasStarted?: boolean, actualArrivalTime?: string): string => {
    if (actualArrivalTime) {
      return '✅ Completed';
    }
    
    if (hasStarted) {
      return '🚌 In Progress';
    }

    const now = currentTime;
    const [depHours, depMinutes] = departureTime.split(':').map(Number);
    const departureDateTime = new Date(now);
    departureDateTime.setHours(depHours, depMinutes, 0, 0);
    
    const diffToDeparture = departureDateTime.getTime() - now.getTime();
    const minutesToDeparture = Math.floor(diffToDeparture / 60000);
    
    if (minutesToDeparture < 0) {
      return 'Delayed';
    } else if (minutesToDeparture === 0) {
      return 'Boarding Now';
    } else if (minutesToDeparture < 30) {
      return `Boarding in ${minutesToDeparture} min`;
    } else if (minutesToDeparture < 60) {
      return `${minutesToDeparture} min`;
    } else {
      const hoursUntil = Math.floor(minutesToDeparture / 60);
      const remainingMinutes = minutesToDeparture % 60;
      return `${hoursUntil}h ${remainingMinutes}m`;
    }
  };

  const toggleScheduleExpansion = (scheduleId: string) => {
    setExpandedSchedule(expandedSchedule === scheduleId ? null : scheduleId);
  };

  const openTicketsModal = (timetable: TimetableWithBus) => {
    setSelectedTripTickets(timetable);
    setShowTicketsModal(true);
    setModalPinInput('');
    setModalVerificationResult(null);
  };

  const closeTicketsModal = () => {
    setShowTicketsModal(false);
    setSelectedTripTickets(null);
    setModalPinInput('');
    setModalVerificationResult(null);
  };

  // NEW: Open trip update modal
  const openUpdateModal = (timetable: TimetableWithBus, type: string) => {
    setSelectedTripForUpdate(timetable);
    setUpdateType(type);
    setUpdateMessage('');
    setShowUpdateModal(true);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setSelectedTripForUpdate(null);
    setUpdateType('');
    setUpdateMessage('');
  };

  // NEW: Handle trip departure
  const handleTripDeparture = async (timetable: TimetableWithBus) => {
    if (!timetable.tripId) {
      alert('Trip not found. Please refresh the page.');
      return;
    }

    try {
      let latitude = null;
      let longitude = null;
      
      if (navigator.geolocation && gpsEnabled) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (error) {
          console.log('GPS not available');
        }
      }

      const { error } = await supabase
        .from('trip_updates')
        .insert({
          trip_id: timetable.tripId,
          driver_id: driverId,
          update_type: 'departure',
          actual_time: new Date().toISOString(),
          status: 'departed',
          message: 'Trip started',
          latitude,
          longitude
        });

      if (error) {
        console.error('Error recording departure:', error);
        alert('Error recording departure: ' + error.message);
        return;
      }

      alert('✅ Departure recorded successfully!');
      fetchWeeklySchedule();
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    }
  };

  // NEW: Handle trip arrival
  const handleTripArrival = async (timetable: TimetableWithBus) => {
    if (!timetable.tripId) {
      alert('Trip not found. Please refresh the page.');
      return;
    }

    try {
      let latitude = null;
      let longitude = null;
      
      if (navigator.geolocation && gpsEnabled) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (error) {
          console.log('GPS not available');
        }
      }

      const { error } = await supabase
        .from('trip_updates')
        .insert({
          trip_id: timetable.tripId,
          driver_id: driverId,
          update_type: 'arrival',
          actual_time: new Date().toISOString(),
          status: 'arrived',
          message: 'Trip completed',
          latitude,
          longitude
        });

      if (error) {
        console.error('Error recording arrival:', error);
        alert('Error recording arrival: ' + error.message);
        return;
      }

      alert('✅ Arrival recorded successfully!');
      fetchWeeklySchedule();
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    }
  };

  // NEW: Submit trip update
  const handleSubmitUpdate = async () => {
    if (!selectedTripForUpdate?.tripId || !updateMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      let latitude = null;
      let longitude = null;
      
      if (navigator.geolocation && gpsEnabled) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch (error) {
          console.log('GPS not available');
        }
      }

      const { error } = await supabase
        .from('trip_updates')
        .insert({
          trip_id: selectedTripForUpdate.tripId,
          driver_id: driverId,
          update_type: updateType,
          actual_time: new Date().toISOString(),
          status: updateType,
          message: updateMessage,
          latitude,
          longitude
        });

      if (error) {
        console.error('Error submitting update:', error);
        alert('Error submitting update: ' + error.message);
        return;
      }

      alert('✅ Update submitted successfully! Passengers will be notified.');
      closeUpdateModal();
      fetchWeeklySchedule();
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    }
  };

  // PIN Verification (keeping existing code)
  const handleModalPinVerification = async () => {
    if (!modalPinInput.trim() || !selectedTripTickets) {
      setModalVerificationResult({
        success: false,
        message: 'Please enter a PIN number'
      });
      return;
    }

    try {
      console.log('🔍 Verifying PIN:', modalPinInput.trim());

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('tracking_pin', modalPinInput.trim())
        .maybeSingle();

      if (ticketError) {
        console.error('❌ Ticket query error:', ticketError);
        setModalVerificationResult({
          success: false,
          message: '❌ Database error: ' + ticketError.message
        });
        return;
      }

      if (!ticketData) {
        console.log('❌ No ticket found with PIN:', modalPinInput.trim());
        setModalVerificationResult({
          success: false,
          message: '❌ Invalid PIN - ticket not found'
        });
        return;
      }

      console.log('✅ Ticket found:', ticketData);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: existingVerification, error: verificationCheckError } = await supabase
        .from('ticket_verifications')
        .select('*')
        .eq('ticket_id', ticketData.id)
        .gte('verified_at', todayStart.toISOString())
        .order('verified_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verificationCheckError) {
        console.error('❌ Verification check error:', verificationCheckError);
      }

      if (existingVerification) {
        const verifiedTime = new Date(existingVerification.verified_at).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        setModalVerificationResult({
          success: false,
          message: `⚠️ Ticket already verified today at ${verifiedTime}`
        });
        return;
      }

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', ticketData.booking_id)
        .single();

      if (bookingError) {
        console.error('❌ Booking query error:', bookingError);
        setModalVerificationResult({
          success: false,
          message: '❌ Error fetching booking: ' + bookingError.message
        });
        return;
      }

      if (!bookingData) {
        console.log('❌ No booking found for ticket');
        setModalVerificationResult({
          success: false,
          message: '❌ Booking not found for this ticket'
        });
        return;
      }

      console.log('✅ Booking found:', bookingData);

      let latitude = null;
      let longitude = null;
      
      if (navigator.geolocation && gpsEnabled) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          console.log('📍 GPS location captured:', { latitude, longitude });
        } catch (error) {
          console.log('⚠️ GPS location not available:', error);
        }
      }

      const { data: verificationRecord, error: insertError } = await supabase
        .from('ticket_verifications')
        .insert({
          ticket_id: ticketData.id,
          driver_id: driverId,
          verification_method: 'manual',
          latitude,
          longitude,
          notes: `Verified via PIN: ${ticketData.tracking_pin}`
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating verification record:', insertError);
        setModalVerificationResult({
          success: false,
          message: '❌ Error recording verification: ' + insertError.message
        });
        return;
      }

      console.log('✅ Verification record created:', verificationRecord);

      setVerifiedTickets(prev => new Set([...prev, ticketData.id]));

      const verifiedTime = new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });

      setModalVerificationResult({
        success: true,
        message: '✅ Passenger verified and recorded successfully!',
        passengerDetails: {
          name: bookingData.passenger_name,
          phone: bookingData.passenger_phone,
          email: bookingData.passenger_email,
          seatNumbers: bookingData.seat_numbers,
          bookingReference: bookingData.booking_reference,
          ticketNumber: ticketData.ticket_number,
          trackingPin: ticketData.tracking_pin,
          verifiedAt: verifiedTime,
          hasGPS: latitude !== null
        }
      });

      setTimeout(() => {
        setModalPinInput('');
      }, 3000);

    } catch (error: any) {
      console.error('❌ Unexpected error during PIN verification:', error);
      setModalVerificationResult({
        success: false,
        message: `❌ Error: ${error.message || 'Please try again'}`
      });
    }
  };

  const confirmPassengerArrival = (bookingId: string, passengerName: string) => {
    setConfirmedPassengers(prev => new Set([...prev, bookingId]));
    setModalVerificationResult(prev => prev ? {
      ...prev,
      message: `✅ ${passengerName} arrival confirmed!`
    } : null);
    
    setTimeout(() => {
      setModalVerificationResult(null);
      setModalPinInput('');
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const todaysSchedule = getTodaysSchedule();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-800">Driver Dashboard</h1>
          <p className="text-dark-600 mt-2">Welcome {user?.name}, manage your weekly schedule and update location</p>
          <p className="text-sm text-dark-500 mt-1">
            Current Time: {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </p>
        </div>

        {/* GPS Status */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${gpsEnabled ? 'bg-success-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <div>
                <h3 className="text-lg font-bold text-dark-800">GPS Tracking</h3>
                <p className="text-dark-600">{gpsEnabled ? 'Location sharing enabled' : 'Location sharing disabled'}</p>
              </div>
            </div>
            <button
              onClick={toggleGPS}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
                gpsEnabled 
                  ? 'bg-error-500 text-white hover:bg-error-600' 
                  : 'bg-primary-500 text-dark-800 hover:bg-primary-600'
              }`}
            >
              <Navigation className="h-5 w-5" />
              <span>{gpsEnabled ? 'Stop Sharing' : 'Start Sharing'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Schedule */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-dark-800">Weekly Schedule</h2>
                  <p className="text-dark-600">{formatWeekRange(currentWeek)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigateWeek('prev')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={goToCurrentWeek}
                    className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors text-sm font-medium"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => navigateWeek('next')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {daysOfWeek.map((day) => {
                  const schedules = weeklySchedule[day] || [];
                  const isToday = day === getCurrentDayName();

                  return (
                    <div
                      key={day}
                      className={`border-2 rounded-xl p-4 transition-all ${
                        isToday ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Calendar className={`h-5 w-5 ${isToday ? 'text-primary-600' : 'text-gray-400'}`} />
                          <div>
                            <h3 className={`font-bold ${isToday ? 'text-primary-700' : 'text-dark-800'}`}>
                              {day}
                              {isToday && <span className="ml-2 text-xs bg-primary-500 text-white px-2 py-1 rounded-full">Today</span>}
                            </h3>
                          </div>
                        </div>
                        {schedules.length > 0 && (
                          <span className="text-sm text-dark-600">{schedules.length} trip{schedules.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>

                      {schedules.length === 0 ? (
                        <p className="text-dark-500 text-sm">No scheduled trips</p>
                      ) : (
                        <div className="space-y-3">
                          {schedules.map((schedule) => {
                            const showTickets = isToday && shouldShowViewTickets(schedule.departure_time, schedule.arrival_time);
                            const tripStatus = isToday ? getTripStatus(schedule.departure_time, schedule.arrival_time, schedule.hasStarted, schedule.actualArrivalTime) : null;

                            return (
                              <div
                                key={schedule.id}
                                className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <h4 className="font-bold text-dark-800">{schedule.bus.name}</h4>
                                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{schedule.bus.plate_number}</span>
                                      {isToday && tripStatus && (
                                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                                          tripStatus.includes('Progress') || tripStatus.includes('Boarding')
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : tripStatus.includes('Completed')
                                            ? 'bg-green-100 text-green-800'
                                            : tripStatus === 'Delayed'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}>
                                          {tripStatus}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                      <div className="flex items-center space-x-2">
                                        <MapPin className="h-4 w-4 text-primary-600" />
                                        <div>
                                          <p className="text-dark-600">Route</p>
                                          <p className="font-medium text-dark-800">{schedule.bus.from_city} → {schedule.bus.to_city}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center space-x-2">
                                        <Clock className="h-4 w-4 text-primary-600" />
                                        <div>
                                          <p className="text-dark-600">Scheduled</p>
                                          <p className="font-medium text-dark-800">{formatTime(schedule.departure_time)} → {formatTime(schedule.arrival_time)}</p>
                                        </div>
                                      </div>

                                      {schedule.actualDepartureTime && (
                                        <div className="flex items-center space-x-2">
                                          <PlayCircle className="h-4 w-4 text-green-600" />
                                          <div>
                                            <p className="text-dark-600">Departed</p>
                                            <p className="font-medium text-dark-800">{formatDateTime(schedule.actualDepartureTime)}</p>
                                          </div>
                                        </div>
                                      )}

                                      {schedule.actualArrivalTime && (
                                        <div className="flex items-center space-x-2">
                                          <StopCircle className="h-4 w-4 text-green-600" />
                                          <div>
                                            <p className="text-dark-600">Arrived</p>
                                            <p className="font-medium text-dark-800">{formatDateTime(schedule.actualArrivalTime)}</p>
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex items-center space-x-2">
                                        <Users className="h-4 w-4 text-primary-600" />
                                        <div>
                                          <p className="text-dark-600">Passengers</p>
                                          <p className="font-medium text-dark-800">{schedule.bookings?.length || 0} booked</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* NEW: Trip Action Buttons */}
                                    {isToday && schedule.tripId && (
                                      <div className="flex flex-wrap gap-2">
                                        {!schedule.hasStarted && (
                                          <button
                                            onClick={() => handleTripDeparture(schedule)}
                                            className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium flex items-center space-x-1"
                                          >
                                            <PlayCircle className="h-3 w-3" />
                                            <span>Start Trip</span>
                                          </button>
                                        )}

                                        {schedule.hasStarted && !schedule.actualArrivalTime && (
                                          <>
                                            <button
                                              onClick={() => handleTripArrival(schedule)}
                                              className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium flex items-center space-x-1"
                                            >
                                              <StopCircle className="h-3 w-3" />
                                              <span>Mark Arrived</span>
                                            </button>

                                            <button
                                              onClick={() => openUpdateModal(schedule, 'delay')}
                                              className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-xs font-medium flex items-center space-x-1"
                                            >
                                              <Clock className="h-3 w-3" />
                                              <span>Report Delay</span>
                                            </button>

                                            <button
                                              onClick={() => openUpdateModal(schedule, 'breakdown')}
                                              className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-medium flex items-center space-x-1"
                                            >
                                              <AlertTriangle className="h-3 w-3" />
                                              <span>Breakdown</span>
                                            </button>

                                            <button
                                              onClick={() => openUpdateModal(schedule, 'route_change')}
                                              className="px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-xs font-medium flex items-center space-x-1"
                                            >
                                              <MapPin className="h-3 w-3" />
                                              <span>Route Change</span>
                                            </button>

                                            <button
                                              onClick={() => openUpdateModal(schedule, 'status')}
                                              className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium flex items-center space-x-1"
                                            >
                                              <MessageSquare className="h-3 w-3" />
                                              <span>Status Update</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {showTickets && (
                                    <button
                                      onClick={() => openTicketsModal(schedule)}
                                      className="ml-4 px-4 py-2 bg-primary-500 text-dark-800 rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-2 text-sm font-medium"
                                    >
                                      <Ticket className="h-4 w-4" />
                                      <span>View Tickets</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg p-6 text-dark-800">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Today's Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Total Trips:</span>
                  <span className="text-2xl font-bold">{todaysSchedule.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Passengers:</span>
                  <span className="text-2xl font-bold">
                    {todaysSchedule.reduce((sum, schedule) => sum + (schedule.bookings?.length || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>In Progress:</span>
                  <span className="text-2xl font-bold">
                    {todaysSchedule.filter(s => s.hasStarted && !s.actualArrivalTime).length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center">
                <Phone className="h-5 w-5 mr-2 text-error-600" />
                Emergency Contact
              </h3>
              <div className="space-y-3">
                <a href="tel:119" className="flex items-center space-x-3 p-3 bg-error-50 rounded-lg hover:bg-error-100 transition-colors">
                  <Phone className="h-5 w-5 text-error-600" />
                  <div>
                    <p className="font-medium text-dark-800">Emergency</p>
                    <p className="text-sm text-dark-600">119</p>
                  </div>
                </a>
                <a href="tel:0117706000" className="flex items-center space-x-3 p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
                  <Phone className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="font-medium text-dark-800">SL Transport Board</p>
                    <p className="text-sm text-dark-600">0117 706 000</p>
                  </div>
                </a>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-dark-800 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-left text-dark-800 font-medium">
                  Report Issue
                </button>
                <button className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-left text-dark-800 font-medium">
                  View History
                </button>
                <button className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-left text-dark-800 font-medium">
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Update Modal */}
      {showUpdateModal && selectedTripForUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-dark-800 capitalize">{updateType.replace('_', ' ')}</h2>
                  <p className="text-dark-600 mt-1">{selectedTripForUpdate.bus.name}</p>
                </div>
                <button
                  onClick={closeUpdateModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <AlertCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  Message to Passengers *
                </label>
                <textarea
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={`Enter ${updateType.replace('_', ' ')} details...`}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={closeUpdateModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitUpdate}
                  disabled={!updateMessage.trim()}
                  className="flex-1 px-4 py-2 bg-primary-500 text-dark-800 rounded-lg hover:bg-primary-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tickets Modal (keeping existing code) */}
      {showTicketsModal && selectedTripTickets && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-dark-800">Passenger Tickets</h2>
                  <p className="text-dark-600 mt-1">{selectedTripTickets.bus.name} - {selectedTripTickets.bus.plate_number}</p>
                </div>
                <button
                  onClick={closeTicketsModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <AlertCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <Search className="h-5 w-5 text-primary-600" />
                  <h3 className="font-medium text-dark-800">Quick Passenger Verification</h3>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={modalPinInput}
                    onChange={(e) => setModalPinInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleModalPinVerification()}
                    placeholder="Enter ticket tracking PIN"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-center font-mono"
                  />
                  <button
                    onClick={handleModalPinVerification}
                    disabled={!modalPinInput.trim()}
                    className="px-4 py-2 bg-primary-500 text-dark-800 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                  >
                    Verify
                  </button>
                </div>
                
                {modalVerificationResult && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    modalVerificationResult.success 
                      ? 'bg-success-100 text-success-800' 
                      : 'bg-error-100 text-error-800'
                  }`}>
                    <div className="flex items-start">
                      {modalVerificationResult.success ? (
                        <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{modalVerificationResult.message}</p>
                        {modalVerificationResult.passengerDetails && (
                          <div className="mt-2 text-sm space-y-1">
                            <p><strong>Name:</strong> {modalVerificationResult.passengerDetails.name}</p>
                            <p><strong>Phone:</strong> {modalVerificationResult.passengerDetails.phone}</p>
                            <p><strong>Seats:</strong> {Array.isArray(modalVerificationResult.passengerDetails.seatNumbers) ? modalVerificationResult.passengerDetails.seatNumbers.join(', ') : modalVerificationResult.passengerDetails.seatNumbers}</p>
                            <p><strong>Booking Ref:</strong> {modalVerificationResult.passengerDetails.bookingReference}</p>
                            <p><strong>Ticket #:</strong> {modalVerificationResult.passengerDetails.ticketNumber}</p>
                            <p><strong>Verified At:</strong> {modalVerificationResult.passengerDetails.verifiedAt}</p>
                            {modalVerificationResult.passengerDetails.hasGPS && (
                              <p className="text-xs text-success-700">📍 GPS location recorded</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedTripTickets.bookings && selectedTripTickets.bookings.length > 0 ? (
                <div className="space-y-4">
                  {selectedTripTickets.bookings.map((booking) => (
                    <div key={booking.id} className={`border-2 rounded-lg p-4 transition-all ${
                      confirmedPassengers.has(booking.id)
                        ? 'border-success-500 bg-success-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-bold text-dark-800">{booking.passenger_name}</h4>
                            {confirmedPassengers.has(booking.id) && (
                              <CheckCircle className="h-5 w-5 text-success-500" />
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-dark-600">
                            <p><strong>Phone:</strong> {booking.passenger_phone}</p>
                            <p><strong>Email:</strong> {booking.passenger_email}</p>
                            <p><strong>Seats:</strong> {Array.isArray(booking.seat_numbers) ? booking.seat_numbers.join(', ') : booking.seat_numbers}</p>
                            <p><strong>Reference:</strong> {booking.booking_reference}</p>
                            <p><strong>Amount:</strong> Rs. {booking.total_amount}</p>
                          </div>
                        </div>
                        {!confirmedPassengers.has(booking.id) && (
                          <button
                            onClick={() => confirmPassengerArrival(booking.id, booking.passenger_name)}
                            className="ml-4 px-4 py-2 bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors text-sm font-medium"
                          >
                            Confirm
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-dark-600">No bookings for this trip yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
