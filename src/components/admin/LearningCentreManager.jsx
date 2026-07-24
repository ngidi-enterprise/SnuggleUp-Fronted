import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LearningCentreManager.css';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.hostname.includes('snuggleup.co.za') ? 'https://api.snuggleup.co.za' : 'http://localhost:3000');
const localDateTime = (value) => value ? new Date(value).toISOString().slice(0, 16) : '';

export default function LearningCentreManager() {
  const { token } = useAuth();
  const [data, setData] = useState({ settings: {}, topics: [], articles: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [editor, setEditor] = useState(null);
  const shouldScrollToEditor = useRef(false);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE}/api/learning-centre${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'Something went wrong');
    return json;
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try { setData(await request('/admin/overview')); }
    catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }, [request, token]);

  useEffect(() => { load(); }, [load]);
  const selectedArticle = useMemo(() => data.articles.find((item) => item.id === selectedId) || null, [data.articles, selectedId]);
  useEffect(() => { if (selectedArticle) setEditor({ title: selectedArticle.title, excerpt: selectedArticle.excerpt || '', bodyHtml: selectedArticle.body_html || '', metaTitle: selectedArticle.meta_title || '', metaDescription: selectedArticle.meta_description || '', scheduledFor: localDateTime(selectedArticle.scheduled_for) }); }, [selectedArticle]);
  useEffect(() => {
    if (editor && shouldScrollToEditor.current) {
      shouldScrollToEditor.current = false;
      document.getElementById('learning-review-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editor]);
  const action = async (fn, success = 'Saved.') => { setMessage(''); try { await fn(); await load(); setMessage(success); } catch (error) { setMessage(error.message); } };
  const openArticleForReview = (articleId) => {
    shouldScrollToEditor.current = true;
    setSelectedId(articleId);
  };
  const counts = { queued: data.topics.filter((item) => item.status === 'queued').length, drafts: data.articles.filter((item) => item.status === 'draft' || item.status === 'scheduled').length, published: data.articles.filter((item) => item.status === 'published').length };

  if (loading) return <div className="learning-admin"><p>Loading Learning Centre...</p></div>;
  return <div className="learning-admin">
    <div className="learning-admin-intro">
      <div><h2>Learning Centre</h2><p>Original, helpful guides for parents. You keep the final say on every published article.</p></div>
      <button onClick={() => action(() => request('/admin/topics/seed', { method: 'POST' }), 'Starter topics added to your queue.')}>Add starter topics</button>
    </div>
    {message && <p className="learning-admin-message">{message}</p>}
    <div className="learning-admin-stats"><div><b>{counts.queued}</b><span>Topics waiting</span></div><div><b>{counts.drafts}</b><span>Drafts and scheduled</span></div><div><b>{counts.published}</b><span>Published guides</span></div></div>

    <section className="learning-admin-card">
      <h3>Automation</h3>
      <div className="learning-settings">
        <label><input type="checkbox" checked={Boolean(data.settings.automation_enabled)} onChange={(e) => setData({ ...data, settings: { ...data.settings, automation_enabled: e.target.checked } })} /> Prepare a new guide automatically</label>
        <label>Every <input type="number" min="1" max="30" value={data.settings.interval_days || 5} onChange={(e) => setData({ ...data, settings: { ...data.settings, interval_days: e.target.value } })} /> days</label>
        <label><input type="checkbox" checked={Boolean(data.settings.low_risk_auto_publish)} onChange={(e) => setData({ ...data, settings: { ...data.settings, low_risk_auto_publish: e.target.checked } })} /> Publish low-risk guides after generation</label>
        <button onClick={() => action(() => request('/admin/settings', { method: 'POST', body: JSON.stringify({ automationEnabled: data.settings.automation_enabled, intervalDays: data.settings.interval_days, lowRiskAutoPublish: data.settings.low_risk_auto_publish }) }))}>Save automation</button>
        <button className="learning-secondary" onClick={() => action(() => request('/admin/automation/run', { method: 'POST' }), 'Automation run completed.')}>Run once now</button>
      </div>
      <p className="learning-note">Health, safety, sleep, feeding, car-seat and milestone topics always stay as drafts for your review.</p>
    </section>

    <section className="learning-admin-card">
      <h3>Add a topic</h3>
      <div className="learning-topic-form">
        <input value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} placeholder="e.g. How to pack a baby changing bag" />
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Google search question (optional)" />
        <button onClick={() => action(async () => { await request('/admin/topics', { method: 'POST', body: JSON.stringify({ title: topicTitle, searchQuestion: question }) }); setTopicTitle(''); setQuestion(''); }, 'Topic added to the queue.')}>Add topic</button>
      </div>
    </section>

    <section className="learning-admin-card">
      <h3>Topic queue</h3>
      {data.topics.length === 0 ? <p>No topics yet. Add the starter topics to begin.</p> : <div className="learning-list">{data.topics.map((item) => <div key={item.id}><span><b>{item.title}</b><small>{item.category}</small></span><em>{item.status}</em>{item.status === 'queued' && <button onClick={() => action(() => request(`/admin/topics/${item.id}/generate`, { method: 'POST' }), 'Draft generated. Open it below to review.')}>Generate draft</button>}</div>)}</div>}
    </section>

    <section className="learning-admin-card">
      <h3>Drafts, scheduled articles and published guides</h3>
      {data.articles.length === 0 ? <p>Drafts will appear here after you generate a topic.</p> : <div className="learning-list">{data.articles.map((item) => <div key={item.id} className={selectedId === item.id ? 'is-selected' : ''}><button className="learning-article-select" onClick={() => openArticleForReview(item.id)}><b>{item.title}</b><small>{item.review_required ? 'Human review required' : 'Ready for review'} | {item.status}</small></button><button className="learning-secondary" onClick={() => openArticleForReview(item.id)}>Review and edit</button>{item.status !== 'published' ? <button onClick={() => action(() => request(`/admin/articles/${item.id}/publish`, { method: 'POST' }), 'Article is now live.')}>Publish now</button> : <button className="learning-secondary" onClick={() => action(() => request(`/admin/articles/${item.id}/unpublish`, { method: 'POST' }), 'Article moved back to draft.')}>Move to draft</button>}</div>)}</div>}
    </section>

    {editor && selectedArticle && <section id="learning-review-editor" className="learning-admin-card learning-editor">
      <h3>Review article</h3>
      <label>Title<input value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} /></label>
      <label>Short introduction<input value={editor.excerpt} onChange={(e) => setEditor({ ...editor, excerpt: e.target.value })} /></label>
      <label>Search title<input value={editor.metaTitle} onChange={(e) => setEditor({ ...editor, metaTitle: e.target.value })} /></label>
      <label>Search description<input value={editor.metaDescription} onChange={(e) => setEditor({ ...editor, metaDescription: e.target.value })} /></label>
      <section className="learning-article-preview" aria-label="Article preview" style={{ background: '#f7fbfa', border: '1px solid #dbe8e4', borderRadius: '8px', color: '#24313d', lineHeight: 1.65, padding: '26px 30px' }}>
        <p className="learning-preview-label" style={{ color: '#126f71', fontSize: '.8rem', fontWeight: 700, letterSpacing: '.04em', margin: '0 0 8px', textTransform: 'uppercase' }}>Article preview</p>
        <h1 style={{ color: '#126f71', fontSize: '1.85rem', lineHeight: 1.25, margin: '0 0 12px' }}>{editor.title}</h1>
        {editor.excerpt && <p className="learning-preview-excerpt" style={{ borderLeft: '3px solid #ff6b9d', color: '#52636a', fontSize: '1.05rem', margin: '0 0 22px', paddingLeft: '14px' }}>{editor.excerpt}</p>}
        <div className="learning-preview-body" style={{ fontSize: '1rem' }} dangerouslySetInnerHTML={{ __html: editor.bodyHtml }} />
      </section>
      <label>Article content (advanced HTML editing)<textarea rows="15" value={editor.bodyHtml} onChange={(e) => setEditor({ ...editor, bodyHtml: e.target.value })} /></label>
      <div className="learning-editor-actions">
        <button onClick={() => action(() => request(`/admin/articles/${selectedArticle.id}`, { method: 'PUT', body: JSON.stringify(editor) }), 'Article changes saved.')}>Save changes</button>
        <label>Schedule for<input type="datetime-local" value={editor.scheduledFor} onChange={(e) => setEditor({ ...editor, scheduledFor: e.target.value })} /></label>
        <button className="learning-secondary" onClick={() => action(() => request(`/admin/articles/${selectedArticle.id}/schedule`, { method: 'POST', body: JSON.stringify({ scheduledFor: editor.scheduledFor }) }), 'Article scheduled.')}>Schedule</button>
        {selectedArticle.status === 'published' && <a href={`#/learning-centre/${selectedArticle.slug}`} target="_blank" rel="noreferrer">View live guide</a>}
      </div>
    </section>}
  </div>;
}
