import React, { useState, useEffect } from 'react';

/**
 * DescriptionGeneratorButton - Reusable component for AI description generation
 * 
 * @param {string} productName - Product name for description
 * @param {string} imageUrl - Image URL or data URI
 * @param {function} onDescriptionGenerated - Callback when description is generated (receives description string)
 * @param {function} setMessage - Callback to display feedback messages
 * @param {string} token - Auth token for API calls
 * @param {string} apiBase - API base URL
 * @param {boolean} isLoading - Optional: show loading state (default: false)
 * 
 * @example
 * <DescriptionGeneratorButton
 *   productName={formData.name}
 *   imageUrl={imagePreviewUrl}
 *   onDescriptionGenerated={(desc) => setFormData({...formData, description: desc})}
 *   setMessage={setMessage}
 *   token={token}
 *   apiBase={API_BASE}
 * />
 */
export default function DescriptionGeneratorButton({
  productName,
  imageUrl,
  onDescriptionGenerated,
  setMessage,
  token,
  apiBase,
  isLoading = false
}) {
  const [generating, setGenerating] = useState(false);
  const [provider, setProvider] = useState('claude');
  const [availableProviders, setAvailableProviders] = useState({ claude: true, gemini: true });

  useEffect(() => {
    // Check which providers are available
    const checkProviders = async () => {
      try {
        const response = await fetch(`${apiBase}/api/admin/products/description-providers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableProviders(data);
          // Set default to first available provider
          if (!data.claude && data.gemini) {
            setProvider('gemini');
          }
        }
      } catch (error) {
        console.error('Error checking providers:', error);
      }
    };
    if (token) {
      checkProviders();
    }
  }, [token, apiBase]);

  const handleGenerate = async () => {
    if (!productName) {
      setMessage?.('Error: Enter product name first');
      return;
    }

    if (!imageUrl) {
      setMessage?.('Error: Upload product image first');
      return;
    }

    setGenerating(true);
    try {
      // Convert image URL to base64
      let imageBase64 = '';
      let imageMimeType = 'image/jpeg';

      // If it's a URL (not already base64), fetch and convert
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Determine MIME type
        imageMimeType = blob.type || 'image/jpeg';
        
        // Convert blob to base64
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result;
            // Extract base64 part if it's a data URI
            if (result && typeof result === 'string') {
              const base64Part = result.includes(',') ? result.split(',')[1] : result;
              if (base64Part && base64Part.length > 10) {
                resolve(base64Part);
              } else {
                reject(new Error('Invalid base64 conversion'));
              }
            } else {
              reject(new Error('FileReader failed'));
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(blob);
        });
      } else if (imageUrl.startsWith('data:')) {
        // It's already a data URI, extract base64 and MIME type
        const match = imageUrl.match(/data:([^;]+);base64,(.+)/);
        if (match && match[2] && match[2].length > 10) {
          imageMimeType = match[1];
          imageBase64 = match[2];
        } else {
          throw new Error('Invalid data URI format');
        }
      } else {
        throw new Error('Image must be a URL or data URI');
      }

      // Validate base64 before sending
      if (!imageBase64 || imageBase64.length < 100) {
        throw new Error('Image data is too short or invalid');
      }

      const response = await fetch(`${apiBase}/api/admin/products/generate-description`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: provider,
          productName: productName,
          imageBase64: imageBase64,
          imageMimeType: imageMimeType
        })
      });

      const data = await response.json();

      if (response.ok && data.description) {
        onDescriptionGenerated?.(data.description);
        const providerLabel = provider === 'claude' ? 'Quality' : 'Favorable';
        setMessage?.(`✨ Generated with ${providerLabel}: Description is ready!`);
      } else {
        setMessage?.(`Error: ${data.error || 'Failed to generate description'}`);
      }
    } catch (error) {
      console.error('Description generation error:', error);
      setMessage?.('Error: Failed to generate description. Check image format and try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        disabled={generating || isLoading || !imageUrl}
        style={{
          padding: '8px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: '500',
          cursor: generating || isLoading || !imageUrl ? 'not-allowed' : 'pointer',
          opacity: generating || isLoading || !imageUrl ? 0.7 : 1
        }}
        title="Choose AI provider: Claude for Quality or Gemini for Favorable cost"
      >
        {availableProviders.claude && (
          <option value="claude">💎 Quality (Claude)</option>
        )}
        {availableProviders.gemini && (
          <option value="gemini">⚡ Favorable (Gemini)</option>
        )}
        {!availableProviders.claude && !availableProviders.gemini && (
          <option value="">No providers configured</option>
        )}
      </select>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating || isLoading || !imageUrl || (!availableProviders.claude && !availableProviders.gemini)}
        style={{
          padding: '8px 16px',
          background: generating || isLoading ? '#E3F2FD' : '#1976D2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: generating || isLoading || !imageUrl ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          opacity: generating || isLoading || !imageUrl ? 0.7 : 1,
          transition: 'all 0.2s ease'
        }}
        title={!imageUrl ? 'Upload product image first' : 'Generate AI-powered product description'}
      >
        {generating ? '⏳ Generating...' : '✨ Generate'}
      </button>
    </div>
  );
}
