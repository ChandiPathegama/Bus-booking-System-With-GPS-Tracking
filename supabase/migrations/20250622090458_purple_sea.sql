/*
  # Weekly Timetable System

  1. New Tables
    - `weekly_timetables` - Stores recurring weekly schedules for buses
    - Drop the existing trips table approach for a cleaner weekly system

  2. Features
    - Day of week (Monday-Sunday) based scheduling
    - Departure and arrival times
    - Repeating weekly pattern
    - No specific dates needed

  3. Optimized for
    - Fast queries by day of week
    - Easy timetable management
    - Driver schedule viewing
*/

-- Create weekly timetables table
CREATE TABLE IF NOT EXISTS weekly_timetables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1=Monday, 7=Sunday
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    price_per_seat DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bus_id, day_of_week, departure_time) -- Prevent duplicate schedules
);

-- Create indexes for weekly_timetables
CREATE INDEX IF NOT EXISTS idx_weekly_timetables_bus_id ON weekly_timetables(bus_id);
CREATE INDEX IF NOT EXISTS idx_weekly_timetables_driver_id ON weekly_timetables(driver_id);
CREATE INDEX IF NOT EXISTS idx_weekly_timetables_day_of_week ON weekly_timetables(day_of_week);
CREATE INDEX IF NOT EXISTS idx_weekly_timetables_departure_time ON weekly_timetables(departure_time);
CREATE INDEX IF NOT EXISTS idx_weekly_timetables_active ON weekly_timetables(is_active);

-- Enable RLS
ALTER TABLE weekly_timetables ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_timetables
CREATE POLICY "Public can read active timetables" ON weekly_timetables
    FOR SELECT USING (is_active = true);

CREATE POLICY "Bus owners can manage timetables for their buses" ON weekly_timetables
    FOR ALL USING (
        bus_id IN (
            SELECT b.id FROM buses b
            JOIN owners o ON b.owner_id = o.id
            WHERE o.user_id = auth.uid()
        )
    );

CREATE POLICY "Drivers can read assigned timetables" ON weekly_timetables
    FOR SELECT USING (
        driver_id IN (
            SELECT id FROM drivers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all timetables" ON weekly_timetables
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to get day name from number
CREATE OR REPLACE FUNCTION get_day_name(day_num INTEGER)
RETURNS TEXT AS $$
BEGIN
    CASE day_num
        WHEN 1 THEN RETURN 'Monday';
        WHEN 2 THEN RETURN 'Tuesday';
        WHEN 3 THEN RETURN 'Wednesday';
        WHEN 4 THEN RETURN 'Thursday';
        WHEN 5 THEN RETURN 'Friday';
        WHEN 6 THEN RETURN 'Saturday';
        WHEN 7 THEN RETURN 'Sunday';
        ELSE RETURN 'Unknown';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get day number from name
CREATE OR REPLACE FUNCTION get_day_number(day_name TEXT)
RETURNS INTEGER AS $$
BEGIN
    CASE LOWER(day_name)
        WHEN 'monday' THEN RETURN 1;
        WHEN 'tuesday' THEN RETURN 2;
        WHEN 'wednesday' THEN RETURN 3;
        WHEN 'thursday' THEN RETURN 4;
        WHEN 'friday' THEN RETURN 5;
        WHEN 'saturday' THEN RETURN 6;
        WHEN 'sunday' THEN RETURN 7;
        ELSE RETURN NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Insert sample weekly timetable data
DO $$
DECLARE
    sample_bus_id UUID;
    sample_driver_id UUID;
BEGIN
    -- Get a sample bus and driver
    SELECT id INTO sample_bus_id FROM buses LIMIT 1;
    SELECT id INTO sample_driver_id FROM drivers LIMIT 1;
    
    IF sample_bus_id IS NOT NULL AND sample_driver_id IS NOT NULL THEN
        -- Insert sample weekly schedule
        INSERT INTO weekly_timetables (bus_id, driver_id, day_of_week, departure_time, arrival_time, price_per_seat) VALUES
        (sample_bus_id, sample_driver_id, 1, '08:00:00', '12:00:00', 1500.00), -- Monday
        (sample_bus_id, sample_driver_id, 1, '14:00:00', '18:00:00', 1500.00), -- Monday afternoon
        (sample_bus_id, sample_driver_id, 2, '08:00:00', '12:00:00', 1500.00), -- Tuesday
        (sample_bus_id, sample_driver_id, 3, '08:00:00', '12:00:00', 1500.00), -- Wednesday
        (sample_bus_id, sample_driver_id, 4, '08:00:00', '12:00:00', 1500.00), -- Thursday
        (sample_bus_id, sample_driver_id, 5, '08:00:00', '12:00:00', 1500.00), -- Friday
        (sample_bus_id, sample_driver_id, 6, '09:00:00', '13:00:00', 1800.00); -- Saturday
    END IF;
END $$;