import React, { useEffect, useRef } from 'react';

const BRANDS = [
  { name: "Johnson's", logo: '/images/brands/johnsons-logo.png', search: 'johnson' },
  { name: 'Nestlé', logo: '/images/brands/nestle-logo.png', search: 'nestl' },
  { name: 'Huggies', logo: '/images/brands/huggies-logo.png', search: 'huggies' },
  { name: 'Pampers', logo: '/images/brands/pampers-logo.png', search: 'pampers' },
  { name: 'Lil Masters', logo: '/images/brands/lil-masters-logo.png', search: 'lil masters' },
  { name: 'Bennetts', logo: '/images/brands/bennetts-logo.png', search: 'bennetts' },
  { name: 'Purity', logo: '/images/brands/purity-logo.png', search: 'purity' },
];

export default function FavouriteBrands({ onSelectBrand }) {
  const trackRef = useRef(null);
  const pauseReasonsRef = useRef(new Set());
  const pauseUntilRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let shouldReduceMotion = reducedMotion.matches;
    let animationFrame;
    let previousTime;

    const positionAtMiddleSequence = () => {
      const sequenceWidth = track.scrollWidth / 3;
      if (sequenceWidth > 0 && track.scrollLeft < sequenceWidth * 0.5) {
        track.scrollLeft = sequenceWidth;
      }
    };

    const animate = (time) => {
      if (previousTime === undefined) previousTime = time;
      const elapsed = Math.min(time - previousTime, 50);
      previousTime = time;

      if (
        !shouldReduceMotion
        && !document.hidden
        && pauseReasonsRef.current.size === 0
        && time >= pauseUntilRef.current
      ) {
        const sequenceWidth = track.scrollWidth / 3;
        track.scrollLeft += elapsed * 0.018;

        if (sequenceWidth > 0 && track.scrollLeft >= sequenceWidth * 2) {
          track.scrollLeft -= sequenceWidth;
        }
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    const handleMotionPreference = (event) => {
      shouldReduceMotion = event.matches;
    };

    positionAtMiddleSequence();
    animationFrame = window.requestAnimationFrame(animate);
    reducedMotion.addEventListener?.('change', handleMotionPreference);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      reducedMotion.removeEventListener?.('change', handleMotionPreference);
    };
  }, []);

  const pauseAutoScroll = (reason) => {
    pauseReasonsRef.current.add(reason);
  };

  const resumeAutoScroll = (reason) => {
    pauseReasonsRef.current.delete(reason);
    pauseUntilRef.current = performance.now() + 1200;
  };

  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;

    const sequenceWidth = track.scrollWidth / 3;
    const distance = Math.min(track.clientWidth * 0.75, 620);

    if (direction < 0 && track.scrollLeft < distance) {
      track.scrollLeft += sequenceWidth;
    } else if (
      direction > 0
      && track.scrollLeft + track.clientWidth + distance > track.scrollWidth
    ) {
      track.scrollLeft -= sequenceWidth;
    }

    pauseUntilRef.current = performance.now() + 3500;
    track.scrollBy({
      left: direction * distance,
      behavior: 'smooth',
    });
  };

  const renderBrand = (brand, sequenceIndex) => (
    <button
      className="brand-logo-button favourite-brand-card"
      key={`${sequenceIndex}-${brand.name}`}
      type="button"
      tabIndex={sequenceIndex === 1 ? undefined : -1}
      onClick={() => onSelectBrand?.(brand.search)}
      aria-label={`Shop ${brand.name} products`}
      title={`Shop ${brand.name}`}
    >
      <img
        src={brand.logo}
        alt={`${brand.name} logo`}
        loading="lazy"
        decoding="async"
        className="favourite-brand-logo"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    </button>
  );

  return (
    <section className="favourite-brands" aria-labelledby="favourite-brands-heading">
      <div className="favourite-brands-heading">
        <div>
          <p>Everyday baby essentials</p>
          <h2 id="favourite-brands-heading">Our Favourite Brands</h2>
        </div>
        <div className="brand-scroll-controls" aria-label="Browse brands">
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous brands">
            &#8249;
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Next brands">
            &#8250;
          </button>
        </div>
      </div>

      <div
        className="favourite-brands-track"
        ref={trackRef}
        aria-label="Favourite brand logos"
        onMouseEnter={() => pauseAutoScroll('hover')}
        onMouseLeave={() => resumeAutoScroll('hover')}
        onFocusCapture={() => pauseAutoScroll('focus')}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            resumeAutoScroll('focus');
          }
        }}
        onPointerDown={() => pauseAutoScroll('pointer')}
        onPointerUp={() => resumeAutoScroll('pointer')}
        onPointerCancel={() => resumeAutoScroll('pointer')}
      >
        {[0, 1, 2].map((sequenceIndex) => (
          <div
            className="favourite-brands-sequence"
            key={sequenceIndex}
            aria-hidden={sequenceIndex === 1 ? undefined : true}
          >
            {BRANDS.map((brand) => renderBrand(brand, sequenceIndex))}
          </div>
        ))}
      </div>
    </section>
  );
}
