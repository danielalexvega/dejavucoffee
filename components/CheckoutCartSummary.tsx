'use client';

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';

export function CheckoutCartSummary() {
  const { items, getTotalPrice } = useCart();

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
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-dark-green">Your Cart</h3>
        <p className="text-gray-600">Your cart is empty.</p>
        <Link
          href="/subscriptions"
          className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700"
        >
          Browse Subscriptions →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-dark-green">Order Summary</h3>
      
      <div className="space-y-3 mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between border-b border-gray-100 pb-3">
            <div className="flex-1">
              <Link
                href={`/subscriptions/${item.slug}`}
                className="text-sm font-semibold text-dark-green hover:underline"
              >
                {item.planTitle}
              </Link>
              <p className="text-xs text-gray-600 mt-1">
                {formatInterval(item.interval)}
              </p>
            </div>
            <div className="text-sm font-semibold text-dark-green ml-4">
              {formatPrice(item.price.amount)}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between text-base font-bold text-dark-green">
          <span>Total:</span>
          <span>{formatPrice(getTotalPrice())}</span>
        </div>
      </div>
    </div>
  );
}
