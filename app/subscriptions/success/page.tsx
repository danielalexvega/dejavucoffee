import Link from 'next/link';

export default function SuccessPage() {
  // Success page - subscription ID can be accessed via searchParams if needed
  return (
    <div className="min-h-screen bg-mint py-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 text-center shadow-sm dark:bg-gray-900">
          <div className="mb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Subscription Successful!
          </h1>
          <p className="mb-8 text-gray-600 dark:text-gray-400">
            Thank you for subscribing. Your subscription has been activated and you'll receive a confirmation email shortly.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/subscriptions"
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              View All Plans
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
