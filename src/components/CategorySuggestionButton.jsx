import React, { useState } from 'react';

const CATEGORY_OPTIONS = [
  'Accessories',
  'Bedding',
  'Baby Clothing',
  'Nursery Items',
  'Toys',
  'Feeding',
  'Health & Safety',
  'Moms Essentials',
  'Travel / Strollers',
  'Diapering'
];

/**
 * CategorySuggestionButton - Reusable component for category suggestion across the store
 * 
 * @param {string} productName - Product name for suggestion
 * @param {string} description - Product description for keyword matching
 * @param {function} onCategorySuggested - Callback when category is selected (receives category string)
 * @param {function} setMessage - Callback to display feedback messages
 * @param {string} token - Auth token for API calls
 * @param {string} apiBase - API base URL
 * @param {boolean} isLoading - Optional: show loading state (default: false)
 * 
 * @example
 * <CategorySuggestionButton
 *   productName={formData.name}
 *   description={formData.description}
 *   onCategorySuggested={(cat) => setFormData({...formData, category: cat})}
 *   setMessage={setMessage}
 *   token={token}
 *   apiBase={API_BASE}
 * />
 */
export default function CategorySuggestionButton({
  productName,
  description,
  onCategorySuggested,
  setMessage,
  token,
  apiBase,
  isLoading = false
}) {
  const [suggestLoading, setSuggestLoading] = useState(false);

  const handleSuggest = async () => {
    if (!productName) {
      setMessage?.('Error: Enter product name first');
      return;
    }

    setSuggestLoading(true);
    try {
      const params = new URLSearchParams({
        productName: productName,
        description: description || ''
      });
      const response = await fetch(
        `${apiBase}/api/local-products/suggest-category?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      
      if (response.ok && data.category) {
        onCategorySuggested?.(data.category);
        setMessage?.(`💡 Suggested category: ${data.category}`);
      } else if (data.category === null) {
        setMessage?.('No matching category found. Please select manually.');
      } else {
        setMessage?.(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Category suggestion error:', error);
      setMessage?.('Error: Failed to suggest category');
    } finally {
      setSuggestLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSuggest}
      disabled={suggestLoading || isLoading || !productName}
      style={{
        padding: '8px 16px',
        background: suggestLoading || isLoading ? '#90CAF9' : '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: suggestLoading || isLoading || !productName ? 'not-allowed' : 'pointer',
        fontSize: '13px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        opacity: suggestLoading || isLoading || !productName ? 0.7 : 1,
        transition: 'all 0.2s ease'
      }}
      title={!productName ? 'Enter product name first' : 'Suggest category based on product details'}
    >
      {suggestLoading ? '⏳ Suggesting...' : '💡 Suggest'}
    </button>
  );
}

export { CATEGORY_OPTIONS };
