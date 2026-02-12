import { NextRequest, NextResponse } from 'next/server';
import { recurlyClient } from '@/lib/recurly';

/**
 * POST /api/recurly/cancel-subscription
 * Cancels a subscription in Recurly (ends at next bill date)
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

    // Cancel subscription - ends at next bill date
    // Try ID first if provided, otherwise use UUID
    const identifier = subscriptionId || subscriptionUuid;
    
    // Recurly Client v4 uses cancelSubscription() method
    const subscription = await recurlyClient.cancelSubscription(identifier, {});

    return NextResponse.json({
      success: true,
      subscription: {
        uuid: subscription.uuid,
        state: subscription.state,
        canceledAt: subscription.canceledAt,
        expiresAt: subscription.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    
    return NextResponse.json(
      { error: error?.message || 'Failed to cancel subscription' },
      { status: 400 }
    );
  }
}
