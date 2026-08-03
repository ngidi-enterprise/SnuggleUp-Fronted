import React, { useRef } from 'react';
import bennettsSvg from '../assets/brands/bennetts.svg?raw';
import johnsonsLogo from '../assets/brands/johnsons.png';
import lilMastersSvg from '../assets/brands/lil-masters.svg?raw';
import nestleSvg from '../assets/brands/nestle.svg?raw';
import pampersSvg from '../assets/brands/pampers.svg?raw';
import purityLogo from '../assets/brands/purity.png';

const svgLogo = (source) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;

const BRANDS = [
  { name: "Johnson's", logo: johnsonsLogo, search: 'johnson' },
  { name: 'Nestlé', logo: svgLogo(nestleSvg), search: 'nestl' },
  {
    name: 'Huggies',
    logo: 'https://images.seeklogo.com/logo-png/32/1/huggies-logo-png_seeklogo-324264.png',
    search: 'huggies',
  },
  { name: 'Pampers', logo: svgLogo(pampersSvg), search: 'pampers' },
  { name: 'Lil Masters', logo: svgLogo(lilMastersSvg), search: 'lil masters' },
  { name: 'Bennetts', logo: svgLogo(bennettsSvg), search: 'bennetts' },
  { name: 'Purity', logo: purityLogo, search: 'purity' },
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
            <img
              src={brand.logo}
              alt=""
              aria-hidden="true"
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
