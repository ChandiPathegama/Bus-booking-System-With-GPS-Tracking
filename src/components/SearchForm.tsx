import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, type Location } from '../lib/supabase';

const SearchForm: React.FC = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLocations();
    setCurrentDate();
  }, []);

  const setCurrentDate = () => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setDate(formattedDate);
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Error fetching locations:', error);
        return;
      }

      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (from && to && date) {
      navigate(`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-14 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="relative">
          <label className="block text-sm font-medium text-dark-600 mb-2">From</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none bg-white"
              required
            >
              <option value="">Select departure city</option>
              {locations.map((location) => (
                <option key={location.id} value={location.name}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-dark-600 mb-2">To</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none bg-white"
              required
            >
              <option value="">Select destination city</option>
              {locations.filter(location => location.name !== from).map((location) => (
                <option key={location.id} value={location.name}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-dark-600 mb-2">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              required
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-primary-500 text-dark-800 py-4 rounded-lg hover:bg-primary-600 transition-all font-semibold flex items-center justify-center space-x-2 text-lg shadow-lg hover:shadow-xl"
      >
        <Search className="h-5 w-5" />
        <span>Search Buses</span>
      </button>
    </form>
  );
};

export default SearchForm;