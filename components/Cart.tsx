'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import Image from 'next/image';

export function Cart() {
  const { items, removeItem, getTotalPrice, clearCart } = useCart();

  const formatPrice = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatInterval = (interval: { length: number; unit: string; totalBillingCycles: number }) => {
    const totalTime = interval.totalBillingCycles * interval.length;
    const unit = interval.unit.endsWith('s') ? interval.unit : interval.unit;
    
    if (totalTime === 1) {
      const singularUnit = unit.endsWith('s') ? unit.slice(0, -1) : unit;
      return `${totalTime} ${singularUnit}`;
    }
    const pluralUnit = unit.endsWith('s') ? unit : `${unit}s`;
    return `${totalTime} ${pluralUnit}`;
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-mint py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-4xl font-bold text-dark-green">Shopping Cart</h1>
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <p className="mb-4 text-lg text-gray-600">Your cart is empty</p>
            <Link
              href="/subscriptions"
              className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
            >
              Browse Subscriptions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mint py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-dark-green">Shopping Cart</h1>
          <button
            onClick={clearCart}
            className="text-sm text-gray-600 hover:text-dark-green"
          >
            Clear Cart
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex-1">
                <Link
                  href={`/subscriptions/${item.slug}`}
                  className="text-xl font-semibold text-dark-green hover:underline"
                >
                  {item.planTitle}
                </Link>
                <p className="mt-1 text-sm text-gray-600">
                  {formatInterval(item.interval)}
                </p>
                <p className="mt-2 text-lg font-bold text-dark-green">
                  {formatPrice(item.price.amount)}
                </p>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="ml-4 rounded-lg p-2 text-red-600 hover:bg-red-50"
                aria-label="Remove item"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between text-xl font-bold text-dark-green">
            <span>Total:</span>
            <span>{formatPrice(getTotalPrice())}</span>
          </div>
          <Link
            href="/checkout"
            className="block w-full rounded-lg bg-blue-600 px-6 py-4 text-center text-lg font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Proceed to Checkout
          </Link>
          <Link
            href="/subscriptions"
            className="mt-4 block text-center text-sm text-gray-600 hover:text-dark-green"
          >
            ← Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
