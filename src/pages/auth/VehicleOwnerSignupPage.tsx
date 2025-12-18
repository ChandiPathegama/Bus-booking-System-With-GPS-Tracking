import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Phone, Truck, Users, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const VehicleOwnerSignupPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profilePicture: null as File | null,
    vehicleRegistrationNumber: '',
    vehicleType: 'Bus',
    vehicleModel: '',
    vehicleColor: '',
    vehicleImage: null as File | null,
    numberOfSeats: 40
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [vehicleImagePreview, setVehicleImagePreview] = useState<string | null>(null);

  const vehicleTypes = ['Bus', 'Van', 'Minibus', 'Coach', 'Microbus'];
  const vehicleColors = [
    'White', 'Black', 'Silver', 'Gray', 'Red', 
    'Blue', 'Green', 'Yellow', 'Orange', 'Brown', 'Other'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      reader.onload = (e) => {
        if (e.target?.result) {
          setProfilePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVehicleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      // Check file size (2MB = 2 * 1024 * 1024 bytes)
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('Vehicle image must be less than 2MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }

      setFormData(prev => ({ ...prev, vehicleImage: file }));
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setVehicleImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      setError(''); // Clear any previous errors
    }
  };

  const removeProfilePicture = () => {
    setFormData(prev => ({ ...prev, profilePicture: null }));
    setProfilePreview(null);
  };

  const removeVehicleImage = () => {
    setFormData(prev => ({ ...prev, vehicleImage: null }));
    setVehicleImagePreview(null);
  };

  const uploadVehicleImage = async (file: File, busId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${busId}-${Date.now()}.${fileExt}`;
      const filePath = `bus-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicles')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading vehicle image:', error);
      return null;
    }
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

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (!formData.vehicleRegistrationNumber || !formData.vehicleModel) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (!formData.vehicleColor) {
      setError('Please select vehicle color');
      setLoading(false);
      return;
    }

    const phoneRegex = /^(\+94|0)?[0-9]{9,10}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      setError('Please enter a valid phone number');
      setLoading(false);
      return;
    }

    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existingUser) {
        setError('This email is already registered. Please use a different email.');
        setLoading(false);
        return;
      }

      // 1. Create user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: formData.email,
          name: formData.fullName,
          phone: formData.phone,
          password: formData.password,
          role: 'owner',
          status: 'active',
          email_verified: false
        })
        .select()
        .single();

      if (userError) {
        console.error('User insert error:', userError);
        throw userError;
      }

      // 2. Create owner record
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .insert({
          user_id: userData.id,
          company_name: formData.fullName,
          license_number: formData.vehicleRegistrationNumber,
          verification_status: 'pending',
          address: '',
          city: '',
          state: ''
        })
        .select()
        .single();

      if (ownerError) {
        console.error('Owner insert error:', ownerError);
        throw ownerError;
      }

      // 3. Create bus record with proper bus_type mapping
      const busTypeMapping: { [key: string]: string } = {
        'Bus': 'ac',
        'Van': 'non_ac',
        'Minibus': 'ac',
        'Coach': 'luxury',
        'Microbus': 'non_ac'
      };

      const { data: busData, error: busError } = await supabase
        .from('buses')
        .insert({
          owner_id: ownerData.id,
          name: `${formData.vehicleType} - ${formData.vehicleModel}`,
          plate_number: formData.vehicleRegistrationNumber.toUpperCase(),
          bus_type: busTypeMapping[formData.vehicleType] || 'ac',
          total_seats: formData.numberOfSeats,
          color: formData.vehicleColor,
          from_city: 'Colombo',
          to_city: 'Kandy',
          status: 'active',
          amenities: []
        })
        .select()
        .single();

      if (busError) {
        console.error('Bus insert error:', busError);
        throw busError;
      }

      // 4. Upload vehicle image if provided
      if (formData.vehicleImage && busData) {
        const imageUrl = await uploadVehicleImage(formData.vehicleImage, busData.id);
        
        if (imageUrl) {
          await supabase
            .from('buses')
            .update({ image_url: imageUrl })
            .eq('id', busData.id);
        }
      }

      alert('Account created successfully!');
      navigate('/auth/login');
      
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="bg-yellow-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="h-8 w-8 text-gray-800" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Vehicle Owner Registration</h2>
          <p className="mt-2 text-gray-600">Join Omniport as a vehicle owner and manage your fleet</p>
        </div>

        <form className="bg-white rounded-xl shadow-lg p-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
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
              <label className="absolute bottom-0 right-0 bg-yellow-400 text-gray-800 rounded-full p-2 cursor-pointer hover:bg-yellow-500">
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
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="+94 XX XXX XXXX"
                  required
                />
              </div>
            </div>
          </div>

          {/* Vehicle Owner Specific Fields */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Truck className="h-5 w-5 mr-2 text-yellow-500" />
              Vehicle Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Vehicle Registration Number *
                </label>
                <input
                  name="vehicleRegistrationNumber"
                  type="text"
                  value={formData.vehicleRegistrationNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent uppercase"
                  placeholder="e.g., WP-CAB-1234"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Vehicle Type *
                </label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  required
                >
                  {vehicleTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Vehicle Model *
                </label>
                <input
                  name="vehicleModel"
                  type="text"
                  value={formData.vehicleModel}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="e.g., Volvo B9R"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Vehicle Color *
                </label>
                <select
                  name="vehicleColor"
                  value={formData.vehicleColor}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  required
                >
                  <option value="">Select Color</option>
                  {vehicleColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Number of Seats *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    name="numberOfSeats"
                    type="number"
                    value={formData.numberOfSeats}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    min="10"
                    max="60"
                    required
                  />
                </div>
              </div>

              {/* Vehicle Image Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Vehicle Image (Max 2MB) *
                </label>
                <div className="mt-2">
                  {vehicleImagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={vehicleImagePreview}
                        alt="Vehicle preview"
                        className="w-full h-48 object-cover rounded-lg border-2 border-yellow-200"
                      />
                      <button
                        type="button"
                        onClick={removeVehicleImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> vehicle image
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG or WEBP (MAX 2MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleVehicleImageChange}
                        className="hidden"
                        required
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Password Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Create a password"
                  required
                  minLength={6}
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
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
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
              <a href="/terms" className="text-yellow-600 hover:text-yellow-500">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-yellow-600 hover:text-yellow-500">
                Privacy Policy
              </a>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 text-gray-800 py-3 rounded-lg hover:bg-yellow-500 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Register as Vehicle Owner'}
          </button>

          <div className="text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-yellow-600 hover:text-yellow-500 font-medium"
              >
                Sign in
              </button>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Want to register as a different user type?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-yellow-600 hover:text-yellow-500"
              >
                Choose user type
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleOwnerSignupPage;
