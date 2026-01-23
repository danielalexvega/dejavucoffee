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
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const expirationRef = useRef<HTMLDivElement>(null);
  const cvvRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<{
    cardNumber: any;
    expiration: any;
    cvv: any;
  } | null>(null);

  // Mount Recurly Elements when Recurly is loaded
  useEffect(() => {
    if (!recurly || !isLoaded) return;

    const elements = recurly.Elements();
    const cardNumber = elements.CardNumberElement();
    const expiration = (elements as any).ExpiryDateElement();
    const cvv = (elements as any).CVVElement();

    if (cardNumberRef.current) {
      cardNumber.attach(cardNumberRef.current);
    }
    if (expirationRef.current) {
      expiration.attach(expirationRef.current);
    }
    if (cvvRef.current) {
      cvv.attach(cvvRef.current);
    }

    elementsRef.current = { cardNumber, expiration, cvv };

    return () => {
      (cardNumber as any).destroy?.();
      (expiration as any).destroy?.();
      (cvv as any).destroy?.();
      elementsRef.current = null;
    };
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
      if (!elementsRef.current) {
        throw new Error('Payment form not ready. Please wait a moment and try again.');
      }

      // Create a Recurly token from the payment form
      // The Elements automatically capture card data
      const token = await (recurly as any).token(elementsRef.current);

      // Send token to your backend API
      const response = await fetch('/api/recurly/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planCode,
          account: {
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
          },
          billingInfo: {
            token: (token as any).id,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription');
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
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600 dark:text-gray-400">Loading payment form...</div>
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
        <div className="text-gray-600 dark:text-gray-400">Loading payment form...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Card Number
          </label>
          <div
            ref={cardNumberRef}
            className="rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-800"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Expiration
            </label>
            <div
              ref={expirationRef}
              className="rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              CVV
            </label>
            <div
              ref={cvvRef}
              className="rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isProcessing}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        {isProcessing ? 'Processing...' : 'Complete Subscription'}
      </button>
    </form>
  );
}
