import Link from "next/link";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Hero } from "@/components/Hero";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mint font-sans">
      <main className="flex w-full flex-col items-center justify-center px-4 py-12 sm:px-8">
      <Hero
          imageSrc="/thisisademosite.svg"
          imageAlt="Warning - do not buy this coffee"
          height="small"
          overlay={false}
          maxImageWidth={1200}
          objectFit="contain"
        />
      <VideoPlayer
          src="/dejavu-video2.mp4"
          alt="Deja Vu Coffee Video"
          className="mb-8"
        />


        <div className="mb-8 flex flex-col items-center gap-6 text-center">
          <h1 className="max-w-xs text-4xl font-semibold leading-tight tracking-tight text-dark-green">
            Coffee Subscription Demo
          </h1>
          <p className="max-w-md text-lg leading-8 text-gray-700">
            Browse our subscription plans and start your coffee journey today.
            Built with Next.js, Sanity.io, and Recurly.
          </p>
        </div>
        

        
        <Link
          href="/subscriptions"
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
        >
          View Subscription Plans
        </Link>
      </main>
    </div>
  );
}
