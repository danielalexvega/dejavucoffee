import { SanityImage } from './subscription';

export interface Author {
  _id: string;
  _type: 'author';
  name: string;
  image?: SanityImage;
  email?: string;
  bio?: any[]; // Portable text
  slug: {
    current: string;
  };
  role?: string;
  title?: string;
  website?: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
}

export interface Article {
  _id: string;
  _type: 'article';
  title: string;
  body?: any[]; // Portable text
  author?: {
    _ref: string;
    _type: 'reference';
  } | Author;
  topics?: string[];
  image?: SanityImage;
  slug: {
    current: string;
  };
  publishedDate?: string;
  excerpt?: string;
  status?: 'draft' | 'published' | 'archived';
  featured?: boolean;
  relatedArticles?: Array<{
    _ref: string;
    _type: 'reference';
  } | Article>;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: SanityImage;
  };
}
