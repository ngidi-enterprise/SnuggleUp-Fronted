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

export default function ShippingForm({ onSubmit, onCancel, initialData }) {
  // Be resilient to null/undefined initialData
  const safeInit = initialData ?? {};
  const [formData, setFormData] = useState({
    customerName: safeInit.customerName || '',
    address: safeInit.address || '',
    city: safeInit.city || '',
    province: safeInit.province || 'Gauteng',
    postalCode: safeInit.postalCode || '',
    phone: safeInit.phone || '',
    idNumber: safeInit.idNumber || ''
  });

  const [errors, setErrors] = useState({});

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

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Full name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Street address is required';
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
      newErrors.phone = 'Phone number is required';
    } else if (!/^0\d{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits starting with 0';
    }

    // South African ID number (13 digits)
    const idDigits = formData.idNumber.replace(/\D/g, '');
    if (!idDigits) {
      newErrors.idNumber = 'South African ID number is required';
    } else if (!/^\d{13}$/.test(idDigits)) {
      newErrors.idNumber = 'ID number must be exactly 13 digits';
    } else if (!isValidSouthAfricanId(idDigits)) {
      newErrors.idNumber = 'ID number checksum is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Restrict idNumber to digits only while typing
    const nextValue = name === 'idNumber' ? value.replace(/\D/g, '') : value;
    setFormData(prev => ({ ...prev, [name]: nextValue }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="shipping-form-overlay">
      <div className="shipping-form-container">
        <div className="shipping-form-header">
          <h2>📦 Shipping Details</h2>
          <p>Please provide your delivery address</p>
        </div>

        <form onSubmit={handleSubmit} className="shipping-form">
          <div className="form-group">
            <label htmlFor="customerName">
              Full Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              placeholder="e.g., John Smith"
              className={errors.customerName ? 'error' : ''}
            />
            {errors.customerName && <span className="error-message">{errors.customerName}</span>}
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

          <div className="form-group">
            <label htmlFor="idNumber">
              South African ID Number <span className="required">*</span>
            </label>
            <input
              type="text"
              id="idNumber"
              name="idNumber"
              value={formData.idNumber}
              onChange={handleChange}
              placeholder="13 digits"
              maxLength="13"
              className={errors.idNumber ? 'error' : ''}
            />
            {errors.idNumber && <span className="error-message">{errors.idNumber}</span>}
            <small className="helper-text">Required for delivery verification and customs.</small>
          </div>

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
