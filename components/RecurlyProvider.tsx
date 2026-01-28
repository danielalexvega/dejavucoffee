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

  // Use the hook from @recurly/react-recurly
  // This will handle script loading automatically and provide a configured instance
  let recurlyFromHook: any = null;
  try {
    recurlyFromHook = useRecurlyBase();
  } catch (error) {
    // If useRecurlyBase throws, we're not within RecurlyProviderBase
    // This means RecurlyProviderBase hasn't initialized yet
  }
  
  // If useRecurlyBase returns null but script is loaded, create instance directly
  useEffect(() => {
    // Prefer the instance from RecurlyProviderBase
    if (recurlyFromHook) {
      setRecurlyInstance(recurlyFromHook);
      return;
    }
    
    // If hook doesn't provide instance but script is loaded, create our own
    if (!recurlyInstance && windowRecurly && publicKey) {
      // Try uppercase Recurly constructor first
      if (RecurlyConstructor && typeof RecurlyConstructor === 'function') {
        try {
          console.log('Creating Recurly instance with publicKey:', publicKey.substring(0, 10) + '...');
          const instance = new RecurlyConstructor({ publicKey });
          console.log('Recurly instance created successfully:', !!instance);
          setRecurlyInstance(instance);
          return;
        } catch (e: any) {
          console.error('Failed to create Recurly instance with uppercase constructor:', e?.message || e);
        }
      }
      
      // Try lowercase recurly if uppercase didn't work
      const recurlyLowercase = typeof window !== 'undefined' ? (window as any).recurly : null;
      if (recurlyLowercase && typeof recurlyLowercase === 'function') {
        try {
          console.log('Trying lowercase recurly constructor');
          const instance = new recurlyLowercase({ publicKey });
          console.log('Recurly instance created successfully with lowercase:', !!instance);
          setRecurlyInstance(instance);
          return;
        } catch (e: any) {
          console.error('Failed to create Recurly instance with lowercase constructor:', e?.message || e);
        }
      }
      
      // If both constructors failed, check if lowercase is already an instance
      if (recurlyLowercase && typeof recurlyLowercase === 'object' && recurlyLowercase !== null) {
        if (typeof (recurlyLowercase as any).Elements === 'function') {
          // It's already an instance, but might need configuration
          try {
            if (typeof (recurlyLowercase as any).configure === 'function') {
              (recurlyLowercase as any).configure({ publicKey });
            }
            console.log('Using existing recurly instance');
            setRecurlyInstance(recurlyLowercase);
            return;
          } catch (e: any) {
            console.error('Failed to configure existing recurly instance:', e?.message || e);
          }
        }
      }
    }
  }, [recurlyFromHook, windowRecurly, publicKey, recurlyInstance, RecurlyConstructor]);
  
  // Use instance from hook if available, otherwise use our direct instance
  return {
    recurly: recurlyFromHook || recurlyInstance,
    isLoaded: !!windowRecurly, // Mark as loaded if script exists
  };
}
