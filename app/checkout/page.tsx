import { Suspense } from 'react';
import { CheckoutForm } from '@/components/CheckoutForm';
import Link from 'next/link';

function CheckoutFormWrapper() {
  return (
    <div className="min-h-screen bg-mint py-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/subscriptions"
          className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to Plans
        </Link>
        <div className="rounded-lg bg-white p-8 shadow-sm dark:bg-gray-900">
          <Suspense fallback={<div>Loading checkout form...</div>}>
            <CheckoutForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <CheckoutFormWrapper />;
}
