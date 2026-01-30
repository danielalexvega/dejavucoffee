import { NextRequest, NextResponse } from 'next/server';
import { recurlyClient } from '@/lib/recurly';

/**
 * POST /api/recurly/pause-subscription
 * Pauses a subscription in Recurly
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
    const { subscriptionUuid } = body;

    if (!subscriptionUuid) {
      return NextResponse.json(
        { error: 'subscriptionUuid is required' },
        { status: 400 }
      );
    }

    // Pause subscription using Recurly API
    // Recurly Client v4 uses pauseSubscription() method
    const subscription = await recurlyClient.pauseSubscription(subscriptionUuid, {});

    return NextResponse.json({
      success: true,
      subscription: {
        uuid: subscription.uuid,
        state: subscription.state,
      },
    });
  } catch (error: any) {
    console.error('Error pausing subscription:', error);
    
    return NextResponse.json(
      { error: error?.message || 'Failed to pause subscription' },
      { status: 400 }
    );
  }
}
