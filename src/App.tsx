import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import SearchPage from './pages/SearchPage';
import BookingPage from './pages/BookingPage';
import TicketPage from './pages/TicketPage';
import TrackingPage from './pages/TrackingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import VehicleOwnerSignupPage from './pages/auth/VehicleOwnerSignupPage';
import DriverSignupPage from './pages/auth/DriverSignupPage';
import PassengerSignupPage from './pages/auth/PassengerSignupPage';
import AdminSignupPage from './pages/auth/AdminSignupPage';
import UserDashboard from './pages/dashboard/UserDashboard';
import OwnerDashboard from './pages/dashboard/OwnerDashboard';
import DriverDashboard from './pages/dashboard/DriverDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import RateTripPage from './pages/RatingPage';
import EditProfile from './pages/EditProfile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/book/:tripId" element={<BookingPage />} />
            <Route path="/ticket/:ticketId" element={<TicketPage />} />
            <Route path="/track/:busId" element={<TrackingPage />} />
            <Route path="/rate-trip/:ticketId" element={<RateTripPage />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            
            {/* Authentication Routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />
            <Route path="/auth/signup/vehicle-owner" element={<VehicleOwnerSignupPage />} />
            <Route path="/auth/signup/driver" element={<DriverSignupPage />} />
            <Route path="/auth/signup/passenger" element={<PassengerSignupPage />} />
            <Route path="/auth/signup/admin" element={<AdminSignupPage />} />
            
            {/* Dashboard Routes */}
            <Route 
              path="/dashboard/user" 
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <UserDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/owner" 
              element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <OwnerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/driver" 
              element={
                <ProtectedRoute allowedRoles={['driver']}>
                  <DriverDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;