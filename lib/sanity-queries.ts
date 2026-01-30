import { sanityClient } from './sanity';
import { SubscriptionPlan } from '@/types/subscription';
import { createImageUrlBuilder } from '@sanity/image-url';
import { SanityImage } from '@/types/subscription';

// Image URL builder for Sanity images
const builder = createImageUrlBuilder(sanityClient);

export function urlFor(source: SanityImage | undefined) {
  if (!source) return undefined;
  return builder.image(source).width(800).height(600).fit('max').url();
}

/**
 * Test Sanity connection and get available document types
 * Useful for debugging
 */
export async function getAvailableDocumentTypes(): Promise<string[]> {
  try {
    const query = `array::unique(*[]._type)`;
    const types = await sanityClient.fetch<string[]>(query);
    return types;
  } catch (error) {
    console.error('Error fetching document types:', error);
    return [];
  }
}

/**
 * Fetch all subscription plans from Sanity
 * Adjust the query based on your actual document type name
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    // Check if project ID is configured
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    if (!projectId) {
      throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set in environment variables');
    }

    // Query for 'coffee' document type
    const query = `*[_type == "coffee"] | order(_createdAt desc) {
      _id,
      _type,
      title,
      slug,
      description,
      image,
      roastLevel,
      origin,
      flavorNotes,
      caffeineLevel,
      recurlyPlanCode,
      featured
    }`;

    const plans = await sanityClient.fetch<SubscriptionPlan[]>(query);

    return plans;
  } catch (error: any) {
    console.error('Error fetching subscription plans:', error);
    // Re-throw with more context
    if (error?.message) {
      throw new Error(`Sanity query failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch a single subscription plan by ID
 */
export async function getSubscriptionPlanById(id: string): Promise<SubscriptionPlan | null> {
  try {
    const query = `*[_id == $id][0] {
      _id,
      _type,
      title,
      slug,
      description,
      image,
      roastLevel,
      origin,
      flavorNotes,
      caffeineLevel,
      recurlyPlanCode,
      featured
    }`;

    const plan = await sanityClient.fetch<SubscriptionPlan | null>(query, { id });
    return plan;
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    throw error;
  }
}

/**
 * Fetch a subscription plan by Recurly plan code
 * Note: recurlyPlanCode is an array, so we check if it contains the code
 */
export async function getSubscriptionPlanByRecurlyCode(
  recurlyPlanCode: string
): Promise<SubscriptionPlan | null> {
  try {
    const query = `*[recurlyPlanCode match $recurlyPlanCode][0] {
      _id,
      _type,
      title,
      slug,
      description,
      image,
      roastLevel,
      origin,
      flavorNotes,
      caffeineLevel,
      recurlyPlanCode,
      featured
    }`;

    const plan = await sanityClient.fetch<SubscriptionPlan | null>(query, { recurlyPlanCode });
    return plan;
  } catch (error) {
    console.error('Error fetching subscription plan by Recurly code:', error);
    throw error;
  }
}

/**
 * Fetch a subscription plan by slug
 */
export async function getSubscriptionPlanBySlug(
  slug: string
): Promise<SubscriptionPlan | null> {
  try {
    const query = `*[_type == "coffee" && slug.current == $slug][0] {
      _id,
      _type,
      title,
      slug,
      description,
      image,
      roastLevel,
      origin,
      flavorNotes,
      caffeineLevel,
      recurlyPlanCode,
      featured
    }`;

    const plan = await sanityClient.fetch<SubscriptionPlan | null>(query, { slug });
    return plan;
  } catch (error) {
    console.error('Error fetching subscription plan by slug:', error);
    throw error;
  }
}
