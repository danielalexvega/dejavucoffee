import { NextRequest, NextResponse } from 'next/server';
import { recurlyClient } from '@/lib/recurly';

/**
 * POST /api/recurly/change-plan
 * Changes a subscription to a new plan (Recurly subscription change).
 *
 * Body: { subscriptionUuid: string, planCode: string }
 */
export async function POST(request: NextRequest) {
  try {
    if (!recurlyClient) {
      return NextResponse.json(
        { error: 'Recurly API key not configured.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { subscriptionUuid, planCode } = body;

    if (!subscriptionUuid || !planCode) {
      return NextResponse.json(
        { error: 'subscriptionUuid and planCode are required' },
        { status: 400 }
      );
    }

    const subscriptionId = subscriptionUuid.startsWith('uuid-')
      ? subscriptionUuid
      : `uuid-${subscriptionUuid}`;

    await recurlyClient.createSubscriptionChange(subscriptionId, {
      planCode,
      timeframe: 'now',
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = (error as Error)?.message ?? 'Failed to change plan';
    console.error('Change plan error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
