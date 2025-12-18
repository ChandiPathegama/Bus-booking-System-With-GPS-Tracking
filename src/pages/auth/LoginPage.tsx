import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Wifi, WifiOff, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [dbChecking, setDbChecking] = useState(true);
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkDatabaseConnectivity();
  }, []);

  const checkDatabaseConnectivity = async () => {
    setDbChecking(true);
    setConnectionDetails(null);
    
    try {
      console.log('=== Comprehensive Database Connectivity Check ===');
      
      // Check environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log('Environment Check:');
      console.log('- Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
      console.log('- Supabase Key:', supabaseKey ? 'Set' : 'Missing');
      
      if (!supabaseUrl || !supabaseKey) {
        setConnectionDetails({
          status: 'failed',
          error: 'Missing environment variables',
          details: {
            url: !supabaseUrl ? 'VITE_SUPABASE_URL is missing' : 'OK',
            key: !supabaseKey ? 'VITE_SUPABASE_ANON_KEY is missing' : 'OK'
          }
        });
        setDbConnected(false);
        return;
      }

      // Test 1: Basic Supabase client initialization
      console.log('Testing Supabase client initialization...');
      
      // Test 2: Simple query to check if we can reach Supabase
      console.log('Testing basic connectivity...');
      const { data: healthData, error: healthError } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (healthError) {
        console.error('Health check failed:', healthError);
        setConnectionDetails({
          status: 'failed',
          error: healthError.message || 'Unknown database error',
          code: healthError.code,
          details: healthError.details,
          hint: healthError.hint,
          possibleCauses: [
            'Invalid Supabase URL or API key',
            'Supabase project is paused or deleted',
            'Network connectivity issues',
            'Row Level Security (RLS) policies blocking access',
            'Table does not exist'
          ]
        });
        setDbConnected(false);
        return;
      }

      console.log('Basic connectivity successful');

      // Test 3: Try to query actual data
      console.log('Testing data query...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .limit(1);

      if (userError) {
        console.error('User query failed:', userError);
        setConnectionDetails({
          status: 'partial',
          error: userError.message,
          code: userError.code,
          message: 'Can connect to Supabase but cannot query users table',
          possibleCauses: [
            'RLS policies are blocking SELECT operations',
            'Users table does not exist',
            'Insufficient permissions for the API key'
          ]
        });
        setDbConnected(false);
        return;
      }

      // Test 4: Check if users table has data
      if (!userData || userData.length === 0) {
        console.log('Users table is empty');
        setConnectionDetails({
          status: 'connected_empty',
          message: 'Database connected but users table is empty',
          suggestion: 'You need to insert test users into the database'
        });
        setDbConnected(true);
      } else {
        console.log('Found users in database:', userData.length);
        setConnectionDetails({
          status: 'connected',
          message: 'Database connected successfully',
          userCount: userData.length,
          sampleUsers: userData.map(u => ({ email: u.email, role: u.role }))
        });
        setDbConnected(true);
      }

    } catch (error: any) {
      console.error('Connection test failed with exception:', error);
      setConnectionDetails({
        status: 'failed',
        error: error.message || 'Network or configuration error',
        stack: error.stack,
        possibleCauses: [
          'Network connectivity issues',
          'Invalid Supabase configuration',
          'CORS issues',
          'Firewall blocking requests'
        ]
      });
      setDbConnected(false);
    } finally {
      setDbChecking(false);
    }
  };

  const insertTestUsers = async () => {
    try {
      console.log('Inserting test users...');
      
      const testUsers = [
        { email: 'admin@omniport.com', password: '1234', name: 'Admin User', role: 'admin', status: 'active' },
        { email: 'owner@omniport.com', password: '1234', name: 'Owner User', role: 'owner', status: 'active' },
        { email: 'driver@omniport.com', password: '1234', name: 'Driver User', role: 'driver', status: 'active' },
        { email: 'user@omniport.com', password: '1234', name: 'Regular User', role: 'user', status: 'active' }
      ];

      const { data, error } = await supabase
        .from('users')
        .insert(testUsers)
        .select();

      if (error) {
        console.error('Failed to insert test users:', error);
        alert(`Failed to insert test users: ${error.message}`);
      } else {
        console.log('Test users inserted:', data);
        alert(`Successfully inserted ${data.length} test users!`);
        checkDatabaseConnectivity();
      }
    } catch (error: any) {
      console.error('Error inserting test users:', error);
      alert(`Error inserting test users: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (dbConnected === false) {
      setError('Database connection failed. Please check your connection and try again.');
      setLoading(false);
      return;
    }

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-dark-800">Welcome Back</h2>
          <p className="mt-2 text-dark-600">Sign in to your Omniport account</p>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit}>
          {/* Enhanced Database Connection Status */}
          <div className="mb-4">
            {dbChecking ? (
              <div className="flex items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <RefreshCw className="animate-spin h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm text-blue-700">Checking database connection...</span>
              </div>
            ) : dbConnected === true ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Wifi className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-700">Database connected</span>
                </div>
                {connectionDetails?.status === 'connected_empty' && (
                  <div className="text-center">
                    <p className="text-xs text-orange-600 mb-2">No users found in database</p>
                    <button
                      type="button"
                      onClick={insertTestUsers}
                      className="text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
                    >
                      Insert Test Users
                    </button>
                  </div>
                )}
                {connectionDetails?.sampleUsers && (
                  <div className="text-xs text-green-600 mt-2">
                    <p>Found {connectionDetails.userCount} users</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <WifiOff className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-sm text-red-700">Database connection failed</span>
                  </div>
                  <button
                    type="button"
                    onClick={checkDatabaseConnectivity}
                    className="text-xs text-red-600 hover:text-red-500 underline"
                    disabled={dbChecking}
                  >
                    Retry
                  </button>
                </div>
                {connectionDetails && (
                  <div className="text-xs text-red-600 mt-2 space-y-1">
                    <p><strong>Error:</strong> {connectionDetails.error}</p>
                    {connectionDetails.code && <p><strong>Code:</strong> {connectionDetails.code}</p>}
                    {connectionDetails.possibleCauses && (
                      <div>
                        <p><strong>Possible causes:</strong></p>
                        <ul className="list-disc list-inside ml-2">
                          {connectionDetails.possibleCauses.map((cause: string, index: number) => (
                            <li key={index}>{cause}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-error-50 border border-error-200 text-error-600 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-600 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  required
                  disabled={loading || dbConnected === false}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-600 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 h-5 w-5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                  disabled={loading || dbConnected === false}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400 hover:text-dark-600"
                  disabled={loading || dbConnected === false}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                disabled={loading || dbConnected === false}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-dark-600">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link to="#" className="text-primary-600 hover:text-primary-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || dbConnected === false || dbChecking}
            className="w-full bg-primary-500 text-dark-800 py-3 rounded-lg hover:bg-primary-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : dbConnected === false ? 'Database Disconnected' : 'Sign In'}
          </button>

          <div className="text-center">
            <p className="text-dark-600">
              Don't have an account?{' '}
              <Link to="/auth/signup" className="text-primary-600 hover:text-primary-500 font-medium">
                Sign up
              </Link>
            </p>
          </div>

          {/* Demo Accounts */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-dark-600 mb-2 font-medium">Demo Accounts:</p>
            <div className="text-xs text-dark-500 space-y-1">
              <p>Admin: admin@omniport.com</p>
              <p>Owner: owner@omniport.com</p>
              <p>Driver: driver@omniport.com</p>
              <p>User: user@omniport.com</p>
              <p className="text-primary-600">Password: <strong>1234</strong></p>
            </div>
          </div>

          {/* Enhanced Debug Info */}
          <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
            <p><strong>Debug Info:</strong></p>
            <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✓ Set' : '✗ Missing'}</p>
            <p>Supabase Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}</p>
            <p>DB Status: {dbConnected === null ? 'Checking...' : dbConnected ? 'Connected' : 'Failed'}</p>
            {connectionDetails && (
              <details className="mt-2">
                <summary className="cursor-pointer font-semibold">Connection Details</summary>
                <pre className="mt-1 p-2 bg-gray-200 rounded text-xs overflow-auto">
                  {JSON.stringify(connectionDetails, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
