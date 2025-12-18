import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Mail, Phone, Save, AlertCircle, CheckCircle, Award, Building2 } from 'lucide-react';

interface DriverProfile {
  license_number: string;
  experience_years: number;
}

interface OwnerProfile {
  company_name: string;
  license_number: string;
  address: string;
  city: string;
  state: string;
}

const EditProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);

  const loadRoleProfile = async () => {
    if (!user) return;

    try {
      if (user.role === 'driver') {
        const { data, error } = await supabase
          .from('drivers')
          .select('license_number, experience_years')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setDriverProfile(data || null);
      } else if (user.role === 'owner') {
        const { data, error } = await supabase
          .from('owners')
          .select('company_name, license_number, address, city, state')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setOwnerProfile(data || null);
      }
    } catch (error) {
      console.error('Error loading role profile:', error);
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      loadRoleProfile();
    }
  }, [user?.id]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDriverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDriverProfile(prev => prev ? { ...prev, [name]: name === 'experience_years' ? parseInt(value) : value } : null);
  };

  const handleOwnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOwnerProfile(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name.trim()) {
      showNotification('error', 'Name is required');
      return;
    }

    if (!formData.phone.trim()) {
      showNotification('error', 'Phone number is required');
      return;
    }

    setLoading(true);
    try {
      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({ name: formData.name.trim(), phone: formData.phone.trim() })
        .eq('id', user.id);
      if (userError) throw userError;

      // Update driver or owner table
      if (user.role === 'driver' && driverProfile) {
        const { error: driverError } = await supabase
          .from('drivers')
          .update({
            license_number: driverProfile.license_number,
            experience_years: driverProfile.experience_years,
          })
          .eq('user_id', user.id);
        if (driverError) throw driverError;
      } else if (user.role === 'owner' && ownerProfile) {
        const { error: ownerError } = await supabase
          .from('owners')
          .update({
            company_name: ownerProfile.company_name,
            license_number: ownerProfile.license_number,
            address: ownerProfile.address,
            city: ownerProfile.city,
            state: ownerProfile.state,
          })
          .eq('user_id', user.id);
        if (ownerError) throw ownerError;
      }

      showNotification('success', 'Profile updated successfully!');

      // Force refresh user context data and role profile
      if (refreshUser) {
        await refreshUser();
      }
      await loadRoleProfile();

      // Clear stale form data and reset it with updated user info
      if (user) {
        setFormData({
          name: user.name || formData.name.trim(),
          email: user.email || formData.email,
          phone: user.phone || formData.phone.trim(),
        });
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showNotification('error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Please log in to edit your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white flex items-center space-x-2`}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
            <p className="text-primary-100 mt-2">Update your personal information</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline h-4 w-4 mr-2" />
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="inline h-4 w-4 mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                  placeholder="Email cannot be changed"
                />
                <p className="text-xs text-gray-500 mt-1">Email address cannot be modified</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="inline h-4 w-4 mr-2" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                  required
                />
              </div>
            </div>

            {user.role === 'driver' && driverProfile && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-primary-600" />
                  Driver Information
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Number *
                  </label>
                  <input
                    type="text"
                    name="license_number"
                    value={driverProfile.icense_number}
                    onChange={handleDriverChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Driver license number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    name="experience_years"
                    value={driverProfile.experience_years}
                    onChange={handleDriverChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Years of driving experience"
                    min="0"
                    required
                  />
                </div>
              </div>
            )}
            {user.role === 'owner' && ownerProfile && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center">
                  <Building2 className="h-5 w-5 mr-2 text-primary-600" />
                  Company Information
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={ownerProfile.company_name}
                    onChange={handleOwnerChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Company name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business License Number *
                  </label>
                  <input
                    type="text"
                    name="license_number"
                    value={ownerProfile.license_number}
                    onChange={handleOwnerChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Business license number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={ownerProfile.address || ''}
                    onChange={handleOwnerChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Business address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={ownerProfile.city || ''}
                      onChange={handleOwnerChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={ownerProfile.state || ''}
                      onChange={handleOwnerChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="State"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Account Role: {user.role}</p>
                  <p>Your role and email cannot be changed. Contact admin for role changes.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Save className="h-5 w-5" />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
