'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { usePathname } from 'next/navigation';

interface PlanOption {
  code: string;
  price: {
    amount: number;
    currency: string;
  };
  interval: {
    length: number;
    unit: string;
    totalBillingCycles: number;
  };
}

interface PlanSelectorProps {
  plans: PlanOption[];
  title: string;
  slug?: string; // Subscription slug for cart item
}

export function PlanSelector({ plans, title, slug }: PlanSelectorProps) {
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>(
    plans.length > 0 ? plans[0].code : ''
  );
  const { addItem } = useCart();
  const pathname = usePathname();
  
  // Get current slug from pathname if not provided
  const currentSlug = slug || pathname?.split('/').pop() || '';

  const formatInterval = (interval: { length: number; unit: string; totalBillingCycles: number }) => {
    // Total time = totalBillingCycles * length
    const totalTime = interval.totalBillingCycles * interval.length;
    
    // Handle pluralization - if unit already ends with 's', don't add another
    const unit = interval.unit.endsWith('s') ? interval.unit : interval.unit;
    
    if (totalTime === 1) {
      // For singular, remove 's' if present
      const singularUnit = unit.endsWith('s') ? unit.slice(0, -1) : unit;
      return `${totalTime} ${singularUnit}`;
    }
    // For plural, ensure unit ends with 's'
    const pluralUnit = unit.endsWith('s') ? unit : `${unit}s`;
    return `${totalTime} ${pluralUnit}`;
  };

  const formatPrice = (price: { amount: number; currency: string }) => {
    const symbol = price.currency === 'USD' ? '$' : '';
    return `${symbol}${price.amount.toFixed(2)}`;
  };

  if (plans.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-dark-green">{title}</h2>
        <p className="text-gray-500">No subscription plans available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
      <h2 className="mb-6 text-2xl font-bold text-dark-green">{title}</h2>
      
      {/* Plan Options */}
      <div className="mb-6 space-y-3">
        {plans.map((plan) => (
          <label
            key={plan.code}
            className={`flex cursor-pointer items-center justify-between rounded-lg border-2 p-4 transition-all ${
              selectedPlanCode === plan.code
                ? 'border-dark-green bg-mint'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <input
                type="radio"
                name="plan"
                value={plan.code}
                checked={selectedPlanCode === plan.code}
                onChange={(e) => setSelectedPlanCode(e.target.value)}
                className="mr-3 h-4 w-4 text-dark-green focus:ring-dark-green"
              />
              <div>
                <div className="font-semibold text-gray-900">
                  {formatInterval(plan.interval)}
                </div>
              </div>
            </div>
            <div className="text-lg font-bold text-dark-green">
              {formatPrice(plan.price)}
            </div>
          </label>
        ))}
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={() => {
          const selectedPlan = plans.find((p) => p.code === selectedPlanCode);
          if (selectedPlan) {
            addItem({
              id: `${selectedPlanCode}-${Date.now()}`, // Unique ID
              planCode: selectedPlan.code,
              planTitle: title,
              price: selectedPlan.price,
              interval: selectedPlan.interval,
              slug: currentSlug,
            });
            // Show feedback (you could add a toast notification here)
            alert(`${title} added to cart!`);
          }
        }}
        className="block w-full rounded-lg bg-blue-600 px-6 py-4 text-center text-lg font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        Add to Cart
      </button>

      {/* Back Link */}
      <Link
        href="/subscriptions"
        className="mt-4 block text-center text-sm text-gray-600 hover:text-dark-green"
      >
        ← Back to All Plans
      </Link>
    </div>
  );
}
