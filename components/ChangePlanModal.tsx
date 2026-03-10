'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface PlanOptionForModal {
  code: string;
  name: string;
  currency: string;
  unitAmount: number;
  intervalLength: number;
  intervalUnit: string;
  totalBillingCycles: number | null;
  intervalLabel: string;
  monthlyEquivalent: number;
}

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current plan code to highlight and compute % difference (optional) */
  currentPlanCode?: string | null;
}

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ChangePlanModal({ isOpen, onClose, currentPlanCode }: ChangePlanModalProps) {
  const [plans, setPlans] = useState<PlanOptionForModal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsLoading(true);
    fetch('/api/recurly/plans')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load plans');
        return res.json();
      })
      .then((data) => {
        setPlans(data.plans ?? []);
      })
      .catch((err) => {
        setError(err?.message ?? 'Could not load plans');
        setPlans([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPlan = currentPlanCode
    ? plans.find((p) => p.code === currentPlanCode)
    : null;
  const currentMonthly = currentPlan?.monthlyEquivalent ?? null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Change plan
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-4">
          {isLoading && (
            <p className="py-8 text-center text-gray-500 dark:text-gray-400">
              Loading plans…
            </p>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 py-3 text-center text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
          {!isLoading && !error && plans.length === 0 && (
            <p className="py-4 text-center text-gray-500 dark:text-gray-400">
              No plans available.
            </p>
          )}
          {!isLoading && !error && plans.length > 0 && (
            <ul className="space-y-3">
              {plans.map((plan) => {
                const isCurrent = plan.code === currentPlanCode;
                const percentDiff =
                  currentMonthly != null &&
                  currentMonthly > 0 &&
                  plan.monthlyEquivalent !== currentMonthly
                    ? ((plan.monthlyEquivalent - currentMonthly) / currentMonthly) * 100
                    : null;

                return (
                  <li
                    key={plan.code}
                    className={`rounded-lg border p-4 ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {plan.name}
                          {isCurrent && (
                            <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                              (current)
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                          {plan.intervalLabel}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(plan.unitAmount, plan.currency)}
                          {plan.intervalLength > 1 && (
                            <span className="font-normal text-gray-500 dark:text-gray-400">
                              {' '}
                              / {plan.intervalLabel.toLowerCase()}
                            </span>
                          )}
                        </p>
                        {plan.intervalLength !== 1 && (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {formatCurrency(plan.monthlyEquivalent, plan.currency)}/month
                            {percentDiff != null && !isCurrent && (
                              <span
                                className={
                                  percentDiff < 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }
                              >
                                {' '}
                                ({percentDiff > 0 ? '+' : ''}
                                {percentDiff.toFixed(0)}%)
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
