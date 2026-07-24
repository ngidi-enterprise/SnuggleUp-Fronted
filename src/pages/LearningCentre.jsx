import React, { useEffect, useState } from 'react';
import './LearningCentre.css';
import { buildArticleJsonLd, PAGE_SEO, SITE_URL, setPageSeo } from '../lib/seo';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.hostname.includes('snuggleup.co.za') ? 'https://api.snuggleup.co.za' : 'http://localhost:3000');
const displayDate = (value) => value ? new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

export default function LearningCentre({ slug, onBack }) {
  const [articles, setArticles] = useState([]); const [article, setArticle] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    fetch(`${API_BASE}/api/learning-centre/articles${slug ? `/${encodeURIComponent(slug)}` : ''}`)
      .then(async (response) => { if (!response.ok) throw new Error('not-found'); return response.json(); })
      .then((data) => { if (!active) return; if (slug) { setArticle(data.article); setPageSeo({ title: data.article.meta_title || data.article.title, description: data.article.meta_description || data.article.excerpt, url: `${SITE_URL}/learning-centre/${data.article.slug}`, type: 'article', jsonLd: [buildArticleJsonLd(data.article)] }); } else { setArticles(data.articles || []); setPageSeo(PAGE_SEO['learning-centre']); } })
      .catch(() => active && setError(slug ? 'This guide is not available right now.' : 'The Learning Centre is getting ready. Please check back soon.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug]);

  if (loading) return <main className="learning-centre-page"><p className="learning-status">Loading helpful guides...</p></main>;
  if (error) return <main className="learning-centre-page"><div className="learning-empty"><h1>SnuggleUp Learning Centre</h1><p>{error}</p><button onClick={onBack}>Back to shop</button></div></main>;
  if (article) return <main className="learning-centre-page"><article className="learning-article"><button className="learning-back" onClick={() => { window.location.hash = '/learning-centre'; }}>Back to Learning Centre</button><p className="learning-kicker">{article.category || 'Parenting guides'}</p><h1>{article.title}</h1><p className="learning-byline">By {article.author_name || 'SnuggleUp Baby Store'}{article.published_at ? ` | ${displayDate(article.published_at)}` : ''}</p><p className="learning-excerpt">{article.excerpt}</p><div className="learning-body" dangerouslySetInnerHTML={{ __html: article.body_html }} />{Array.isArray(article.product_links) && article.product_links.length > 0 && <aside className="learning-products"><h2>Explore helpful essentials</h2>{article.product_links.map((product) => <a key={`${product.source}-${product.id}`} href={product.url}>{product.name}</a>)}</aside>}</article></main>;
  return <main className="learning-centre-page"><section className="learning-hero"><p className="learning-kicker">SnuggleUp Learning Centre</p><h1>Gentle guidance for every little stage</h1><p>Practical, caring reads for South African parents, families, and caregivers.</p></section><section className="learning-grid">{articles.map((item) => <a className="learning-card" href={`#/learning-centre/${item.slug}`} key={item.id}><p>{item.category || 'Parenting guides'}</p><h2>{item.title}</h2><span>{item.excerpt}</span><strong>Read guide</strong></a>)}</section>{articles.length === 0 && <div className="learning-empty"><h2>Fresh guides are on their way</h2><p>We are preparing helpful reads for parents and caregivers.</p></div>}</main>;
}
