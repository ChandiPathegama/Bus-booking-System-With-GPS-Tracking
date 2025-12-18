import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Phone, Calendar, Car, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DriverSignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profilePicture: null as File | null,
    drivingLicenseNumber: '',
    licenseExpiryDate: '',
    assignedVehicleId: '',
    emergencyContactNumber: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, profilePicture: file }));
      const reader = new FileReader();
      reader.onload = (e) => setProfilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePicture = () => {
    setFormData(prev => ({ ...prev, profilePicture: null }));
    setProfilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (!formData.drivingLicenseNumber || !formData.licenseExpiryDate || !formData.emergencyContactNumber) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Validate phone number (basic validation for Sri Lankan format)
    const phoneRegex = /^(\+94|0)?[0-9]{9,10}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      setError('Please enter a valid phone number');
      setLoading(false);
      return;
    }

    // Validate emergency contact number
    if (!phoneRegex.test(formData.emergencyContactNumber.replace(/\s/g, ''))) {
      setError('Please enter a valid emergency contact number');
      setLoading(false);
      return;
    }

    // Check if license expiry date is in the future
    const expiryDate = new Date(formData.licenseExpiryDate);
    const today = new Date();
    if (expiryDate <= today) {
      setError('License expiry date must be in the future');
      setLoading(false);
      return;
    }

    try {
      console.log('🚗 Attempting driver registration...', {
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone,
        drivingLicenseNumber: formData.drivingLicenseNumber
      });

      // Step 1: Create user account with Supabase Auth
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.fullName,
            phone: formData.phone,
            role: 'driver'
          },
          emailRedirectTo: undefined
        }
      });

      if (signupError) {
        console.error('❌ Signup error:', signupError);
        setError(signupError.message || 'Failed to create account');
        setLoading(false);
        return;
      }

      if (!signupData.user) {
        setError('Failed to create account. Please try again.');
        setLoading(false);
        return;
      }

      console.log('✅ User account created:', signupData.user.id);

      // Step 2: Insert into users table with plain password
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          id: signupData.user.id,
          email: formData.email,
          password: formData.password,
          name: formData.fullName,
          phone: formData.phone,
          role: 'driver',
          email_verified: true,
          status: 'active'
        });

      if (userInsertError) {
        console.error('❌ Failed to insert user record:', userInsertError);
        setError('Failed to create user profile. Please try again.');
        setLoading(false);
        return;
      }

      console.log('✅ User record created in users table');

      // Step 3: Insert driver-specific data
      const { data: driverRecord, error: driverError } = await supabase
        .from('drivers')
        .insert({
          user_id: signupData.user.id,
          license_number: formData.drivingLicenseNumber,
          license_expiry: formData.licenseExpiryDate,
          emergency_contact: formData.emergencyContactNumber,
          experience_years: 0,
          verification_status: 'pending',
          availability_status: 'available'
        })
        .select()
        .single();

      if (driverError) {
        console.error('❌ Failed to create driver profile:', driverError);
        setError('Account created but driver profile failed. Please contact support.');
        setLoading(false);
        return;
      }

      console.log('✅ Driver profile created successfully:', driverRecord);
      
      alert('Registration successful! You can now login to your account.');
      
      // Navigate to login page
      navigate('/auth/login');

    } catch (err: any) {
      console.error('❌ Registration error:', err);
      
      // Provide more specific error messages
      if (err.message) {
        setError(`Registration failed: ${err.message}`);
      } else if (err.code === '23505') {
        setError('This email is already registered. Please use a different email or sign in.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="bg-yellow-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="h-8 w-8 text-gray-900" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Driver Registration</h2>
          <p className="mt-2 text-gray-600">Join Omniport as a professional driver</p>
        </div>

        <form className="bg-white rounded-xl shadow-lg p-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              <p className="font-medium">⚠️ {error}</p>
            </div>
          )}

          {/* Profile Picture Upload */}
          <div className="text-center">
            <div className="relative inline-block">
              {profilePreview ? (
                <div className="relative">
                  <img
                    src={profilePreview}
                    alt="Profile preview"
                    className="w-24 h-24 rounded-full object-cover border-4 border-yellow-200"
                  />
                  <button
                    type="button"
                    onClick={removeProfilePicture}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-yellow-400 text-gray-900 rounded-full p-2 cursor-pointer hover:bg-yellow-500">
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-gray-500 mt-2">Upload profile picture (optional)</p>
          </div>

          {/* Common Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="+94 XX XXX XXXX"
                  required
                />
              </div>
            </div>
          </div>

          {/* Driver Specific Fields */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driving License Number *
                </label>
                <input
                  name="drivingLicenseNumber"
                  type="text"
                  value={formData.drivingLicenseNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="e.g., B1234567890"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Expiry Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    name="licenseExpiryDate"
                    type="date"
                    value={formData.licenseExpiryDate}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Vehicle ID (Optional)
                </label>
                <input
                  name="assignedVehicleId"
                  type="text"
                  value={formData.assignedVehicleId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Vehicle registration number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    name="emergencyContactNumber"
                    type="tel"
                    value={formData.emergencyContactNumber}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="+94 XX XXX XXXX"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Password Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-center">
            <input
              id="terms"
              type="checkbox"
              className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              required
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-600">
              I agree to the{' '}
              <Link to="#" className="text-yellow-600 hover:text-yellow-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="#" className="text-yellow-600 hover:text-yellow-500">
                Privacy Policy
              </Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 text-gray-900 py-3 rounded-lg hover:bg-yellow-500 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Register as Driver'}
          </button>

          <div className="text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-yellow-600 hover:text-yellow-500 font-medium">
                Sign in
              </Link>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Want to register as a different user type?{' '}
              <Link to="/auth/signup" className="text-yellow-600 hover:text-yellow-500">
                Choose user type
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverSignupPage;
