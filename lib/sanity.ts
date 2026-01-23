import { createClient } from '@sanity/client';

// Sanity client configuration
// Uses environment variables to connect to your external Sanity project
export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01', // Use current date (YYYY-MM-DD) to target the latest API version
  useCdn: process.env.NODE_ENV === 'production', // Use CDN in production for faster responses
  token: process.env.NEXT_SANITY_API_KEY, // Optional: only needed for write operations
});
