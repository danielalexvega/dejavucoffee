import { NextRequest, NextResponse } from 'next/server';
import { recurlyClient } from '@/lib/recurly';

/**
 * POST /api/recurly/pause-subscription
 * Pauses a subscription in Recurly
 * 
 * Expected body:
 * {
 *   subscriptionUuid: string,
 *   remainingPauseCycles?: number (defaults to 1 if not provided)
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
    const { subscriptionUuid, subscriptionId, remainingPauseCycles } = body;

    if (!subscriptionUuid && !subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionUuid or subscriptionId is required' },
        { status: 400 }
      );
    }

    // Pause subscription using Recurly API
    // Recurly Client v4 uses pauseSubscription() method  
    // remaining_pause_cycles is required - default to 1 cycle if not specified
    const pauseCycles = remainingPauseCycles || 1;
    
    // Try ID first if provided, otherwise use UUID
    // Some Recurly operations require ID instead of UUID
    const identifier = subscriptionId || subscriptionUuid;
    
    console.log('Pausing subscription:', { identifier, subscriptionUuid, subscriptionId, pauseCycles });
    
    // Recurly API expects: POST /subscriptions/{subscription_id}/pause
    // Body: { "remaining_pause_cycles": number }
    // Try with the provided identifier (ID or UUID)
    const subscription = await recurlyClient.pauseSubscription(identifier, {
      remaining_pause_cycles: pauseCycles,
    });

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
