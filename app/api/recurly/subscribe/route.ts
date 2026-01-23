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
 *   billingInfo: { token: string } // Token from Recurly.js
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

    if (!planCode || !account?.email || !billingInfo?.token) {
      return NextResponse.json(
        { error: 'Missing required fields: planCode, account.email, and billingInfo.token' },
        { status: 400 }
      );
    }

    // Create subscription using Recurly API
    // Recurly Client v4 uses createSubscription() method directly
    const subscription = await recurlyClient.createSubscription({
      planCode,
      account: {
        code: account.email, // Use email as account code, or generate a unique ID
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
      },
      currency: 'USD', // Adjust based on your needs
      billingInfo: {
        tokenId: billingInfo.token,
      },
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
    
    // Handle Recurly-specific errors
    if (error?.message) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
