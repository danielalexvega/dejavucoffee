import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getSubscriptionPlanBySlug } from '@/lib/sanity-queries';
import { getRecurlyPlans } from '@/lib/recurly-queries';
import { urlFor } from '@/lib/sanity-queries';
import { SubscriptionPlan } from '@/types/subscription';
import { StickyPlanSelector } from '@/components/StickyPlanSelector';

interface SubscriptionPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function SubscriptionPage({ params }: SubscriptionPageProps) {
  const { slug } = await params;
  let plan: SubscriptionPlan | null = null;
  let error: string | null = null;
  let planOptions: Array<{
    code: string;
    price: { amount: number; currency: string };
    interval: { length: number; unit: string; totalBillingCycles: number };
  }> = [];

  try {
    // Fetch plan from Sanity by slug
    plan = await getSubscriptionPlanBySlug(slug);

    if (!plan) {
      notFound();
    }

    // Fetch all Recurly plans for this subscription
    if (plan.recurlyPlanCode && plan.recurlyPlanCode.length > 0) {
      const recurlyPlansMap = await getRecurlyPlans(plan.recurlyPlanCode);
      
      // Convert to array of plan options
      planOptions = plan.recurlyPlanCode
        .map((code) => {
          const recurlyPlan = recurlyPlansMap.get(code);
          if (!recurlyPlan) {
            console.log(`No Recurly plan found for code: ${code}`);
            return null;
          }

          // Extract price from Recurly plan
          let price: { amount: number; currency: string } | undefined;
          
          if (recurlyPlan.currencies && recurlyPlan.currencies.length > 0) {
            const currency = recurlyPlan.currencies[0];
            const unitAmount = currency.unitAmount;
            const amountInDollars = unitAmount && unitAmount >= 1000 
              ? unitAmount / 100  // Convert cents to dollars
              : (unitAmount || 0); // Already in dollars
            
            price = {
              amount: amountInDollars,
              currency: currency.currency || 'USD',
            };
          }

          if (!price || !recurlyPlan.intervalLength || recurlyPlan.totalBillingCycles === undefined || recurlyPlan.totalBillingCycles === null) {
            console.log(`Missing price, interval, or totalBillingCycles for code ${code}:`, { 
              price, 
              intervalLength: recurlyPlan.intervalLength,
              totalBillingCycles: recurlyPlan.totalBillingCycles 
            });
            return null;
          }

          const option = {
            code,
            price,
            interval: {
              length: recurlyPlan.intervalLength,
              unit: recurlyPlan.intervalUnit,
              totalBillingCycles: recurlyPlan.totalBillingCycles,
            },
          };
          return option;
        })
        .filter((option): option is NonNullable<typeof option> => option !== null);

    } else {
      console.log('No recurlyPlanCode array or empty array');
    }
  } catch (err: any) {
    console.error('Error fetching subscription plan:', err);
    error = `Failed to load subscription plan: ${err?.message || 'Unknown error'}`;
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-mint py-12">
        <div className="mx-auto max-w-[80vw] px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-red-50 p-6 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <h1 className="mb-2 text-2xl font-semibold">Error</h1>
            <p>{error || 'Subscription plan not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = plan.image ? urlFor(plan.image) : null;

  return (
    <div className="min-h-screen bg-mint">
      {/* Main Content */}
      <div className="mx-auto pt-5 max-w-[80vw] px-4 sm:px-6 lg:px-8 lg:pb-12" style={{ overflow: 'visible' }}>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:items-start" style={{ overflow: 'visible' }}>
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2">
              {/* Image */}
              {imageUrl && (
                <div className="mb-8">
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                    <Image
                      src={imageUrl}
                      alt={plan.title}
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <section className="mb-8">
                <p className="text-lg leading-relaxed text-gray-700">
                  {plan.description}
                </p>
              </section>

              {/* Flavor Notes */}
              {plan.flavorNotes && plan.flavorNotes.length > 0 && (
                <section className="mb-8">
                  <h2 className="mb-4 text-2xl font-bold text-dark-green">Flavor Notes</h2>
                  <div className="flex flex-wrap gap-2">
                    {plan.flavorNotes.map((note, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-dark-green shadow-sm"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Origin */}
              <section className="mb-8">
                <h2 className="mb-2 text-2xl font-bold text-dark-green">Origin</h2>
                <p className="text-lg text-gray-700">{plan.origin}</p>
              </section>

              {/* Roast Level */}
              <section className="mb-8">
                <h2 className="mb-2 text-2xl font-bold text-dark-green">Roast Level</h2>
                <p className="text-lg capitalize text-gray-700">{plan.roastLevel}</p>
              </section>
          </div>

          {/* Right Column - 1/3 width, sticky */}
          <StickyPlanSelector plans={planOptions} title={plan.title} slug={plan.slug.current} />
        </div>
      </div>
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: SubscriptionPageProps) {
  const { slug } = await params;
  const plan = await getSubscriptionPlanBySlug(slug);

  if (!plan) {
    return {
      title: 'Subscription Not Found',
    };
  }

  const imageUrl = plan.image ? urlFor(plan.image) : null;

  return {
    title: `${plan.title} | Coffee Subscription`,
    description: plan.description || `Subscribe to ${plan.title} - ${plan.origin} coffee with ${plan.roastLevel} roast level.`,
    openGraph: {
      title: `${plan.title} | Coffee Subscription`,
      description: plan.description || `Subscribe to ${plan.title}`,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}
