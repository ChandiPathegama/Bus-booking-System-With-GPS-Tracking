const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'omniport',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone, role = 'user' } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, ?)',
      [email, passwordHash, name, phone, role]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, email, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: result.insertId, email, name, role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const [users] = await pool.execute(
      'SELECT id, email, password_hash, name, role, status FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is suspended' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bus Routes
app.get('/api/buses/search', async (req, res) => {
  try {
    const { from, to, date } = req.query;

    const [trips] = await pool.execute(`
      SELECT 
        t.id as trip_id,
        b.name as bus_name,
        b.from_city,
        b.to_city,
        b.amenities,
        b.total_seats,
        t.trip_date,
        t.departure_time,
        t.arrival_time,
        t.price_per_seat,
        t.available_seats,
        u.name as owner_name
      FROM trips t
      JOIN buses b ON t.bus_id = b.id
      JOIN owners o ON b.owner_id = o.id
      JOIN users u ON o.user_id = u.id
      WHERE b.from_city LIKE ? 
        AND b.to_city LIKE ? 
        AND t.trip_date = ?
        AND t.status = 'scheduled'
        AND b.status = 'active'
      ORDER BY t.departure_time
    `, [`%${from}%`, `%${to}%`, date]);

    res.json(trips);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/trips/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;

    const [trips] = await pool.execute(`
      SELECT 
        t.*,
        b.name as bus_name,
        b.from_city,
        b.to_city,
        b.total_seats,
        b.amenities
      FROM trips t
      JOIN buses b ON t.bus_id = b.id
      WHERE t.id = ?
    `, [tripId]);

    if (trips.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Get booked seats
    const [bookings] = await pool.execute(`
      SELECT seat_numbers 
      FROM bookings 
      WHERE trip_id = ? AND booking_status = 'confirmed'
    `, [tripId]);

    const bookedSeats = [];
    bookings.forEach(booking => {
      const seats = JSON.parse(booking.seat_numbers);
      bookedSeats.push(...seats);
    });

    res.json({
      ...trips[0],
      booked_seats: bookedSeats
    });
  } catch (error) {
    console.error('Trip fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Booking Routes
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const {
      tripId,
      passengerName,
      passengerEmail,
      passengerPhone,
      seatNumbers,
      totalAmount
    } = req.body;

    // Generate booking reference
    const bookingReference = 'OMN' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

    // Insert booking
    const [result] = await pool.execute(`
      INSERT INTO bookings (
        user_id, trip_id, passenger_name, passenger_email, 
        passenger_phone, seat_numbers, total_amount, booking_reference
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      tripId,
      passengerName,
      passengerEmail,
      passengerPhone,
      JSON.stringify(seatNumbers),
      totalAmount,
      bookingReference
    ]);

    // Update available seats
    await pool.execute(`
      UPDATE trips 
      SET available_seats = available_seats - ? 
      WHERE id = ?
    `, [seatNumbers.length, tripId]);

    res.status(201).json({
      message: 'Booking created successfully',
      bookingId: result.insertId,
      bookingReference
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/bookings/user', authenticateToken, async (req, res) => {
  try {
    const [bookings] = await pool.execute(`
      SELECT 
        b.*,
        t.trip_date,
        t.departure_time,
        t.arrival_time,
        bus.name as bus_name,
        bus.from_city,
        bus.to_city
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN buses bus ON t.bus_id = bus.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `, [req.user.id]);

    res.json(bookings);
  } catch (error) {
    console.error('Bookings fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GPS Tracking Routes
app.post('/api/gps/update', authenticateToken, async (req, res) => {
  try {
    const { busId, latitude, longitude, speed, heading } = req.body;

    // Verify driver has access to this bus
    if (req.user.role !== 'driver' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.execute(`
      INSERT INTO gps_logs (bus_id, latitude, longitude, speed, heading)
      VALUES (?, ?, ?, ?, ?)
    `, [busId, latitude, longitude, speed || 0, heading || 0]);

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('GPS update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/gps/live/:busId', async (req, res) => {
  try {
    const { busId } = req.params;

    const [locations] = await pool.execute(`
      SELECT latitude, longitude, speed, heading, timestamp
      FROM gps_logs
      WHERE bus_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `, [busId]);

    if (locations.length === 0) {
      return res.status(404).json({ error: 'No location data found' });
    }

    res.json(locations[0]);
  } catch (error) {
    console.error('GPS fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Routes
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [busCount] = await pool.execute('SELECT COUNT(*) as count FROM buses WHERE status = "active"');
    const [bookingCount] = await pool.execute('SELECT COUNT(*) as count FROM bookings');
    const [revenue] = await pool.execute('SELECT SUM(total_amount) as total FROM bookings WHERE payment_status = "paid"');

    res.json({
      totalUsers: userCount[0].count,
      totalBuses: busCount[0].count,
      totalBookings: bookingCount[0].count,
      totalRevenue: revenue[0].total || 0
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;