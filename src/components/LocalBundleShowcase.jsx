import React, { useEffect, useMemo, useState } from 'react';

const firstImage = (product) => {
  if (Array.isArray(product?.images)) return product.images[0] || '';
  if (typeof product?.images === 'string') {
    try {
      const parsed = JSON.parse(product.images);
      return Array.isArray(parsed) ? parsed[0] || '' : product.images;
    } catch {
      return product.images;
    }
  }
  return product?.image || '';
};

const money = (value) => `R${Number(value || 0).toFixed(2)}`;

export default function LocalBundleShowcase({ bundles = [], onAddBundle }) {
  const availableBundles = useMemo(
    () => bundles.filter(bundle => Array.isArray(bundle.products) && bundle.products.length > 0),
    [bundles]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (availableBundles.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex(index => (index + 1) % availableBundles.length);
      setMessage('');
    }, 9000);
    return () => window.clearInterval(timer);
  }, [availableBundles.length]);

  useEffect(() => {
    if (activeIndex >= availableBundles.length) setActiveIndex(0);
  }, [activeIndex, availableBundles.length]);

  if (availableBundles.length === 0) return null;

  const bundle = availableBundles[activeIndex];
  const changeSlide = (direction) => {
    setActiveIndex(index => (
      (index + direction + availableBundles.length) % availableBundles.length
    ));
    setMessage('');
  };

  const addBundle = () => {
    const result = onAddBundle?.(bundle);
    setMessage(result?.message || '');
  };

  return (
    <section className="bundle-showcase" aria-label="SnuggleUp parent-ready kits">
      <div className="bundle-showcase-copy">
        <p className="bundle-eyebrow">{bundle.eyebrow}</p>
        <h2>{bundle.name}</h2>
        <p className="bundle-description">{bundle.description}</p>

        <div className="bundle-pricing" aria-label={`Kit price ${money(bundle.bundlePrice)}`}>
          <span className="bundle-price">{money(bundle.bundlePrice)}</span>
          <span className="bundle-regular-price">{money(bundle.regularPrice)}</span>
          <span className="bundle-saving">Save R{Number(bundle.saving || 0).toFixed(0)}</span>
        </div>

        <ul className="bundle-product-list">
          {bundle.products.map(product => (
            <li key={product.id}>{product.name}</li>
          ))}
        </ul>

        <div className="bundle-actions">
          <button
            type="button"
            className="bundle-add-button"
            onClick={addBundle}
            disabled={!bundle.isAvailable}
          >
            {bundle.isAvailable ? 'Add full kit' : 'Kit currently unavailable'}
          </button>
          <span>{bundle.products.length} local essentials</span>
        </div>
        {message && <p className="bundle-message" role="status">{message}</p>}
      </div>

      <div className="bundle-visual" aria-hidden="true">
        <div className="bundle-image-stage">
          {bundle.products.map((product, index) => (
            <div className={`bundle-product-image bundle-product-image-${index + 1}`} key={product.id}>
              <img src={firstImage(product)} alt="" />
            </div>
          ))}
        </div>
        <span className="bundle-kit-label">Ready in one click</span>
      </div>

      {availableBundles.length > 1 && (
        <>
          <button
            type="button"
            className="bundle-arrow bundle-arrow-previous"
            onClick={() => changeSlide(-1)}
            aria-label="Previous kit"
          >
            &lsaquo;
          </button>
          <button
            type="button"
            className="bundle-arrow bundle-arrow-next"
            onClick={() => changeSlide(1)}
            aria-label="Next kit"
          >
            &rsaquo;
          </button>
          <div className="bundle-dots" aria-label="Choose a kit">
            {availableBundles.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={index === activeIndex ? 'active' : ''}
                onClick={() => {
                  setActiveIndex(index);
                  setMessage('');
                }}
                aria-label={`Show ${item.name}`}
                aria-current={index === activeIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
