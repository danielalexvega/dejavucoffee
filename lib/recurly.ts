// Recurly client for server-side operations
// This uses your private API key and should only be used in API routes
import { Client } from 'recurly';

// Initialize Recurly client with API key
// Supports both RECURLY_PRIVATE_KEY and RECURLY_API_KEY for backwards compatibility
const apiKey = process.env.RECURLY_PRIVATE_KEY || process.env.RECURLY_API_KEY;

if (!apiKey) {
  console.warn('RECURLY_PRIVATE_KEY is not set. Recurly API calls will fail.');
}

let recurlyClientInstance: any = null;
try {
  if (apiKey) {
    recurlyClientInstance = new Client(apiKey);
  }
} catch (error: any) {
  console.error('Failed to initialize Recurly Client:', error?.message || error);
}

export const recurlyClient = recurlyClientInstance;

// Recurly configuration for client-side
export const recurlyConfig = {
  publicKey: process.env.NEXT_PUBLIC_RECURLY_PUBLIC_KEY || '',
  siteId: process.env.RECURLY_SITE_ID || '',
};
