import React, { useState } from 'react';
import './ShippingForm.css';

// South African ID validator (13 digits + checksum)
const isValidSouthAfricanId = (value) => {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length !== 13) return false;
  const nums = digits.split('').map(Number);

  // Sum of digits in odd positions (1,3,5,7,9,11) excluding check digit
  const sumOdd = nums.slice(0, 12).filter((_, idx) => idx % 2 === 0).reduce((a, b) => a + b, 0);

  // Even positions concatenated, doubled, then sum of digits
  const evenStr = nums.slice(0, 12).filter((_, idx) => idx % 2 === 1).join('');
  const doubled = String(Number(evenStr || '0') * 2);
  const sumEven = doubled.split('').reduce((a, b) => a + Number(b), 0);

  const total = sumOdd + sumEven;
  const checkDigit = (10 - (total % 10)) % 10;
  return checkDigit === nums[12];
};

export default function ShippingForm({
  onSubmit,
  onCancel,
  initialData,
  readonlyEmail = false,
  orderSummary = {},
  shippingLabel = 'Delivery',
  hasLocalItems = false,
  localDeliveryMode = 'economy',
  localFreeDeliveryEligible = false,
  localShippingQuotes = [],
  selectedLocalShipping = null,
  localShippingLoading = false,
  localShippingError = '',
  onLocalDeliveryModeChange,
  onLocalShippingSelect,
  onCheckLocalShippingRates
}) {
  // Be resilient to null/undefined initialData
  const safeInit = initialData ?? {};
  const [formData, setFormData] = useState({
    email: safeInit.email || '',
    firstName: safeInit.firstName || '',
    lastName: safeInit.lastName || '',
    address: safeInit.address || '',
    suburb: safeInit.suburb || '',
    city: safeInit.city || '',
    province: safeInit.province || 'Gauteng',
    postalCode: safeInit.postalCode || '',
    phone: safeInit.phone || '',
    smsTrackingOptIn: Boolean(safeInit.smsTrackingOptIn || safeInit.smsTrackingConsent)
  });

  const [errors, setErrors] = useState({});
  const [deliverySelectionError, setDeliverySelectionError] = useState('');

  // helper to assemble full name for parent
  const getCustomerName = () => `${formData.firstName} ${formData.lastName}`.trim();

  const provinces = [
    'Gauteng',
    'Western Cape',
    'KwaZulu-Natal',
    'Eastern Cape',
    'Free State',
    'Limpopo',
    'Mpumalanga',
    'Northern Cape',
    'North West'
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Street address is required';
    }

    if (!formData.suburb.trim()) {
      newErrors.suburb = 'Suburb is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    } else if (!/^\d{4}$/.test(formData.postalCode)) {
      newErrors.postalCode = 'Postal code must be 4 digits';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Mobile number is required';
    } else if (!/^0\d{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Mobile number must be 10 digits starting with 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: nextValue }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    const localQuoteFields = new Set(['address', 'suburb', 'city', 'province', 'postalCode']);
    if (hasLocalItems && localDeliveryMode !== 'economy' && localQuoteFields.has(name)) {
      onLocalShippingSelect?.(null);
      setDeliverySelectionError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (hasLocalItems && localDeliveryMode !== 'economy' && !selectedLocalShipping) {
      setDeliverySelectionError('Choose a live courier rate before continuing to payment.');
      return;
    }

    onSubmit(formData);
  };

  const requestLocalShippingRates = () => {
    if (!validateForm()) return;
    setDeliverySelectionError('');
    onCheckLocalShippingRates?.({
      ...formData,
      customerName: getCustomerName()
    });
  };

  const matchingLocalRates = localShippingQuotes.filter(rate => rate.type === localDeliveryMode);
  const localDeliveryIsFree = localFreeDeliveryEligible && ['economy', 'pickup'].includes(localDeliveryMode);

  return (
    <div className="shipping-form-overlay">
      <div className="shipping-form-container">
        <div className="shipping-form-header">
          <h2>📦 Shipping Details</h2>
          <p>Please provide your delivery address</p>
        </div>

        <div className="shipping-order-summary">
          <div>
            <span>{orderSummary.itemCount || 0} item(s)</span>
            <strong>{shippingLabel}</strong>
          </div>
          <div>
            <span>Subtotal</span>
            <strong>R{Number(orderSummary.subtotal || 0).toFixed(2)}</strong>
          </div>
          <div>
            <span>Shipping</span>
            <strong>R{Number(orderSummary.shipping || 0).toFixed(2)}</strong>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>R{Number(orderSummary.total || 0).toFixed(2)}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="shipping-form">
          {/* Email required even for guest checkout */}
          <div className="form-group">
            <label htmlFor="email">
              Email Address <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g., you@example.com"
              className={errors.email ? 'error' : ''}
              disabled={readonlyEmail}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">
                First Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="e.g., John"
                className={errors.firstName ? 'error' : ''}
              />
              {errors.firstName && <span className="error-message">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">
                Last Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="e.g., Smith"
                className={errors.lastName ? 'error' : ''}
              />
              {errors.lastName && <span className="error-message">{errors.lastName}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone">
              Phone Number <span className="required">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g., 0821234567"
              className={errors.phone ? 'error' : ''}
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <label className="sms-consent">
            <input
              type="checkbox"
              name="smsTrackingOptIn"
              checked={formData.smsTrackingOptIn}
              onChange={handleChange}
            />
            <span>
              <strong>Send delivery updates by SMS</strong>
              <small>We will only text important tracking updates. SMS costs are covered by SnuggleUp.</small>
            </span>
          </label>

          <div className="form-group">
            <label htmlFor="address">
              Street Address <span className="required">*</span>
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g., 123 Main Street, Suburb"
              className={errors.address ? 'error' : ''}
            />
            {errors.address && <span className="error-message">{errors.address}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="suburb">
              Suburb <span className="required">*</span>
            </label>
            <input
              type="text"
              id="suburb"
              name="suburb"
              value={formData.suburb}
              onChange={handleChange}
              placeholder="e.g., Crown City"
              className={errors.suburb ? 'error' : ''}
            />
            {errors.suburb && <span className="error-message">{errors.suburb}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">
                City <span className="required">*</span>
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g., Johannesburg"
                className={errors.city ? 'error' : ''}
              />
              {errors.city && <span className="error-message">{errors.city}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="postalCode">
                Postal Code <span className="required">*</span>
              </label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="e.g., 2196"
                maxLength="4"
                className={errors.postalCode ? 'error' : ''}
              />
              {errors.postalCode && <span className="error-message">{errors.postalCode}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="province">
              Province <span className="required">*</span>
            </label>
            <select
              id="province"
              name="province"
              value={formData.province}
              onChange={handleChange}
            >
              {provinces.map(prov => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
          </div>

          {hasLocalItems && (
            <div className="form-group">
              <label>Local Delivery Method</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    onLocalDeliveryModeChange?.('economy');
                    onLocalShippingSelect?.(null);
                    setDeliverySelectionError('');
                  }}
                  className="btn-cancel"
                  style={{
                    borderColor: localDeliveryMode === 'economy' ? '#126F71' : undefined,
                    background: localDeliveryMode === 'economy' ? '#e8f6f3' : undefined
                  }}
                >
                  {localFreeDeliveryEligible ? 'Standard delivery - Free' : 'Standard delivery - R99'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLocalDeliveryModeChange?.('express');
                    onLocalShippingSelect?.(null);
                    setDeliverySelectionError('');
                  }}
                  className="btn-cancel"
                  style={{
                    borderColor: localDeliveryMode === 'express' ? '#126F71' : undefined,
                    background: localDeliveryMode === 'express' ? '#e8f6f3' : undefined
                  }}
                >
                  Express live rate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLocalDeliveryModeChange?.('pickup');
                    onLocalShippingSelect?.(null);
                    setDeliverySelectionError('');
                  }}
                  className="btn-cancel"
                  style={{
                    borderColor: localDeliveryMode === 'pickup' ? '#126F71' : undefined,
                    background: localDeliveryMode === 'pickup' ? '#e8f6f3' : undefined
                  }}
                >
                  {localFreeDeliveryEligible ? 'Pick-up point - Free delivery' : 'Pick-up point live rate'}
                </button>
              </div>

              {localDeliveryMode !== 'economy' && (
                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={requestLocalShippingRates}
                    disabled={localShippingLoading}
                  >
                    {localShippingLoading ? 'Checking live courier rates...' : 'Get live courier rates'}
                  </button>

                  {localShippingError && (
                    <span className="error-message" style={{ display: 'block', marginTop: '8px' }}>
                      {localShippingError}
                    </span>
                  )}

                  {matchingLocalRates.length > 0 && (
                    <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                      {matchingLocalRates.map(rate => (
                        <button
                          key={rate.id}
                          type="button"
                          onClick={() => {
                            onLocalShippingSelect?.(rate);
                            setDeliverySelectionError('');
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px',
                            border: selectedLocalShipping?.id === rate.id ? '2px solid #126F71' : '1px solid #ddd',
                            background: selectedLocalShipping?.id === rate.id ? '#e8f6f3' : '#fff',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <span>
                            <strong>{rate.label}</strong>
                            {rate.deliveryEstimate && <small style={{ display: 'block' }}>{rate.deliveryEstimate}</small>}
                          </span>
                          <strong>{localDeliveryMode === 'pickup' && localDeliveryIsFree ? 'Free' : `R${Number(rate.priceZAR).toFixed(2)}`}</strong>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {deliverySelectionError && (
                <span className="error-message" style={{ display: 'block', marginTop: '8px' }}>
                  {deliverySelectionError}
                </span>
              )}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              Continue to Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
