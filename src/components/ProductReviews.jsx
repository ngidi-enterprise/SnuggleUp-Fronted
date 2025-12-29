import React, { useEffect, useMemo, useState } from 'react';
import './ProductReviews.css';
import { getProductReviews } from '../lib/cjApi.js';

export default function ProductReviews({ productId, productName = 'Product' }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchReviews = async () => {
      if (!productId) {
        setReviews([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const data = await getProductReviews(productId);
        if (cancelled) return;
        const incoming = Array.isArray(data?.reviews) ? data.reviews : [];
        setReviews(incoming.slice(0, 50));
      } catch (e) {
        if (cancelled) return;
        setError(e.message || 'Unable to load reviews right now');
        setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchReviews();
    return () => { cancelled = true; };
  }, [productId]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return Number((reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1));
  }, [reviews]);

  const ratingDistribution = useMemo(() => {
    const buckets = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const rating = Math.round(Number(r.rating) || 0);
      if (rating >= 1 && rating <= 5) buckets[rating] += 1;
    });
    return buckets;
  }, [reviews]);

  const renderStars = (rating) => (
    <div className="star-rating">
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className={`star ${i < rating ? 'filled' : 'empty'}`}
          aria-label={`${i + 1} star`}
        >
          ★
        </span>
      ))}
    </div>
  );

  const renderRatingBar = (stars, count, total) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div key={stars} className="rating-bar-row">
        <span className="rating-label">{stars} ★</span>
        <div className="rating-bar-container">
          <div className="rating-bar" style={{ width: `${percentage}%` }}></div>
        </div>
        <span className="rating-count">{count}</span>
      </div>
    );
  };

  return (
    <div className="product-reviews-section">
      <h3 className="reviews-title">Customer Reviews</h3>

      {loading && (
        <div className="no-reviews" style={{ padding: '32px 0' }}>
          <p>Loading reviews for {productName}…</p>
        </div>
      )}

      {error && !loading && (
        <div className="no-reviews" style={{ color: '#a30000' }}>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && reviews.length > 0 ? (
        <>
          <div className="reviews-summary">
            <div className="summary-rating">
              <div className="average-score">
                <span className="score-number">{averageRating}</span>
                <span className="score-text">out of 5</span>
              </div>
              <div className="summary-stars">
                {renderStars(Math.round(averageRating))}
              </div>
              <p className="review-count">Based on {reviews.length} recent reviews</p>
            </div>

            <div className="rating-distribution">
              {[5, 4, 3, 2, 1].map(stars =>
                renderRatingBar(stars, ratingDistribution[stars], reviews.length)
              )}
            </div>
          </div>

          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <div className="review-title-section">
                    <h4 className="review-title">{review.title || 'Review'}</h4>
                    {review.verified && (
                      <span className="verified-badge">✓ Verified Purchase</span>
                    )}
                  </div>
                  <span className="review-date">{review.date ? new Date(review.date).toLocaleDateString() : 'Recently'}</span>
                </div>

                <div className="review-rating">
                  {renderStars(Math.round(Number(review.rating) || 0))}
                </div>

                <p className="review-comment">{review.comment}</p>

                <div className="review-footer">
                  <span className="review-author">by {review.author || 'Customer'}</span>
                  <button className="helpful-btn">
                    👍 Helpful ({review.helpful ?? 0})
                  </button>
                </div>
              </div>
            ))}
          </div>

          {reviews.length >= 6 && (
            <button className="load-more-reviews">
              View All Reviews →
            </button>
          )}
        </>
      ) : null}

      {!loading && !error && reviews.length === 0 && (
        <div className="no-reviews">
          <p>No reviews yet. Be the first to review this product!</p>
        </div>
      )}
    </div>
  );
}
