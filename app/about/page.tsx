import { getArticles, urlFor, urlForArticleCard } from '@/lib/sanity-queries';
import { Article } from '@/types/article';
import Link from 'next/link';
import Image from 'next/image';
import { Hero } from '@/components/Hero';

export default async function ArticlesPage() {
  let articles: Article[] = [];
  let error: string | null = null;

  try {
    articles = await getArticles();
    console.log('Articles fetched:', JSON.stringify(articles, null, 2));
    console.log('Number of articles:', articles.length);
  } catch (err: any) {
    console.error('Error loading articles:', err);
    error = err?.message || 'Failed to load articles';
  }

  return (
    <div className="min-h-screen bg-mint">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl text-dark-green font-sailers">Articles</h1>
          <p className="text-lg text-gray-700">
            Explore our latest articles and insights, our thoughts and musings on everything from coffee to culture.
          </p>
        </div>

        {error && (
          <div className="mb-8 rounded-lg bg-red-50 p-4 text-red-800">
            <p>Error: {error}</p>
          </div>
        )}

        {articles.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-600">No articles found.</p>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article._id}
              href={`/articles/${article.slug.current}`}
              className="group flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg"
            >
              {article.image && (
                <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-gray-50">
                  <Image
                    src={urlForArticleCard(article.image) || ''}
                    alt={article.title}
                    fill
                    className="object-contain object-center transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col p-6">
                {article.topics && article.topics.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {article.topics.slice(0, 3).map((topic, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-mint px-3 py-1 text-xs font-medium text-dark-green"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
                <h2 className="mb-3 text-xl font-semibold text-gray-900 group-hover:text-dark-green transition-colors line-clamp-2">
                  {article.title}
                </h2>
                {article.excerpt && (
                  <p className="mb-4 flex-1 text-gray-600 line-clamp-3">{article.excerpt}</p>
                )}
                <div className="mt-auto flex items-center justify-between text-sm text-gray-500">
                  {article.author && typeof article.author === 'object' && 'name' in article.author && (
                    <span>{article.author.name}</span>
                  )}
                  {article.publishedDate && (
                    <time dateTime={article.publishedDate}>
                      {new Date(article.publishedDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
