import React, { useEffect, useMemo, useState } from 'react';
import './ProductReviews.css';
import { useAuth } from '../context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com').replace(/\/$/, '');

const clampRating = (value) => {
  const rating = Number(value) || 0;
  return Math.min(5, Math.max(1, Math.round(rating)));
};

const uniqueIds = (ids) => {
  const seen = new Set();
  return ids
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
};

const getReviewApiJson = async (path, token) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Unable to load reviews right now');
  }
  return data;
};

const postReviewApiJson = async (path, token, body) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit review');
  }
  return data;
};

export default function ProductReviews({ productId, productIds, productName = 'Product' }) {
  const { user, token: authToken } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canReview, setCanReview] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, title: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const rawProductIds = Array.isArray(productIds) ? productIds : [];
  const reviewIdKey = [productId, ...rawProductIds].map((id) => String(id || '').trim()).join('|');
  const reviewIds = useMemo(() => uniqueIds(reviewIdKey.split('|')), [reviewIdKey]);

  const loadReviews = async (ids, token) => {
    if (ids.length === 0) return [];

    const settled = await Promise.allSettled(
      ids.map((id) => getReviewApiJson(`/api/reviews/product/${encodeURIComponent(id)}`, token))
    );

    const merged = [];
    const seen = new Set();
    let firstError = null;

    settled.forEach((result) => {
      if (result.status === 'rejected') {
        firstError = firstError || result.reason;
        return;
      }

      const incoming = Array.isArray(result.value?.reviews) ? result.value.reviews : [];
      incoming.forEach((review) => {
        const key = String(review.id || `${review.author}-${review.date}-${review.comment}`);
        if (seen.has(key)) return;
        seen.add(key);
        merged.push({
          id: key,
          rating: clampRating(review.rating),
          title: review.title || '',
          comment: review.comment || '',
          author: review.author || 'SnuggleUp customer',
          verified: Boolean(review.verified || review.verified_purchase),
          helpful: Number(review.helpful || review.helpful_count || 0),
          date: review.date || review.created_at || null,
        });
      });
    });

    if (merged.length === 0 && settled.every((result) => result.status === 'rejected')) {
      throw firstError || new Error('Unable to load reviews right now');
    }

    return merged.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 50);
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const token = authToken || localStorage.getItem('token');
        const loadedReviews = await loadReviews(reviewIds, token);
        if (!cancelled) setReviews(loadedReviews);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load reviews right now');
          setReviews([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [reviewIds, authToken]);

  useEffect(() => {
    let cancelled = false;

    const checkEligibility = async () => {
      const token = authToken || localStorage.getItem('token');
      if (!user || !token || reviewIds.length === 0) {
        setCanReview(false);
        setOrderInfo(null);
        return;
      }

      for (const id of reviewIds) {
        try {
          const data = await getReviewApiJson(`/api/reviews/can-review/${encodeURIComponent(id)}`, token);
          if (cancelled) return;
          if (data.canReview) {
            setCanReview(true);
            setOrderInfo({
              productId: id,
              orderId: data.orderId,
              orderNumber: data.orderNumber,
            });
            return;
          }
        } catch (_) {
          // Try the next possible product ID. Older orders may have used a different cart ID.
        }
      }

      if (!cancelled) {
        setCanReview(false);
        setOrderInfo(null);
      }
    };

    checkEligibility();
    return () => {
      cancelled = true;
    };
  }, [user, authToken, reviewIds]);

  useEffect(() => {
    if (!showReviewModal) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setShowReviewModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showReviewModal]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + clampRating(review.rating), 0);
    return Number((total / reviews.length).toFixed(1));
  }, [reviews]);

  const ratingDistribution = useMemo(() => {
    const buckets = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      buckets[clampRating(review.rating)] += 1;
    });
    return buckets;
  }, [reviews]);

  const renderStars = (rating, label = `${rating} out of 5 stars`) => (
    <span className="review-stars" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? 'star filled' : 'star'}>
          &#9733;
        </span>
      ))}
    </span>
  );

  const renderRatingBar = (stars) => {
    const count = ratingDistribution[stars] || 0;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;

    return (
      <div key={stars} className="rating-bar-row">
        <span className="rating-label">{stars} star</span>
        <div className="rating-bar-track" aria-hidden="true">
          <span className="rating-bar-fill" style={{ width: `${percentage}%` }} />
        </div>
        <span className="rating-count">{count}</span>
      </div>
    );
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();
    if (!orderInfo) {
      setSubmitError('You can review this product after purchasing it.');
      return;
    }

    const token = authToken || localStorage.getItem('token');
    if (!token) {
      setSubmitError('Please sign in before writing a review.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      await postReviewApiJson('/api/reviews/submit', token, {
        productId: orderInfo.productId,
        orderId: orderInfo.orderId,
        rating: reviewData.rating,
        title: reviewData.title.trim(),
        comment: reviewData.comment.trim(),
      });

      const loadedReviews = await loadReviews(reviewIds, token);
      setReviews(loadedReviews);
      setCanReview(false);
      setOrderInfo(null);
      setShowReviewModal(false);
      setReviewData({ rating: 5, title: '', comment: '' });
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const reviewAction = canReview ? (
    <button className="write-review-btn" type="button" onClick={() => setShowReviewModal(true)}>
      Write a review
    </button>
  ) : (
    <span className="review-note">
      {user ? 'Reviews open after a paid purchase.' : 'Sign in after checkout to review this product.'}
    </span>
  );

  return (
    <section className="product-reviews-section" aria-labelledby="customer-reviews-title">
      <div className="reviews-title-row">
        <div>
          <h2 id="customer-reviews-title" className="reviews-title">Customer reviews</h2>
          <p className="reviews-subtitle">{productName}</p>
        </div>
        {reviewAction}
      </div>

      {loading && (
        <div className="reviews-empty-state">
          <p>Loading customer reviews...</p>
        </div>
      )}

      {error && !loading && (
        <div className="reviews-empty-state reviews-error-state">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && reviews.length > 0 && (
        <>
          <div className="reviews-summary">
            <div className="summary-score-card">
              <span className="score-number">{averageRating}</span>
              {renderStars(Math.round(averageRating), `${averageRating} out of 5 stars`)}
              <span className="review-count">Based on {reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
            </div>

            <div className="rating-distribution" aria-label="Rating distribution">
              {[5, 4, 3, 2, 1].map(renderRatingBar)}
            </div>
          </div>

          <div className="reviews-list">
            {reviews.map((review) => (
              <article key={review.id} className="review-item">
                <div className="review-header">
                  <div>
                    <h3 className="review-title">{review.title || 'Customer review'}</h3>
                    <div className="review-meta">
                      <span>{review.author}</span>
                      {review.date && <span>{new Date(review.date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  {review.verified && <span className="verified-badge">Verified purchase</span>}
                </div>

                <div className="review-rating-row">
                  {renderStars(review.rating)}
                </div>

                <p className="review-comment">{review.comment}</p>

                <div className="review-footer">
                  <span>{review.helpful} found this helpful</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div className="reviews-empty-card">
          <div className="empty-stars" aria-hidden="true">
            <span>&#9733;</span><span>&#9733;</span><span>&#9733;</span><span>&#9733;</span><span>&#9733;</span>
          </div>
          <h3>No customer reviews yet</h3>
          <p>Once customers have bought this product, their verified reviews will appear here.</p>
        </div>
      )}

      {showReviewModal && (
        <div className="review-modal-overlay" onMouseDown={() => setShowReviewModal(false)}>
          <div className="review-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="write-review-title">
            <div className="review-modal-header">
              <h3 id="write-review-title">Write your review</h3>
              <button className="review-modal-close" type="button" onClick={() => setShowReviewModal(false)} aria-label="Close review form">
                &times;
              </button>
            </div>

            <form className="review-form" onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label>Your rating</label>
                <div className="rating-input" role="radiogroup" aria-label="Choose your rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${star <= reviewData.rating ? 'filled' : ''}`}
                      onClick={() => setReviewData((current) => ({ ...current, rating: star }))}
                      aria-label={`${star} star${star === 1 ? '' : 's'}`}
                    >
                      &#9733;
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="review-title">Review title</label>
                <input
                  id="review-title"
                  type="text"
                  value={reviewData.title}
                  onChange={(event) => setReviewData((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Example: Great quality"
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label htmlFor="review-comment">Your review</label>
                <textarea
                  id="review-comment"
                  value={reviewData.comment}
                  onChange={(event) => setReviewData((current) => ({ ...current, comment: event.target.value }))}
                  placeholder="Tell other parents what you liked about it"
                  rows={5}
                  minLength={10}
                  required
                />
                <span className="char-count">{reviewData.comment.trim().length} characters</span>
              </div>

              {submitError && <div className="review-error">{submitError}</div>}

              <div className="review-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowReviewModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={submitting || reviewData.comment.trim().length < 10}>
                  {submitting ? 'Submitting...' : 'Submit review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
