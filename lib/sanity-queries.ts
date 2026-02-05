import { sanityClient } from './sanity';
import { SubscriptionPlan } from '@/types/subscription';
import { Article, Author } from '@/types/article';
import { createImageUrlBuilder } from '@sanity/image-url';
import { SanityImage } from '@/types/subscription';

// Image URL builder for Sanity images
const builder = createImageUrlBuilder(sanityClient);

export function urlFor(source: SanityImage | undefined) {
  if (!source) return undefined;
  return builder.image(source).width(800).height(600).fit('max').url();
}

/**
 * Generate optimized image URL for article cards (16:9 aspect ratio)
 * Images are 1200x675, so we request appropriate size for cards
 */
export function urlForArticleCard(source: SanityImage | undefined) {
  if (!source) return undefined;
  // Request 800x450 (maintains 16:9 ratio) for card display
  return builder.image(source).width(800).height(450).fit('max').url();
}

/**
 * Generate optimized image URL for full article pages (16:9 aspect ratio)
 * Images are 1200x675, so we request full width for article display
 */
export function urlForArticle(source: SanityImage | undefined) {
  if (!source) return undefined;
  // Request 1200x675 (full size, maintains 16:9 ratio) for article page
  return builder.image(source).width(1200).height(675).fit('max').url();
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

/**
 * Fetch all published articles from Sanity
 */
export async function getArticles(): Promise<Article[]> {
  try {
    // First, let's check what we have
    const totalArticles = await sanityClient.fetch(`count(*[_type == "article"])`);
    const publishedArticles = await sanityClient.fetch(`count(*[_type == "article" && status == "published"])`);
    console.log(`[getArticles] Total articles: ${totalArticles}, Published: ${publishedArticles}`);

    // Check status values
    const statusValues = await sanityClient.fetch(`array::unique(*[_type == "article"].status)`);
    console.log(`[getArticles] Status values found:`, statusValues);

    const query = `*[_type == "article" && status == "published"] | order(publishedDate desc) {
      _id,
      _type,
      title,
      body,
      "author": author->{
        _id,
        _type,
        name,
        image,
        email,
        bio,
        slug,
        role,
        title,
        website,
        social
      },
      topics,
      image,
      slug,
      publishedDate,
      excerpt,
      status,
      featured,
      "relatedArticles": relatedArticles[]->{
        _id,
        _type,
        title,
        slug,
        image,
        excerpt,
        publishedDate
      },
      seo
    }`;

    console.log(`[getArticles] Executing query...`);
    const articles = await sanityClient.fetch<Article[]>(query);
    console.log(`[getArticles] Query returned ${articles.length} articles`);
    
    if (articles.length === 0 && totalArticles > 0) {
      console.warn(`[getArticles] Warning: Found ${totalArticles} articles but none with status "published"`);
      console.warn(`[getArticles] Available statuses:`, statusValues);
    }
    
    return articles;
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    if (error?.message) {
      throw new Error(`Sanity query failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch a single article by slug
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const query = `*[_type == "article" && slug.current == $slug && status == "published"][0] {
      _id,
      _type,
      title,
      body,
      "author": author->{
        _id,
        _type,
        name,
        image,
        email,
        bio,
        slug,
        role,
        title,
        website,
        social
      },
      topics,
      image,
      slug,
      publishedDate,
      excerpt,
      status,
      featured,
      "relatedArticles": relatedArticles[]->{
        _id,
        _type,
        title,
        slug,
        image,
        excerpt,
        publishedDate
      },
      seo
    }`;

    const article = await sanityClient.fetch<Article | null>(query, { slug });
    return article;
  } catch (error: any) {
    console.error('Error fetching article by slug:', error);
    throw error;
  }
}

/**
 * Fetch all authors from Sanity
 */
export async function getAuthors(): Promise<Author[]> {
  try {
    const query = `*[_type == "author"] | order(name asc) {
      _id,
      _type,
      name,
      image,
      email,
      bio,
      slug,
      role,
      title,
      website,
      social
    }`;

    const authors = await sanityClient.fetch<Author[]>(query);
    return authors;
  } catch (error: any) {
    console.error('Error fetching authors:', error);
    if (error?.message) {
      throw new Error(`Sanity query failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch a single author by slug
 */
export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  try {
    const query = `*[_type == "author" && slug.current == $slug][0] {
      _id,
      _type,
      name,
      image,
      email,
      bio,
      slug,
      role,
      title,
      website,
      social
    }`;

    const author = await sanityClient.fetch<Author | null>(query, { slug });
    return author;
  } catch (error: any) {
    console.error('Error fetching author by slug:', error);
    throw error;
  }
}

/**
 * Fetch articles by author ID
 */
export async function getArticlesByAuthor(authorId: string): Promise<Article[]> {
  try {
    const query = `*[_type == "article" && author._ref == $authorId && status == "published"] | order(publishedDate desc) {
      _id,
      _type,
      title,
      body,
      "author": author->{
        _id,
        _type,
        name,
        image,
        email,
        bio,
        slug,
        role,
        title,
        website,
        social
      },
      topics,
      image,
      slug,
      publishedDate,
      excerpt,
      status,
      featured,
      seo
    }`;

    const articles = await sanityClient.fetch<Article[]>(query, { authorId });
    return articles;
  } catch (error: any) {
    console.error('Error fetching articles by author:', error);
    throw error;
  }
}
