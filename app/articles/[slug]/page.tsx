import { getArticleBySlug, getArticles, urlFor, urlForArticle, urlForArticleCard } from '@/lib/sanity-queries';
import { Article } from '@/types/article';
import Link from 'next/link';
import Image from 'next/image';
import { PortableText } from '@/components/PortableText';
import { notFound } from 'next/navigation';

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((article) => ({
    slug: article.slug.current,
  }));
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const author = article.author && typeof article.author === 'object' && 'name' in article.author 
    ? article.author 
    : null;

  return (
    <div className="min-h-screen bg-mint">
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Back to Articles */}
        <Link
          href="/about"
          className="mb-8 inline-flex items-center text-dark-green hover:text-hunter-green transition-colors"
        >
          <svg
            className="mr-2 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Articles
        </Link>

        {/* Featured Image */}
        {article.image && (
          <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg bg-gray-50">
            <Image
              src={urlForArticle(article.image) || ''}
              alt={article.title}
              fill
              className="object-contain object-center"
              priority
              sizes="100vw"
            />
          </div>
        )}


        {/* Article Header */}
        <header className="mb-8">
          {article.topics && article.topics.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {article.topics.map((topic, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-dark-green px-3 py-1 text-xs font-medium text-white"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
          
          <h1 className="mb-4 text-2xl text-dark-green font-sailers md:text-4xl">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="mb-6 text-xl text-gray-700 italic">{article.excerpt}</p>
          )}

          {/* Author and Date */}
          <div className="flex items-center gap-4 text-gray-600">
            {author && (
              <Link
                href={`/authors/${author.slug.current}`}
                className="flex items-center gap-3 hover:text-dark-green transition-colors"
              >
                {author.image && (
                  <div className="relative h-12 w-12 overflow-hidden rounded-full">
                    <Image
                      src={urlFor(author.image) || ''}
                      alt={author.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <div className="font-medium">{author.name}</div>
                  {author.role && (
                    <div className="text-sm text-gray-500">{author.role}</div>
                  )}
                </div>
              </Link>
            )}
            {article.publishedDate && (
              <time dateTime={article.publishedDate} className="text-sm">
                {new Date(article.publishedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            )}
          </div>
        </header>


        <div data-rf-zone="paywall">
        {/* Article Body */}
        {article.body && (
          <div className="prose prose-lg max-w-none article-body">
            <PortableText content={article.body} />
          </div>
        )}
        </div>

        {/* Related Articles */}
        {article.relatedArticles && article.relatedArticles.length > 0 && (
          <section className="mt-12 border-t border-gray-200 pt-8">
            <h2 className="mb-6 text-2xl font-bold text-dark-green font-sailers">
              Related Articles
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {article.relatedArticles.map((relatedArticle) => {
                if (typeof relatedArticle === 'object' && 'slug' in relatedArticle) {
                  return (
                    <Link
                      key={relatedArticle._id}
                      href={`/articles/${relatedArticle.slug.current}`}
                      className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg"
                    >
                      {relatedArticle.image && (
                        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg bg-gray-50">
                          <Image
                            src={urlForArticleCard(relatedArticle.image) || ''}
                            alt={relatedArticle.title}
                            fill
                            className="object-contain object-center transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <h3 className="mb-2 text-xl font-semibold text-gray-900 group-hover:text-dark-green transition-colors">
                        {relatedArticle.title}
                      </h3>
                      {relatedArticle.excerpt && (
                        <p className="text-gray-600 line-clamp-2">{relatedArticle.excerpt}</p>
                      )}
                    </Link>
                  );
                }
                return null;
              })}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
