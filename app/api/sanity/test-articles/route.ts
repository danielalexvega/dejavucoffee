import { NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';
import { getArticles } from '@/lib/sanity-queries';

/**
 * GET /api/sanity/test-articles
 * Test endpoint to debug article queries
 */
export async function GET() {
  try {
    // First, let's check what document types exist
    const allTypes = await sanityClient.fetch(`array::unique(*[]._type)`);
    console.log('Available document types:', allTypes);

    // Check if 'article' type exists
    const articleCount = await sanityClient.fetch(`count(*[_type == "article"])`);
    console.log('Total articles (all statuses):', articleCount);

    // Check published articles
    const publishedCount = await sanityClient.fetch(`count(*[_type == "article" && status == "published"])`);
    console.log('Published articles:', publishedCount);

    // Check all articles regardless of status
    const allArticles = await sanityClient.fetch(`*[_type == "article"] {
      _id,
      _type,
      title,
      status,
      slug,
      "hasAuthor": defined(author),
      "authorRef": author._ref
    }`);
    console.log('All articles (any status):', JSON.stringify(allArticles, null, 2));

    // Try the actual getArticles function
    const articles = await getArticles();
    console.log('getArticles() returned:', articles.length, 'articles');
    console.log('getArticles() data:', JSON.stringify(articles, null, 2));

    return NextResponse.json({
      success: true,
      debug: {
        availableTypes: allTypes,
        totalArticles: articleCount,
        publishedArticles: publishedCount,
        allArticlesRaw: allArticles,
        getArticlesResult: articles,
        getArticlesCount: articles.length,
      },
    });
  } catch (error: any) {
    console.error('Error testing articles:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || String(error),
        stack: error?.stack,
      },
      { status: 500 }
    );
  }
}
