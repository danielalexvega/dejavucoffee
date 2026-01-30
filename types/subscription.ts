// TypeScript types for subscription plan data from Sanity

export interface SanityImage {
  _type: 'image';
  asset: {
    _ref: string;
    _type: 'reference';
  };
  alt?: string;
}

export interface SubscriptionPlan {
  _id: string;
  _type: string;
  title: string;
  slug: {
    current: string;
  };
  description: string; // Required in schema
  image: SanityImage; // Required in schema
  roastLevel: 'light' | 'medium' | 'dark';
  origin: string;
  flavorNotes?: string[];
  caffeineLevel?: 'regular' | 'decaf' | 'half-caff';
  recurlyPlanCode: string[]; // Array of strings in schema
  featured?: boolean;
  // Recurly plan details (fetched from Recurly API)
  recurlyPlan?: {
    name: string;
    code: string;
    price?: {
      amount: number;
      currency: string;
    };
    interval?: {
      length: number;
      unit: string; // 'month', 'year', etc.
    };
  };
}

// Helper type for image URLs (after processing with Sanity's image URL builder)
export interface SubscriptionPlanWithImageUrl extends Omit<SubscriptionPlan, 'image'> {
  imageUrl?: string;
}
