import { NextRequest, NextResponse } from 'next/server';
import { recurlyClient } from '@/lib/recurly';

/**
 * POST /api/recurly/cancel-pause
 * Cancels a scheduled pause by setting remaining_pause_cycles to 0
 * 
 * Expected body:
 * {
 *   subscriptionUuid: string,
 *   subscriptionId?: string
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

    // Cancel scheduled pause by setting remaining_pause_cycles to 0
    // Try ID first if provided, otherwise use UUID
    const identifier = subscriptionId || subscriptionUuid;
    
    // Call pauseSubscription with remaining_pause_cycles: 0 to cancel the scheduled pause
    const subscription = await recurlyClient.pauseSubscription(identifier, {
      remaining_pause_cycles: 0,
    });

    return NextResponse.json({
      success: true,
      subscription: {
        uuid: subscription.uuid,
        state: subscription.state,
        remainingPauseCycles: subscription.remainingPauseCycles,
      },
    });
  } catch (error: any) {
    console.error('Error canceling pause:', error);
    
    return NextResponse.json(
      { error: error?.message || 'Failed to cancel scheduled pause' },
      { status: 400 }
    );
  }
}
