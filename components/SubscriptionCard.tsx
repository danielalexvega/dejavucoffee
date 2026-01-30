import Image from 'next/image';
import Link from 'next/link';
import { SubscriptionPlan } from '@/types/subscription';
import { urlFor } from '@/lib/sanity-queries';

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
}

export function SubscriptionCard({ plan }: SubscriptionCardProps) {
  const imageUrl = plan.image ? urlFor(plan.image) : null;
  const detailsUrl = plan.slug ? `/subscriptions/${plan.slug.current}` : '/subscriptions';

  return (
    <Link
      href={detailsUrl}
      className="group flex flex-col rounded-lg bg-mint shadow-sm transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      {imageUrl && (
        <div className="relative w-full overflow-hidden rounded-t-lg p-5">
          <div className="relative aspect-square w-full">
            <Image
              src={imageUrl}
              alt={plan.title || 'Coffee subscription'}
              fill
              className="object-contain transition-transform duration-200 group-hover:scale-110"
            />
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-3xl font-sailers text-dark-green dark:text-gray-100 text-center transition-transform duration-200 group-hover:scale-110">
          {plan.title}
        </h3>
      </div>
    </Link>
  );
}
