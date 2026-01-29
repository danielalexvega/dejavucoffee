import { getSubscriptionPlans } from '@/lib/sanity-queries';
import { getRecurlyPlans, getAllRecurlyPlans } from '@/lib/recurly-queries';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { SubscriptionPlan } from '@/types/subscription';
import { Hero } from '@/components/Hero';

export default async function SubscriptionsPage() {
  let plans: SubscriptionPlan[] = [];
  let error: string | null = null;

  try {
    // Fetch all plans from Recurly
    const allRecurlyPlans = await getAllRecurlyPlans();

    // Fetch plans from Sanity
    plans = await getSubscriptionPlans();
    
    // Fetch plan details from Recurly for each plan
    const planCodes = plans.map((plan) => plan.recurlyPlanCode).filter(Boolean);
    
    if (planCodes.length > 0) {
      const recurlyPlans = await getRecurlyPlans(planCodes);
      
      // Enrich Sanity plans with Recurly plan details
      plans = plans.map((plan) => {
        const recurlyPlan = recurlyPlans.get(plan.recurlyPlanCode);
        if (recurlyPlan) {
          // Extract price from Recurly plan
          // Recurly plans can have currencies array or pricing object
          let price: { amount: number; currency: string } | undefined;
          
          if (recurlyPlan.currencies && recurlyPlan.currencies.length > 0) {
            const currency = recurlyPlan.currencies[0];
            // Recurly v4 API: Check the actual structure
            // unitAmount might be in cents OR dollars depending on API version
            const unitAmount = currency.unitAmount;
            
            // Based on your report ($0.20 instead of $20.00), it seems unitAmount is already in dollars
            // If unitAmount is 20 and should display as $20.00, don't divide
            // If unitAmount is 2000 and should display as $20.00, divide by 100
            // For now, let's assume if it's a small number (< 1000), it's already in dollars
            const amountInDollars = unitAmount && unitAmount >= 1000 
              ? unitAmount / 100  // Convert cents to dollars
              : (unitAmount || 0); // Already in dollars
            
            price = {
              amount: amountInDollars,
              currency: currency.currency || 'USD',
            };
          } else if ((recurlyPlan as any).pricing) {
            const pricing = (recurlyPlan as any).pricing;
            const unitAmount = pricing.unitAmount || 0;
            const amountInDollars = unitAmount >= 1000 ? unitAmount / 100 : unitAmount;
            price = {
              amount: amountInDollars,
              currency: pricing.currency || 'USD',
            };
          }
          
          return {
            ...plan,
            recurlyPlan: {
              name: recurlyPlan.name || plan.title,
              code: recurlyPlan.code || plan.recurlyPlanCode,
              price,
              interval: recurlyPlan.interval
                ? {
                    length: recurlyPlan.interval.length,
                    unit: recurlyPlan.interval.unit,
                  }
                : undefined,
            },
          };
        }
        return plan;
      });
    }
  } catch (err: any) {
    console.error('Error fetching subscription plans:', err);
    // Provide more detailed error message
    const errorMessage = err?.message || 'Unknown error';
    error = `Failed to load subscription plans: ${errorMessage}. Please check your Sanity configuration.`;
  }

  return (
    <div className="min-h-screen bg-mint py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Hero
          imageSrc="/subscription-hero.png"
          imageAlt="Subscription Hero Image"
          height="small"
          overlay={false}
        />
        <div className="mb-12 text-center">
          <h1 className="text-4xl text-dark-green dark:text-gray-100 font-sailers">
            Choose Your Subscription
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Select the perfect plan for your needs
          </p>
        </div>

        {error && (
          <div className="mx-auto max-w-2xl rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {plans.length === 0 && !error && (
          <div className="mx-auto max-w-2xl rounded-lg bg-gray-100 p-8 text-center dark:bg-gray-900">
            <p className="text-gray-600 dark:text-gray-400">
              No subscription plans available at this time.
            </p>
          </div>
        )}

        {plans.length > 0 && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <SubscriptionCard key={plan._id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
