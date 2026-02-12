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
    
    // Resume subscription using Recurly API
    const subscription = await recurlyClient.resumeSubscription(identifier, {});

    return NextResponse.json({
      success: true,
      subscription: {
        uuid: subscription.uuid,
        state: subscription.state,
      },
    });
  } catch (error: any) {
    console.error('Error resuming subscription:', {
      message: error?.message,
      type: error?.type,
      params: error?.params,
      status: error?.status,
      statusCode: error?.statusCode,
      fullError: error,
    });
    
    // Provide more user-friendly error messages
    let errorMessage = error?.message || 'Failed to resume subscription';
    
    // Check for various error patterns from Recurly
    if (errorMessage.includes('active subscription') || 
        errorMessage.includes('not paused') ||
        errorMessage.includes('active, not paused') ||
        errorMessage.includes('Cannot resume')) {
      // This might happen if Recurly hasn't updated the state field yet
      // even though remainingPauseCycles indicates it's paused
      errorMessage = 'Subscription state may not be synchronized yet. Recurly requires the subscription to be in "paused" state before resuming. Please wait a moment and refresh the page, then try again.';
    } else if (errorMessage.includes('Couldn\'t find Subscription')) {
      errorMessage = 'Subscription not found. Please refresh and try again.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
