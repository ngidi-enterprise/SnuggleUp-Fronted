import React from 'react';
import './PaymentTrustBanner.css';

export default function PaymentTrustBanner() {
  return (
    <div className="payfast-trust-fallback" role="img" aria-label="PayFast safe and secure payments">
      <div className="payfast-trust-main">
        <div>
          <div className="payfast-trust-logo">
            <span>Pay</span>Fast
          </div>
          <div className="payfast-trust-company">A DPO Company</div>
        </div>
        <div className="payfast-trust-divider" />
        <div className="payfast-trust-message">Safe and secure payments</div>
      </div>
      <div className="payfast-trust-methods" aria-hidden="true">
        <span className="trust-method trust-method-eft">instant EFT</span>
        <span className="trust-method trust-method-bank">ABSA</span>
        <span className="trust-method trust-method-bank">FNB</span>
        <span className="trust-method trust-method-bank">Nedbank</span>
        <span className="trust-method trust-method-bank">Standard Bank</span>
        <span className="trust-method trust-method-visa">VISA</span>
        <span className="trust-method trust-method-mastercard">Mastercard</span>
      </div>
    </div>
  );
}
