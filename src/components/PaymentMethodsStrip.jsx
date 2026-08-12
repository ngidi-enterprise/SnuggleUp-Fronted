import React from 'react';
import './PaymentMethodsStrip.css';
import visaLogo from '../assets/payment-methods/visa.svg';
import mastercardLogo from '../assets/payment-methods/mastercard.svg';
import americanExpressLogo from '../assets/payment-methods/american-express.svg';
import applePayLogo from '../assets/payment-methods/apple-pay.png';
import samsungPayLogo from '../assets/payment-methods/samsung-pay.png';
import instantEftLogo from '../assets/payment-methods/instant-eft.svg';
import scanToPayLogo from '../assets/payment-methods/scan-to-pay.svg';
import snapScanLogo from '../assets/payment-methods/snapscan.svg';
import zapperLogo from '../assets/payment-methods/zapper.svg';
import mobicredLogo from '../assets/payment-methods/mobicred.svg';
import rcsLogo from '../assets/payment-methods/rcs.svg';

const PAYMENT_METHODS = [
  { name: 'Visa', logo: visaLogo },
  { name: 'Mastercard', logo: mastercardLogo },
  { name: 'American Express', logo: americanExpressLogo },
  { name: 'Apple Pay', logo: applePayLogo },
  { name: 'Samsung Pay', logo: samsungPayLogo },
  { name: 'Instant EFT', logo: instantEftLogo },
  { name: 'Scan to Pay', logo: scanToPayLogo },
  { name: 'SnapScan', logo: snapScanLogo },
  { name: 'Zapper', logo: zapperLogo },
  { name: 'Mobicred', logo: mobicredLogo },
  { name: 'RCS Store Card', logo: rcsLogo }
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
