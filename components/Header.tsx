'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CartDropdown } from './CartDropdown';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-mint shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo - Left */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center transition-transform duration-200 hover:scale-110">
            <Image
              src="/dejavu-300x100.svg"
              alt="Deja Vu Coffee Club"
              width={150}
              height={60}
              className="w-auto"
              priority
            />
          </Link>
        </div>

        {/* Navigation - Center */}
        <nav className="hidden items-center space-x-8 md:flex font-sailers">
          <Link
            href="/"
            className="header-link"
          >
            Home
          </Link>
          <Link
            href="/subscriptions"
            className="header-link"
          >
            Subscriptions
          </Link>
          <Link
            href="/about"
            className="header-link"
          >
            About Us
          </Link>
        </nav>

        {/* Icons - Right */}
        <div className="flex items-center space-x-4">
          {/* Shopping Cart with Dropdown */}
          <CartDropdown />

          {/* Login */}
          <button
            className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-dark-green"
            aria-label="Login"
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>

          {/* Mobile menu button */}
          <button
            className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-dark-green md:hidden"
            aria-label="Menu"
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
