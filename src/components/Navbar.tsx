import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsUserMenuOpen(false);
  };

  const getDashboardLink = () => {
    if (!user) return '/auth/login';
    return `/dashboard/${user.role}`;
  };

  const isPassengerOrGuest = !user || user.role === 'user' || user.role === 'passenger';

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src="/logo.png" 
              alt="Omniport" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {isPassengerOrGuest && (
              <>
                <Link to="/" className="text-dark-600 hover:text-primary-500 transition-colors">
                  Home
                </Link>
                <Link to="/search" className="text-dark-600 hover:text-primary-500 transition-colors">
                  Search Buses
                </Link>
                {user && (
                  <Link to="/dashboard/user" className="text-dark-600 hover:text-primary-500 transition-colors">
                    My Bookings
                  </Link>
                )}
              </>
            )}
            
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-dark-600 hover:text-primary-500 transition-colors"
                >
                  <User className="h-5 w-5" />
                  <span>{user.name}</span>
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <Link
                      to={getDashboardLink()}
                      className="block px-4 py-2 text-dark-600 hover:bg-primary-50 transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/edit-profile"
                      className="block px-4 py-2 text-dark-600 hover:bg-primary-50 transition-colors flex items-center space-x-2"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit Profile</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-error-500 hover:bg-error-50 transition-colors flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/auth/login"
                  className="text-dark-600 hover:text-primary-500 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/auth/signup"
                  className="bg-primary-500 text-dark-800 px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors font-medium"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-dark-600 hover:text-primary-500"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              {isPassengerOrGuest && (
                <>
                  <Link
                    to="/"
                    className="text-dark-600 hover:text-primary-500 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Home
                  </Link>
                  <Link
                    to="/search"
                    className="text-dark-600 hover:text-primary-500 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Search Buses
                  </Link>
                  {user && (
                    <Link
                      to="/dashboard/user"
                      className="text-dark-600 hover:text-primary-500 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Bookings
                    </Link>
                  )}
                </>
              )}
              
              {user ? (
                <>
                  <Link
                    to={getDashboardLink()}
                    className="text-dark-600 hover:text-primary-500 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/edit-profile"
                    className="text-dark-600 hover:text-primary-500 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Edit Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-left text-error-500 hover:text-error-600 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    className="text-dark-600 hover:text-primary-500 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/auth/signup"
                    className="bg-primary-500 text-dark-800 px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors font-medium inline-block text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
