'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRecurly } from './RecurlyProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export function CheckoutForm() {
  const { recurly, isLoaded } = useRecurly();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planCode = searchParams.get('plan');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elementsReady, setElementsReady] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Wait for recurly to become available if script is loaded but instance isn't ready yet
  useEffect(() => {
    if (isLoaded && !recurly) {
      // Poll for recurly to become available (useRecurlyBase might return null initially)
      let attempts = 0;
      const maxAttempts = 500; // 5 seconds
      
      const checkInterval = setInterval(() => {
        attempts++;
        // Force re-render by updating formData (harmless update)
        // This will cause useRecurly to be called again
        setFormData(prev => ({ ...prev }));
        
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.warn('Recurly instance not available after 5 seconds');
        }
      }, 100);
      
      return () => {
        clearInterval(checkInterval);
      };
    }
  }, [isLoaded, recurly]);

  const cardNumberRef = useRef<HTMLDivElement>(null);
  const expirationMonthRef = useRef<HTMLDivElement>(null);
  const expirationYearRef = useRef<HTMLDivElement>(null);
  const cvvRef = useRef<HTMLDivElement>(null);
  const elementsInstanceRef = useRef<any>(null);

  // Mount Recurly Elements when Recurly is loaded
  useEffect(() => {
    if (!isLoaded) {
      setElementsReady(false);
      return;
    }
    if (!recurly) {
      setElementsReady(false);
      return;
    }

    // Wait for DOM refs to be ready
    if (!cardNumberRef.current || !expirationMonthRef.current || !expirationYearRef.current || !cvvRef.current) {
      setElementsReady(false);
      return;
    }

    try {
      const elements = recurly.Elements();
      elementsInstanceRef.current = elements; // Store Elements instance for tokenization
      
      const cardNumber = elements.CardNumberElement();
      const cardMonth = elements.CardMonthElement();
      const cardYear = elements.CardYearElement();
      const cardCvv = elements.CardCvvElement();

      // Attach Elements to DOM refs
      cardNumber.attach(cardNumberRef.current);
      cardMonth.attach(expirationMonthRef.current);
      cardYear.attach(expirationYearRef.current);
      cardCvv.attach(cvvRef.current);

      // Mark Elements as ready
      setElementsReady(true);

      return () => {
        try {
          (cardNumber as any).destroy?.();
          (cardMonth as any).destroy?.();
          (cardYear as any).destroy?.();
          (cardCvv as any).destroy?.();
        } catch (e) {
          // Ignore cleanup errors
        }
        elementsInstanceRef.current = null;
        setElementsReady(false);
      };
    } catch (error: any) {
      console.error('Error mounting Recurly Elements:', error?.message || error);
      setError(`Failed to initialize payment form: ${error?.message || 'Unknown error'}`);
      setElementsReady(false);
    }
  }, [recurly, isLoaded]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!recurly || !isLoaded) {
      setError('Recurly is not loaded. Please wait a moment and try again.');
      return;
    }

    if (!planCode) {
      setError('No plan selected. Please go back and select a subscription plan.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (!formRef.current) {
        throw new Error('Payment form not ready. Please wait a moment and try again.');
      }

      // Ensure Elements are ready
      if (!elementsReady || !elementsInstanceRef.current) {
        throw new Error('Payment form Elements not initialized. Please wait a moment and try again.');
      }

      const token = await new Promise((resolve, reject) => {
        // Recurly.js v4 Elements API: pass Elements instance to token()
        // The second parameter is optional data (first_name, last_name, etc.)
        (recurly as any).token(
          elementsInstanceRef.current,
          {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
          (err: any, token: any) => {
            if (err) {
              console.error('Recurly tokenization error:', err);
              console.error('Error fields:', err.fields);
              console.error('Error details:', err.details);
              reject(err);
            } else {
              console.log('Recurly token created:', token?.id);
              resolve(token);
            }
          }
        );
      });

      // Send token to your backend API
      const requestBody = {
        planCode,
        account: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
        },
        billingInfo: {
          token: (token as any).id,
        },
      };
      
      console.log('Sending subscription request:', { ...requestBody, billingInfo: { token: '***' } });

      const response = await fetch('/api/recurly/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      console.log('Subscription response:', { status: response.status, data });

      if (!response.ok) {
        // Show more detailed error message
        const errorMessage = data.error || data.message || 'Failed to create subscription';
        throw new Error(errorMessage);
      }

      // Redirect to success page or subscription management
      router.push(`/subscriptions/success?subscription=${data.subscription.uuid}`);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'An error occurred during checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!isLoaded) {
    const publicKey = process.env.NEXT_PUBLIC_RECURLY_PUBLIC_KEY;
    const hasRecurlyScript = typeof window !== 'undefined' && !!(window as any).Recurly;
    
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="text-gray-600 dark:text-gray-400 mb-4">Loading payment form...</div>
        {!publicKey && (
          <div className="text-sm text-yellow-600">Warning: NEXT_PUBLIC_RECURLY_PUBLIC_KEY not set</div>
        )}
        {publicKey && !hasRecurlyScript && (
          <div className="text-sm text-yellow-600">Loading Recurly.js script...</div>
        )}
      </div>
    );
  }

  if (isLoaded && !recurly) {
    // Check if public key is configured (available at build time in client components)
    const publicKey = process.env.NEXT_PUBLIC_RECURLY_PUBLIC_KEY;
    
    if (!publicKey) {
      return (
        <div className="rounded-lg bg-yellow-50 p-6 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
          <h3 className="mb-2 font-semibold">Recurly Not Configured</h3>
          <p className="mb-4">
            Please add <code className="rounded bg-yellow-100 px-2 py-1 dark:bg-yellow-900/40">NEXT_PUBLIC_RECURLY_PUBLIC_KEY</code> to your <code className="rounded bg-yellow-100 px-2 py-1 dark:bg-yellow-900/40">.env.local</code> file to enable checkout.
          </p>
          <p className="mb-4 text-sm">
            <strong>Important:</strong> After adding the key, you must restart your dev server with <code className="rounded bg-yellow-100 px-2 py-1 dark:bg-yellow-900/40">npm run dev</code> for the change to take effect.
          </p>
          <Link
            href="/subscriptions"
            className="inline-block rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
          >
            Back to Plans
          </Link>
        </div>
      );
    }
    // If key exists but recurly is null, script might still be loading
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600 dark:text-gray-400">  </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Complete Your Subscription
        </h2>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <input
          type="email"
          id="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Recurly.js payment form will be mounted here */}
      <div id="recurly-elements" className="space-y-4">
        <div className="w-full">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Card Number
          </label>
          <div
            ref={cardNumberRef}
            className="w-full rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-800"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="w-full">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Month
            </label>
            <div
              ref={expirationMonthRef}
              className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            />
          </div>

          <div className="w-full">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Year
            </label>
            <div
              ref={expirationYearRef}
              className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            />
          </div>

          <div className="w-full">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              CVV
            </label>
            <div
              ref={cvvRef}
              className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

          <button
            type="submit"
            disabled={isProcessing || !elementsReady}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isProcessing ? 'Processing...' : !elementsReady ? 'Initializing payment form...' : 'Complete Subscription'}
          </button>
    </form>
  );
}
