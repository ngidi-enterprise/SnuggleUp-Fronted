import React, { useEffect, useMemo, useState } from 'react';
import './ShoppingFeedbackPrompt.css';
import { trackSurveyResponse } from '../lib/analytics';

const SURVEY_VERSION = 'shopping_feedback_v2';
const DISMISSED_AT_KEY = 'snuggleup_shopping_feedback_v2_dismissed_at';
const COMPLETED_KEY = 'snuggleup_shopping_feedback_v2_completed';
const VISITED_ROUTES_KEY = 'snuggleup_shopping_feedback_v2_routes';
const DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

const questions = [
  {
    key: 'visit_goal',
    title: 'What brought you to SnuggleUp today?',
    options: [
      'Nappies and changing',
      'Feeding essentials',
      'Bath and skincare',
      'A helpful baby bundle',
      'Just browsing',
    ],
  },
  {
    key: 'stock_request_category',
    title: 'What would you like SnuggleUp to stock next?',
    options: [
      'More nappies and sizes',
      'Formula and feeding essentials',
      'Bath and skincare',
      'Baby gear and nursery items',
      'Something else',
    ],
  },
];

const readNumber = (key) => {
  try {
    return Number(window.localStorage.getItem(key) || 0);
  } catch {
    return 0;
  }
};

const shouldRemainHidden = () => {
  try {
    if (window.localStorage.getItem(COMPLETED_KEY) === 'true') return true;
    if (window.localStorage.getItem('hasMadeFirstPurchase') === 'true') return true;
    const dismissedAt = readNumber(DISMISSED_AT_KEY);
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
};

export default function ShoppingFeedbackPrompt({ blocked, routeKey, eligibleForSurvey }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const [minimumTimeReached, setMinimumTimeReached] = useState(false);
  const [dwellTimeReached, setDwellTimeReached] = useState(false);
  const [routeCount, setRouteCount] = useState(1);
  const [complete, setComplete] = useState(false);
  const [stockCategory, setStockCategory] = useState('');
  const [stockRequest, setStockRequest] = useState('');

  const question = questions[step];
  const permanentlyHidden = useMemo(() => shouldRemainHidden(), []);

  useEffect(() => {
    const minimumTimer = window.setTimeout(() => setMinimumTimeReached(true), 15000);
    const dwellTimer = window.setTimeout(() => setDwellTimeReached(true), 45000);
    return () => {
      window.clearTimeout(minimumTimer);
      window.clearTimeout(dwellTimer);
    };
  }, []);

  useEffect(() => {
    if (!routeKey) return;
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(VISITED_ROUTES_KEY) || '[]');
      const routes = Array.isArray(stored) ? stored : [];
      if (!routes.includes(routeKey)) routes.push(routeKey);
      window.sessionStorage.setItem(VISITED_ROUTES_KEY, JSON.stringify(routes.slice(-12)));
      setRouteCount(routes.length);
      if (routes.length > 1) setEngaged(true);
    } catch {}
  }, [routeKey]);

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable >= 0.2) setEngaged(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (
      permanentlyHidden
      || blocked
      || !eligibleForSurvey
      || visible
      || complete
    ) return;

    if ((minimumTimeReached && routeCount > 1) || (dwellTimeReached && engaged)) {
      setVisible(true);
    }
  }, [blocked, complete, dwellTimeReached, eligibleForSurvey, engaged, minimumTimeReached, permanentlyHidden, routeCount, visible]);

  useEffect(() => {
    if (permanentlyHidden || blocked || !eligibleForSurvey || visible || complete || !minimumTimeReached || !engaged) return undefined;
    const onMouseOut = (event) => {
      if (!event.relatedTarget && event.clientY <= 8) setVisible(true);
    };
    document.addEventListener('mouseout', onMouseOut);
    return () => document.removeEventListener('mouseout', onMouseOut);
  }, [blocked, complete, eligibleForSurvey, engaged, minimumTimeReached, permanentlyHidden, visible]);

  useEffect(() => {
    if (blocked && visible) setVisible(false);
  }, [blocked, visible]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  };

  const selectAnswer = (answer) => {
    if (step === 0) {
      trackSurveyResponse(question.key, question.title, answer, SURVEY_VERSION);
      setStep(1);
      return;
    }

    setStockCategory(answer);
  };

  const submitStockRequest = () => {
    const request = stockRequest.trim();
    if (!stockCategory && !request) return;

    if (stockCategory) {
      trackSurveyResponse(question.key, question.title, stockCategory, SURVEY_VERSION);
    }
    if (request) {
      trackSurveyResponse(
        'stock_request_detail',
        'Specific products or brands requested',
        request,
        SURVEY_VERSION,
      );
    }

    try {
      window.localStorage.setItem(COMPLETED_KEY, 'true');
    } catch {}
    setComplete(true);
    window.setTimeout(() => setVisible(false), 1800);
  };

  if (!visible || blocked || permanentlyHidden || !eligibleForSurvey) return null;

  return (
    <aside className="shopping-feedback" role="dialog" aria-labelledby="shopping-feedback-title">
      <button className="shopping-feedback-close" type="button" onClick={dismiss} aria-label="Close feedback question">&times;</button>
      {complete ? (
        <div className="shopping-feedback-thanks" aria-live="polite">
          <strong>Thank you</strong>
          <p>We review every request when planning our local range. Please check back soon.</p>
        </div>
      ) : (
        <>
          <span className="shopping-feedback-eyebrow">Help us make shopping easier</span>
          <h2 id="shopping-feedback-title">{question.title}</h2>
          <p className="shopping-feedback-note">
            {step === 0
              ? 'Two quick taps.'
              : 'Choose a category and tell us the product or brand you have in mind.'}
          </p>
          <div className="shopping-feedback-options">
            {question.options.map((option) => (
              <button
                type="button"
                key={option}
                className={step === 1 && stockCategory === option ? 'selected' : ''}
                aria-pressed={step === 1 ? stockCategory === option : undefined}
                onClick={() => selectAnswer(option)}
              >
                {option}
              </button>
            ))}
          </div>
          {step === 1 && (
            <div className="shopping-feedback-request">
              <label htmlFor="shopping-feedback-product">Product or brand (optional)</label>
              <input
                id="shopping-feedback-product"
                type="text"
                value={stockRequest}
                maxLength={120}
                placeholder="e.g. Huggies size 2 or baby bottles"
                onChange={(event) => setStockRequest(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitStockRequest();
                }}
              />
              <button
                className="shopping-feedback-submit"
                type="button"
                disabled={!stockCategory && !stockRequest.trim()}
                onClick={submitStockRequest}
              >
                Send my request
              </button>
            </div>
          )}
          <div className="shopping-feedback-footer">
            <span>Question {step + 1} of 2</span>
            <button type="button" onClick={dismiss}>Not now</button>
          </div>
        </>
      )}
    </aside>
  );
}
