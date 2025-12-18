/*
  # Omniport Bus Booking Platform Database Schema

  1. New Tables
    - `users` - Authentication and user profiles with roles (admin, owner, driver, user)
    - `owners` - Extended profile for bus owners with company details
    - `drivers` - Extended profile for drivers with license information
    - `buses` - Bus fleet management with amenities and routes
    - `trips` - Scheduled trips with pricing and availability
    - `bookings` - User bookings with seat selection and payment tracking
    - `gps_logs` - Real-time GPS tracking for buses
    - `payments` - Payment transaction records
    - `bus_stops` - Bus stop locations and facilities
    - `route_stops` - Mapping of stops to bus routes
    - `notifications` - System notifications for users

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Secure sensitive data access

  3. Features
    - Multi-role user system with proper authentication
    - Real-time GPS tracking capabilities
    - Comprehensive booking and payment system
    - Route and stop management
    - Notification system
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and basic profile
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'owner', 'driver', 'user')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Extended profile for bus owners
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    license_number VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    gst_number VARCHAR(50),
    bank_account VARCHAR(50),
    ifsc_code VARCHAR(20),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for owners table
CREATE INDEX IF NOT EXISTS idx_owners_user_id ON owners(user_id);
CREATE INDEX IF NOT EXISTS idx_owners_verification_status ON owners(verification_status);

-- Extended profile for drivers
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) NOT NULL,
    license_expiry DATE NOT NULL,
    experience_years INTEGER DEFAULT 0,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    emergency_contact VARCHAR(20),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'assigned', 'unavailable')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(license_number)
);

-- Create indexes for drivers table
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_availability ON drivers(availability_status);
CREATE INDEX IF NOT EXISTS idx_drivers_verification_status ON drivers(verification_status);

-- Bus fleet management
CREATE TABLE IF NOT EXISTS buses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    bus_type VARCHAR(20) DEFAULT 'ac' CHECK (bus_type IN ('ac', 'non_ac', 'sleeper', 'semi_sleeper', 'luxury')),
    total_seats INTEGER NOT NULL DEFAULT 40,
    amenities JSONB, -- Store amenities as JSON array
    from_city VARCHAR(100) NOT NULL,
    to_city VARCHAR(100) NOT NULL,
    route_description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
    registration_date DATE,
    insurance_expiry DATE,
    permit_expiry DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for buses table
CREATE INDEX IF NOT EXISTS idx_buses_owner_id ON buses(owner_id);
CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(from_city, to_city);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_buses_plate_number ON buses(plate_number);

-- Scheduled trips
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    trip_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    price_per_seat DECIMAL(10, 2) NOT NULL,
    available_seats INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bus_id, trip_date, departure_time)
);

-- Create indexes for trips table
CREATE INDEX IF NOT EXISTS idx_trips_bus_id ON trips(bus_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_trip_date ON trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);

-- User bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    passenger_name VARCHAR(255) NOT NULL,
    passenger_email VARCHAR(255) NOT NULL,
    passenger_phone VARCHAR(20) NOT NULL,
    seat_numbers JSONB NOT NULL, -- Store selected seats as JSON array
    total_amount DECIMAL(10, 2) NOT NULL,
    booking_status VARCHAR(20) DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed', 'cancelled', 'completed')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- Real-time GPS tracking
CREATE TABLE IF NOT EXISTS gps_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5, 2) DEFAULT 0,
    heading INTEGER DEFAULT 0, -- Direction in degrees (0-360)
    accuracy DECIMAL(8, 2), -- GPS accuracy in meters
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for gps_logs table
CREATE INDEX IF NOT EXISTS idx_gps_logs_bus_id ON gps_logs(bus_id);
CREATE INDEX IF NOT EXISTS idx_gps_logs_trip_id ON gps_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_gps_logs_timestamp ON gps_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_gps_logs_location ON gps_logs(latitude, longitude);

-- Payment transactions
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('card', 'upi', 'netbanking', 'wallet')),
    payment_gateway VARCHAR(50), -- razorpay, stripe, etc.
    transaction_id VARCHAR(255),
    gateway_response JSONB, -- Store gateway response as JSON
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_processed_at ON payments(processed_at);

-- Bus stops for route management
CREATE TABLE IF NOT EXISTS bus_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    facilities JSONB, -- Store facilities as JSON array
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for bus_stops table
CREATE INDEX IF NOT EXISTS idx_bus_stops_city ON bus_stops(city);
CREATE INDEX IF NOT EXISTS idx_bus_stops_location ON bus_stops(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_bus_stops_status ON bus_stops(status);

-- Route stops mapping
CREATE TABLE IF NOT EXISTS route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    stop_id UUID NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    stop_order INTEGER NOT NULL,
    arrival_time TIME,
    departure_time TIME,
    distance_from_start DECIMAL(8, 2), -- Distance in kilometers
    UNIQUE(bus_id, stop_order)
);

-- Create indexes for route_stops table
CREATE INDEX IF NOT EXISTS idx_route_stops_bus_id ON route_stops(bus_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_stop_id ON route_stops(stop_id);

-- System notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'system' CHECK (type IN ('booking', 'payment', 'trip', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can read all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for owners table
CREATE POLICY "Owners can read own data" ON owners
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Owners can update own data" ON owners
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can read all owners" ON owners
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for drivers table
CREATE POLICY "Drivers can read own data" ON drivers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Drivers can update own data" ON drivers
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins and owners can read drivers" ON drivers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- RLS Policies for buses table
CREATE POLICY "Public can read active buses" ON buses
    FOR SELECT USING (status = 'active');

CREATE POLICY "Owners can manage own buses" ON buses
    FOR ALL USING (
        owner_id IN (
            SELECT id FROM owners WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all buses" ON buses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for trips table
CREATE POLICY "Public can read scheduled trips" ON trips
    FOR SELECT USING (status = 'scheduled');

CREATE POLICY "Bus owners can manage trips for their buses" ON trips
    FOR ALL USING (
        bus_id IN (
            SELECT b.id FROM buses b
            JOIN owners o ON b.owner_id = o.id
            WHERE o.user_id = auth.uid()
        )
    );

CREATE POLICY "Drivers can read assigned trips" ON trips
    FOR SELECT USING (
        driver_id IN (
            SELECT id FROM drivers WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for bookings table
CREATE POLICY "Users can read own bookings" ON bookings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create bookings" ON bookings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings" ON bookings
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Bus owners can read bookings for their buses" ON bookings
    FOR SELECT USING (
        trip_id IN (
            SELECT t.id FROM trips t
            JOIN buses b ON t.bus_id = b.id
            JOIN owners o ON b.owner_id = o.id
            WHERE o.user_id = auth.uid()
        )
    );

-- RLS Policies for gps_logs table
CREATE POLICY "Public can read GPS logs" ON gps_logs
    FOR SELECT TO anon, authenticated;

CREATE POLICY "Drivers can insert GPS logs for assigned buses" ON gps_logs
    FOR INSERT WITH CHECK (
        bus_id IN (
            SELECT t.bus_id FROM trips t
            JOIN drivers d ON t.driver_id = d.id
            WHERE d.user_id = auth.uid()
        )
    );

-- RLS Policies for payments table
CREATE POLICY "Users can read own payments" ON payments
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create payments for own bookings" ON payments
    FOR INSERT WITH CHECK (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for bus_stops table
CREATE POLICY "Public can read bus stops" ON bus_stops
    FOR SELECT TO anon, authenticated;

CREATE POLICY "Admins can manage bus stops" ON bus_stops
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for route_stops table
CREATE POLICY "Public can read route stops" ON route_stops
    FOR SELECT TO anon, authenticated;

CREATE POLICY "Bus owners can manage route stops for their buses" ON route_stops
    FOR ALL USING (
        bus_id IN (
            SELECT b.id FROM buses b
            JOIN owners o ON b.owner_id = o.id
            WHERE o.user_id = auth.uid()
        )
    );

-- RLS Policies for notifications table
CREATE POLICY "Users can read own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Insert sample data for testing (using proper UUID generation)

-- Sample admin user
INSERT INTO users (email, password_hash, name, role) VALUES 
('admin@omniport.com', '$2b$10$example_hash', 'Admin User', 'admin');

-- Sample bus owner
INSERT INTO users (email, password_hash, name, phone, role) VALUES 
('owner@omniport.com', '$2b$10$example_hash', 'Transport Owner', '+91-9876543210', 'owner');

-- Get the owner user ID and create owner profile
DO $$
DECLARE
    owner_user_id UUID;
    owner_id UUID;
    driver_user_id UUID;
    driver_id UUID;
    bus_id UUID;
BEGIN
    -- Get owner user ID
    SELECT id INTO owner_user_id FROM users WHERE email = 'owner@omniport.com';
    
    -- Insert owner profile
    INSERT INTO owners (user_id, company_name, license_number, city, state, verification_status) 
    VALUES (owner_user_id, 'Express Transport Co.', 'TL-2024-001', 'Delhi', 'Delhi', 'verified')
    RETURNING id INTO owner_id;

    -- Sample driver
    INSERT INTO users (email, password_hash, name, phone, role) VALUES 
    ('driver@omniport.com', '$2b$10$example_hash', 'Rajesh Kumar', '+91-9876543211', 'driver')
    RETURNING id INTO driver_user_id;

    INSERT INTO drivers (user_id, license_number, license_expiry, experience_years, verification_status) 
    VALUES (driver_user_id, 'DL-1234567890', '2025-12-31', 8, 'verified')
    RETURNING id INTO driver_id;

    -- Sample regular user
    INSERT INTO users (email, password_hash, name, phone, role) VALUES 
    ('user@omniport.com', '$2b$10$example_hash', 'John Doe', '+91-9876543212', 'user');

    -- Sample bus
    INSERT INTO buses (owner_id, name, plate_number, bus_type, total_seats, from_city, to_city, amenities) 
    VALUES (owner_id, 'Volvo Express VX-101', 'DL-01-AB-1234', 'luxury', 40, 'Delhi', 'Mumbai', 
     '["WiFi", "AC", "Charging Port", "Water Bottle", "Blanket"]'::jsonb)
    RETURNING id INTO bus_id;

    -- Sample trip
    INSERT INTO trips (bus_id, driver_id, trip_date, departure_time, arrival_time, price_per_seat, available_seats) 
    VALUES (bus_id, driver_id, '2024-01-15', '08:00:00', '18:00:00', 1200.00, 40);

    -- Sample bus stops
    INSERT INTO bus_stops (name, city, state, latitude, longitude) VALUES 
    ('ISBT Kashmere Gate', 'Delhi', 'Delhi', 28.6692, 77.2265),
    ('Mumbai Central', 'Mumbai', 'Maharashtra', 18.9690, 72.8205);
END $$;