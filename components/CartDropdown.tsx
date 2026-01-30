'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';

export function CartDropdown() {
  const { items, removeItem, getTotalPrice, getItemCount } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const cartCount = getItemCount();

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

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cart Icon Button */}
      <Link
        href="/cart"
        className="relative rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-dark-green"
        aria-label="Shopping cart"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {cartCount > 0 && (
          <span className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-dark-green text-xs font-bold text-white">
            {cartCount}
          </span>
        )}
      </Link>

      {/* Dropdown - Only show when cart has items */}
      {isHovered && cartCount > 0 && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
          <div className="p-4">
            <h3 className="mb-3 text-lg font-semibold text-dark-green">Cart ({cartCount})</h3>
            
            {/* Cart Items */}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/subscriptions/${item.slug}`}
                      className="text-sm font-semibold text-dark-green hover:underline truncate block"
                    >
                      {item.planTitle}
                    </Link>
                    <p className="mt-1 text-xs text-gray-600">
                      {formatInterval(item.interval)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-dark-green">
                      {formatPrice(item.price.amount)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removeItem(item.id);
                    }}
                    className="ml-2 flex-shrink-0 rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    aria-label="Remove item"
                  >
                    <svg
                      className="h-4 w-4"
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

            {/* Total and Actions */}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="mb-3 flex items-center justify-between text-base font-bold text-dark-green">
                <span>Total:</span>
                <span>{formatPrice(getTotalPrice())}</span>
              </div>
              <Link
                href="/cart"
                className="block w-full rounded-lg bg-dark-green px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-mint hover:text-dark-green"
              >
                View Cart
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
