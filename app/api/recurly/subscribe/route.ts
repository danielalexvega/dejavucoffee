import { NextRequest, NextResponse } from 'next/server';
import { recurlyClient } from '@/lib/recurly';

/**
 * POST /api/recurly/subscribe
 * Creates a new subscription in Recurly
 * 
 * Expected body:
 * {
 *   planCode: string,
 *   account: { email: string, firstName?: string, lastName?: string },
 *   billingInfo: { 
 *     token: string, // Token from Recurly.js
 *     address?: string,
 *     city?: string,
 *     state?: string,
 *     zip?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    if (!recurlyClient) {
      return NextResponse.json(
        { error: 'Recurly API key not configured. Please set RECURLY_PRIVATE_KEY environment variable.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { planCode, account, billingInfo } = body;

    console.log('Received subscription request:', {
      planCode,
      account: { email: account?.email, firstName: account?.firstName, lastName: account?.lastName },
      billingInfo: {
        hasToken: !!billingInfo?.token,
        address: billingInfo?.address,
        city: billingInfo?.city,
        state: billingInfo?.state,
        zip: billingInfo?.zip,
        country: billingInfo?.country,
      },
    });

    if (!planCode || !account?.email || !billingInfo?.token) {
      return NextResponse.json(
        { error: 'Missing required fields: planCode, account.email, and billingInfo.token' },
        { status: 400 }
      );
    }

    // Validate that all required address fields are provided
    if (!billingInfo.address || !billingInfo.city || !billingInfo.state || !billingInfo.zip || !billingInfo.country) {
      return NextResponse.json(
        { error: 'All address fields are required: address, city, state, zip, and country' },
        { status: 400 }
      );
    }

    // Generate a unique account code (Recurly requires account code to be unique)
    // Use email-based code or generate UUID
    const accountCode = `acc-${account.email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now()}`;

    // Build billingInfo object with token only
    // When using a token, address information is already included in the token
    // (passed during tokenization in the frontend), so we don't need to include it here
    const billingInfoPayload: any = {
      tokenId: billingInfo.token,
    };

    console.log('Creating subscription with billingInfo (token only):', {
      tokenId: '***',
      note: 'Address info is included in the token',
    });

    // Create subscription using Recurly API
    // Recurly Client v4 uses createSubscription() method directly
    // billingInfo must be nested inside account object, not as top-level parameter
    const subscription = await recurlyClient.createSubscription({
      planCode,
      account: {
        code: accountCode, // Unique account code
        email: account.email,
        firstName: account.firstName || undefined,
        lastName: account.lastName || undefined,
        billingInfo: billingInfoPayload,
      },
      currency: 'USD', // Adjust based on your needs
    });

    return NextResponse.json({
      success: true,
      subscription: {
        uuid: subscription.uuid,
        state: subscription.state,
        plan: subscription.plan,
        account: subscription.account,
      },
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    
    // Handle Recurly-specific errors with more detail
    if (error?.message) {
      // Recurly API errors often have more details in error object
      const errorDetails = error?.params || error?.fields || {};
      const errorMessage = error.message + (Object.keys(errorDetails).length > 0 
        ? ` Details: ${JSON.stringify(errorDetails)}` 
        : '');
      
      return NextResponse.json(
        { error: errorMessage, details: errorDetails },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create subscription', details: error },
      { status: 500 }
    );
  }
}
