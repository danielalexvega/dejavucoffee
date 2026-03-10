import { NextResponse } from 'next/server';
import { getRecurlyPlans } from '@/lib/recurly-queries';

/**
 * Plan codes allowed for the "Change plan" modal.
 * Not all plans from Recurly—only these for controlled UX.
 */
const ALLOWED_PLAN_CODES = [
  'col-ann',
  'dra',
  'drm',
  'drq',
  'dba',
  'dbm',
  'dbq',
  'eba',
  'ebm',
  'ebq',
  'lra',
  'lrm',
  'lrq',
  'mra',
  'mrq',
  'mrm',
  'soa',
  'som',
  'soq',
];

export interface PlanOptionForModal {
  code: string;
  name: string;
  currency: string;
  /** Price per billing period (in dollars for display) */
  unitAmount: number;
  intervalLength: number;
  intervalUnit: string;
  totalBillingCycles: number | null;
  /** Human-readable interval, e.g. "Monthly", "Quarterly", "Annual" */
  intervalLabel: string;
  /** Equivalent price per month for comparison */
  monthlyEquivalent: number;
}

function getIntervalLabel(intervalLength: number, intervalUnit: string): string {
  if (intervalUnit === 'months') {
    if (intervalLength === 1) return 'Monthly';
    if (intervalLength === 3) return 'Quarterly';
    if (intervalLength === 12) return 'Annual';
    return `Every ${intervalLength} months`;
  }
  if (intervalUnit === 'days') {
    if (intervalLength === 30) return 'Monthly';
    return `Every ${intervalLength} days`;
  }
  return `${intervalLength} ${intervalUnit}`;
}

/**
 * GET /api/recurly/plans
 * Returns plan details for the allowed plan codes only (not all Recurly plans).
 */
export async function GET() {
  try {
    const planMap = await getRecurlyPlans(ALLOWED_PLAN_CODES);
    const results: PlanOptionForModal[] = [];

    for (const code of ALLOWED_PLAN_CODES) {
      const plan = planMap.get(code);
      if (!plan) continue;

      const currency = plan.currencies?.[0];
      const unitAmountRaw = currency?.unitAmount ?? 0;
      // Recurly may return amount in cents (e.g. 1999) or dollars (e.g. 155.88).
      // Use the same heuristic as the subscriptions page: treat values >= 1000 as cents.
      const unitAmount =
        typeof unitAmountRaw === 'number' && unitAmountRaw >= 1000
          ? unitAmountRaw / 100
          : Number(unitAmountRaw) || 0;

      const intervalLength = plan.intervalLength ?? 1;
      const intervalUnit = (plan.intervalUnit || 'months').toLowerCase();
      const totalBillingCycles = plan.totalBillingCycles ?? null;

      // Months per billing period for monthly equivalent
      let monthsPerPeriod = 1;
      if (intervalUnit === 'months') {
        monthsPerPeriod = intervalLength;
      } else if (intervalUnit === 'days') {
        monthsPerPeriod = intervalLength / 30;
      }
      const monthlyEquivalent = monthsPerPeriod > 0 ? unitAmount / monthsPerPeriod : unitAmount;

      results.push({
        code: plan.code ?? code,
        name: plan.name ?? code,
        currency: currency?.currency ?? 'USD',
        unitAmount,
        intervalLength,
        intervalUnit,
        totalBillingCycles,
        intervalLabel: getIntervalLabel(intervalLength, intervalUnit),
        monthlyEquivalent,
      });
    }

    return NextResponse.json({ plans: results });
  } catch (error: unknown) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: (error as Error)?.message ?? 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
