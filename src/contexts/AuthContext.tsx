import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, type User } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, phone?: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('omniport_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('omniport_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login for:', email); // Debug log
      
      const { data: userRecords, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim()) // Normalize email
        .limit(1);

      console.log('Database query result:', { userRecords, error }); // Debug log

      if (error) {
        console.error('Database error during login:', error);
        return false;
      }

      if (!userRecords || userRecords.length === 0) {
        console.warn('Login failed: user not found');
        return false;
      }

      const userRecord = userRecords[0];

      // Convert both passwords to strings and trim whitespace for comparison
      const storedPassword = String(userRecord.password).trim();
      const inputPassword = String(password).trim();
      
      console.log('Password comparison:', { 
        storedPassword, 
        inputPassword, 
        match: storedPassword === inputPassword 
      }); // Debug log

      if (storedPassword !== inputPassword) {
        console.warn('Login failed: incorrect password');
        return false;
      }

      const userData: User = {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        phone: userRecord.phone,
        role: userRecord.role,
        status: userRecord.status,
        created_at: userRecord.created_at,
      };

      setUser(userData);
      localStorage.setItem('omniport_user', JSON.stringify(userData));
      console.log('Login successful for user:', userData.email); // Debug log
      return true;
    } catch (error) {
      console.error('Unexpected error during login:', error);
      return false;
    }
  };

  const signup = async (email: string, password: string, name: string, phone?: string): Promise<boolean> => {
    try {
      // Check if user already exists
      const { data: existingUsers, error: existingUserError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .limit(1);

      if (existingUserError) {
        console.error('Error checking existing user:', existingUserError);
        return false;
      }

      if (existingUsers && existingUsers.length > 0) {
        console.error('Signup failed: user already exists');
        return false;
      }

      // Insert new user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            email: email.toLowerCase().trim(),
            password: password.trim(),
            name: name.trim(),
            phone: phone?.trim(),
            role: 'user',
            status: 'active',
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Signup error:', insertError);
        return false;
      }

      if (!newUser) {
        console.error('Signup failed: no user data returned');
        return false;
      }

      const userData: User = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
        created_at: newUser.created_at,
      };

      setUser(userData);
      localStorage.setItem('omniport_user', JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Unexpected error during signup:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('omniport_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Test function to debug database connection
export async function testSupabaseConnection() {
  const testEmail = 'admin@omniport.com';

  try {
    console.log('Testing Supabase connection...');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .limit(1);

    if (error) {
      console.error('Supabase query error:', error);
    } else if (data && data.length > 0) {
      console.log('Supabase query success:', data[0]);
      console.log('Password in database:', data[0].password);
    } else {
      console.log('No user found with that email');
    }
  } catch (error) {
    console.error('Unexpected error testing Supabase connection:', error);
  }
}