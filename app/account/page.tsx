'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function AccountPage() {
  const { user, isAuthenticated, isLoading, logout, updateUser } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [isPausing, setIsPausing] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState<string | null>(null);
  const [isCancelingPause, setIsCancelingPause] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const isLoadingRef = useRef(false);
  const loadedEmailRef = useRef<string | null>(null);
  const userRef = useRef(user);
  const updateUserRef = useRef(updateUser);
  
  // Keep refs in sync with latest values (without causing re-renders)
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  
  useEffect(() => {
    updateUserRef.current = updateUser;
  }, [updateUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/subscriptions');
    }
  }, [isAuthenticated, isLoading, router]);

  // Function to sort subscriptions by status: active first, paused second, then others
  const sortSubscriptionsByStatus = useCallback((subs: any[]) => {
    const statusOrder: { [key: string]: number } = {
      'active': 1,
      'paused': 2,
      'canceled': 3,
      'expired': 4,
      'future': 5,
    };
    
    return [...subs].sort((a, b) => {
      const aOrder = statusOrder[a.state] || 99;
      const bOrder = statusOrder[b.state] || 99;
      return aOrder - bOrder;
    });
  }, []);

  // Function to refresh subscriptions from Recurly
  const refreshSubscriptions = useCallback(async (force: boolean = false) => {
    const email = userRef.current?.email;
    if (!email) return;
    
    // Allow force refresh even if currently loading (for post-operation refreshes)
    if (!force && isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    setIsLoadingSubscriptions(true);
    try {
      const response = await fetch('/api/recurly/check-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (response.ok && data.subscriptions) {
        setSubscriptions(sortSubscriptionsByStatus(data.subscriptions));
        
        // Update user object with account information and subscriptions
        // Only update if the data actually changed to prevent loops
        const currentUser = userRef.current;
        if (data.account && currentUser) {
          const needsUpdate = 
            currentUser.firstName !== data.account.firstName ||
            currentUser.lastName !== data.account.lastName;
          
          if (needsUpdate) {
            updateUserRef.current({
              firstName: data.account.firstName,
              lastName: data.account.lastName,
              subscriptions: data.subscriptions,
            });
          }
        }
      } else {
        console.error('Error refreshing subscriptions:', data.error);
      }
    } catch (error) {
      console.error('Error refreshing subscriptions:', error);
    } finally {
      isLoadingRef.current = false;
      setIsLoadingSubscriptions(false);
    }
  }, []); // Empty deps - we use refs to access latest values

  // Refresh subscriptions from Recurly when user is authenticated
  // Only reload if the email changes (e.g., different user logs in)
  useEffect(() => {
    if (isAuthenticated && user?.email && loadedEmailRef.current !== user.email) {
      loadedEmailRef.current = user.email;
      refreshSubscriptions();
    }
  }, [isAuthenticated, user?.email, refreshSubscriptions]);

  if (isLoading || isLoadingSubscriptions) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handlePause = async (subscription: any) => {
    // Double-check the state before attempting to pause
    if (subscription.state !== 'active') {
      console.warn(`Attempted to pause subscription ${subscription.uuid} but state is ${subscription.state}, not active`);
      showToast(`Cannot pause: subscription is ${subscription.state}`);
      await refreshSubscriptions(true);
      return;
    }
    
    // Check if a pause is already scheduled
    if (subscription.remainingPauseCycles && subscription.remainingPauseCycles > 0) {
      console.warn(`Attempted to pause subscription ${subscription.uuid} but pause is already scheduled`);
      showToast('A pause is already scheduled. Cancel it first if you want to change it.');
      await refreshSubscriptions(true);
      return;
    }

    setIsPausing(subscription.uuid);
    try {
      const response = await fetch('/api/recurly/pause-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscriptionUuid: subscription.uuid,
          subscriptionId: subscription.id, // Include ID in case UUID doesn't work
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to pause subscription');
        return;
      }

      // Optimistically update the subscription state from the API response
      if (data.subscription && data.subscription.state) {
        setSubscriptions((prevSubs) =>
          sortSubscriptionsByStatus(
            prevSubs.map((sub: any) =>
              sub.uuid === subscription.uuid
                ? { ...sub, state: data.subscription.state }
                : sub
            )
          )
        );
      }

      showToast('Subscription paused successfully');
      
      // Wait for Recurly to process the change, then refresh to get all updated fields
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s first
      await refreshSubscriptions(true); // Force refresh to get complete updated data
      
      // Check again after another delay to ensure state is fully updated
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait another 1s
      await refreshSubscriptions(true); // Force refresh
    } catch (error: any) {
      showToast('An error occurred. Please try again.');
      console.error('Pause error:', error);
    } finally {
      setIsPausing(null);
    }
  };

  const handleCancelPause = async (subscription: any) => {
    // Double-check the state before attempting to cancel pause
    if (subscription.state !== 'active' || !subscription.remainingPauseCycles || subscription.remainingPauseCycles === 0) {
      console.warn(`Attempted to cancel pause for subscription ${subscription.uuid} but state is ${subscription.state} or no pause scheduled`);
      showToast('No scheduled pause to cancel');
      await refreshSubscriptions(true);
      return;
    }

    setIsCancelingPause(subscription.uuid);
    try {
      const response = await fetch('/api/recurly/cancel-pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscriptionUuid: subscription.uuid,
          subscriptionId: subscription.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to cancel scheduled pause');
        return;
      }

      // Optimistically update the subscription
      if (data.subscription) {
        setSubscriptions((prevSubs) =>
          sortSubscriptionsByStatus(
            prevSubs.map((sub: any) =>
              sub.uuid === subscription.uuid
                ? { 
                    ...sub, 
                    state: data.subscription.state,
                    remainingPauseCycles: data.subscription.remainingPauseCycles || 0,
                  }
                : sub
            )
          )
        );
      }

      showToast('Scheduled pause canceled successfully');
      
      // Wait for Recurly to process the change, then refresh
      await new Promise(resolve => setTimeout(resolve, 2000));
      await refreshSubscriptions(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshSubscriptions(true);
    } catch (error: any) {
      showToast('An error occurred. Please try again.');
      console.error('Cancel pause error:', error);
    } finally {
      setIsCancelingPause(null);
    }
  };

  const handleCancelClick = (subscription: any) => {
    // Don't allow canceling already canceled or expired subscriptions
    if (subscription.state === 'canceled' || subscription.state === 'expired') {
      showToast('Subscription is already canceled or expired');
      return;
    }

    // Set pending cancellation to show confirmation
    setPendingCancel(subscription.uuid);
    showToast('Click "Confirm Cancel" to cancel your subscription. It will remain active until the end of the billing period.');
  };

  const handleCancelConfirm = async (subscription: any) => {
    setPendingCancel(null);
    setIsCanceling(subscription.uuid);
    try {
      const response = await fetch('/api/recurly/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscriptionUuid: subscription.uuid,
          subscriptionId: subscription.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to cancel subscription');
        return;
      }

      // Optimistically update the subscription
      if (data.subscription) {
        setSubscriptions((prevSubs) =>
          sortSubscriptionsByStatus(
            prevSubs.map((sub: any) =>
              sub.uuid === subscription.uuid
                ? { 
                    ...sub, 
                    state: data.subscription.state,
                    canceledAt: data.subscription.canceledAt,
                    expiresAt: data.subscription.expiresAt,
                  }
                : sub
            )
          )
        );
      }

      showToast('Subscription canceled successfully. It will remain active until the end of the billing period.');
      
      // Wait for Recurly to process the change, then refresh
      await new Promise(resolve => setTimeout(resolve, 2000));
      await refreshSubscriptions(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshSubscriptions(true);
    } catch (error: any) {
      showToast('An error occurred. Please try again.');
      console.error('Cancel subscription error:', error);
    } finally {
      setIsCanceling(null);
    }
  };

  const handleCancelCancel = () => {
    setPendingCancel(null);
  };

  const handleResume = async (subscription: any) => {
    // Double-check the state before attempting to resume
    if (subscription.state !== 'paused') {
      showToast(`Cannot resume: subscription is ${subscription.state}`);
      await refreshSubscriptions(true);
      return;
    }

    setIsResuming(subscription.uuid);
    try {
      
      const response = await fetch('/api/recurly/resume-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscriptionUuid: subscription.uuid,
          subscriptionId: subscription.id, // Include ID in case UUID doesn't work
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Resume API error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          fullResponse: data,
        });
        
        // Check if subscription is already active
        if (data.error && (data.error.includes('active subscription') || data.error.includes('not paused'))) {
          showToast('Subscription is already active');
          // Refresh to get the latest state
          await refreshSubscriptions(true);
        } else {
          showToast(data.error || 'Failed to resume subscription');
        }
        return;
      }

      // Optimistically update the subscription state from the API response
      if (data.subscription && data.subscription.state) {
        setSubscriptions((prevSubs) =>
          sortSubscriptionsByStatus(
            prevSubs.map((sub: any) =>
              sub.uuid === subscription.uuid
                ? { ...sub, state: data.subscription.state }
                : sub
            )
          )
        );
      }

      showToast('Subscription resumed successfully');
      
      // Wait for Recurly to process the change, then refresh to get all updated fields
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s first
      await refreshSubscriptions(true); // Force refresh to get complete updated data
      
      // Check again after another delay to ensure state is fully updated
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait another 1s
      await refreshSubscriptions(true); // Force refresh
    } catch (error: any) {
      // Check if error is about already being active or not paused
      const errorMessage = error?.message || '';
      if (errorMessage.includes('active subscription') || errorMessage.includes('not paused')) {
        showToast('Subscription is already active');
        await refreshSubscriptions(true); // Force refresh
      } else {
        showToast('An error occurred. Please try again.');
        console.error('Resume error:', error);
      }
    } finally {
      setIsResuming(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    // Recurly returns amounts as decimals (e.g., 169.9), not cents
    // Format to always show 2 decimal places
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-charcoal py-12 dark:bg-charcoal">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div 
          className="mb-8 relative bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/cookie-charcoal.svg)',
            backgroundSize: '100% auto',
            paddingBottom: '20%', // Add padding to prevent cropping (adjust percentage based on SVG aspect ratio)
            minHeight: '150px', // Minimum height to ensure SVG is visible
          }}
        >
          <h1 className="text-3xl text-gray-900 dark:text-gray-100 font-sailers">
            My Subscription
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Welcome back, {user.firstName} {user.lastName}
          </p>
        </div>

        {/* <div className="mb-6 flex justify-end">
          <button
            onClick={logout}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Logout
          </button>
        </div> */}

        {!subscriptions || subscriptions.length === 0 ? (
          <div className="rounded-lg bg-yellow-50 p-6 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            <h3 className="mb-2 font-semibold">No Subscriptions Found</h3>
            <p className="mb-4">You don't have any active subscriptions.</p>
            <Link
              href="/subscriptions"
              className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Browse Subscriptions
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Your Subscriptions ({subscriptions.length})
            </h2>

            {subscriptions.map((subscription: any) => (
              <div
                key={subscription.uuid}
                className="relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {/* Cancel Plan button - positioned in top right */}
                {(subscription.state === 'active' || subscription.state === 'paused') && (
                  <div className="absolute right-4 top-4 group">
                    {pendingCancel === subscription.uuid ? (
                      <div className="flex gap-2 items-center bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => handleCancelConfirm(subscription)}
                          disabled={isCanceling === subscription.uuid}
                          className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isCanceling === subscription.uuid ? 'Canceling...' : 'Confirm'}
                        </button>
                        <button
                          onClick={handleCancelCancel}
                          disabled={isCanceling === subscription.uuid}
                          className="rounded bg-gray-200 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-300 dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleCancelClick(subscription)}
                          disabled={isCanceling === subscription.uuid || pendingCancel !== null}
                          className="rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center"
                          title="Cancel Plan"
                        >
                          {isCanceling === subscription.uuid ? (
                            <span className="text-xs">...</span>
                          ) : (
                            <X size={18} />
                          )}
                        </button>
                        {/* Tooltip */}
                        <div className="absolute right-0 top-full mt-2 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          Cancel Plan
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {subscription.planName || 'Subscription'}
                    </h3>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Status
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              subscription.state === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : subscription.state === 'paused'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : subscription.state === 'canceled'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                : subscription.state === 'expired'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : subscription.state === 'future'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {subscription.state.charAt(0).toUpperCase() + subscription.state.slice(1)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Amount
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                          {subscription.unitAmount
                            ? formatCurrency(subscription.unitAmount, subscription.currency)
                            : 'N/A'}{' '}
                          {subscription.quantity > 1 && `× ${subscription.quantity}`}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Current Period Start
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(subscription.currentPeriodStart)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Current Period End
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                          {formatDate(subscription.currentPeriodEnd)}
                        </p>
                      </div>
                      
                      {/* Show additional status information based on state */}
                      {subscription.state === 'paused' && subscription.pausedAt && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Paused Since
                          </p>
                          <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(subscription.pausedAt)}
                          </p>
                        </div>
                      )}
                      
                      {subscription.state === 'canceled' && subscription.canceledAt && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Canceled On
                          </p>
                          <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(subscription.canceledAt)}
                          </p>
                        </div>
                      )}
                      
                      {subscription.expiresAt && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {subscription.state === 'canceled' ? 'Expires On' : 'Expires At'}
                          </p>
                          <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(subscription.expiresAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 flex-wrap items-start justify-between">
                  <div className="flex gap-3 flex-wrap">
                    {/* Show pause button for active subscriptions with no scheduled pause */}
                    {subscription.state === 'active' && (!subscription.remainingPauseCycles || subscription.remainingPauseCycles === 0) && (
                      <button
                        onClick={() => handlePause(subscription)}
                        disabled={isPausing === subscription.uuid}
                        className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPausing === subscription.uuid ? 'Pausing...' : 'Pause Subscription'}
                      </button>
                    )}

                    {/* Show cancel pause button for active subscriptions with scheduled pause */}
                    {subscription.state === 'active' && subscription.remainingPauseCycles > 0 && (
                      <button
                        onClick={() => handleCancelPause(subscription)}
                        disabled={isCancelingPause === subscription.uuid}
                        className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isCancelingPause === subscription.uuid ? 'Canceling...' : 'Cancel Pause'}
                      </button>
                    )}

                    {/* Show resume button only for paused subscriptions */}
                    {subscription.state === 'paused' && (
                      <button
                        onClick={() => handleResume(subscription)}
                        disabled={isResuming === subscription.uuid}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isResuming === subscription.uuid ? 'Resuming...' : 'Resume Subscription'}
                      </button>
                    )}
                    
                    {/* Show info message for canceled subscriptions */}
                    {subscription.state === 'canceled' && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        This subscription will expire at the end of the current billing period.
                      </p>
                    )}
                    
                    {/* Show info message for expired subscriptions */}
                    {subscription.state === 'expired' && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        This subscription has expired and cannot be reactivated.
                      </p>
                    )}

                    <Link
                      href={`/subscriptions/${subscription.planCode}`}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      View Plan Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
