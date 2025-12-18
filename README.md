# Omniport - Modern Bus Booking Platform

A comprehensive bus booking platform with real-time GPS tracking, multi-role user management, and modern UI/UX design.

## 🚀 Features

### Core Functionality
- **Multi-Role System**: Admin, Owner, Driver, and User roles with specific permissions
- **Real-Time Tracking**: Live GPS tracking of buses with interactive maps
- **Smart Booking**: Seat selection, passenger management, and instant confirmation
- **Responsive Design**: Mobile-first approach with beautiful UI/UX

### User Roles & Capabilities

#### 🔧 Admin Dashboard
- Complete platform management
- User and bus oversight
- Analytics and reporting
- System configuration

#### 🚌 Bus Owner Portal
- Fleet management
- Driver assignment
- Revenue tracking
- Route management

#### 👨‍✈️ Driver Interface
- Trip management
- GPS location sharing
- Passenger information
- Route navigation

#### 👤 User Experience
- Bus search and booking
- Live tracking
- Booking history
- Profile management

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Leaflet** for interactive maps
- **Framer Motion** for animations

### Backend
- **Node.js** with Express
- **MySQL** database
- **JWT** authentication
- **bcrypt** for password hashing

### Design System
- **Primary Color**: #FFCB05 (Yellow)
- **Dark Color**: #212121
- **Font**: Plus Jakarta Sans
- **Mobile-first responsive design**

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- MySQL 8.0+
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd omniport-bus-booking
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install backend dependencies**
```bash
cd server
npm install
```

4. **Database Setup**
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE omniport;

# Import schema
mysql -u root -p omniport < database/schema.sql
```

5. **Environment Configuration**
```bash
# Copy environment file
cp server/.env.example server/.env

# Edit with your database credentials
nano server/.env
```

6. **Start Development Servers**

Frontend:
```bash
npm run dev
```

Backend (in separate terminal):
```bash
cd server
npm run dev
```

## 📱 Demo Accounts

For testing purposes, use these demo accounts:

- **Admin**: admin@omniport.com
- **Owner**: owner@omniport.com  
- **Driver**: driver@omniport.com
- **User**: user@omniport.com

*Password: any password (demo mode)*

## 🗂️ Project Structure

```
omniport-bus-booking/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Page components
│   ├── contexts/           # React contexts
│   └── utils/              # Utility functions
├── server/
│   ├── index.js            # Express server
│   ├── routes/             # API routes
│   └── middleware/         # Custom middleware
├── database/
│   └── schema.sql          # Database schema
└── public/                 # Static assets
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Buses & Trips
- `GET /api/buses/search` - Search buses
- `GET /api/trips/:tripId` - Get trip details

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/user` - User bookings

### GPS Tracking
- `POST /api/gps/update` - Update bus location
- `GET /api/gps/live/:busId` - Get live location

### Admin
- `GET /api/admin/stats` - Platform statistics

## 🎨 Design Features

- **Modern UI**: Clean, professional interface with subtle animations
- **Color System**: Comprehensive color palette with proper contrast ratios
- **Typography**: Plus Jakarta Sans with proper hierarchy
- **Responsive**: Mobile-first design with breakpoints for all devices
- **Accessibility**: WCAG compliant with proper focus states

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- SQL injection prevention
- CORS protection

## 📊 Database Schema

The platform uses a comprehensive MySQL schema with:
- User management with roles
- Bus and trip management
- Booking system with seat selection
- Real-time GPS tracking
- Payment transaction records

## 🚀 Deployment

### Frontend (Netlify/Vercel)
```bash
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Heroku)
```bash
cd server
# Set environment variables
# Deploy to your preferred platform
```

### Database (PlanetScale/AWS RDS)
- Import schema.sql
- Configure connection string
- Set up environment variables

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- Tailwind CSS for the utility-first CSS framework
- Leaflet for the interactive maps
- All contributors and testers

---

**Built with ❤️ for modern bus travel**