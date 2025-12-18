import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, Car, User, Shield } from 'lucide-react';

const SignupPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-dark-800 mb-4">Join Omniport</h1>
          <p className="text-xl text-dark-600 max-w-2xl mx-auto">
            Choose your account type to get started with Sri Lanka's premier bus booking platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Vehicle Owner Card */}
          <Link
            to="/auth/signup/vehicle-owner"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-8 text-center border-2 border-transparent hover:border-primary-300"
          >
            <div className="bg-primary-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Truck className="h-8 w-8 text-dark-800" />
            </div>
            <h3 className="text-xl font-bold text-dark-800 mb-3">Vehicle Owner</h3>
            <p className="text-dark-600 mb-4">
              Register your buses and manage your fleet operations
            </p>
            <ul className="text-sm text-dark-500 space-y-1 mb-6">
              <li>• Fleet management</li>
              <li>• Driver assignment</li>
              <li>• Revenue tracking</li>
              <li>• Route management</li>
            </ul>
            <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg text-sm font-medium">
              Register Fleet
            </div>
          </Link>

          {/* Driver Card */}
          <Link
            to="/auth/signup/driver"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-8 text-center border-2 border-transparent hover:border-primary-300"
          >
            <div className="bg-primary-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Car className="h-8 w-8 text-dark-800" />
            </div>
            <h3 className="text-xl font-bold text-dark-800 mb-3">Driver</h3>
            <p className="text-dark-600 mb-4">
              Join as a professional driver and manage your trips
            </p>
            <ul className="text-sm text-dark-500 space-y-1 mb-6">
              <li>• Trip management</li>
              <li>• GPS tracking</li>
              <li>• Schedule viewing</li>
              <li>• Earnings tracking</li>
            </ul>
            <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg text-sm font-medium">
              Join as Driver
            </div>
          </Link>

          {/* Passenger Card */}
          <Link
            to="/auth/signup/passenger"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-8 text-center border-2 border-transparent hover:border-primary-300"
          >
            <div className="bg-primary-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <User className="h-8 w-8 text-dark-800" />
            </div>
            <h3 className="text-xl font-bold text-dark-800 mb-3">Passenger</h3>
            <p className="text-dark-600 mb-4">
              Book tickets and travel comfortably across Sri Lanka
            </p>
            <ul className="text-sm text-dark-500 space-y-1 mb-6">
              <li>• Easy booking</li>
              <li>• Live tracking</li>
              <li>• Digital tickets</li>
              <li>• Trip history</li>
            </ul>
            <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg text-sm font-medium">
              Book Tickets
            </div>
          </Link>

          {/* Administrator Card */}
          <Link
            to="/auth/signup/admin"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-8 text-center border-2 border-transparent hover:border-primary-300"
          >
            <div className="bg-primary-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Shield className="h-8 w-8 text-dark-800" />
            </div>
            <h3 className="text-xl font-bold text-dark-800 mb-3">Administrator</h3>
            <p className="text-dark-600 mb-4">
              Manage the platform and oversee operations
            </p>
            <ul className="text-sm text-dark-500 space-y-1 mb-6">
              <li>• Platform management</li>
              <li>• User oversight</li>
              <li>• Analytics & reports</li>
              <li>• System configuration</li>
            </ul>
            <div className="bg-warning-50 text-warning-700 px-4 py-2 rounded-lg text-sm font-medium">
              Requires Approval
            </div>
          </Link>
        </div>

        {/* Additional Information */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-dark-800 mb-6 text-center">Why Choose Omniport?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-success-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-lg font-semibold text-dark-800 mb-2">Modern Platform</h3>
              <p className="text-dark-600">
                State-of-the-art technology with real-time tracking and instant bookings
              </p>
            </div>

            <div className="text-center">
              <div className="bg-success-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-lg font-semibold text-dark-800 mb-2">Secure & Reliable</h3>
              <p className="text-dark-600">
                Your data is protected with enterprise-grade security and privacy measures
              </p>
            </div>

            <div className="text-center">
              <div className="bg-success-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🌟</span>
              </div>
              <h3 className="text-lg font-semibold text-dark-800 mb-2">24/7 Support</h3>
              <p className="text-dark-600">
                Round-the-clock customer support to assist you whenever you need help
              </p>
            </div>
          </div>
        </div>

        {/* Login Link */}
        <div className="text-center mt-8">
          <p className="text-dark-600">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-primary-600 hover:text-primary-500 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;