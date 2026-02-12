import { NextRequest, NextResponse } from 'next/server';
import { recurlyClient } from '@/lib/recurly';

/**
 * POST /api/recurly/check-subscriptions
 * Checks if an email has any subscriptions in Recurly
 * 
 * Expected body:
 * {
 *   email: string
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
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find account by email in Recurly
    // Recurly Client v4 uses listAccounts which returns an iterator
    let account = null;
    try {
      const accountsResponse = recurlyClient.listAccounts({
        params: {
          email: email,
        },
      });

      // Iterate through accounts to find matching email
      if (accountsResponse && typeof accountsResponse.each === 'function') {
        for await (const acc of accountsResponse.each()) {
          if (acc.email === email) {
            account = acc;
            break;
          }
        }
      }
    } catch (error: any) {
      // If account lookup fails, check if it's a "not found" error
      if (error?.message?.includes('not found') || error?.status === 404) {
        return NextResponse.json({
          subscriptions: [],
        });
      }
      throw error;
    }

    // If no account found, return empty subscriptions
    if (!account) {
      return NextResponse.json({
        subscriptions: [],
      });
    }

    // Get subscriptions for this account
    // Recurly Client v4 uses listSubscriptions which returns an iterator
    const subscriptions: any[] = [];
    try {
      const subscriptionsResponse = recurlyClient.listSubscriptions({
        params: {
          accountId: account.id,
        },
      });

      // Iterate through subscriptions
      if (subscriptionsResponse && typeof subscriptionsResponse.each === 'function') {
        for await (const sub of subscriptionsResponse.each()) {
          subscriptions.push(sub);
          // Limit to 100 subscriptions
          if (subscriptions.length >= 100) break;
        }
      }
    } catch (error: any) {
      // If subscriptions lookup fails, log but don't fail - account exists
      console.error('Error fetching subscriptions:', error);
    }

    // Format subscription data for frontend
    const formattedSubscriptions = subscriptions.map((sub: any) => {
      // Get the state field - Recurly uses 'state' field
      // IMPORTANT: We must trust Recurly's actual state field, not override it
      // Recurly's API requires the state to be "paused" before allowing resume
      // Even if remainingPauseCycles > 0, if state is "active", resume will fail
      const stateValue = sub.state;
      const normalizedState = (stateValue || '').toLowerCase();
      
      return {
        uuid: sub.uuid,
        id: sub.id, // Include ID as well in case it's needed for pause/resume
        state: normalizedState, // Normalized state: active, paused, canceled, expired, future
        planCode: sub.plan?.code,
        planName: sub.plan?.name,
        currentPeriodStart: sub.currentPeriodStartedAt,
        currentPeriodEnd: sub.currentPeriodEndsAt,
        quantity: sub.quantity,
        unitAmount: sub.unitAmount,
        currency: sub.currency,
        accountId: sub.account?.id,
        // Additional status-related fields
        pausedAt: sub.pausedAt,
        canceledAt: sub.canceledAt,
        expiresAt: sub.expiresAt,
        trialEndsAt: sub.trialEndsAt,
        // Current term information
        currentTermEndsAt: sub.currentTermEndsAt,
        // Include remainingPauseCycles for reference
        remainingPauseCycles: sub.remainingPauseCycles,
        // Include original state for debugging
        originalState: sub.state,
      };
    });

    return NextResponse.json({
      subscriptions: formattedSubscriptions,
      account: {
        id: account.id,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
      },
    });
  } catch (error: any) {
    console.error('Error checking subscriptions:', error);
    
    // Handle case where account doesn't exist (not necessarily an error)
    if (error?.message?.includes('not found') || error?.status === 404) {
      return NextResponse.json({
        subscriptions: [],
      });
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to check subscriptions' },
      { status: 500 }
    );
  }
}
