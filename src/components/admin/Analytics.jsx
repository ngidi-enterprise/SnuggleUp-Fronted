import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStorefrontAnalyticsIdentity } from '../../lib/analytics';

const currentSouthAfricanMonth = () => {
  const parts = new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year}-${month}`;
};

const csvCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [reportMonth, setReportMonth] = useState(currentSouthAfricanMonth);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
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
      case 'remove_from_cart':
      case 'cart_item_removed': return `Removed ${step.productName || 'a product'} from cart`;
      case 'cart_opened': return 'Opened the shopping cart';
      case 'quantity_changed': return `Changed ${step.productName || 'a product'} quantity${step.eventValue ? ` to ${step.eventValue}` : ''}`;
      case 'begin_checkout': return 'Started checkout';
      case 'checkout_clicked': return 'Clicked checkout';
      case 'checkout_loaded': return 'Checkout form loaded';
      case 'checkout_step': return `Continued checkout${step.eventValue ? ` (step ${step.eventValue})` : ''}`;
      case 'delivery_location_entered': return 'Entered a delivery location';
      case 'delivery_quote_shown': return 'Received delivery quotes';
      case 'delivery_option_selected': return `Selected ${step.deliveryOption || 'a delivery option'}`;
      case 'customer_details_started': return 'Started entering customer details';
      case 'customer_details_completed': return 'Completed customer details';
      case 'payment_clicked': return 'Clicked the payment button';
      case 'payment_started': return 'Opened PayFast';
      case 'payfast_redirected': return 'Redirected to PayFast';
      case 'payment_success': return 'Payment confirmed';
      case 'payment_failed': return `Payment failed${step.failureReason ? `: ${step.failureReason}` : ''}`;
      case 'purchase': return 'Completed a purchase';
      case 'purchase_complete': return 'Purchase completed';
      case 'scroll_depth': return `Scrolled ${step.eventValue || 0}% down ${page}`;
      case 'page_exit': return `Exited from ${page}`;
      default: return step.eventName;
    }
  };
  const checkoutEvents = new Set([
    'add_to_cart', 'cart_opened', 'cart_item_removed', 'remove_from_cart',
    'quantity_changed', 'checkout_clicked', 'begin_checkout', 'checkout_loaded',
    'delivery_location_entered', 'delivery_quote_shown', 'delivery_option_selected',
    'customer_details_started', 'customer_details_completed', 'payment_clicked',
    'payfast_redirected', 'payment_started', 'payment_success', 'payment_failed',
    'purchase_complete', 'purchase',
  ]);
  const formatMoney = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? `R${amount.toFixed(2)}` : null;
  };
  const journeyStepDetails = (step) => {
    const parts = [];
    const items = Array.isArray(step.cartItems) ? step.cartItems : [];
    if (items.length) {
      parts.push(items.map((item) => `${item.quantity || 1} x ${item.productName || 'Product'}`).join(' | '));
    }
    if (formatMoney(step.cartValue)) parts.push(`Cart ${formatMoney(step.cartValue)}`);
    if (formatMoney(step.deliveryCost)) parts.push(`Delivery ${formatMoney(step.deliveryCost)}`);
    if (step.deliveryOption) parts.push(step.deliveryOption);
    if (step.orderReference) parts.push(`Order ${step.orderReference}`);
    return parts;
  };
  const formatStaffLabel = (value) => value === 'superuser' ? 'Superuser' : 'Other admins';

  const loadMonthlyReport = async () => {
    setReportLoading(true);
    setReportError('');
    try {
      const response = await fetch(`${API_BASE}/api/admin/traffic-insights/export?month=${encodeURIComponent(reportMonth)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to analyse this month');
      setMonthlyReport(data);
    } catch (reportFailure) {
      setReportError(reportFailure.message);
      setMonthlyReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  const downloadMonthlyCsv = () => {
    if (!monthlyReport) return;
    const summary = monthlyReport.summary || {};
    const bots = monthlyReport.botSummary || {};
    const rows = [
      ['SnuggleUp customer analytics report', monthlyReport.period?.label || reportMonth],
      ['Normal visitors', summary.visitors || 0],
      ['Normal sessions', summary.sessions || 0],
      ['Detected bot/crawler visitors (total only)', bots.visitors || 0],
      ['Detected bot/crawler sessions (total only)', bots.sessions || 0],
      ['High-intent visitors adding 3+ products without purchase', monthlyReport.similarBehavior?.visitors || 0],
      [],
      [
        'Visitor ID', 'Visit started (SA time)', 'Latest action (SA time)', 'Sessions/tabs',
        'Source', 'Campaign', 'Country', 'Province', 'Municipality / city',
        'Device', 'Duration', 'Pages viewed',
        'Products viewed', 'Products added', 'Checkout started', 'Payment started',
        'Purchased', 'Exit page', 'Action time (SA time)', 'Action',
      ],
    ];

    (monthlyReport.journeys || []).forEach((journey) => {
      const steps = journey.steps?.length ? journey.steps : [{}];
      steps.forEach((step) => rows.push([
        String(journey.visitor_id || '').slice(-10).toUpperCase(),
        formatVisitTime(journey.started_at),
        formatVisitTime(journey.latest_activity),
        journey.session_count || 0,
        journey.source || journey.referrer_host || 'Direct',
        [journey.campaign, journey.ad_group].filter(Boolean).join(' / '),
        formatRegion(journey),
        journey.province_name || journey.region_name || '',
        journey.municipality_name || journey.city_name || '',
        [journey.device_type, journey.browser_name, journey.os_name].filter(Boolean).join(' / '),
        formatDuration(journey.session_duration_seconds),
        journey.pages_viewed || 0,
        (journey.products_viewed || []).join(' | '),
        (journey.added_products || []).join(' | '),
        journey.checkout_started ? 'Yes' : 'No',
        journey.payment_started ? 'Yes' : 'No',
        journey.purchased ? 'Yes' : 'No',
        journey.exit_page || '',
        step.occurredAt ? formatVisitTime(step.occurredAt) : '',
        step.eventName ? formatJourneyStep(step) : '',
      ]));
    });

    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `snuggleup-customer-analytics-${monthlyReport.period?.month || reportMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printMonthlyPdf = () => {
    if (!monthlyReport) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setReportError('Please allow pop-ups once so the PDF report can open.');
      return;
    }
    const summary = monthlyReport.summary || {};
    const bots = monthlyReport.botSummary || {};
    const journeyHtml = (monthlyReport.journeys || []).map((journey) => {
      const steps = (journey.steps || []).map((step, index) => `
        <li><b>${index + 1}. ${escapeHtml(formatVisitTime(step.occurredAt))}</b> ${escapeHtml(formatJourneyStep(step))}</li>
      `).join('');
      return `
        <section class="journey">
          <div class="journey-title">
            <h2>Visitor ${escapeHtml(String(journey.visitor_id || '').slice(-10).toUpperCase())}</h2>
            <span>${escapeHtml(formatVisitTime(journey.started_at))}</span>
          </div>
          <div class="facts">
            <p><b>Source:</b> ${escapeHtml(journey.source || journey.referrer_host || 'Direct')}</p>
            <p><b>Sessions/tabs:</b> ${escapeHtml(journey.session_count || 0)}</p>
            <p><b>Duration:</b> ${escapeHtml(formatDuration(journey.session_duration_seconds))}</p>
            <p><b>Country:</b> ${escapeHtml(formatRegion(journey))}</p>
            <p><b>Province:</b> ${escapeHtml(journey.province_name || journey.region_name || 'Unknown')}</p>
            <p><b>Municipality / city:</b> ${escapeHtml(journey.municipality_name || journey.city_name || 'Unknown')}</p>
            <p><b>Products viewed:</b> ${escapeHtml((journey.products_viewed || []).join(', ') || 'None recorded')}</p>
            <p><b>Products added:</b> ${escapeHtml((journey.added_products || []).join(', ') || 'None')}</p>
            <p><b>Checkout / purchase:</b> ${journey.checkout_started ? 'Started' : 'No'} / ${journey.purchased ? 'Completed' : 'No'}</p>
            <p><b>Exit page:</b> ${escapeHtml(journey.exit_page || 'Not recorded')}</p>
          </div>
          <h3>Action timeline</h3>
          <ol>${steps || '<li>No detailed actions recorded.</li>'}</ol>
        </section>`;
    }).join('');

    printWindow.document.write(`<!doctype html><html><head><title>SnuggleUp analytics ${escapeHtml(reportMonth)}</title>
      <style>
        @page{size:A4;margin:14mm} body{font-family:Arial,sans-serif;color:#243746;margin:0;font-size:11px;line-height:1.45}
        header{border-bottom:4px solid #147a7d;padding-bottom:14px;margin-bottom:18px} h1{color:#147a7d;margin:0 0 4px} h2{font-size:15px;margin:0} h3{font-size:12px;margin:12px 0 5px}
        .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}.stat{border:1px solid #d8e7e5;padding:9px}.stat b{display:block;font-size:17px;color:#147a7d}
        .notice{padding:10px;border-left:4px solid #f45b93;background:#fff5f8;margin:12px 0}.journey{break-inside:avoid;border:1px solid #d8e7e5;padding:12px;margin:0 0 12px}
        .journey-title{display:flex;justify-content:space-between;border-bottom:1px solid #e6eceb;padding-bottom:7px}.facts{display:grid;grid-template-columns:1fr 1fr;gap:2px 15px}.facts p{margin:4px 0}ol{margin:4px 0;padding-left:22px}li{padding:3px 0}
        .bots{color:#5d6f75} @media print{button{display:none}}
      </style></head><body>
      <header><h1>SnuggleUp Customer Analytics</h1><div>${escapeHtml(monthlyReport.period?.label || reportMonth)} - Times shown in South African time</div></header>
      <div class="summary">
        <div class="stat"><b>${escapeHtml(summary.visitors || 0)}</b>normal visitors</div>
        <div class="stat"><b>${escapeHtml(summary.sessions || 0)}</b>normal sessions</div>
        <div class="stat"><b>${escapeHtml(summary.pageViews || 0)}</b>page views</div>
        <div class="stat"><b>${escapeHtml(summary.productViews || 0)}</b>product views</div>
        <div class="stat"><b>${escapeHtml(summary.addToCartActions || 0)}</b>add-to-cart actions</div>
        <div class="stat"><b>${escapeHtml(summary.purchases || 0)}</b>purchases recorded</div>
      </div>
      <div class="notice"><b>${escapeHtml(monthlyReport.similarBehavior?.visitors || 0)} similar high-intent visitors:</b> ${escapeHtml(monthlyReport.similarBehavior?.label || '')}</div>
      <p class="bots"><b>Bots/crawlers excluded from details:</b> ${escapeHtml(bots.visitors || 0)} visitors, ${escapeHtml(bots.sessions || 0)} sessions, ${escapeHtml(bots.events || 0)} events.</p>
      ${journeyHtml || '<p>No normal-customer journeys were recorded for this month.</p>'}
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 350);
  };

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
              <div className="analytics-card"><div className="analytics-card-content"><h3>Bots/crawlers excluded</h3><p className="analytics-card-value">{formatNumber(traffic.botSummary?.visitors)}</p></div></div>
            </div>

            <section className="analytics-history-report">
              <div className="analytics-history-heading">
                <div>
                  <h3>Monthly customer analytics history</h3>
                  <p>Analyse a full calendar month. Customer visits remain detailed; detected bots and crawlers appear only as totals.</p>
                </div>
                <div className="analytics-history-controls">
                  <label>
                    Month
                    <input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} />
                  </label>
                  <button type="button" onClick={loadMonthlyReport} disabled={reportLoading}>
                    {reportLoading ? 'Analysing...' : 'Analyse month'}
                  </button>
                </div>
              </div>
              {reportError && <p className="analytics-history-error">{reportError}</p>}
              {monthlyReport && (
                <div className="analytics-history-results">
                  <div className="analytics-history-stat"><strong>{formatNumber(monthlyReport.summary?.visitors)}</strong><span>normal visitors</span></div>
                  <div className="analytics-history-stat"><strong>{formatNumber(monthlyReport.similarBehavior?.visitors)}</strong><span>similar high-intent visits</span></div>
                  <div className="analytics-history-stat muted"><strong>{formatNumber(monthlyReport.botSummary?.visitors)}</strong><span>bots/crawlers, total only</span></div>
                  <p className="analytics-history-finding">
                    <strong>Similar to the journey you highlighted:</strong> {monthlyReport.similarBehavior?.label}. Found {formatNumber(monthlyReport.similarBehavior?.visitors)} during {monthlyReport.period?.label}.
                  </p>
                  {monthlyReport.similarBehavior?.examples?.length > 0 && (
                    <div className="analytics-history-examples">
                      {monthlyReport.similarBehavior.examples.map((example) => (
                        <span key={example.visitor_id}>
                          {String(example.visitor_id || '').slice(-10).toUpperCase()}: {example.added_products.join(', ')}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="analytics-history-actions">
                    <button type="button" onClick={downloadMonthlyCsv}>Download for Excel</button>
                    <button type="button" className="secondary" onClick={printMonthlyPdf}>Save as PDF</button>
                  </div>
                  {monthlyReport.truncated && <p className="analytics-history-error">This unusually large month reached the 100,000-event export limit.</p>}
                </div>
              )}
            </section>

            <div className="traffic-funnel" aria-label="Customer journey funnel">
              <div className="traffic-funnel-heading">
                <div>
                  <h3>High-intent checkout funnel</h3>
                  <p>See each step from adding a product through confirmed purchase.</p>
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
              <p className="analytics-table-note">Approximate country, province, and municipality/city based on routing information. GPS coordinates and IP addresses are not stored.</p>
              {traffic.regions?.length ? (
                <table><thead><tr><th>Country</th><th>Province</th><th>Municipality / city</th><th>Visitor time zone</th><th>Sessions</th><th>Most recent visit (SA time)</th></tr></thead><tbody>
                  {traffic.regions.map((item, index) => (
                    <tr key={`${item.country_code || item.timezone_name}-${item.province_name || ''}-${item.municipality_name || ''}-${index}`}>
                      <td>{formatRegion(item)}</td>
                      <td>{item.province_name || '-'}</td>
                      <td>{item.municipality_name || '-'}</td>
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
                  <h3>What visitors came for and want stocked</h3>
                  <p>Optional responses from engaged shoppers during the last 30 days, including specific product and brand requests.</p>
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
                const yesNo = (value) => value ? 'Yes' : 'No';
                const checkoutSteps = steps.filter((step) => checkoutEvents.has(step.eventName));
                const lastCheckoutStep = checkoutSteps[checkoutSteps.length - 1];
                const completedPurchase = steps.some((step) => ['purchase_complete', 'purchase'].includes(step.eventName));
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
                      <div><dt>Country</dt><dd>{formatRegion(journey)}</dd></div>
                      <div><dt>Province</dt><dd>{journey.province_name || journey.region_name || 'Unknown'}</dd></div>
                      <div><dt>Municipality / city</dt><dd>{journey.municipality_name || journey.city_name || 'Unknown'}</dd></div>
                      <div><dt>Visit duration</dt><dd>{formatDuration(journey.session_duration_seconds)}</dd></div>
                      <div><dt>Pages viewed</dt><dd>{formatNumber(journey.pages_viewed)}</dd></div>
                      <div><dt>Products viewed</dt><dd>{products.length ? products.join(', ') : formatNumber(journey.products_viewed_count)}</dd></div>
                      <div><dt>Maximum scroll</dt><dd>{formatNumber(journey.scroll_depth)}%</dd></div>
                      <div><dt>Images viewed</dt><dd>{formatNumber(journey.images_viewed)}</dd></div>
                      <div><dt>Delivery / returns opened</dt><dd>{yesNo(journey.delivery_opened)} / {yesNo(journey.returns_opened)}</dd></div>
                      <div><dt>Added to cart</dt><dd>{yesNo(journey.added_to_cart)}</dd></div>
                      <div><dt>Checkout started</dt><dd>{yesNo(journey.checkout_started)}</dd></div>
                      <div><dt>Purchase completed</dt><dd>{yesNo(journey.purchased)}</dd></div>
                      <div className="visitor-checkout-stop"><dt>Checkout journey ended</dt><dd>{lastCheckoutStep ? (completedPurchase ? 'Purchase completed' : `After: ${formatJourneyStep(lastCheckoutStep)}`) : 'No checkout activity'}</dd></div>
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
                          <span>
                            {formatJourneyStep(step)}
                            {journeyStepDetails(step).length > 0 && (
                              <small className="visitor-timeline-details">{journeyStepDetails(step).join(' · ')}</small>
                            )}
                          </span>
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
