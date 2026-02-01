import Link from 'next/link';
import { Hero } from '@/components/Hero';

export default function SuccessPage() {
  // Success page - subscription ID can be accessed via searchParams if needed
  return (
    <div className="min-h-screen bg-mint pb-12">
      <Hero
        imageSrc="/success.svg"
        imageAlt="Successfully Subscribed"
        height="small"
        overlay={false}
        objectFit="contain"
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-mint p-8 text-center dark:bg-mint">
          <h1 className="mb-4 text-2xl text-dark-green dark:text-dark-green font-sailers">
            Subscription Successful!
          </h1>
          <p className="mb-8 text-dark-green dark:text-dark-green font-sailers">
            Thanks for joining us. Your subscription has been activated and you'll receive a confirmation email shortly.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/subscriptions"
              className="btn-primary"
            >
              Get More Coffee
            </Link>
            <Link
              href="/"
              className="btn-secondary"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
