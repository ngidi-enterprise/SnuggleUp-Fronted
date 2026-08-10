import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStorefrontAnalyticsIdentity } from '../../lib/analytics';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const { token } = useAuth();

  const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    
    console.log('Analytics Debug:', {
      token: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
      apiBase: API_BASE,
      hasToken: !!token
    });
    
    if (!token) {
      setError('No authentication token available. Please log in again.');
      setLoading(false);
      return;
    }
    
    try {
      // Reclassify this browser's existing anonymous events before querying the
      // customer report. This prevents an immediate login/dashboard navigation
      // from briefly showing the superuser's session under customer journeys.
      const classificationRes = await fetch(`${API_BASE}/api/analytics/session-role`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(getStorefrontAnalyticsIdentity()),
      });
      if (!classificationRes.ok) {
        throw new Error(`Unable to classify the current analytics session: ${classificationRes.status}`);
      }

      const [res, trafficRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/analytics`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE}/api/admin/traffic-insights`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      console.log('Analytics response:', res.status, res.statusText);

      if (!res.ok) {
        const errorText = await res.text();
        console.log('Analytics error response:', errorText);
        throw new Error(`Failed to fetch analytics: ${res.status}`);
      }

      const data = await res.json();
      setAnalytics(data);
      if (trafficRes.ok) {
        setTraffic(await trafficRes.json());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading analytics...</div>;
  }

  if (error) {
    return <div className="admin-error">Error: {error}</div>;
  }

  if (!analytics) {
    return <div className="admin-error">No analytics data available</div>;
  }

  const { summary, dailyOrders, topProducts } = analytics;
  const trafficSummary = traffic?.summary || {};
  const funnel = traffic?.funnel || [];
  const funnelStart = Number(funnel[0]?.value || 0);
  const formatNumber = (value) => Number(value || 0).toLocaleString('en-ZA');
  const formatDuration = (seconds) => {
    const value = Number(seconds || 0);
    return value >= 60 ? `${Math.floor(value / 60)}m ${value % 60}s` : `${value}s`;
  };
  const parseAnalyticsDate = (value) => {
    if (!value) return null;
    const text = String(value);
    // PostgreSQL JSON values from legacy deployments may contain a timestamp
    // without an offset. Analytics timestamps are stored in UTC, so make that
    // explicit before converting everything to South African local time.
    const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(text)
      ? `${text}Z`
      : text;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const formatVisitTime = (value) => {
    const date = parseAnalyticsDate(value);
    if (!date) return '-';
    return date.toLocaleString('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  const formatActionTime = (value) => {
    const date = parseAnalyticsDate(value);
    if (!date) return '-';
    return date.toLocaleTimeString('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  const formatRegion = (item) => {
    if (item.country_code) {
      try {
        return new Intl.DisplayNames(['en'], { type: 'region' }).of(item.country_code) || item.country_code;
      } catch {
        return item.country_code;
      }
    }
    return item.timezone_name || 'Unknown region';
  };
  const formatJourneyStep = (step) => {
    const page = step.pageTitle || step.pagePath || 'store page';
    switch (step.eventName) {
      case 'page_view': return `Visited ${page}`;
      case 'category_view': return `Browsed ${page}`;
      case 'product_view': return `Viewed ${step.productName || 'a product'}`;
      case 'image_view': return `Viewed image ${step.eventValue || ''} of ${step.productName || 'a product'}`.trim();
      case 'section_open': return `Opened ${page}`;
      case 'add_to_cart': return `Added ${step.productName || 'a product'} to cart`;
      case 'remove_from_cart': return `Removed ${step.productName || 'a product'} from cart`;
      case 'begin_checkout': return 'Started checkout';
      case 'checkout_step': return `Continued checkout${step.eventValue ? ` (step ${step.eventValue})` : ''}`;
      case 'payment_started': return 'Opened PayFast';
      case 'purchase': return 'Completed a purchase';
      case 'scroll_depth': return `Scrolled ${step.eventValue || 0}% down ${page}`;
      case 'page_exit': return `Exited from ${page}`;
      default: return step.eventName;
    }
  };
  const formatStaffLabel = (value) => value === 'superuser' ? 'Superuser' : 'Other admins';

  return (
    <div className="analytics-container">
      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="analytics-card">
          <div className="analytics-card-icon">💰</div>
          <div className="analytics-card-content">
            <h3>Total Revenue</h3>
            <p className="analytics-card-value">
              R {Number(summary.total_revenue || 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">📦</div>
          <div className="analytics-card-content">
            <h3>Total Orders</h3>
            <p className="analytics-card-value">{summary.total_orders || 0}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">✅</div>
          <div className="analytics-card-content">
            <h3>Completed</h3>
            <p className="analytics-card-value">{summary.completed_orders || 0}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">⏳</div>
          <div className="analytics-card-content">
            <h3>Pending</h3>
            <p className="analytics-card-value">{summary.pending_orders || 0}</p>
          </div>
        </div>
      </div>

      <div className="analytics-section" style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Store traffic and interest</h2>
          <span style={{ color: '#637381', fontSize: '0.9rem' }}>{traffic?.period || 'Last 30 days'}</span>
        </div>
        {!traffic ? (
          <p style={{ color: '#637381' }}>Traffic tracking is ready. The first visitor data will appear here shortly.</p>
        ) : (
          <>
            <div className="analytics-summary" style={{ marginTop: '16px' }}>
              <div className="analytics-card"><div className="analytics-card-content"><h3>Visitors</h3><p className="analytics-card-value">{formatNumber(trafficSummary.visitors)}</p></div></div>
              <div className="analytics-card"><div className="analytics-card-content"><h3>Sessions</h3><p className="analytics-card-value">{formatNumber(trafficSummary.sessions)}</p></div></div>
              <div className="analytics-card"><div className="analytics-card-content"><h3>Page views</h3><p className="analytics-card-value">{formatNumber(trafficSummary.page_views)}</p></div></div>
              <div className="analytics-card"><div className="analytics-card-content"><h3>Product views</h3><p className="analytics-card-value">{formatNumber(trafficSummary.product_views)}</p></div></div>
              <div className="analytics-card"><div className="analytics-card-content"><h3>Average visit time</h3><p className="analytics-card-value">{formatDuration(trafficSummary.average_seconds)}</p></div></div>
            </div>

            <div className="traffic-funnel" aria-label="Customer journey funnel">
              <div className="traffic-funnel-heading">
                <div>
                  <h3>Customer journey funnel</h3>
                  <p>See exactly where visitors continue and where they leave.</p>
                </div>
                <span>Unique sessions</span>
              </div>
              {funnel.length ? (
                <div className="traffic-funnel-steps">
                  {funnel.map((stage, index) => {
                    const relativeWidth = funnelStart > 0
                      ? Math.max(42, Math.round((Number(stage.value || 0) / funnelStart) * 100))
                      : Math.max(42, 100 - (index * 10));
                    return (
                      <div className="traffic-funnel-stage" key={stage.key}>
                        {index > 0 && (
                          <div className="traffic-funnel-drop">
                            <span aria-hidden="true">↓</span>
                            {stage.lostPercent}% left before this step
                          </div>
                        )}
                        <div className={`traffic-funnel-bar ${stage.verified ? 'verified' : ''}`} style={{ width: `${relativeWidth}%` }}>
                          <span>{stage.label}</span>
                          <strong>{formatNumber(stage.value)}</strong>
                          {index > 0 && <small>{stage.retainedPercent}% continued</small>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p>No funnel activity recorded yet.</p>
              )}
              <p className="traffic-funnel-note">Purchased orders are counted only after PayFast confirms payment. Funnel history begins when this analytics feature is deployed.</p>
            </div>

            <div className="analytics-table" style={{ marginTop: '24px' }}>
              <h3>Staff activity (separate)</h3>
              <p className="analytics-table-note">These sessions are excluded from all customer totals, funnels, product views, and visitor reports above.</p>
              {traffic.staffActivity?.length ? (
                <table><thead><tr><th>Account type</th><th>Sessions</th><th>Page views</th><th>Latest activity</th></tr></thead><tbody>
                  {traffic.staffActivity.map((item) => (
                    <tr key={item.audience_type}>
                      <td>{formatStaffLabel(item.audience_type)}</td>
                      <td>{formatNumber(item.sessions)}</td>
                      <td>{formatNumber(item.page_views)}</td>
                      <td>{formatVisitTime(item.latest_activity)}</td>
                    </tr>
                  ))}
                </tbody></table>
              ) : <p>No staff activity has been classified yet.</p>}
            </div>

            <div className="analytics-table" style={{ marginTop: '24px' }}>
              <h3>Where visitors come from</h3>
              {traffic.sources?.length ? (
                <table><thead><tr><th>Source</th><th>Medium</th><th>Sessions</th></tr></thead><tbody>
                  {traffic.sources.map((item, index) => <tr key={`${item.source}-${index}`}><td>{item.source}</td><td>{item.medium}</td><td>{formatNumber(item.sessions)}</td></tr>)}
                </tbody></table>
              ) : <p>No traffic sources recorded yet.</p>}
            </div>

            <div className="analytics-table" style={{ marginTop: '24px' }}>
              <h3>Visitor regions</h3>
              <p className="analytics-table-note">Approximate location based on country routing information or browser time zone. Precise location and IP addresses are not stored.</p>
              {traffic.regions?.length ? (
                <table><thead><tr><th>Country or region</th><th>Visitor time zone</th><th>Sessions</th><th>Most recent visit (SA time)</th></tr></thead><tbody>
                  {traffic.regions.map((item, index) => (
                    <tr key={`${item.country_code || item.timezone_name}-${index}`}>
                      <td>{formatRegion(item)}</td>
                      <td>{item.timezone_name || '-'}</td>
                      <td>{formatNumber(item.sessions)}</td>
                      <td>{formatVisitTime(item.latest_visit)}</td>
                    </tr>
                  ))}
                </tbody></table>
              ) : <p>No visitor-region information recorded yet.</p>}
            </div>

            <div className="visitor-feedback-report">
              <div className="visitor-feedback-heading">
                <div>
                  <h3>What visitors need before ordering</h3>
                  <p>Anonymous, optional responses from engaged shoppers during the last 30 days.</p>
                </div>
              </div>
              {traffic.surveyFeedback?.length ? (
                <div className="visitor-feedback-questions">
                  {traffic.surveyFeedback.map((group) => (
                    <section className="visitor-feedback-question" key={group.key}>
                      <div className="visitor-feedback-question-title">
                        <strong>{group.question}</strong>
                        <span>{formatNumber(group.total)} responses</span>
                      </div>
                      <div className="visitor-feedback-answers">
                        {group.answers.map((answer) => (
                          <div className="visitor-feedback-answer" key={answer.answer}>
                            <div>
                              <span>{answer.answer}</span>
                              <strong>{answer.percent}%</strong>
                            </div>
                            <div className="visitor-feedback-meter" aria-hidden="true">
                              <span style={{ width: `${answer.percent}%` }} />
                            </div>
                            <small>{formatNumber(answer.responses)} visitors</small>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="visitor-feedback-empty">Responses will appear here after engaged shoppers answer the two-question prompt.</p>
              )}
            </div>

            <div className="customer-journeys">
              <div className="customer-journeys-heading">
                <div>
                  <h3>Recent anonymous customer journeys</h3>
                  <p>Pages, product activity, shopping steps, and scroll milestones. No typing, form contents, or video is recorded.</p>
                </div>
                <span>Last 7 days</span>
              </div>
              {traffic.journeys?.length ? traffic.journeys.map((journey) => {
                const steps = Array.isArray(journey.steps) ? journey.steps : [];
                const source = journey.source || journey.referrer_host || 'Direct';
                const products = Array.isArray(journey.products_viewed) ? journey.products_viewed : [];
                const location = [
                  journey.city_name,
                  journey.region_name,
                  formatRegion(journey),
                ].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(', ');
                const yesNo = (value) => value ? 'Yes' : 'No';
                return (
                  <article className="visitor-card" key={journey.journey_id || journey.session_id}>
                    <header className="visitor-card-header">
                      <div>
                        <span className="visitor-card-eyebrow">Visitor ID</span>
                        <strong>{String(journey.visitor_id || '').slice(-10).toUpperCase()}</strong>
                      </div>
                      <div className="visitor-card-badges">
                        <span className={`visitor-type-badge ${journey.is_returning ? 'returning' : ''}`}>
                          {journey.is_returning ? 'Returning visitor' : 'New visitor'}
                        </span>
                        {Number(journey.session_count) > 1 && (
                          <span className="visitor-tabs-badge">{formatNumber(journey.session_count)} tabs combined</span>
                        )}
                      </div>
                      <time>{formatVisitTime(journey.started_at)}</time>
                    </header>

                    <dl className="visitor-card-grid">
                      <div><dt>Traffic source</dt><dd>{source}</dd></div>
                      {journey.google_search_term && <div><dt>Google search term</dt><dd>{journey.google_search_term}</dd></div>}
                      <div><dt>Campaign / ad group</dt><dd>{[journey.campaign, journey.ad_group].filter(Boolean).join(' / ') || '—'}</dd></div>
                      <div><dt>Device / browser</dt><dd>{[journey.device_type, journey.browser_name, journey.os_name].filter(Boolean).join(' · ') || 'Unknown'}</dd></div>
                      <div><dt>City or region</dt><dd>{location || 'Unknown region'}</dd></div>
                      <div><dt>Visit duration</dt><dd>{formatDuration(journey.session_duration_seconds)}</dd></div>
                      <div><dt>Pages viewed</dt><dd>{formatNumber(journey.pages_viewed)}</dd></div>
                      <div><dt>Products viewed</dt><dd>{products.length ? products.join(', ') : formatNumber(journey.products_viewed_count)}</dd></div>
                      <div><dt>Maximum scroll</dt><dd>{formatNumber(journey.scroll_depth)}%</dd></div>
                      <div><dt>Images viewed</dt><dd>{formatNumber(journey.images_viewed)}</dd></div>
                      <div><dt>Delivery / returns opened</dt><dd>{yesNo(journey.delivery_opened)} / {yesNo(journey.returns_opened)}</dd></div>
                      <div><dt>Added to cart</dt><dd>{yesNo(journey.added_to_cart)}</dd></div>
                      <div><dt>Checkout started</dt><dd>{yesNo(journey.checkout_started)}</dd></div>
                      <div><dt>Purchase completed</dt><dd>{yesNo(journey.purchased)}</dd></div>
                      <div><dt>Exit page</dt><dd>{journey.exit_page || 'Not recorded yet'}</dd></div>
                    </dl>

                    <div className="visitor-timeline-heading">
                      <strong>Action timeline</strong>
                      <span>
                        {formatNumber(steps.length)} actions
                        {Number(journey.session_count) > 1 ? ` across ${formatNumber(journey.session_count)} tabs` : ''}
                      </span>
                    </div>
                    <ol className="visitor-timeline">
                      {steps.map((step, index) => (
                        <li key={`${step.eventName}-${step.pagePath}-${step.productName}-${step.eventValue}-${step.occurredAt}-${index}`}>
                          <time>{formatActionTime(step.occurredAt)}</time>
                          <span>{formatJourneyStep(step)}</span>
                        </li>
                      ))}
                    </ol>
                  </article>
                );
              }) : <p>No customer journeys recorded yet.</p>}
            </div>

            <div className="analytics-table" style={{ marginTop: '24px' }}>
              <h3>Most visited pages</h3>
              {traffic.pages?.length ? (
                <table><thead><tr><th>Page</th><th>Views</th></tr></thead><tbody>
                  {traffic.pages.map((item, index) => <tr key={`${item.page_path}-${index}`}><td>{item.page_title || item.page_path}</td><td>{formatNumber(item.views)}</td></tr>)}
                </tbody></table>
              ) : <p>No page views recorded yet.</p>}
            </div>

            <div className="analytics-table" style={{ marginTop: '24px' }}>
              <h3>Most viewed products</h3>
              {traffic.products?.length ? (
                <table><thead><tr><th>Product</th><th>Views</th><th>Clicks</th><th>Added to cart</th></tr></thead><tbody>
                  {traffic.products.map((item) => <tr key={item.product_id}><td>{item.product_name || item.product_id}</td><td>{formatNumber(item.views)}</td><td>{formatNumber(item.clicks)}</td><td>{formatNumber(item.add_to_cart)}</td></tr>)}
                </tbody></table>
              ) : <p>No product interest recorded yet.</p>}
            </div>

            <div className="analytics-table" style={{ marginTop: '24px' }}>
              <h3>Most active visiting times</h3>
              {traffic.popularHours?.length ? <p>{traffic.popularHours.map((item) => `${String(item.hour).padStart(2, '0')}:00 (${formatNumber(item.sessions)} sessions)`).join('   |   ')}</p> : <p>No session data recorded yet.</p>}
            </div>
          </>
        )}
      </div>

      {/* Daily Orders Chart */}
      <div className="analytics-section">
        <h2>📈 Sales Last 30 Days</h2>
        <div className="analytics-chart">
          {dailyOrders && dailyOrders.length > 0 ? (
            <div className="bar-chart">
              {dailyOrders.slice(0, 10).reverse().map((day) => {
                const maxRevenue = Math.max(...dailyOrders.map((d) => Number(d.revenue || 0)));
                const height = maxRevenue > 0 ? (Number(day.revenue || 0) / maxRevenue) * 200 : 10;
                
                return (
                  <div key={day.date} className="bar-chart-item">
                    <div className="bar-chart-label">
                      {new Date(day.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="bar-chart-bar-container">
                      <div
                        className="bar-chart-bar"
                        style={{ height: `${height}px` }}
                        title={`R ${Number(day.revenue || 0).toFixed(2)}`}
                      >
                        <span className="bar-chart-value">R {Number(day.revenue || 0).toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No sales data available</p>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="analytics-section">
        <h2>🏆 Top Selling Products</h2>
        <div className="analytics-table">
          {topProducts && topProducts.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Times Ordered</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={index}>
                    <td>{product.product_name || 'Unknown Product'}</td>
                    <td>{product.times_ordered}</td>
                    <td>R {Number(product.total_revenue || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No product data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
