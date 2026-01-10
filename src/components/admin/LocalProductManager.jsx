import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LocalProductManager.css';

// Determine API base consistently with the rest of the app
const API_BASE = (import.meta.env.VITE_API_BASE)
  || ((typeof window !== 'undefined' && (window.location.hostname === 'snuggleup.co.za' || window.location.hostname === 'www.snuggleup.co.za'))
        ? 'https://snuggleup-backend.onrender.com'
        : 'http://localhost:3000');

export default function LocalProductManager() {
  const { token } = useAuth(); // Get token from auth context
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
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
    dimensions: '',
    is_featured: false,
    is_active: true
  });
  const [message, setMessage] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [token]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/local-products`, {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      setMessage('Error: Not authenticated. Please log in again.');
      return;
    }

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        stock_quantity: parseInt(formData.stock_quantity),
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        images: formData.images ? formData.images.split('\n').filter(url => url.trim()) : [],
        dimensions: formData.dimensions ? JSON.parse(formData.dimensions) : null
      };

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

      setMessage(editingId ? 'Product updated successfully!' : 'Product created successfully!');
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
      dimensions: product.dimensions ? JSON.stringify(product.dimensions) : '',
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
      dimensions: '',
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
      <div className="header">
        <h2>🏭 Local Warehouse Products</h2>
        <button 
          className="btn-primary"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            resetForm();
          }}
          style={{ display: showForm ? 'none' : 'block' }}
        >
          ➕ Add New Product
        </button>
      </div>

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
              <label>SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="PROD-001"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Product description..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price (R) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
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
            <div className="form-group">
              <label>Stock Quantity *</label>
              <input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="General">General</option>
                <option value="Clothing">Clothing</option>
                <option value="Toys">Toys</option>
                <option value="Feeding">Feeding</option>
                <option value="Bath & Care">Bath & Care</option>
                <option value="Furniture">Furniture</option>
                <option value="Safety">Safety</option>
              </select>
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

          <div className="form-group">
            <label>Dimensions (JSON)</label>
            <input
              type="text"
              value={formData.dimensions}
              onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
              placeholder='{"length": 30, "width": 20, "height": 10}'
            />
          </div>

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

          <div className="form-actions">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingId ? 'Update Product' : 'Create Product'}
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
              <th>Price</th>
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
                <td>
                  R{product.price}
                  {product.compare_at_price && (
                    <span className="compare-price">R{product.compare_at_price}</span>
                  )}
                </td>
                <td className={product.stock_quantity === 0 ? 'out-of-stock' : ''}>
                  {product.stock_quantity}
                </td>
                <td>{product.category}</td>
                <td>
                  <span className={`status ${product.is_active ? 'active' : 'inactive'}`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="actions">
                  <button onClick={() => handleEdit(product)} title="Edit">✏️</button>
                  <button onClick={() => handleDelete(product.id)} title="Delete" className="delete">🗑️</button>
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
