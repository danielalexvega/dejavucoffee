'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  subscriptions?: any[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; subscriptions?: any[] }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const SESSION_STORAGE_KEY = 'coffee_demo_session';

interface SessionData {
  email: string;
  subscriptions?: any[];
  expiresAt: number;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
        if (sessionData) {
          const session: SessionData = JSON.parse(sessionData);
          
          // Check if session is still valid
          if (session.expiresAt > Date.now()) {
            setUser({
              email: session.email,
              subscriptions: session.subscriptions,
            });
          } else {
            // Session expired, remove it
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; subscriptions?: any[] }> => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    // Check password (demo: must be 'flatwhite')
    if (password !== 'flatwhite') {
      return { success: false, error: 'Incorrect password' };
    }

    try {
      // Check Recurly for subscriptions by email
      const response = await fetch('/api/recurly/check-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to check subscriptions' };
      }

      // If no subscriptions found, return error
      if (!data.subscriptions || data.subscriptions.length === 0) {
        return { 
          success: false, 
          error: 'No subscription found for this email. Please purchase a subscription first.' 
        };
      }

      // Save session to localStorage
      const sessionData: SessionData = {
        email,
        subscriptions: data.subscriptions,
        expiresAt: Date.now() + SESSION_DURATION,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));

      // Update user state
      setUser({
        email,
        subscriptions: data.subscriptions,
      });

      return { success: true, subscriptions: data.subscriptions };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
