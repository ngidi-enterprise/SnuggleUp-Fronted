import React from 'react';
import './PaymentMethodsStrip.css';

const PAYMENT_METHODS = [
  { name: 'Visa', logo: '/images/payment-methods/visa.svg' },
  { name: 'Mastercard', logo: '/images/payment-methods/mastercard.svg' },
  { name: 'American Express', logo: '/images/payment-methods/american-express.svg' },
  { name: 'Apple Pay', logo: '/images/payment-methods/apple-pay.png' },
  { name: 'Samsung Pay', logo: '/images/payment-methods/samsung-pay.png' },
  { name: 'Instant EFT', logo: '/images/payment-methods/instant-eft.svg' },
  { name: 'Scan to Pay', logo: '/images/payment-methods/scan-to-pay.svg' },
  { name: 'SnapScan', logo: '/images/payment-methods/snapscan.svg' },
  { name: 'Zapper', logo: '/images/payment-methods/zapper.svg' },
  { name: 'Mobicred', logo: '/images/payment-methods/mobicred.svg' },
  { name: 'RCS Store Card', logo: '/images/payment-methods/rcs.svg' }
];

export default function PaymentMethodsStrip({ compact = false }) {
  return (
    <section
      className={`payment-methods-strip ${compact ? 'payment-methods-strip--compact' : ''}`}
      aria-label="Payment methods available through PayFast"
    >
      <div className="payment-methods-heading">
        <span>Payment options</span>
        <strong>Choose how you want to pay securely at checkout</strong>
      </div>
      <div className="payment-methods-list">
        {PAYMENT_METHODS.map((method) => (
          <div
            className="payment-method-logo"
            key={method.name}
            title={method.name}
            aria-label={method.name}
          >
            <img src={method.logo} alt={`${method.name} logo`} loading="lazy" />
          </div>
        ))}
      </div>
    </section>
  );
}
