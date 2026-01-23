'use client';

import { RecurlyProvider as RecurlyProviderBase, useRecurly as useRecurlyBase } from '@recurly/react-recurly';
import { ReactNode, useEffect, useState } from 'react';

interface RecurlyProviderProps {
  children: ReactNode;
}

/**
 * Wrapper around @recurly/react-recurly's RecurlyProvider
 * Handles missing public key gracefully and loads Recurly.js script
 */
export function RecurlyProvider({ children }: RecurlyProviderProps) {
  const publicKey = process.env.NEXT_PUBLIC_RECURLY_PUBLIC_KEY;
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Recurly.js script if public key is provided
  useEffect(() => {
    if (!publicKey) {
      return;
    }

    // Check if script is already loaded
    if (typeof window !== 'undefined' && (window as any).Recurly) {
      setScriptLoaded(true);
      return;
    }

    // Load the Recurly.js script
    const script = document.createElement('script');
    script.src = 'https://js.recurly.com/v4/recurly.js';
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Recurly.js script');
      setScriptLoaded(true); // Still mark as loaded to prevent infinite waiting
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.querySelector('script[src="https://js.recurly.com/v4/recurly.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [publicKey]);

  // If no public key, render children without RecurlyProvider
  // This allows the app to work without Recurly configured
  if (!publicKey) {
    return <>{children}</>;
  }

  // Wait for script to load before rendering provider
  if (!scriptLoaded) {
    return <>{children}</>;
  }

  return (
    <RecurlyProviderBase publicKey={publicKey}>
      {children}
    </RecurlyProviderBase>
  );
}

/**
 * Hook to access Recurly instance
 * Returns null if Recurly is not configured
 */
export function useRecurly() {
  const publicKey = process.env.NEXT_PUBLIC_RECURLY_PUBLIC_KEY;
  
  if (!publicKey) {
    return {
      recurly: null,
      isLoaded: true, // Mark as loaded even without key
    };
  }

  try {
    const recurly = useRecurlyBase();
    return {
      recurly,
      isLoaded: !!recurly,
    };
  } catch (error) {
    // If useRecurlyBase throws, it means we're not within RecurlyProviderBase yet
    // This could mean the script is still loading or provider isn't ready
    // Check if script is loaded to determine if we should wait
    const scriptLoaded = typeof window !== 'undefined' && !!(window as any).Recurly;
    
    return {
      recurly: null,
      isLoaded: !scriptLoaded, // If script isn't loaded, we're still loading
    };
  }
}
