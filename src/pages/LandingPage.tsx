import React from 'react';
import { ArrowRight, Shield, Clock, Star } from 'lucide-react';
import SearchForm from '../components/SearchForm';
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  
  // Show search form only for passengers or guests (not logged in)
  const showSearchForm = !user || user.role === 'user' || user.role === 'passenger';

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-400 to-primary-600 py-20 lg:py-32">
        <div className="absolute inset-0 bg-dark-800 opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold text-dark-800 mb-6">
              Travel Smart with <span className="text-white">Omniport</span>
            </h1>
            <p className="text-xl lg:text-2xl text-dark-700 max-w-3xl mx-auto mb-8">
              Book your bus tickets instantly across Sri Lanka, track your journey in real-time, and travel with complete peace of mind
            </p>
          </div>
          
          {/* Show search form only for passengers or guests */}
          {showSearchForm && <SearchForm />}
          
          {/* Show message for other user types */}
          {!showSearchForm && (
            <div className="text-center bg-white/90 backdrop-blur-sm rounded-xl p-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-dark-800 mb-4">
                Welcome, {user?.name}!
              </h3>
              <p className="text-lg text-dark-600 mb-6">
                Access your dashboard to manage your {user?.role === 'owner' ? 'fleet' : user?.role === 'driver' ? 'trips' : 'account'}.
              </p>
              <a 
                href={`/dashboard/${user?.role}`}
                className="inline-flex items-center space-x-2 bg-dark-800 text-white px-8 py-3 rounded-lg hover:bg-dark-700 transition-all font-semibold"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-dark-800 mb-4">
              Why Choose Omniport?
            </h2>
            <p className="text-xl text-dark-600 max-w-2xl mx-auto">
              Experience the future of bus travel in Sri Lanka with our cutting-edge platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-xl bg-gray-50 hover:bg-primary-50 transition-all">
              <div className="bg-primary-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="h-8 w-8 text-dark-800" />
              </div>
              <h3 className="text-xl font-bold text-dark-800 mb-4">Real-Time Tracking</h3>
              <p className="text-dark-600">
                Track your bus location live on the map with your secure tracking PIN and never miss your ride again
              </p>
            </div>

            <div className="text-center p-8 rounded-xl bg-gray-50 hover:bg-primary-50 transition-all">
              <div className="bg-primary-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-dark-800" />
              </div>
              <h3 className="text-xl font-bold text-dark-800 mb-4">Instant Tickets</h3>
              <p className="text-dark-600">
                Get your digital ticket instantly with a unique tracking PIN - no payment required for this prototype
              </p>
            </div>

            <div className="text-center p-8 rounded-xl bg-gray-50 hover:bg-primary-50 transition-all">
              <div className="bg-primary-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="h-8 w-8 text-dark-800" />
              </div>
              <h3 className="text-xl font-bold text-dark-800 mb-4">Premium Experience</h3>
              <p className="text-dark-600">
                Enjoy comfortable rides across Sri Lanka with top-rated buses and professional drivers
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied travelers who trust Omniport for their bus travel needs across Sri Lanka
          </p>
          {showSearchForm ? (
            <a
              href="/auth/signup"
              className="bg-primary-500 text-dark-800 px-8 py-4 rounded-lg hover:bg-primary-600 transition-all font-semibold text-lg inline-flex items-center space-x-2"
            >
              <span>Get Started Today</span>
              <ArrowRight className="h-5 w-5" />
            </a>
          ) : (
            <a
              href={`/dashboard/${user?.role}`}
              className="bg-primary-500 text-dark-800 px-8 py-4 rounded-lg hover:bg-primary-600 transition-all font-semibold text-lg inline-flex items-center space-x-2"
            >
              <span>Go to Your Dashboard</span>
              <ArrowRight className="h-5 w-5" />
            </a>
          )}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
