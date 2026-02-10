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

    console.log('SUBSCRIPTIONS RAW:', subscriptions.map((sub: any) => ({
      uuid: sub.uuid,
      state: sub.state,
      status: sub.status,
      pausedAt: sub.pausedAt,
      remainingPauseCycles: sub.remainingPauseCycles,
      allKeys: Object.keys(sub).filter(key => key.toLowerCase().includes('state') || key.toLowerCase().includes('status') || key.toLowerCase().includes('pause')),
    })));

    // Format subscription data for frontend
    const formattedSubscriptions = subscriptions.map((sub: any) => {
      // Check multiple possible state fields
      // Recurly might use 'state', 'status', or other field names
      let stateValue = sub.state || sub.status || sub.currentState || '';
      let normalizedState = stateValue.toLowerCase();
      
      // If state is active but subscription has pause indicators, check if it's actually paused
      // This handles cases where Recurly hasn't updated the state field yet
      if (normalizedState === 'active') {
        // Check if subscription is actually paused based on pause-related fields
        if (sub.remainingPauseCycles && sub.remainingPauseCycles > 0) {
          normalizedState = 'paused';
          console.log(`Subscription ${sub.uuid} marked as paused due to remainingPauseCycles: ${sub.remainingPauseCycles}`);
        } else if (sub.pausedAt && !sub.resumeDate) {
          // If pausedAt exists but no resumeDate, it might still be paused
          // Check if pausedAt is recent (within last 30 days) as a heuristic
          const pausedDate = new Date(sub.pausedAt);
          const daysSincePaused = (Date.now() - pausedDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSincePaused < 30) {
            normalizedState = 'paused';
            console.log(`Subscription ${sub.uuid} marked as paused due to recent pausedAt: ${sub.pausedAt}`);
          }
        }
      }
      
      // Log all subscription states for debugging
      console.log(`Subscription ${sub.uuid} (${sub.plan?.code || 'unknown'}):`, {
        originalState: sub.state,
        status: sub.status,
        currentState: sub.currentState,
        normalizedState: normalizedState,
        pausedAt: sub.pausedAt,
        remainingPauseCycles: sub.remainingPauseCycles,
        resumeDate: sub.resumeDate,
      });
      
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
