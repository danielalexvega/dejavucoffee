import { PlanSelector } from './PlanSelector';

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

interface StickyPlanSelectorProps {
  plans: PlanOption[];
  title: string;
  slug?: string;
}

export function StickyPlanSelector({ plans, title, slug }: StickyPlanSelectorProps) {
  return (
    <div className="lg:col-span-1">
      <div 
        className="lg:sticky lg:top-24 lg:z-10"
        style={{
          position: 'sticky',
          top: '6rem', // 24 * 4 = 96px = 6rem
          alignSelf: 'flex-start',
        }}
      >
        <PlanSelector plans={plans} title={title} slug={slug} />
      </div>
    </div>
  );
}
