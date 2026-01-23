export default function AboutPage() {
  return (
    <div className="min-h-screen bg-mint py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg p-8">
          <h1 className="mb-6 text-4xl font-bold text-dark-green">About Deja Vu Coffee Club</h1>
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700">
              This is a demo page for Recurly made with Next.js, Sanity.io, and Recurly.js. 
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
