export const SITE_URL = 'https://snuggleup.co.za';
export const SITE_NAME = 'SnuggleUp';
export const DEFAULT_IMAGE = `${SITE_URL}/images/snuggleup-logo-brand.png`;

const DEFAULT_DESCRIPTION =
  'Shop baby products, nursery essentials, feeding, travel, toys, bedding, and local warehouse baby items from SnuggleUp in South Africa.';

export const DEFAULT_SEO = {
  title: 'SnuggleUp | Baby Products & Essentials in South Africa',
  description: DEFAULT_DESCRIPTION,
  url: SITE_URL,
  image: DEFAULT_IMAGE,
  type: 'website',
};

export const PAGE_SEO = {
  home: DEFAULT_SEO,
  'learning-centre': {
    title: 'Learning Centre | SnuggleUp Baby Store',
    description: 'Helpful, practical guides for South African parents, families, and caregivers from SnuggleUp.',
    url: `${SITE_URL}/learning-centre`,
  },
  shipping: {
    title: 'Shipping Policy | SnuggleUp South Africa',
    description: 'Read SnuggleUp shipping options, delivery timelines, and local warehouse delivery information for South African customers.',
    url: `${SITE_URL}/shipping`,
  },
  returns: {
    title: 'Returns & Refund Policy | SnuggleUp',
    description: 'Learn how returns, refunds, cancellations, damaged items, and failed deliveries are handled at SnuggleUp.',
    url: `${SITE_URL}/returns`,
  },
  privacy: {
    title: 'Privacy Policy | SnuggleUp',
    description: 'Read how SnuggleUp handles customer account, checkout, order, and support information.',
    url: `${SITE_URL}/privacy`,
  },
  terms: {
    title: 'Terms of Service | SnuggleUp',
    description: 'Read the terms and conditions for shopping with SnuggleUp.',
    url: `${SITE_URL}/terms`,
  },
  'data-deletion': {
    title: 'Data Deletion Request | SnuggleUp',
    description: 'Request deletion of your SnuggleUp account and personal information.',
    url: `${SITE_URL}/data-deletion`,
  },
  wishlist: {
    title: 'Wishlist | SnuggleUp',
    description: 'View your saved baby products and essentials at SnuggleUp.',
    url: `${SITE_URL}/`,
  },
};

export function stripHtml(input = '') {
  if (!input) return '';
  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = String(input);
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
  }
  return String(input).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function truncate(input = '', maxLength = 155) {
  const clean = String(input || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

export function slugify(input = '') {
  return String(input || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function absoluteUrl(url) {
  if (!url) return DEFAULT_IMAGE;
  const value = String(url).trim();
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('http://')) return value.replace(/^http:/, 'https:');
  if (value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `${SITE_URL}${value}`;
  return `${SITE_URL}/${value}`;
}

export function getCuratedProductUrl(product) {
  const id = product?.id;
  const slug = slugify(product?.seo_title || product?.product_name || product?.name || 'baby-product');
  return id ? `${SITE_URL}/products/${id}/${slug}` : SITE_URL;
}

export function getLocalProductUrl(product) {
  const id = product?.id;
  const slug = slugify(product?.name || product?.product_name || 'local-baby-product');
  return id ? `${SITE_URL}/local-products/${id}/${slug}` : SITE_URL;
}

function upsertMeta(selector, attributes) {
  if (typeof document === 'undefined') return;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    document.head.appendChild(tag);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    tag.setAttribute(key, value);
  });
}

function upsertLink(rel, href) {
  if (typeof document === 'undefined') return;
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

function setJsonLd(items = []) {
  if (typeof document === 'undefined') return;
  document.head.querySelectorAll('script[data-seo-json-ld="true"]').forEach((tag) => tag.remove());
  items.filter(Boolean).forEach((item, index) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoJsonLd = 'true';
    script.id = `seo-json-ld-${index}`;
    script.textContent = JSON.stringify(item);
    document.head.appendChild(script);
  });
}

export function buildStoreJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: SITE_NAME,
    url: SITE_URL,
    logo: DEFAULT_IMAGE,
    image: DEFAULT_IMAGE,
    description: DEFAULT_DESCRIPTION,
    email: 'support@snuggleup.co.za',
    areaServed: {
      '@type': 'Country',
      name: 'South Africa',
    },
    sameAs: [
      'https://www.facebook.com/',
      'https://www.instagram.com/',
    ],
  };
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildProductJsonLd({
  product,
  name,
  description,
  image,
  url,
  price,
  sku,
  availability,
  category,
}) {
  const numericPrice = Number(price || 0);
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: [absoluteUrl(image)],
    url,
    sku: sku ? String(sku) : String(product?.id || ''),
    category: category || product?.category || 'Baby products',
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'ZAR',
      price: numericPrice.toFixed(2),
      availability: availability || 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
  };

  if (!json.description) delete json.description;
  if (!numericPrice) delete json.offers.price;
  return json;
}

export function buildArticleJsonLd(article = {}) {
  const url = `${SITE_URL}/learning-centre/${article.slug || ''}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title || 'SnuggleUp Learning Centre',
    description: article.meta_description || article.excerpt || DEFAULT_DESCRIPTION,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: article.published_at || article.created_at || new Date().toISOString(),
    dateModified: article.updated_at || article.published_at || new Date().toISOString(),
    author: { '@type': 'Organization', name: article.author_name || SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: DEFAULT_IMAGE } },
  };
}

export function setPageSeo(options = {}) {
  if (typeof document === 'undefined') return;
  const seo = { ...DEFAULT_SEO, ...options };
  const title = seo.title || DEFAULT_SEO.title;
  const description = truncate(seo.description || DEFAULT_SEO.description);
  const url = seo.url || SITE_URL;
  const image = absoluteUrl(seo.image || DEFAULT_IMAGE);
  const type = seo.type || 'website';

  document.title = title;
  upsertLink('canonical', url);
  upsertMeta('meta[name="description"]', { name: 'description', content: description });
  upsertMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow, max-image-preview:large' });
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
  setJsonLd(seo.jsonLd || [buildStoreJsonLd(), buildWebSiteJsonLd()]);
}
