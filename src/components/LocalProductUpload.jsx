import React, { useState, useCallback } from 'react';
import './LocalProductUpload.css';

const CATEGORIES = [
  'strollers', 'car-seats', 'feeding', 'toys', 'clothing',
  'safety', 'furniture', 'gear', 'bath', 'outdoor'
];

const API_BASE = import.meta.env.VITE_API_BASE || 'https://snuggleup-backend.onrender.com';

export default function LocalProductUpload({ onClose, onProductAdded, token }) {
  const [step, setStep] = useState('details'); // details | images | review
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    compare_at_price: '',
    stock_quantity: '',
    sku: '',
    category: 'toys',
    tags: '',
    weight_kg: '',
    dimensions: '',
    is_featured: false
  });

  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Handle text input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  // Handle image selection and conversion to base64
  const handleImageSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    const newImages = [];
    const newPreviews = [];

    try {
      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Please select only image files');
          continue;
        }

        // Validate file size (max 5MB per image)
        if (file.size > 5 * 1024 * 1024) {
          setError('Image size must be less than 5MB');
          continue;
        }

        // Convert to base64
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            newImages.push(reader.result);
            newPreviews.push({
              url: reader.result,
              name: file.name,
              size: (file.size / 1024).toFixed(2)
            });
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setImages(prev => [...prev, ...newImages]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
      setError('');
    } catch (err) {
      setError(`Failed to process images: ${err.message}`);
    } finally {
      setUploadingImages(false);
    }
  }, []);

  // Remove image from preview
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Validate form data
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Product name is required');
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Valid price is required');
      return false;
    }
    if (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0) {
      setError('Stock quantity is required');
      return false;
    }
    if (images.length === 0) {
      setError('At least one product image is required');
      return false;
    }
    return true;
  };

  // Submit product
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        stock_quantity: parseInt(formData.stock_quantity),
        sku: formData.sku.trim() || null,
        category: formData.category,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        images: images, // base64 data URLs
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        dimensions: formData.dimensions.trim() || null,
        is_featured: formData.is_featured,
        is_active: true
      };

      const response = await fetch(`${API_BASE}/api/local-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create product');
      }

      const newProduct = await response.json();
      setSuccess('✅ Product uploaded successfully!');
      
      // Reset form
      setTimeout(() => {
        if (onProductAdded) onProductAdded(newProduct);
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Product Details
  const renderDetailsStep = () => (
    <div className="upload-step">
      <h3>📝 Product Details</h3>
      
      <div className="form-group">
        <label>Product Name *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="e.g., Baby Stroller Premium Edition"
          maxLength={100}
        />
        <small>{formData.name.length}/100</small>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Price (ZAR) *</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            placeholder="399.99"
            step="0.01"
            min="0"
          />
        </div>
        <div className="form-group">
          <label>Compare At Price (ZAR)</label>
          <input
            type="number"
            name="compare_at_price"
            value={formData.compare_at_price}
            onChange={handleInputChange}
            placeholder="499.99"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Stock Quantity *</label>
          <input
            type="number"
            name="stock_quantity"
            value={formData.stock_quantity}
            onChange={handleInputChange}
            placeholder="10"
            min="0"
          />
        </div>
        <div className="form-group">
          <label>SKU</label>
          <input
            type="text"
            name="sku"
            value={formData.sku}
            onChange={handleInputChange}
            placeholder="SKU-001"
            maxLength={50}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Category *</label>
          <select name="category" value={formData.category} onChange={handleInputChange}>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="is_featured"
              checked={formData.is_featured}
              onChange={handleInputChange}
            />
            Feature this product
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe your product, features, materials, etc."
          rows={4}
          maxLength={1000}
        />
        <small>{formData.description.length}/1000</small>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Tags (comma-separated)</label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleInputChange}
            placeholder="baby, stroller, travel"
            maxLength={200}
          />
        </div>
        <div className="form-group">
          <label>Weight (kg)</label>
          <input
            type="number"
            name="weight_kg"
            value={formData.weight_kg}
            onChange={handleInputChange}
            placeholder="2.5"
            step="0.1"
            min="0"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Dimensions</label>
        <input
          type="text"
          name="dimensions"
          value={formData.dimensions}
          onChange={handleInputChange}
          placeholder="e.g., 100cm x 50cm x 80cm"
          maxLength={100}
        />
      </div>

      <button className="btn-next" onClick={() => setStep('images')}>
        Next: Add Images →
      </button>
    </div>
  );

  // Step 2: Product Images
  const renderImagesStep = () => (
    <div className="upload-step">
      <h3>🖼️ Product Images</h3>
      <p className="step-hint">Upload high-quality product images (first image will be thumbnail)</p>

      <div className="image-upload-area">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageSelect}
          disabled={uploadingImages}
          id="image-input"
        />
        <label htmlFor="image-input" className={uploadingImages ? 'uploading' : ''}>
          {uploadingImages ? '⏳ Processing images...' : '📸 Click to select images'}
        </label>
      </div>

      {imagePreviews.length > 0 && (
        <div className="image-previews">
          <h4>Selected Images ({imagePreviews.length})</h4>
          <div className="preview-grid">
            {imagePreviews.map((preview, idx) => (
              <div key={idx} className="preview-item">
                <div className="preview-badge">{idx === 0 ? '🎯 Thumbnail' : `${idx + 1}`}</div>
                <img src={preview.url} alt={`Preview ${idx + 1}`} />
                <p>{preview.name}</p>
                <small>{preview.size} KB</small>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removeImage(idx)}
                  disabled={loading}
                >
                  ✕ Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="step-buttons">
        <button className="btn-back" onClick={() => setStep('details')} disabled={loading}>
          ← Back
        </button>
        <button
          className="btn-next"
          onClick={() => setStep('review')}
          disabled={images.length === 0 || loading}
        >
          Next: Review →
        </button>
      </div>
    </div>
  );

  // Step 3: Review
  const renderReviewStep = () => (
    <div className="upload-step">
      <h3>✅ Review & Publish</h3>

      <div className="review-preview">
        <div className="review-left">
          <div className="preview-main-image">
            <img src={imagePreviews[0]?.url || ''} alt="Product" />
            <div className="fast-shipping-badge">⚡ 2-3 Working Days</div>
          </div>
        </div>

        <div className="review-right">
          <h4>{formData.name}</h4>
          
          {formData.compare_at_price && (
            <div className="price-row">
              <span className="price-original">R{parseFloat(formData.compare_at_price).toFixed(2)}</span>
              <span className="price-current">R{parseFloat(formData.price).toFixed(2)}</span>
            </div>
          )}
          {!formData.compare_at_price && (
            <div className="price-current">R{parseFloat(formData.price).toFixed(2)}</div>
          )}

          <div className="review-meta">
            <span>📦 Stock: {formData.stock_quantity} units</span>
            <span>📂 {formData.category}</span>
            {formData.sku && <span>🏷️ {formData.sku}</span>}
          </div>

          {formData.description && (
            <div className="review-description">
              <p>{formData.description}</p>
            </div>
          )}

          <div className="review-images">
            <p>Images: {images.length} uploaded</p>
            <div className="thumb-strip">
              {imagePreviews.map((p, idx) => (
                <img key={idx} src={p.url} alt={`Thumb ${idx}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="step-buttons">
        <button className="btn-back" onClick={() => setStep('images')} disabled={loading}>
          ← Back
        </button>
        <button
          className="btn-publish"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '⏳ Publishing...' : '🚀 Publish Product'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="local-product-upload-modal" onClick={onClose}>
      <div className="local-product-upload-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-upload" onClick={onClose}>✕</button>

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            {error}
            <button className="alert-close" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {step === 'details' && renderDetailsStep()}
        {step === 'images' && renderImagesStep()}
        {step === 'review' && renderReviewStep()}

        <div className="upload-progress">
          <div className={`progress-step ${step === 'details' ? 'active' : step !== 'details' ? 'done' : ''}`}>
            Step 1: Details
          </div>
          <div className={`progress-step ${step === 'images' ? 'active' : step === 'review' ? 'done' : ''}`}>
            Step 2: Images
          </div>
          <div className={`progress-step ${step === 'review' ? 'active' : ''}`}>
            Step 3: Review
          </div>
        </div>
      </div>
    </div>
  );
}
