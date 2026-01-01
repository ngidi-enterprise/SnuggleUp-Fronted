import React, { useEffect, useMemo, useState } from 'react';
import './ProductReviews.css';
import { getProductReviews } from '../lib/cjApi.js';
import { useAuth } from '../context/AuthContext';

export default function ProductReviews({ productId, productName = 'Product' }) {
  const { user, token: authToken } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canReview, setCanReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    title: '',
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [orderInfo, setOrderInfo] = useState(null);

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

  // Check if logged-in user can review this product
  useEffect(() => {
    let cancelled = false;
    const checkReviewEligibility = async () => {
      const bearerToken = authToken || localStorage.getItem('token');

      console.log('🔍 Review eligibility check:', { user: !!user, productId, bearerToken: !!bearerToken });

      if (!user || !productId || !bearerToken) {
        console.log('❌ Early exit: missing user/productId/token');
        setCanReview(false);
        return;
      }
      
      try {
        // Auto-detect production API URL
        const isProd = window.location.hostname === 'snuggleup.co.za' || window.location.hostname === 'www.snuggleup.co.za';
        const baseUrl = import.meta.env.VITE_API_URL || (isProd ? 'https://snuggleup-api.onrender.com' : 'http://localhost:3000');
        const apiUrl = `${baseUrl}/api/reviews/can-review/${productId}`;
        console.log('📡 Fetching:', apiUrl);
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${bearerToken}`
          }
        });
        
        console.log('📨 Response status:', response.status);
        if (!response.ok) {
          console.log('❌ Non-OK response');
          setCanReview(false);
          return;
        }
        
        const data = await response.json();
        console.log('✅ Eligibility data:', data);
        if (cancelled) return;
        
        setCanReview(data.canReview);
        if (data.canReview) {
          setOrderInfo({ orderId: data.orderId, orderNumber: data.orderNumber });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('❌ Review eligibility check failed:', err);
          setCanReview(false);
        }
      }
    };

    checkReviewEligibility();
    return () => { cancelled = true; };
  }, [user, authToken, productId]);

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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!orderInfo) return;
    
    setSubmitting(true);
    setSubmitError('');
    
    try {
      const bearerToken = authToken || localStorage.getItem('token');
      if (!bearerToken) {
        setSubmitError('You need to be signed in to write a review.');
        return;
      }
      // Auto-detect production API URL
      const isProd = window.location.hostname === 'snuggleup.co.za' || window.location.hostname === 'www.snuggleup.co.za';
      const baseUrl = import.meta.env.VITE_API_URL || (isProd ? 'https://snuggleup-api.onrender.com' : 'http://localhost:3000');
      const response = await fetch(`${baseUrl}/api/reviews/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`
        },
        body: JSON.stringify({
          productId,
          orderId: orderInfo.orderId,
          rating: reviewData.rating,
          title: reviewData.title,
          comment: reviewData.comment
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }
      
      // Success - close modal and refresh reviews
      setShowReviewModal(false);
      setReviewData({ rating: 5, title: '', comment: '' });
      setCanReview(false);
      
      // Refresh reviews list
      const refreshData = await getProductReviews(productId);
      const incoming = Array.isArray(refreshData?.reviews) ? refreshData.reviews : [];
      setReviews(incoming.slice(0, 50));
      
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="product-reviews-section">
      <div className="reviews-title-row">
        <h3 className="reviews-title">Customer Reviews</h3>
        {canReview && (
          <button 
            className="write-review-btn"
            onClick={() => setShowReviewModal(true)}
          >
            ✍️ Write a Review
          </button>
        )}
        {/* Debug info - remove after testing */}
        {user && (
          <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
            Debug: user={user.email || 'yes'} | canReview={canReview ? 'YES' : 'NO'} | token={authToken ? 'yes' : 'no'}
          </div>
        )}
      </div>

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

      {/* Review Modal */}
      {showReviewModal && (
        <div className="review-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <h3>Write Your Review</h3>
              <button 
                className="review-modal-close"
                onClick={() => setShowReviewModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmitReview} className="review-form">
              <div className="form-group">
                <label>Your Rating *</label>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${star <= reviewData.rating ? 'filled' : ''}`}
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="review-title">Review Title (optional)</label>
                <input
                  id="review-title"
                  type="text"
                  placeholder="Sum up your experience"
                  value={reviewData.title}
                  onChange={(e) => setReviewData({ ...reviewData, title: e.target.value })}
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label htmlFor="review-comment">Your Review *</label>
                <textarea
                  id="review-comment"
                  placeholder="Tell us about your experience with this product..."
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  rows={5}
                  required
                  minLength={10}
                />
                <span className="char-count">{reviewData.comment.length} characters</span>
              </div>

              {submitError && (
                <div className="review-error">{submitError}</div>
              )}

              <div className="review-modal-footer">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={() => setShowReviewModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={submitting || reviewData.comment.trim().length < 10}
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
