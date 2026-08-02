import React, { useRef } from 'react';

const BRANDS = [
  { name: "Johnson's", image: '/images/brands/johnsons.png', search: 'johnson' },
  { name: 'Nestle', image: '/images/brands/nestle.svg', search: 'nestl' },
  { name: 'Huggies', image: '/images/brands/huggies.svg', search: 'huggies' },
  { name: 'Pampers', image: '/images/brands/pampers.svg', search: 'pampers' },
  { name: 'Lil Masters', image: '/images/brands/lil-masters.svg', search: 'lil masters' },
  { name: 'Bennetts', image: '/images/brands/bennetts.svg', search: 'bennetts' },
  { name: 'Purity', image: '/images/brands/purity.png', search: 'purity' },
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
        {BRANDS.map(brand => (
          <button
            className="brand-logo-button"
            key={brand.name}
            type="button"
            onClick={() => onSelectBrand?.(brand.search)}
            aria-label={`Shop ${brand.name} products`}
            title={`Shop ${brand.name}`}
          >
            <img src={brand.image} alt={`${brand.name} logo`} loading="lazy" />
          </button>
        ))}
      </div>
    </section>
  );
}
