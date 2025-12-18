import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Clock, MapPin, Phone, Users, Lock } from 'lucide-react';
import MapView from '../components/MapView';
import { supabase, type Bus, type GPSLog } from '../lib/supabase';

interface BusWithLocation extends Bus {
  latest_gps?: GPSLog;
}

const TrackingPage: React.FC = () => {
  const { busId } = useParams();
  const [searchParams] = useSearchParams();
  const providedPin = searchParams.get('pin');
  
  const [busInfo, setBusInfo] = useState<BusWithLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinRequired, setPinRequired] = useState(!providedPin);
  const [enteredPin, setEnteredPin] = useState(providedPin || '');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    if (providedPin && busId) {
      verifyPinAndLoadBus(providedPin);
    }
  }, [busId, providedPin]);

  const verifyPinAndLoadBus = async (pin: string) => {
    try {
      // Verify PIN exists in tickets table
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          bookings!inner (
            trips!inner (
              buses!inner (*)
            )
          )
        `)
        .eq('tracking_pin', pin)
        .eq('bookings.trips.buses.id', busId)
        .single();

      if (ticketError || !ticketData) {
        setPinError('Invalid tracking PIN for this bus.');
        setPinRequired(true);
        setLoading(false);
        return;
      }

      // Load bus info
      await loadBusInfo();
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setPinError('Error verifying tracking PIN.');
      setPinRequired(true);
      setLoading(false);
    }
  };

  const loadBusInfo = async () => {
    try {
      const { data: busData, error: busError } = await supabase
        .from('buses')
        .select('*')
        .eq('id', busId)
        .single();

      if (busError || !busData) {
        console.error('Error fetching bus:', busError);
        setBusInfo(null);
        setLoading(false);
        return;
      }

      // Get latest GPS location
      const { data: gpsData } = await supabase
        .from('gps_logs')
        .select('*')
        .eq('bus_id', busId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const busWithLocation: BusWithLocation = {
        ...busData,
        latest_gps: gpsData || undefined
      };

      setBusInfo(busWithLocation);
      setPinRequired(false);
      setPinError('');
    } catch (error) {
      console.error('Error loading bus info:', error);
      setBusInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await verifyPinAndLoadBus(enteredPin);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (pinRequired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-dark-800 mb-2">Enter Tracking PIN</h2>
            <p className="text-dark-600">Please enter the 4-digit PIN from your ticket to track this bus</p>
          </div>

          <form onSubmit={handlePinSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-600 mb-2">
                Tracking PIN
              </label>
              <input
                type="text"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-2xl tracking-widest font-bold"
                placeholder="0000"
                required
              />
              {pinError && (
                <p className="text-error-500 text-sm mt-2">{pinError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-primary-500 text-dark-800 py-3 rounded-lg hover:bg-primary-600 transition-colors font-semibold"
            >
              Track Bus
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-dark-500">
              Don't have a ticket? 
              <a href="/search" className="text-primary-600 hover:text-primary-700 ml-1">
                Book a seat first
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!busInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark-800 mb-4">Bus not found</h2>
          <p className="text-dark-600">The bus you're looking for doesn't exist or is not currently trackable.</p>
        </div>
      </div>
    );
  }

  // Mock data for demo purposes
  const mockBusInfo = {
    currentLocation: 'Near Kegalle',
    driverName: 'Sunil Perera',
    driverPhone: '+94 77 123 4567',
    nextStop: 'Kandy Bus Station',
    estimatedNextStop: '11:15 AM',
    estimatedArrival: '11:30 AM',
    occupiedSeats: 35,
    status: 'On Time'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-800 mb-2">🚌 Live Bus Tracking</h1>
          <p className="text-dark-600">Track your bus in real-time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark-800">Live Location</h2>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
                  <span className="text-success-600 font-medium">Live</span>
                </div>
              </div>
              <MapView busId={busId!} busName={busInfo.name} />
            </div>
          </div>

          {/* Bus Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Bus Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-dark-800 mb-4">{busInfo.name}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-dark-600">Status</span>
                  <span className="font-semibold text-success-600">
                    {mockBusInfo.status}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-dark-400" />
                  <div className="flex-1">
                    <p className="text-sm text-dark-500">Current Location</p>
                    <p className="font-semibold text-dark-800">{mockBusInfo.currentLocation}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-dark-400" />
                  <div className="flex-1">
                    <p className="text-sm text-dark-500">Next Stop</p>
                    <p className="font-semibold text-dark-800">{mockBusInfo.nextStop}</p>
                    <p className="text-sm text-primary-600">ETA: {mockBusInfo.estimatedNextStop}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-dark-400" />
                  <div className="flex-1">
                    <p className="text-sm text-dark-500">Occupancy</p>
                    <p className="font-semibold text-dark-800">
                      {mockBusInfo.occupiedSeats}/{busInfo.total_seats} seats
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${(mockBusInfo.occupiedSeats / busInfo.total_seats) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Route Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-dark-800 mb-4">Route Information</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-dark-800">{busInfo.from_city}</p>
                    <p className="text-sm text-dark-500">Departure: 08:00 AM</p>
                  </div>
                  <div className="w-8 h-0.5 bg-primary-500"></div>
                  <div className="text-right">
                    <p className="font-semibold text-dark-800">{busInfo.to_city}</p>
                    <p className="text-sm text-dark-500">ETA: {mockBusInfo.estimatedArrival}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-dark-800 mb-4">Driver Information</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-dark-500">Driver Name</p>
                  <p className="font-semibold text-dark-800">{mockBusInfo.driverName}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-dark-400" />
                  <div>
                    <p className="text-sm text-dark-500">Contact</p>
                    <a 
                      href={`tel:${mockBusInfo.driverPhone}`}
                      className="font-semibold text-primary-600 hover:text-primary-700"
                    >
                      {mockBusInfo.driverPhone}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Tracking Info */}
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-dark-800 mb-2">🔒 Secure Tracking</h3>
              <p className="text-sm text-dark-600">
                This tracking is only available to passengers with valid tickets. 
                Your tracking PIN: <span className="font-bold text-primary-600">{enteredPin}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;