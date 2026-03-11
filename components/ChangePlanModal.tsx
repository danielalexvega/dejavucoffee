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
  /** Subscription UUID for the subscription being changed (required to call change-plan API) */
  subscriptionUuid?: string | null;
  /** Called after a successful plan switch (e.g. refresh subscriptions, close modal) */
  onSwitchSuccess?: () => void;
}

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

type ModalView = 'list' | 'comparison';

export function ChangePlanModal({
  isOpen,
  onClose,
  currentPlanCode,
  subscriptionUuid,
  onSwitchSuccess,
}: ChangePlanModalProps) {
  const [plans, setPlans] = useState<PlanOptionForModal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ModalView>('list');
  /** Plan the user has selected to switch to (highlighted in orange) */
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSelectedPlanCode(null);
    setView('list');
    setSwitchError(null);
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

  // Current plan first, then the rest
  const sortedPlans = [...plans].sort((a, b) => {
    if (currentPlanCode) {
      if (a.code === currentPlanCode) return -1;
      if (b.code === currentPlanCode) return 1;
    }
    return 0;
  });

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleContinue = () => {
    if (!selectedPlanCode) return;
    setSwitchError(null);
    setView('comparison');
  };

  const handleBack = () => {
    setView('list');
    setSwitchError(null);
  };

  const handleSwitchPlans = async () => {
    if (!selectedPlanCode || !subscriptionUuid) return;
    setIsSubmitting(true);
    setSwitchError(null);
    try {
      const res = await fetch('/api/recurly/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionUuid, planCode: selectedPlanCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSwitchError(data.error || 'Failed to switch plan');
        return;
      }
      onSwitchSuccess?.();
      onClose();
    } catch (err) {
      setSwitchError((err as Error)?.message ?? 'Failed to switch plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPlan = selectedPlanCode ? plans.find((p) => p.code === selectedPlanCode) : null;

  const renderPlanCard = (plan: PlanOptionForModal, isSticky: boolean) => {
    const isCurrent = plan.code === currentPlanCode;
    const isSelected = plan.code === selectedPlanCode;
    const percentDiff =
      currentMonthly != null &&
      currentMonthly > 0 &&
      plan.monthlyEquivalent !== currentMonthly
        ? ((plan.monthlyEquivalent - currentMonthly) / currentMonthly) * 100
        : null;

    const isClickable = !isCurrent;
    const handleCardClick = () => {
      if (!isClickable) return;
      setSelectedPlanCode((prev) => (prev === plan.code ? null : plan.code));
    };

    let cardBg = 'border-gray-200 dark:border-gray-700';
    if (isCurrent) {
      cardBg = 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900';
    } else if (isSelected) {
      cardBg = 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900';
    }

    return (
      <li
        key={plan.code}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className={`rounded-lg border p-4 ${cardBg} ${
          isSticky ? 'sticky top-0 z-10 bg-blue-50 shadow-md dark:bg-blue-900' : ''
        } ${isClickable ? 'cursor-pointer transition-colors ' + (isSelected ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50') : ''}`}
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
              {isSelected && !isCurrent && (
                <span className="ml-2 text-xs font-normal text-orange-600 dark:text-orange-400">
                  (selected)
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
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
          {view === 'list' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Change plan
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!selectedPlanCode}
                  onClick={handleContinue}
                  className="rounded-lg bg-slate px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate dark:hover:bg-charcoal disabled:hover:bg-slate"
                >
                  Continue
                </button>
                <button
                  onClick={onClose}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Compare plans
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={onClose}
                  className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-4">
          {view === 'list' && (
            <>
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
                  {sortedPlans.map((plan, index) =>
                    renderPlanCard(plan, index === 0 && plan.code === currentPlanCode)
                  )}
                </ul>
              )}
            </>
          )}

          {view === 'comparison' && !currentPlan && (
            <div className="space-y-4 py-4">
              <p className="text-gray-600 dark:text-gray-400">
                Current plan could not be loaded. Go back to choose a plan.
              </p>
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Back
              </button>
            </div>
          )}
          {view === 'comparison' && currentPlan && !selectedPlan && (
            <div className="space-y-4 py-4">
              <p className="text-gray-600 dark:text-gray-400">
                Selected plan could not be loaded. Go back to choose a plan.
              </p>
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Back
              </button>
            </div>
          )}
          {view === 'comparison' && currentPlan && selectedPlan && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Compare your current plan with your selection, then confirm to switch.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-4 dark:border-blue-400 dark:bg-blue-900">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    Current plan
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                    {currentPlan.name}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {currentPlan.intervalLabel}
                  </p>
                  <p className="mt-2 font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(currentPlan.unitAmount, currentPlan.currency)}
                    {currentPlan.intervalLength > 1 && (
                      <span className="font-normal text-gray-500 dark:text-gray-400">
                        {' '}
                        / {currentPlan.intervalLabel.toLowerCase()}
                      </span>
                    )}
                  </p>
                  {currentPlan.intervalLength !== 1 && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(currentPlan.monthlyEquivalent, currentPlan.currency)}/month
                    </p>
                  )}
                </div>
                <div className="rounded-lg border-2 border-orange-400 bg-orange-50 p-4 dark:border-orange-600 dark:bg-orange-900">
                  <p className="text-xs font-medium uppercase tracking-wide text-orange-600 dark:text-orange-400">
                    New plan
                  </p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                    {selectedPlan.name}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {selectedPlan.intervalLabel}
                  </p>
                  <p className="mt-2 font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(selectedPlan.unitAmount, selectedPlan.currency)}
                    {selectedPlan.intervalLength > 1 && (
                      <span className="font-normal text-gray-500 dark:text-gray-400">
                        {' '}
                        / {selectedPlan.intervalLabel.toLowerCase()}
                      </span>
                    )}
                  </p>
                  {selectedPlan.intervalLength !== 1 && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(selectedPlan.monthlyEquivalent, selectedPlan.currency)}/month
                    </p>
                  )}
                </div>
              </div>
              {switchError && (
                <p className="rounded-lg bg-red-50 py-2 text-center text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {switchError}
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSwitchPlans}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Switching…' : 'Switch plans'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
