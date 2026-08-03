import React, { useRef } from 'react';

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

  const scroll = (direction) => {
    trackRef.current?.scrollBy({
      left: direction * Math.min(trackRef.current.clientWidth * 0.75, 620),
      behavior: 'smooth',
    });
  };

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

      <div className="favourite-brands-track" ref={trackRef}>
        {BRANDS.map((brand) => (
          <button
            className="brand-logo-button favourite-brand-card"
            key={brand.name}
            type="button"
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
        ))}
      </div>
    </section>
  );
}
