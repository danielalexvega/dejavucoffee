'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptions?: any[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  userId: string | null; // Unique User ID for Redfast and analytics
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; subscriptions?: any[] }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const SESSION_STORAGE_KEY = 'coffee_demo_session';
const USER_ID_STORAGE_KEY = 'coffee_demo_user_id';

interface SessionData {
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptions?: any[];
  expiresAt: number;
}

// Generate a UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get or create a User ID from localStorage
function getOrCreateUserId(): string {
  try {
    let userId = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (!userId) {
      // Generate new UUID if one doesn't exist
      userId = generateUUID();
      localStorage.setItem(USER_ID_STORAGE_KEY, userId);
    }
    return userId;
  } catch (error) {
    console.error('Error getting/creating User ID:', error);
    // Fallback: generate a new ID even if localStorage fails
    return generateUUID();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session and User ID from localStorage on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        // Get or create User ID (persists even when logged out)
        const storedUserId = getOrCreateUserId();
        setUserId(storedUserId);

        const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
        if (sessionData) {
          const session: SessionData = JSON.parse(sessionData);
          
          // Check if session is still valid
          if (session.expiresAt > Date.now()) {
            setUser({
              email: session.email,
              firstName: session.firstName,
              lastName: session.lastName,
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
        // Still try to get/create User ID even if session load fails
        try {
          const storedUserId = getOrCreateUserId();
          setUserId(storedUserId);
        } catch (idError) {
          console.error('Error getting User ID:', idError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  // Expose User ID to window and dataLayer for Redfast/analytics access
  useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      // Expose to window object for easy access
      (window as any).coffeeDemoUserId = userId;

      // Initialize dataLayer if it doesn't exist (for Google Tag Manager / Redfast)
      if (!(window as any).dataLayer) {
        (window as any).dataLayer = [];
      }

      // Push User ID to dataLayer
      (window as any).dataLayer.push({
        userId: userId,
        event: 'user_id_ready',
      });

      console.log('User ID exposed for analytics:', userId);
    }
  }, [userId]);

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
        firstName: data.account?.firstName,
        lastName: data.account?.lastName,
        subscriptions: data.subscriptions,
        expiresAt: Date.now() + SESSION_DURATION,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));

      // Update user state
      setUser({
        email,
        firstName: data.account?.firstName,
        lastName: data.account?.lastName,
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
    // Note: User ID is NOT removed on logout - it persists for analytics tracking
    // This allows Redfast to continue tracking the same user across sessions
  };

  const updateUser = (userData: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    
    // Update localStorage session
    try {
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionData) {
        const session: SessionData = JSON.parse(sessionData);
        const updatedSession: SessionData = {
          ...session,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          subscriptions: updatedUser.subscriptions,
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
      }
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, userId, login, logout, updateUser, isLoading }}>
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
