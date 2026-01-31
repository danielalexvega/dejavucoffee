import { Suspense } from 'react';
import { CheckoutForm } from '@/components/CheckoutForm';
import { CheckoutCartSummary } from '@/components/CheckoutCartSummary';
import Link from 'next/link';

function CheckoutFormWrapper() {
  return (
    <div className="min-h-screen bg-mint py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/cart"
          className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Cart
        </Link>
        
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Checkout Form */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-8 shadow-sm dark:bg-dark-green">
              <Suspense fallback={<div>Loading checkout form...</div>}>
                <CheckoutForm />
              </Suspense>
            </div>
          </div>

          {/* Right Column - Cart Summary */}
          <div className="lg:col-span-1">
            <CheckoutCartSummary />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <CheckoutFormWrapper />;
}
