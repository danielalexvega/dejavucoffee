'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
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
  const { showToast } = useToast();
  const pathname = usePathname();
  
  // Get current slug from pathname if not provided
  const currentSlug = slug || pathname?.split('/').pop() || '';

  // Debug: Log plans to see what we're receiving
  console.log('PlanSelector - plans:', plans);
  console.log('PlanSelector - title:', title);
  console.log('PlanSelector - slug:', slug);

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

  // Calculate monthly cost and total cost based on plan type
  const calculatePlanCosts = (plan: PlanOption) => {
    const { price, interval } = plan;
    const { length, unit, totalBillingCycles } = interval;
    
    let monthlyCost: number;
    let totalCost: number;
    
    // Annual plan: length=12, unit='months', totalBillingCycles=1
    // amount is total annual cost
    if (length === 12 && unit === 'months' && totalBillingCycles === 1) {
      monthlyCost = price.amount / 12;
      totalCost = price.amount;
    }
    // Quarterly/Semi-annual: length=1, unit='months', totalBillingCycles > 1
    // amount is monthly cost
    else if (length === 1 && unit === 'months' && totalBillingCycles > 1) {
      monthlyCost = price.amount;
      totalCost = price.amount * totalBillingCycles;
    }
    // Monthly or other: amount is the cost per period
    else {
      monthlyCost = price.amount;
      totalCost = price.amount * totalBillingCycles * length;
    }
    
    return { monthlyCost, totalCost };
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
      <h2 className="mb-2 text-xl text-dark-green text-center font-sailers">Subscribe and Save</h2>
      
      {/* Plan Options */}
      <div className="mb-6 space-y-2">
        {plans.map((plan) => {
          const { monthlyCost, totalCost } = calculatePlanCosts(plan);
          const isSelected = selectedPlanCode === plan.code;
          
          return (
            <div key={plan.code}>
              <label
                className={`flex cursor-pointer items-center justify-between rounded-lg border-2 p-2 transition-all ${
                  isSelected
                    ? 'border-dark-green bg-mint'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="plan"
                    value={plan.code}
                    checked={isSelected}
                    onChange={(e) => setSelectedPlanCode(e.target.value)}
                    className="mr-3 h-4 w-4 accent-dark-green focus:ring-dark-green"
                  />
                  <div>
                    <div className="text-base font-semibold text-gray-900">
                      {formatInterval(plan.interval)}
                    </div>
                  </div>
                </div>
                <div className="text-base font-bold text-dark-green">
                  {formatPrice({ amount: monthlyCost, currency: plan.price.currency })}/month
                </div>
              </label>
              
              {/* Show total cost details when plan is selected */}
              {isSelected && (
                <div className="mt-2 rounded-lg bg-gray-50 p-3 border border-gray-200">
                  <div className="text-sm text-gray-700">
                    <div className="font-semibold text-dark-green mb-1">Plan Details:</div>
                    <div>Monthly Cost: {formatPrice({ amount: monthlyCost, currency: plan.price.currency })}</div>
                    <div className="font-bold text-dark-green mt-1">
                      Total Cost: {formatPrice({ amount: totalCost, currency: plan.price.currency })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
            showToast(`${title} added to cart!`);
          }
        }}
        className="block w-full rounded-lg bg-dark-green px-2 py-2 text-center text-md font-sailers text-white transition-colors hover:bg-mint dark:bg-blue-500 dark:hover:bg-dark-green"
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
