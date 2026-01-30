'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AccountPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [isPausing, setIsPausing] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/subscriptions');
    }
  }, [isAuthenticated, isLoading, router]);

  // Refresh subscriptions from Recurly when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      const refreshSubscriptions = async () => {
        setIsLoadingSubscriptions(true);
        try {
          const response = await fetch('/api/recurly/check-subscriptions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: user.email }),
          });

          const data = await response.json();
          if (response.ok && data.subscriptions) {
            setSubscriptions(data.subscriptions);
          }
        } catch (error) {
          console.error('Error refreshing subscriptions:', error);
        } finally {
          setIsLoadingSubscriptions(false);
        }
      };

      refreshSubscriptions();
    }
  }, [isAuthenticated, user?.email]);

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

  const handlePause = async (subscriptionUuid: string) => {
    setIsPausing(subscriptionUuid);
    try {
      const response = await fetch('/api/recurly/pause-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionUuid }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to pause subscription');
        return;
      }

      // Refresh the page to show updated subscription state
      window.location.reload();
    } catch (error: any) {
      alert('An error occurred. Please try again.');
      console.error('Pause error:', error);
    } finally {
      setIsPausing(null);
    }
  };

  const handleResume = async (subscriptionUuid: string) => {
    setIsResuming(subscriptionUuid);
    try {
      const response = await fetch('/api/recurly/resume-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionUuid }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to resume subscription');
        return;
      }

      // Refresh the page to show updated subscription state
      window.location.reload();
    } catch (error: any) {
      alert('An error occurred. Please try again.');
      console.error('Resume error:', error);
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100); // Recurly amounts are in cents
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-sailers">
            My Account
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Welcome back, {user.email}
          </p>
        </div>

        <div className="mb-6 flex justify-end">
          <button
            onClick={logout}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Logout
          </button>
        </div>

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
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {subscription.planName || subscription.planCode || 'Subscription'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Plan Code: {subscription.planCode}
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Status
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 capitalize">
                          {subscription.state}
                        </p>
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
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  {subscription.state === 'active' && (
                    <button
                      onClick={() => handlePause(subscription.uuid)}
                      disabled={isPausing === subscription.uuid}
                      className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPausing === subscription.uuid ? 'Pausing...' : 'Pause Subscription'}
                    </button>
                  )}

                  {subscription.state === 'paused' && (
                    <button
                      onClick={() => handleResume(subscription.uuid)}
                      disabled={isResuming === subscription.uuid}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isResuming === subscription.uuid ? 'Resuming...' : 'Resume Subscription'}
                    </button>
                  )}

                  <Link
                    href={`/subscriptions/${subscription.planCode}`}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    View Plan Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
