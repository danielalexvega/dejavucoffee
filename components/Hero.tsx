import Image from 'next/image';
import Link from 'next/link';

interface HeroProps {
  imageSrc: string;
  imageAlt?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  overlay?: boolean;
  height?: 'small' | 'medium' | 'large' | 'full';
  className?: string;
}

const heightClasses = {
  small: 'h-[400px]',
  medium: 'h-[500px]',
  large: 'h-[600px]',
  full: 'min-h-screen',
};

export function Hero({
  imageSrc,
  imageAlt = 'Hero image',
  title,
  subtitle,
  ctaText,
  ctaHref,
  overlay = true,
  height = 'medium',
  className = '',
}: HeroProps) {
  return (
    <section className={`relative w-full overflow-hidden ${heightClasses[height]} ${className}`}>
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-contain"
          priority
          sizes="100vw"
        />
        {/* Overlay */}
        {overlay && (
          <div className="absolute inset-0 bg-black/40" />
        )}
      </div>

      {/* Content */}
      {(title || subtitle || ctaText) && (
        <div className="relative z-10 flex h-full items-center justify-center">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            {title && (
              <h1 className="mb-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mb-8 text-lg text-white drop-shadow-md sm:text-xl md:text-2xl">
                {subtitle}
              </p>
            )}
            {ctaText && ctaHref && (
              <Link
                href={ctaHref}
                className="inline-block rounded-lg bg-blue-600 px-8 py-3 text-lg font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {ctaText}
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
