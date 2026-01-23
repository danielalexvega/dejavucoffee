import { NextResponse } from 'next/server';
import { recurlyClient } from '@/lib/recurly';

/**
 * GET /api/recurly/test
 * Test endpoint to verify Recurly connection
 */
export async function GET() {
  const apiKey = process.env.RECURLY_PRIVATE_KEY || process.env.RECURLY_API_KEY;
  
  const debugInfo = {
    apiKeySet: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'not set',
    clientInitialized: !!recurlyClient,
    envVars: {
      RECURLY_PRIVATE_KEY: !!process.env.RECURLY_PRIVATE_KEY,
      RECURLY_API_KEY: !!process.env.RECURLY_API_KEY,
    },
  };

  if (!recurlyClient) {
    return NextResponse.json({
      success: false,
      error: 'Recurly client not initialized',
      debug: debugInfo,
    }, { status: 500 });
  }

  try {
    // Try to list sites (simple API call to test connection)
    const sites = await recurlyClient.listSites({ params: { limit: 1 } });
    const sitesArray = [];
    for await (const site of sites.each()) {
      sitesArray.push(site);
      break; // Just get first one
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Recurly',
      debug: debugInfo,
      testResult: {
        sitesFound: sitesArray.length > 0,
        firstSite: sitesArray[0] ? {
          subdomain: sitesArray[0].subdomain,
          displayName: sitesArray[0].displayName,
        } : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to Recurly',
      errorMessage: error?.message || String(error),
      errorType: error?.constructor?.name,
      debug: debugInfo,
    }, { status: 500 });
  }
}
