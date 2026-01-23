'use client';

import { RecurlyProvider as RecurlyProviderBase, useRecurly as useRecurlyBase } from '@recurly/react-recurly';
import { ReactNode, useEffect, useState, useMemo } from 'react';

interface RecurlyProviderProps {
  children: ReactNode;
}

/**
 * Wrapper around @recurly/react-recurly's RecurlyProvider
 * Handles missing public key gracefully and waits for Recurly.js to load
 */
export function RecurlyProvider({ children }: RecurlyProviderProps) {
  const publicKey = process.env.NEXT_PUBLIC_RECURLY_PUBLIC_KEY;
  const [isRecurlyReady, setIsRecurlyReady] = useState(false);

  useEffect(() => {
    if (!publicKey || typeof window === 'undefined') {
      return;
    }

    // Check if Recurly is already available
    // Recurly.js v4 exposes itself as window.recurly (lowercase)
    // But @recurly/react-recurly expects window.Recurly (uppercase)
    const checkRecurly = () => {
      const recurlyLower = (window as any).recurly;
      const recurlyUpper = (window as any).Recurly;
      
      // If lowercase exists but uppercase doesn't, create an alias
      if (recurlyLower && !recurlyUpper) {
        (window as any).Recurly = recurlyLower;
      }
      
      return !!recurlyLower || !!recurlyUpper;
    };

    // Check immediately
    if (checkRecurly()) {
      setIsRecurlyReady(true);
      return;
    }

    const scriptUrl = 'https://js.recurly.com/v4/recurly.js';
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`) as HTMLScriptElement;

    // If script exists but Recurly isn't available, wait for it
    if (existingScript) {
      // Script is already in DOM, wait for it to execute
      const checkInterval = setInterval(() => {
        if (checkRecurly()) {
          setIsRecurlyReady(true);
          clearInterval(checkInterval);
        }
      }, 50);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        setIsRecurlyReady(true); // Prevent infinite loading
      }, 10000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }

    // Script doesn't exist, load it manually
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = false; // Load synchronously
    
    script.onload = () => {
      // Wait a bit for Recurly to initialize after script loads
      let attempts = 0;
      const maxAttempts = 100; // 5 seconds
      
      const checkInterval = setInterval(() => {
        attempts++;
        if (checkRecurly()) {
          setIsRecurlyReady(true);
          clearInterval(checkInterval);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          setIsRecurlyReady(true); // Prevent infinite loading
        }
      }, 50);
    };
    
    script.onerror = () => {
      setIsRecurlyReady(true); // Prevent infinite loading
    };
    
    document.head.appendChild(script);

    return () => {
      // Don't remove script on cleanup
    };
  }, [publicKey]);

  // If no public key, render children without RecurlyProvider
  if (!publicKey) {
    return <>{children}</>;
  }

  // Wait for Recurly.js to be available before rendering RecurlyProviderBase
  // Double-check that window.recurly actually exists before rendering
  if (!isRecurlyReady || typeof window === 'undefined' || (!(window as any).recurly && !(window as any).Recurly)) {
    return <>{children}</>;
  }

  // Recurly.js should be available now
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
  const [recurlyInstance, setRecurlyInstance] = useState<any>(null);
  
  if (!publicKey) {
    return {
      recurly: null,
      isLoaded: true, // Mark as loaded even without key
    };
  }

  // Check if window.Recurly exists (the script is loaded)
  const windowRecurly = typeof window !== 'undefined' && ((window as any).Recurly || (window as any).recurly);
  const RecurlyConstructor = typeof window !== 'undefined' ? (window as any).Recurly : null;
  const recurlyLowercase = typeof window !== 'undefined' ? (window as any).recurly : null;

  // Use the hook from @recurly/react-recurly
  // This will handle script loading automatically
  let recurlyFromHook: any = null;
  try {
    recurlyFromHook = useRecurlyBase();
  } catch (error) {
    // If useRecurlyBase throws, we're not within RecurlyProviderBase
    // This means RecurlyProviderBase hasn't initialized yet
  }
  
  // If useRecurlyBase returns null but window.Recurly exists, create instance directly
  useEffect(() => {
    if (recurlyFromHook) {
      setRecurlyInstance(recurlyFromHook);
      return;
    }
    
    if (!recurlyInstance && windowRecurly && publicKey) {
      // Try to create instance from window.Recurly constructor
      if (RecurlyConstructor && typeof RecurlyConstructor === 'function') {
        try {
          const instance = new RecurlyConstructor({ publicKey });
          setRecurlyInstance(instance);
          return;
        } catch (e) {
          // Constructor failed, try lowercase
        }
      }
      
      // If uppercase constructor didn't work, check if lowercase is already an instance
      if (recurlyLowercase && typeof recurlyLowercase === 'object' && recurlyLowercase !== null) {
        // Check if it has Elements method (it's already an instance)
        if (typeof (recurlyLowercase as any).Elements === 'function') {
          setRecurlyInstance(recurlyLowercase);
          return;
        }
      }
    }
  }, [recurlyFromHook, windowRecurly, publicKey, recurlyInstance, RecurlyConstructor, recurlyLowercase]);
  
  return {
    recurly: recurlyFromHook || recurlyInstance, // Use hook's instance or our direct instance
    isLoaded: !!windowRecurly, // Mark as loaded if script exists
  };
}
