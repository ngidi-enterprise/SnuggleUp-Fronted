import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import CategorySuggestionButton, { CATEGORY_OPTIONS } from '../CategorySuggestionButton';
import DescriptionGeneratorButton from '../DescriptionGeneratorButton';
import './LocalProductManager.css';

// Determine API base consistently with the rest of the app
const API_BASE = (import.meta.env.VITE_API_BASE)
  || ((typeof window !== 'undefined' && (window.location.hostname === 'snuggleup.co.za' || window.location.hostname === 'www.snuggleup.co.za'))
        ? 'https://snuggleup-backend.onrender.com'
        : 'http://localhost:3000');

const dimensionsFromProduct = (rawDimensions) => {
  if (!rawDimensions) return {};
  if (typeof rawDimensions === 'object' && !Array.isArray(rawDimensions)) return rawDimensions;

  try {
    const parsed = JSON.parse(rawDimensions);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const dimensionValue = (dimensions, keys) => {
  const value = keys.map((key) => dimensions[key]).find((entry) => entry !== undefined && entry !== null);
  return value ?? '';
};

const dimensionsFromForm = (formData) => {
  const entries = [formData.length_cm, formData.width_cm, formData.height_cm];
  const dimensions = {
    length_cm: Number(formData.length_cm),
    width_cm: Number(formData.width_cm),
    height_cm: Number(formData.height_cm)
  };

  const values = Object.values(dimensions);
  const hasAnyValue = entries.some((value) => String(value).trim() !== '');
  const hasCompleteValues = values.every((value) => Number.isFinite(value) && value > 0);

  return { dimensions: hasCompleteValues ? dimensions : null, hasAnyValue, hasCompleteValues };
};

export default function LocalProductManager({ access = {}, onProductStatsChange }) {
  const { token } = useAuth(); // Get token from auth context
  const isSuperuser = Boolean(access.isSuperuser);
  const isProductAssistant = Boolean(access.isProductAssistant);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [assistantNotifications, setAssistantNotifications] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    compare_at_price: '',
    stock_quantity: '',
    sku: '',
    category: 'General',
    tags: '',
    images: '',
    weight_kg: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    is_featured: false,
    is_active: true
  });
  const [message, setMessage] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchAssistantNotifications();
    }
  }, [token, isProductAssistant]);

  useEffect(() => {
    if (!isProductAssistant || typeof onProductStatsChange !== 'function') return;

    onProductStatsChange({
      uploaded: products.length,
      approved: products.filter((product) => product.approval_status === 'approved').length
    });
  }, [products, isProductAssistant, onProductStatsChange]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/local-products/manage`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching local products:', error);
      setMessage('Failed to load products. Please check backend availability.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssistantNotifications = async () => {
    if (!isProductAssistant) return;

    try {
      const response = await fetch(`${API_BASE}/api/local-products/assistant/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setAssistantNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching product approval notifications:', error);
    }
  };

  const markAssistantNotificationsRead = async () => {
    if (!assistantNotifications.length) return;
    const ids = assistantNotifications.map((notification) => notification.id);
    setAssistantNotifications([]);

    try {
      await fetch(`${API_BASE}/api/local-products/assistant/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids })
      });
    } catch (error) {
      console.error('Error marking approval notifications read:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      setMessage('Error: Not authenticated. Please log in again.');
      return;
    }

    try {
      const shippingDimensions = dimensionsFromForm(formData);
      if (shippingDimensions.hasAnyValue && !shippingDimensions.hasCompleteValues) {
        setMessage('Error: Enter length, width, and height together.');
        return;
      }

      // Prevent duplicate SKU (must be unique)
      if (formData.sku && products.some(p => p.sku && p.sku.toLowerCase() === formData.sku.toLowerCase() && p.id !== editingId)) {
        setMessage('Error: SKU already exists. Please use a unique SKU.');
        return;
      }

      const { length_cm, width_cm, height_cm, ...productData } = formData;
      const payload = {
        ...productData,
        stock_quantity: parseInt(formData.stock_quantity),
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        images: formData.images ? formData.images.split('\n').filter(url => url.trim()) : [],
        dimensions: shippingDimensions.dimensions
      };

      if (isSuperuser) {
        payload.price = parseFloat(formData.price);
        payload.compare_at_price = formData.compare_at_price ? parseFloat(formData.compare_at_price) : null;
      } else {
        delete payload.price;
        delete payload.compare_at_price;
        delete payload.is_featured;
        delete payload.is_active;
      }

      const url = editingId 
        ? `${API_BASE}/api/local-products/${editingId}`
        : `${API_BASE}/api/local-products`;
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save product');
      }

      setMessage(
        isProductAssistant
          ? (editingId ? 'Product changes sent for superuser review.' : 'Product submitted for superuser review.')
          : (editingId ? 'Product updated successfully!' : 'Product created successfully!')
      );
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      // Network errors often show as TypeError: Failed to fetch
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        setMessage('Error: Failed to reach backend. Check VITE_API_BASE and CORS.');
      } else {
        setMessage(`Error: ${error.message}`);
      }
    }
  };

  const handleEdit = (product) => {
    const dimensions = dimensionsFromProduct(product.dimensions);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      compare_at_price: product.compare_at_price || '',
      stock_quantity: product.stock_quantity,
      sku: product.sku || '',
      category: product.category || 'General',
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
      images: Array.isArray(product.images) ? product.images.join('\n') : '',
      weight_kg: product.weight_kg || '',
      length_cm: dimensionValue(dimensions, ['length_cm', 'length', 'l']),
      width_cm: dimensionValue(dimensions, ['width_cm', 'width', 'w']),
      height_cm: dimensionValue(dimensions, ['height_cm', 'height', 'h']),
      is_featured: product.is_featured,
      is_active: product.is_active
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    if (!token) {
      setMessage('Error: Not authenticated. Please log in again.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/local-products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete product');

      setMessage('Product deleted successfully!');
      fetchProducts();
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleApprove = async (product) => {
    if (!isSuperuser) return;

    const price = Number(product.price || 0);
    if (!Number.isFinite(price) || price <= 0) {
      setMessage('Error: Add a valid price before approving this product.');
      handleEdit(product);
      return;
    }

    if (!confirm(`Approve and publish "${product.name}" to the store?`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/local-products/${product.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price: product.price,
          compare_at_price: product.compare_at_price || null,
          stock_quantity: product.stock_quantity,
          is_featured: product.is_featured
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve product');
      }

      setMessage(`Product approved and published: ${data.product?.name || product.name}`);
      fetchProducts();
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      compare_at_price: '',
      stock_quantity: '',
      sku: '',
      category: 'General',
      tags: '',
      images: '',
      weight_kg: '',
      length_cm: '',
      width_cm: '',
      height_cm: '',
      is_featured: false,
      is_active: true
    });
  };

  // Compress and convert images to data URLs (stored directly in DB)
  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    setMessage('Processing images...');

    try {
      const uploadedUrls = [];
      
      for (const file of files) {
        // Compress image to reasonable size before storing
        const compressed = await compressImage(file, 800, 0.85);
        uploadedUrls.push(compressed);
      }

      // Append new URLs to existing ones
      const existingUrls = formData.images ? formData.images.trim().split('\n').filter(u => u) : [];
      const allUrls = [...existingUrls, ...uploadedUrls].join('\n');

      setFormData(prev => ({ ...prev, images: allUrls }));
      setMessage(`Successfully processed ${uploadedUrls.length} image(s)! (Optimized & stored)`);
    } catch (error) {
      setMessage(`Error processing images: ${error.message}`);
    } finally {
      setUploadingImages(false);
    }
  };

  // Compress image to data URL with max dimensions and quality
  const compressImage = (file, maxSize = 800, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          // Draw to canvas and compress
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to data URL with compression
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleImageUpload(files);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      handleImageUpload(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  if (loading) return <div className="loading">Loading products...</div>;

  return (
    <div className="local-product-manager">
      <div className="local-warehouse-actions" style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '20px' 
      }}>
        <button 
          className="btn-primary"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            resetForm();
          }}
          style={{ display: showForm ? 'none' : 'inline-block' }}
        >
          + Add New Product
        </button>
      </div>

      {isProductAssistant && (
        <div className="assistant-access-card">
          <strong>Product assistant access</strong>
          <p>You can upload product details, descriptions, images, stock, weight, and dimensions.</p>
        </div>
      )}

      {isSuperuser && products.some((product) => product.approval_status === 'pending_review') && (
        <div className="assistant-access-card superuser-review-card">
          <strong>Products waiting for review</strong>
          <p>Review pending uploads, add prices, then approve and publish them when ready.</p>
        </div>
      )}

      {assistantNotifications.length > 0 && (
        <div className="message success">
          <span>
            Congratulations, {assistantNotifications.map((item) => item.name).join(', ')} {assistantNotifications.length === 1 ? 'has' : 'have'} been approved and are now live.
          </span>
          <button onClick={markAssistantNotificationsRead}>x</button>
        </div>
      )}

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
          <button onClick={() => setMessage('')}>✕</button>
        </div>
      )}

      {showForm && (
        <form className="product-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit Product' : 'Add New Product'}</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>SKU <span style={{fontSize: '12px', color: '#666'}}>(Auto-generated if left empty)</span></label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="SNUG-0126-0001-HUG"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!formData.name) {
                      setMessage('Error: Enter product name first to generate SKU');
                      return;
                    }
                    try {
                      const response = await fetch(
                        `${API_BASE}/api/local-products/generate-sku?productName=${encodeURIComponent(formData.name)}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                      );
                      const data = await response.json();
                      if (response.ok) {
                        setFormData({ ...formData, sku: data.sku });
                        setMessage(`Generated SKU: ${data.sku}`);
                      } else {
                        setMessage(`Error: ${data.error}`);
                      }
                    } catch (error) {
                      setMessage('Error: Failed to generate SKU');
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🔄 Generate
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>Description</span>
              {formData.images && formData.images.trim() && (
                <DescriptionGeneratorButton
                  productName={formData.name}
                  imageUrl={formData.images.trim().split('\n')[0]}
                  onDescriptionGenerated={(desc) => setFormData({ ...formData, description: desc })}
                  setMessage={setMessage}
                  token={token}
                  apiBase={API_BASE}
                  endpointBase="/api/local-products"
                />
              )}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Product description..."
            />
            {(!formData.images || !formData.images.trim()) && (
              <small style={{ color: '#999', marginTop: '4px', display: 'block' }}>
                💡 Tip: Upload an image above to use AI description generator
              </small>
            )}
          </div>

          <div className="form-row">
            {isSuperuser && (
              <>
                <div className="form-group">
                  <label>Price (R) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required={isSuperuser}
                  />
                </div>
                <div className="form-group">
                  <label>Compare At Price (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.compare_at_price}
                    onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
                    placeholder="Was R..."
                  />
                </div>
              </>
            )}
            <div className="form-group">
              <label>Stock Quantity</label>
              <input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ flex: 1 }}
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <CategorySuggestionButton
                  productName={formData.name}
                  description={formData.description}
                  onCategorySuggested={(cat) => setFormData({ ...formData, category: cat })}
                  setMessage={setMessage}
                  token={token}
                  apiBase={API_BASE}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                placeholder="0.5"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Tags (comma separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="essentials, best-seller, organic"
            />
          </div>

          <div className="form-group">
            <label>Image URLs (one per line) or Drop Files:</label>
            
            {/* File Drop Zone */}
            <div 
              className="file-drop-zone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                id="imageFiles"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="imageFiles" className="file-drop-label">
                {uploadingImages ? (
                  <>📤 Uploading...</>
                ) : (
                  <>📁 Drop images here or click to browse</>
                )}
              </label>
            </div>
            
            {/* Manual URL Textarea */}
            <textarea
              value={formData.images}
              onChange={(e) => setFormData({ ...formData, images: e.target.value })}
              rows={4}
              placeholder="Or paste image URLs here (one per line)"
              disabled={uploadingImages}
            />
            <small>Drop files to auto-upload to CDN, or paste URLs manually</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Length (cm)</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={formData.length_cm}
                onChange={(e) => setFormData({ ...formData, length_cm: e.target.value })}
                placeholder="30"
              />
            </div>
            <div className="form-group">
              <label>Width (cm)</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={formData.width_cm}
                onChange={(e) => setFormData({ ...formData, width_cm: e.target.value })}
                placeholder="20"
              />
            </div>
            <div className="form-group">
              <label>Height (cm)</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={formData.height_cm}
                onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                placeholder="15"
              />
            </div>
          </div>

          {isSuperuser && (
            <div className="form-checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                />
                Featured Product
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isProductAssistant
                ? (editingId ? 'Send Changes for Review' : 'Submit for Review')
                : (editingId ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      )}

      <div className="products-table">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>SKU</th>
              {isSuperuser && <th>Price</th>}
              <th>Stock</th>
              <th>Category</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="product-thumb" />
                  ) : (
                    <div className="no-image">📦</div>
                  )}
                </td>
                <td>
                  <strong>{product.name}</strong>
                  {product.is_featured && <span className="badge featured">⭐ Featured</span>}
                </td>
                <td>{product.sku || '-'}</td>
                {isSuperuser && (
                  <td>
                    {Number(product.price || 0) > 0 ? `R${product.price}` : 'Needs price'}
                    {product.compare_at_price && (
                      <span className="compare-price">R{product.compare_at_price}</span>
                    )}
                  </td>
                )}
                <td className={product.stock_quantity === 0 ? 'out-of-stock' : ''}>
                  {product.stock_quantity}
                </td>
                <td>{product.category}</td>
                <td>
                  <span className={`status ${product.approval_status === 'pending_review' ? 'pending' : (product.is_active ? 'active' : 'inactive')}`}>
                    {product.approval_status === 'pending_review' ? 'Pending review' : (product.is_active ? 'Live' : 'Inactive')}
                  </span>
                </td>
                <td className="actions">
                  {(isSuperuser || product.approval_status !== 'approved') && (
                    <button onClick={() => handleEdit(product)} title="Edit">✏️</button>
                  )}
                  {isSuperuser && product.approval_status === 'pending_review' && (
                    <button onClick={() => handleApprove(product)} title="Approve and publish" className="approve">Approve</button>
                  )}
                  {isSuperuser && (
                    <button onClick={() => handleDelete(product.id)} title="Delete" className="delete">🗑️</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && !showForm && (
          <div className="empty-state">
            <p>📦 No products yet. Click "Add Product" to get started!</p>
            <button 
              className="btn-primary btn-large"
              onClick={() => setShowForm(true)}
            >
              ➕ Add Your First Product
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
