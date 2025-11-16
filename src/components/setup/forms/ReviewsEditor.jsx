/**
 * Reviews Editor - Google Reviews Configuration
 * Allows users to configure Google Reviews display in setup editor
 * Part of Pro+ features
 */

import React, { useState } from 'react';
import './ReviewsEditor.css';

const ReviewsEditor = ({ siteData, onChange }) => {
  const [placeId, setPlaceId] = useState(siteData?.features?.reviews?.placeId || '');
  const [enabled, setEnabled] = useState(siteData?.features?.reviews?.enabled || false);
  const [maxReviews, setMaxReviews] = useState(siteData?.features?.reviews?.maxReviews || 5);
  const [showOverallRating, setShowOverallRating] = useState(
    siteData?.features?.reviews?.showOverallRating !== false
  );

  const handlePlaceIdChange = (e) => {
    const newPlaceId = e.target.value;
    setPlaceId(newPlaceId);
    updateReviews({ placeId: newPlaceId });
  };

  const handleEnabledChange = (e) => {
    const isEnabled = e.target.checked;
    setEnabled(isEnabled);
    updateReviews({ enabled: isEnabled });
  };

  const handleMaxReviewsChange = (e) => {
    const max = parseInt(e.target.value, 10);
    setMaxReviews(max);
    updateReviews({ maxReviews: max });
  };

  const handleShowOverallRatingChange = (e) => {
    const show = e.target.checked;
    setShowOverallRating(show);
    updateReviews({ showOverallRating: show });
  };

  const updateReviews = (updates) => {
    const reviewsConfig = {
      enabled: enabled,
      placeId: placeId,
      maxReviews: maxReviews,
      showOverallRating: showOverallRating,
      ...updates
    };

    onChange({
      ...siteData,
      features: {
        ...siteData.features,
        reviews: reviewsConfig
      }
    });
  };

  const handleFindPlaceId = () => {
    window.open(
      'https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder',
      '_blank'
    );
  };

  return (
    <div className="reviews-editor">
      <h3>Google Reviews</h3>
      <p className="reviews-description">
        Display your Google reviews on your site to build trust with customers.
      </p>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleEnabledChange}
          />
          <span>Enable Google Reviews</span>
        </label>
      </div>

      {enabled && (
        <>
          <div className="form-group">
            <label htmlFor="placeId">
              Google Place ID
              <span className="required">*</span>
            </label>
            <div className="input-with-button">
              <input
                type="text"
                id="placeId"
                value={placeId}
                onChange={handlePlaceIdChange}
                placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                className="form-control"
              />
              <button
                type="button"
                onClick={handleFindPlaceId}
                className="btn-secondary"
              >
                Find Place ID
              </button>
            </div>
            <small className="form-help">
              Enter your Google Place ID to display reviews. 
              <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer">
                Learn more
              </a>
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="maxReviews">
              Number of Reviews to Display
            </label>
            <select
              id="maxReviews"
              value={maxReviews}
              onChange={handleMaxReviewsChange}
              className="form-control"
            >
              <option value="3">3 reviews</option>
              <option value="5">5 reviews</option>
              <option value="10">10 reviews</option>
              <option value="15">15 reviews</option>
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showOverallRating}
                onChange={handleShowOverallRatingChange}
              />
              <span>Show overall rating summary</span>
            </label>
            <small className="form-help">
              Display your average rating and total review count at the top
            </small>
          </div>

          {placeId && (
            <div className="reviews-preview">
              <h4>Preview</h4>
              <div className="preview-card">
                <div className="preview-header">
                  <div className="preview-stars">★★★★★</div>
                  <div className="preview-rating">
                    <strong>4.8</strong> (120 reviews)
                  </div>
                </div>
                <div className="preview-review">
                  <div className="preview-review-header">
                    <strong>John Doe</strong>
                    <span className="preview-review-stars">★★★★★</span>
                  </div>
                  <p>Great experience! Highly recommend...</p>
                  <small>3 days ago</small>
                </div>
                <small className="preview-note">
                  This is a preview. Real reviews will be fetched from Google.
                </small>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReviewsEditor;

