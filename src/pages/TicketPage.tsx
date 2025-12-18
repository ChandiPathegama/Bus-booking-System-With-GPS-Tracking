import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, User, Phone, Mail, Navigation, Download } from 'lucide-react';
import { supabase, type Ticket, type Booking, type Trip, type Bus } from '../lib/supabase';

interface BusWithGPS extends Bus {
  gps_tracker?: string;
}

interface TicketWithDetails extends Ticket {
  booking: Booking & {
    trip: Trip & {
      bus: BusWithGPS;
    };
  };
}

const TicketPage: React.FC = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState<TicketWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          bookings!inner (
            *,
            trips!inner (
              *,
              buses!inner (*)
            )
          )
        `)
        .eq('id', ticketId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching ticket:', error);
        setTicket(null);
        return;
      }

      if (!data) {
        console.log('Ticket not found');
        setTicket(null);
        return;
      }

      const ticketData: TicketWithDetails = {
        id: data.id,
        booking_id: data.booking_id,
        ticket_number: data.ticket_number,
        tracking_pin: data.tracking_pin,
        qr_code: data.qr_code,
        issued_at: data.issued_at,
        rating: data.rating,
        comment: data.comment,
        booking: {
          id: data.bookings.id,
          user_id: data.bookings.user_id,
          trip_id: data.bookings.trip_id,
          passenger_name: data.bookings.passenger_name,
          passenger_email: data.bookings.passenger_email,
          passenger_phone: data.bookings.passenger_phone,
          seat_numbers: data.bookings.seat_numbers,
          total_amount: data.bookings.total_amount,
          booking_status: data.bookings.booking_status,
          payment_status: data.bookings.payment_status,
          booking_reference: data.bookings.booking_reference,
          created_at: data.bookings.created_at,
          trip: {
            id: data.bookings.trips.id,
            bus_id: data.bookings.trips.bus_id,
            driver_id: data.bookings.trips.driver_id,
            trip_date: data.bookings.trips.trip_date,
            departure_time: data.bookings.trips.departure_time,
            arrival_time: data.bookings.trips.arrival_time,
            price_per_seat: data.bookings.trips.price_per_seat,
            available_seats: data.bookings.trips.available_seats,
            status: data.bookings.trips.status,
            bus: {
              id: data.bookings.trips.buses.id,
              owner_id: data.bookings.trips.buses.owner_id,
              name: data.bookings.trips.buses.name,
              plate_number: data.bookings.trips.buses.plate_number,
              bus_type: data.bookings.trips.buses.bus_type,
              total_seats: data.bookings.trips.buses.total_seats,
              amenities: data.bookings.trips.buses.amenities || [],
              from_city: data.bookings.trips.buses.from_city,
              to_city: data.bookings.trips.buses.to_city,
              status: data.bookings.trips.buses.status,
              gps_tracker: data.bookings.trips.buses.gps_tracker
            }
          }
        }
      };

      setTicket(ticketData);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!ticket) return;

    setDownloading(true);
    try {
      // Create HTML content for PDF
      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Bus Ticket - ${ticket.ticket_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              background: linear-gradient(to right, #FBBF24, #F59E0B);
              padding: 30px;
              border-radius: 10px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
            }
            .ticket-number {
              font-size: 18px;
              font-weight: bold;
              margin-top: 10px;
            }
            .route {
              display: flex;
              justify-content: space-between;
              margin: 30px 0;
              padding: 20px;
              background: #f9fafb;
              border-radius: 10px;
            }
            .location {
              text-align: center;
            }
            .location-name {
              font-size: 24px;
              font-weight: bold;
            }
            .time {
              font-size: 18px;
              color: #F59E0B;
              font-weight: bold;
            }
            .details {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin: 30px 0;
              padding: 20px;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
            }
            .detail-item {
              padding: 10px 0;
            }
            .detail-label {
              color: #6b7280;
              font-size: 14px;
            }
            .detail-value {
              font-weight: bold;
              font-size: 16px;
            }
            .passenger-info {
              margin: 30px 0;
              padding: 20px;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
            }
            .tracking-pin {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background: #fef3c7;
              border: 2px solid #F59E0B;
              border-radius: 10px;
            }
            .tracking-pin-number {
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 5px;
              color: #F59E0B;
            }
            .notes {
              margin-top: 40px;
              padding: 20px;
              background: #f9fafb;
              border-radius: 10px;
            }
            .notes ul {
              padding-left: 20px;
            }
            .notes li {
              margin: 10px 0;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎫 Omniport Bus Ticket</h1>
            <div class="ticket-number">Ticket #${ticket.ticket_number}</div>
          </div>

          <div class="route">
            <div class="location">
              <div class="location-name">${ticket.booking.trip.bus.from_city}</div>
              <div style="font-size: 14px; color: #6b7280; margin: 5px 0;">Departure</div>
              <div class="time">${formatTime(ticket.booking.trip.departure_time)}</div>
            </div>
            <div style="display: flex; align-items: center; padding: 0 20px;">
              <div style="border-top: 2px dashed #d1d5db; width: 100px;"></div>
            </div>
            <div class="location">
              <div class="location-name">${ticket.booking.trip.bus.to_city}</div>
              <div style="font-size: 14px; color: #6b7280; margin: 5px 0;">Arrival</div>
              <div class="time">${formatTime(ticket.booking.trip.arrival_time)}</div>
            </div>
          </div>

          <div class="details">
            <div class="detail-item">
              <div class="detail-label">Bus</div>
              <div class="detail-value">${ticket.booking.trip.bus.name}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Date</div>
              <div class="detail-value">${formatDate(ticket.booking.trip.trip_date)}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Seat Number</div>
              <div class="detail-value">#${ticket.booking.seat_numbers[0]}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Fare</div>
              <div class="detail-value" style="color: #F59E0B;">LKR ${ticket.booking.total_amount.toLocaleString()}</div>
            </div>
          </div>

          <div class="passenger-info">
            <h3 style="margin-top: 0;">Passenger Information</h3>
            <div style="margin: 10px 0;"><strong>Name:</strong> ${ticket.booking.passenger_name}</div>
            <div style="margin: 10px 0;"><strong>Email:</strong> ${ticket.booking.passenger_email}</div>
            <div style="margin: 10px 0;"><strong>Phone:</strong> ${ticket.booking.passenger_phone}</div>
          </div>

          <div class="tracking-pin">
            <h3 style="margin-top: 0;">Live Tracking PIN</h3>
            <div class="tracking-pin-number">${ticket.tracking_pin}</div>
            <p style="margin-bottom: 0; color: #6b7280;">Use this PIN to track your bus on the day of travel</p>
          </div>

          <div style="text-align: center; margin: 30px 0; padding: 15px; background: #dcfce7; border-radius: 10px;">
            <strong style="color: #16a34a;">✓ ${ticket.booking.booking_status.toUpperCase()}</strong>
            <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">Booked on ${formatDate(ticket.booking.created_at)}</div>
          </div>

          <div class="notes">
            <h3>Important Notes</h3>
            <ul>
              <li>Please arrive at the departure point 15 minutes before departure time</li>
              <li>Keep your ticket and tracking PIN safe for the journey</li>
              <li>Live tracking will be available 30 minutes before departure</li>
              <li>For any assistance, contact our helpline: +94 11 123 4567</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>Thank you for choosing Omniport Bus Service</p>
            <p>www.omniport.lk | support@omniport.lk</p>
          </div>
        </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([content], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bus-ticket-${ticket.ticket_number}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Failed to download ticket. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleTrackBus = () => {
    const gpsTracker = ticket?.booking.trip.bus.gps_tracker || 'catsat-x001';
    const trackingUrl = `https://bus.ideago.dev/map.php/?sn=${gpsTracker}`;
    window.open(trackingUrl, '_blank');
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
      day: 'numeric'
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
          <h2 className="text-2xl font-bold text-dark-800 mb-4">Ticket not found</h2>
          <Link
            to="/search"
            className="bg-primary-500 text-dark-800 px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-dark-800 mb-2">🎫 Your Bus Ticket</h1>
          <p className="text-dark-600">Booking confirmed successfully!</p>
        </div>

        {/* Ticket Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-dark-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Omniport</h2>
                <p className="text-dark-700">Bus Ticket</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-dark-700">Ticket #</p>
                <p className="text-lg font-bold">{ticket.ticket_number}</p>
              </div>
            </div>
          </div>

          {/* Ticket Content */}
          <div className="p-6">
            {/* Route Information */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-dark-800">{ticket.booking.trip.bus.from_city}</p>
                  <p className="text-sm text-dark-500">Departure</p>
                  <p className="text-lg font-semibold text-primary-600">{formatTime(ticket.booking.trip.departure_time)}</p>
                </div>
                <div className="flex-1 mx-4">
                  <div className="border-t-2 border-dashed border-gray-300 relative">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary-500 rounded-full p-2">
                      <MapPin className="h-4 w-4 text-dark-800" />
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-dark-800">{ticket.booking.trip.bus.to_city}</p>
                  <p className="text-sm text-dark-500">Arrival</p>
                  <p className="text-lg font-semibold text-primary-600">{formatTime(ticket.booking.trip.arrival_time)}</p>
                </div>
              </div>
            </div>

            {/* Trip Details */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-dark-500">Bus</p>
                <p className="font-semibold text-dark-800">{ticket.booking.trip.bus.name}</p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Date</p>
                <p className="font-semibold text-dark-800">{formatDate(ticket.booking.trip.trip_date)}</p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Seat Number</p>
                <p className="font-semibold text-dark-800">#{ticket.booking.seat_numbers[0]}</p>
              </div>
              <div>
                <p className="text-sm text-dark-500">Fare</p>
                <p className="font-semibold text-primary-600">LKR {ticket.booking.total_amount.toLocaleString()}</p>
              </div>
            </div>

            {/* Passenger Details */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-bold text-dark-800 mb-3">Passenger Information</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-dark-400" />
                  <span className="text-dark-600">{ticket.booking.passenger_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-dark-400" />
                  <span className="text-dark-600">{ticket.booking.passenger_email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-dark-400" />
                  <span className="text-dark-600">{ticket.booking.passenger_phone}</span>
                </div>
              </div>
            </div>

            {/* Tracking Section */}
            <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <h3 className="text-lg font-bold text-dark-800 mb-3 flex items-center space-x-2">
                <Navigation className="h-5 w-5 text-primary-600" />
                <span>Live Tracking</span>
              </h3>
              <div className="mb-4">
                <p className="text-sm text-dark-600 mb-2">
                  Use this PIN to track your bus live on the day of travel:
                </p>
                <div className="bg-white p-3 rounded-lg border-2 border-primary-300">
                  <p className="text-center text-2xl font-bold text-primary-600 tracking-widest">
                    {ticket.tracking_pin}
                  </p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="text-center mb-6">
              <span className="px-4 py-2 bg-success-100 text-success-600 rounded-full font-semibold">
                ✓ {ticket.booking.booking_status}
              </span>
              <p className="text-sm text-dark-500 mt-2">Booked on {formatDate(ticket.booking.created_at)}</p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="border border-primary-500 text-primary-600 py-3 rounded-lg hover:bg-primary-50 transition-colors font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Download className="h-5 w-5" />
                <span>{downloading ? 'Downloading...' : 'Download'}</span>
              </button>
              <button
                onClick={handleTrackBus}
                className="bg-success-500 text-white py-3 rounded-lg hover:bg-success-600 transition-colors font-semibold flex items-center justify-center space-x-2"
              >
                <Navigation className="h-5 w-5" />
                <span>Track Bus</span>
              </button>
              <Link
                to="/dashboard/user"
                className="bg-dark-800 text-white py-3 rounded-lg hover:bg-dark-700 transition-colors font-semibold text-center flex items-center justify-center"
              >
                All Bookings
              </Link>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-dark-800 mb-4">Important Notes</h3>
          <ul className="space-y-2 text-dark-600">
            <li className="flex items-start space-x-2">
              <span className="text-primary-500 font-bold">•</span>
              <span>Please arrive at the departure point 15 minutes before departure time</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary-500 font-bold">•</span>
              <span>Keep your ticket and tracking PIN safe for the journey</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary-500 font-bold">•</span>
              <span>Live tracking will be available 30 minutes before departure</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary-500 font-bold">•</span>
              <span>For any assistance, contact our helpline: +94 11 123 4567</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TicketPage;
