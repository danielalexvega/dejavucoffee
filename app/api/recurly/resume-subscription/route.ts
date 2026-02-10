import { NextRequest, NextResponse } from 'next/server';
import { recurlyClient } from '@/lib/recurly';

/**
 * POST /api/recurly/resume-subscription
 * Resumes a paused subscription in Recurly
 * 
 * Expected body:
 * {
 *   subscriptionUuid: string
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
    const { subscriptionUuid, subscriptionId } = body;

    if (!subscriptionUuid && !subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionUuid or subscriptionId is required' },
        { status: 400 }
      );
    }

    // Resume subscription using Recurly API
    // Recurly Client v4 uses resumeSubscription() method
    // Try ID first if provided, otherwise use UUID
    const identifier = subscriptionId || subscriptionUuid;
    
    // First, verify the subscription state before attempting to resume
    try {
      const currentSubscription = await recurlyClient.getSubscription(identifier);
      if (currentSubscription.state !== 'paused') {
        return NextResponse.json(
          { error: `Subscription is ${currentSubscription.state}, not paused. Cannot resume.` },
          { status: 400 }
        );
      }
    } catch (getError: any) {
      // If we can't get the subscription, log but continue (might be a different error)
      console.log('Could not verify subscription state before resume:', getError?.message);
    }
    
    const subscription = await recurlyClient.resumeSubscription(identifier, {});

    return NextResponse.json({
      success: true,
      subscription: {
        uuid: subscription.uuid,
        state: subscription.state,
      },
    });
  } catch (error: any) {
    console.error('Error resuming subscription:', error);
    
    // Provide more user-friendly error messages
    let errorMessage = error?.message || 'Failed to resume subscription';
    if (errorMessage.includes('active subscription')) {
      errorMessage = 'Subscription is already active';
    } else if (errorMessage.includes('not paused')) {
      errorMessage = 'This subscription is not currently paused';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
