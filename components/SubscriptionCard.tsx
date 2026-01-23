import Image from 'next/image';
import Link from 'next/link';
import { SubscriptionPlan } from '@/types/subscription';
import { urlFor } from '@/lib/sanity-queries';

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
}

export function SubscriptionCard({ plan }: SubscriptionCardProps) {
  const imageUrl = plan.image ? urlFor(plan.image) : null;

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      {imageUrl && (
        <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
          <Image
            src={imageUrl}
            alt={plan.title || 'Coffee subscription'}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          {plan.title}
        </h3>
        {plan.description && (
          <p className="mb-4 flex-1 text-gray-600 dark:text-gray-400">
            {plan.description}
          </p>
        )}
        {plan.recurlyPlan?.price && (
          <div className="mb-6">
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {plan.recurlyPlan.price.currency === 'USD' ? '$' : ''}
              {plan.recurlyPlan.price.amount.toFixed(2)}
            </span>
            {plan.recurlyPlan.interval && (
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                / {plan.recurlyPlan.interval.length === 1 
                  ? plan.recurlyPlan.interval.unit 
                  : `${plan.recurlyPlan.interval.length} ${plan.recurlyPlan.interval.unit}s`}
              </span>
            )}
          </div>
        )}
        <Link
          href={`/checkout?plan=${plan.recurlyPlanCode}`}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Subscribe
        </Link>
      </div>
    </div>
  );
}
