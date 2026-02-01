'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        showToast('Login successful!');
        onClose();
        // Redirect to account page
        router.push('/account');
      } else {
        // If no subscription found, redirect to subscriptions page
        if (result.error?.includes('No subscription found')) {
          setError(result.error);
          setTimeout(() => {
            onClose();
            router.push('/subscriptions');
          }, 2000);
        } else {
          setError(result.error || 'Login failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Close modal if clicking on the overlay (not the modal content)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-10 p-4 backdrop-blur-xs"
      onClick={handleOverlayClick}
    >
      <div 
        className="relative w-full max-w-sm rounded-lg bg-charcoal p-6 shadow-xl dark:bg-slate"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-6 text-white hover:text-terracotta dark:hover:text-terracotta"
          aria-label="Close"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="mb-4 text-xl text-gray-900 dark:text-gray-100 font-sailers">
          Login to Your Account
        </h2>

        {error && (
          <div className="mb-3 rounded-lg bg-terracotta p-3 text-sm text-white dark:bg-terracotta dark:text-white">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-white dark:text-white">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate px-4 py-2 focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate dark:border-slate dark:bg-white dark:text-black"
              placeholder="your@email.com"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-white">
              Password
            </label>
            <input
              type="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate px-4 py-2 focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate dark:border-slate dark:bg-white dark:text-black"
              placeholder="Enter your password"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate px-4 py-2 font-sailers text-sm font-medium text-white transition-colors hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate dark:hover:bg-charcoal"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          Demo: Password is <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">flatwhite</code>
        </p>
      </div>
    </div>
  );
}
