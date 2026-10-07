import type { SiteContent, SiteSettings } from '../types';

export const CONTENT_ID = '1b7242b4-4da0-4c5c-a1ba-7de84e1e0101';
export const SETTINGS_ID = '1b7242b4-4da0-4c5c-a1ba-7de84e1e0102';
export const GUARD_ID = '1b7242b4-4da0-4c5c-a1ba-7de84e1e0103';

export const defaultContent: SiteContent = {
  heroHeading: 'Woven by\nTradition.\nStyled for Today.',
  heroSubtitle: 'Discover Mandakini’s contemporary heritage and handcrafted elegance.',
  heroImage: null,
  heroCtaLabel: 'Explore the collection',
  heroCtaHref: '/shop',
  announcement: '',
  categoriesHeading: 'Explore our collections',
  productsHeading: 'Selected for you',
  featuredCategories: [],
  featuredProducts: [],
  aboutHeading: 'The Mandakini story',
  aboutText: '',
  artisans: [],
  banners: [],
  gallery: [],
  version: 1
};

export const defaultSettings: SiteSettings = {
  businessName: 'MANDAKINI',
  tagline: 'THREADS OF HERITAGE',
  logo: null,
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  instagram: '',
  facebook: '',
  businessHours: '',
  footerText: '',
  currency: 'INR',
  seoTitle: 'Mandakini',
  seoDescription: '',
  version: 1
};
