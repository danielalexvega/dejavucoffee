import { Hero } from "@/components/Hero";


export default function AboutPage() {
  return (
    <div className="min-h-screen bg-mint py-12">
        <Hero
          imageSrc="/aboutus-imagine.svg"
          imageAlt="About Hero Image"
          height="small"
          overlay={false}
          objectFit="contain"
        />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg p-8">
          <h1 className="mb-6 text-4xl text-dark-green font-sailers text-center">with Recurly</h1>
          <h2 className="mb-6 text-2xl text-dark-green font-sailers text-center">Earnings you can set your watch to</h2>
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 text-lg">
              This is a demo page made by Daniel Vega, a Sales Engineer at Recurly. I used Next.js, Recurly.js and Recurly Engage, Sanity.io, Tailwind CSS. 
            </p>
            <p className="mt-4 text-gray-700">
              This page is a placeholder. You can update it with your company's story,
              mission, and values.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
