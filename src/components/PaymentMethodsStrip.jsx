import React from 'react';
import './PaymentMethodsStrip.css';

const PAYMENT_METHODS = [
  { name: 'Credit Card', mark: 'VISA', className: 'visa' },
  { name: 'Debit Card', mark: 'Debit', className: 'debit' },
  { name: 'American Express', mark: 'AMEX', className: 'amex' },
  { name: 'Apple Pay', mark: 'Pay', className: 'apple' },
  { name: 'Google Pay', mark: 'G Pay', className: 'google' },
  { name: 'Samsung Pay', mark: 'Samsung', className: 'samsung' },
  { name: 'Instant EFT', mark: 'EFT', className: 'eft' },
  { name: 'Scan to Pay', mark: 'QR', className: 'qr' },
  { name: 'SnapScan', mark: 'Snap', className: 'snapscan' },
  { name: 'Zapper', mark: 'Zapper', className: 'zapper' },
  { name: 'Mobicred', mark: 'Mobi', className: 'mobicred' },
  { name: 'RCS Store Card', mark: 'RCS', className: 'rcs' }
];

export default function PaymentMethodsStrip({ compact = false }) {
  return (
    <section
      className={`payment-methods-strip ${compact ? 'payment-methods-strip--compact' : ''}`}
      aria-label="Payment methods available at checkout"
    >
      <div className="payment-methods-heading">
        <span>Payment options</span>
        <strong>Choose how you want to pay securely at checkout</strong>
      </div>
      <div className="payment-methods-list">
        {PAYMENT_METHODS.map((method) => (
          <span className="payment-method-pill" key={method.name}>
            <span className={`payment-method-mark payment-method-mark--${method.className}`}>
              {method.mark}
            </span>
            <span>{method.name}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
