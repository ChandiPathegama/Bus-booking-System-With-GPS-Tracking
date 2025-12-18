/*
  # Sri Lankan Bus Booking System Updates

  1. New Tables
    - `locations` - Predefined bus route locations for Sri Lanka
    - `tickets` - Generated tickets with tracking codes after booking

  2. Updates
    - Remove seat selection functionality
    - Add ticket generation with 4-digit PIN
    - Update sample data for Sri Lankan locations

  3. Sample Data
    - Add major Sri Lankan cities as locations
    - Update existing data to reflect Sri Lankan context
*/

-- Create locations table for Sri Lankan cities
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  district VARCHAR(100),
  province VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for locations
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);

-- Create tickets table for generated tickets with tracking
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  tracking_pin VARCHAR(4) NOT NULL,
  qr_code TEXT, -- For future QR code implementation
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for tickets
CREATE INDEX IF NOT EXISTS idx_tickets_booking_id ON tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_tracking_pin ON tickets(tracking_pin);

-- Enable RLS on new tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locations table
CREATE POLICY "Public can read active locations" ON locations
    FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage locations" ON locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for tickets table
CREATE POLICY "Users can read own tickets" ON tickets
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can create tickets" ON tickets
    FOR INSERT WITH CHECK (true);

-- Insert Sri Lankan locations
INSERT INTO locations (name, district, province) VALUES 
('Colombo', 'Colombo', 'Western Province'),
('Kandy', 'Kandy', 'Central Province'),
('Galle', 'Galle', 'Southern Province'),
('Jaffna', 'Jaffna', 'Northern Province'),
('Anuradhapura', 'Anuradhapura', 'North Central Province'),
('Negombo', 'Gampaha', 'Western Province'),
('Matara', 'Matara', 'Southern Province'),
('Trincomalee', 'Trincomalee', 'Eastern Province'),
('Batticaloa', 'Batticaloa', 'Eastern Province'),
('Kurunegala', 'Kurunegala', 'North Western Province'),
('Ratnapura', 'Ratnapura', 'Sabaragamuwa Province'),
('Badulla', 'Badulla', 'Uva Province'),
('Nuwara Eliya', 'Nuwara Eliya', 'Central Province'),
('Polonnaruwa', 'Polonnaruwa', 'North Central Province'),
('Hambantota', 'Hambantota', 'Southern Province');

-- Update existing buses to use Sri Lankan routes
UPDATE buses SET 
  from_city = 'Colombo',
  to_city = 'Kandy'
WHERE id IN (SELECT id FROM buses LIMIT 1);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'OMN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate 4-digit tracking PIN
CREATE OR REPLACE FUNCTION generate_tracking_pin()
RETURNS TEXT AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create ticket after booking
CREATE OR REPLACE FUNCTION create_ticket_after_booking()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tickets (booking_id, ticket_number, tracking_pin)
  VALUES (NEW.id, generate_ticket_number(), generate_tracking_pin());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_ticket_after_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_ticket_after_booking();