import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Phone, CreditCard, Calendar, Upload, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';


const PassengerSignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    // Common fields
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profilePicture: null as File | null
  });


  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  
  const { signup } = useAuth();
  const navigate = useNavigate();


  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];
  const languageOptions = ['English', 'Sinhala', 'Tamil'];


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
      reader.onload = (e) => setProfilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };


  const removeProfilePicture = () => {
    setFormData(prev => ({ ...prev, profilePicture: null }));
    setProfilePreview(null);
  };


  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };


  const handleDateOfBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateOfBirth = e.target.value;
    setFormData(prev => ({
      ...prev,
      dateOfBirth,
      age: calculateAge(dateOfBirth)
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');


    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }


    // Password validation - minimum 8 characters
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }


    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }


    // Phone number validation - exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    const cleanedPhone = formData.phone.replace(/[\s\-\(\)\+]/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      setError('Phone number must be exactly 10 digits');
      setLoading(false);
      return;
    }


    try {
      const success = await signup(formData.email, formData.password, formData.fullName, cleanedPhone);
      if (success) {
        // In a real app, you would save the additional passenger data to the database
        console.log('Passenger Registration Data:', {
          ...formData,
          phone: cleanedPhone,
          role: 'user'
        });
        navigate('/dashboard/user');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="bg-primary-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-dark-800" />
          </div>
          <h2 className="text-3xl font-bold text-dark-800">Passenger Registration</h2>
          <p className="mt-2 text-dark-600">Join Omniport and start your journey with us</p>
        </div>


        <form className="bg-white rounded-xl shadow-lg p-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-error-50 border border-error-200 text-error-600 px-4 py-3 rounded-lg">
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
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary-200"
                  />
                  <button
                    type="button"
                    onClick={removeProfilePicture}
                    className="absolute -top-2 -right-2 bg-error-500 text-white rounded-full p-1 hover:bg-error-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-primary-500 text-dark-800 rounded-full p-2 cursor-pointer hover:bg-primary-600">
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-dark-500 mt-2">Upload profile picture (optional)</p>
          </div>


          {/* Common Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-dark-600 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
                <input
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>


            <div>
              <label className="block text-sm font-medium text-dark-600 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>


            <div>
              <label className="block text-sm font-medium text-dark-600 mb-2">
                Phone Number * (10 digits)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0771234567"
                  required
                  maxLength={10}
                />
              </div>
            </div>


          </div>


          {/* Password Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-dark-600 mb-2">
                Password * (min 8 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Create a password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400 hover:text-dark-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>


            <div>
              <label className="block text-sm font-medium text-dark-600 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400 hover:text-dark-600"
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
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              required
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-dark-600">
              I agree to the{' '}
              <Link to="#" className="text-primary-600 hover:text-primary-500">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="#" className="text-primary-600 hover:text-primary-500">
                Privacy Policy
              </Link>
            </label>
          </div>


          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-dark-800 py-3 rounded-lg hover:bg-primary-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Register as Passenger'}
          </button>


          <div className="text-center">
            <p className="text-dark-600">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-primary-600 hover:text-primary-500 font-medium">
                Sign in
              </Link>
            </p>
            <p className="text-sm text-dark-500 mt-2">
              Want to register as a different user type?{' '}
              <Link to="/auth/signup" className="text-primary-600 hover:text-primary-500">
                Choose user type
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};


export default PassengerSignupPage;
