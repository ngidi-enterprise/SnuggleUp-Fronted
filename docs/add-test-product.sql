-- Run this SQL in your Render PostgreSQL database to add a test product
-- This will let you see products on your storefront immediately

INSERT INTO curated_products (
  cj_pid,
  cj_vid,
  product_name,
  product_description,
  product_image,
  cj_cost_price,
  suggested_price,
  custom_price,
  is_active,
  category,
  stock_quantity
) VALUES (
  'TEST-001',
  'TEST-VAR-001',
  'Premium Baby Blanket',
  'Soft and cozy blanket perfect for newborns and toddlers. Made from 100% organic cotton with hypoallergenic materials.',
  'https://img.ltwebstatic.com/images3_pi/2022/06/13/1655112341a8c8f8dcda6d2f7aabcdf5e07d3c4a69.webp',
  150.00,
  300.00,
  299.99,
  TRUE,
  'Blankets',
  50
);

-- Check if it was inserted
SELECT * FROM curated_products WHERE cj_pid = 'TEST-001';
