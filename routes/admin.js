const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { getAllProducts, isShopifyConfigured } = require('../config/shopify');

// GET /api/admin/bookings - Get all bookings
router.get('/bookings', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        booking_dates,
        first_name,
        last_name,
        phone_number,
        email,
        product_id,
        variant_id,
        quantity,
        shopify_checkout_id,
        shopify_checkout_url,
        status,
        created_at,
        updated_at
      FROM booking_orders
      ORDER BY created_at DESC
    `;
    
    const [rows] = await pool.execute(query);
    
    // Parse JSON booking_dates
    const bookings = rows.map(booking => ({
      ...booking,
      booking_dates: JSON.parse(booking.booking_dates)
    }));

    res.json({
      success: true,
      data: bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/admin/products - Get all products directly from Shopify
router.get('/products', async (req, res) => {
  try {
    // Fetch products directly from Shopify
    if (!isShopifyConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Shopify is not configured. Please set SHOPIFY_ACCESS_TOKEN and SHOPIFY_STORE_URL in config.env'
      });
    }

    const shopifyResult = await getAllProducts();
    
    if (!shopifyResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch products from Shopify',
        details: shopifyResult.error
      });
    }

    const shopifyProducts = shopifyResult.products || [];
    
    if (shopifyProducts.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: 'No products found in Shopify store'
      });
    }

    // Get date/seat information from database for all products
    const productIds = shopifyProducts.map(p => p.id);
    if (productIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    // Build query to get date/seat stats for all products
    const placeholders = productIds.map(() => '?').join(',');
    const dateStatsQuery = `
      SELECT 
        product_id,
        COUNT(DISTINCT id) as total_dates,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_dates,
        SUM(available_seats) as total_available_seats,
        SUM(booked_seats) as total_booked_seats
      FROM product_dates
      WHERE product_id IN (${placeholders})
      GROUP BY product_id
    `;
    
    const [dateStatsRows] = await pool.execute(dateStatsQuery, productIds);
    
    // Create a map of product_id to date stats
    const dateStatsMap = {};
    dateStatsRows.forEach(row => {
      dateStatsMap[row.product_id] = {
        total_dates: row.total_dates || 0,
        active_dates: row.active_dates || 0,
        total_available_seats: row.total_available_seats || 0,
        total_booked_seats: row.total_booked_seats || 0
      };
    });

    // Format products with variants and merge date/seat info from database
    const formattedProducts = [];
    
    for (const product of shopifyProducts) {
      const productDateStats = dateStatsMap[product.id] || {
        total_dates: 0,
        active_dates: 0,
        total_available_seats: 0,
        total_booked_seats: 0
      };

      if (product.variants && product.variants.length > 0) {
        // Product has variants - create entry for each variant
        for (const variant of product.variants) {
          formattedProducts.push({
            product_id: product.id,
            variant_id: variant.id,
            product_name: product.title,
            variant_name: variant.title || 'Default',
            price: variant.price || '0.00',
            sku: variant.sku || '',
            inventory_quantity: variant.inventory_quantity || 0,
            // Date/seat stats from database (shared across all variants of same product)
            total_dates: productDateStats.total_dates,
            active_dates: productDateStats.active_dates,
            total_available_seats: productDateStats.total_available_seats,
            total_booked_seats: productDateStats.total_booked_seats,
            // Additional Shopify data
            shopify_product: {
              id: product.id,
              handle: product.handle,
              status: product.status,
              vendor: product.vendor,
              product_type: product.product_type,
              created_at: product.created_at,
              updated_at: product.updated_at
            }
          });
        }
      } else {
        // Product has no variants - use product ID as variant ID
        formattedProducts.push({
          product_id: product.id,
          variant_id: product.id,
          product_name: product.title,
          variant_name: 'Default',
          price: '0.00',
          sku: '',
          inventory_quantity: 0,
          // Date/seat stats from database
          total_dates: productDateStats.total_dates,
          active_dates: productDateStats.active_dates,
          total_available_seats: productDateStats.total_available_seats,
          total_booked_seats: productDateStats.total_booked_seats,
          // Additional Shopify data
          shopify_product: {
            id: product.id,
            handle: product.handle,
            status: product.status,
            vendor: product.vendor,
            product_type: product.product_type,
            created_at: product.created_at,
            updated_at: product.updated_at
          }
        });
      }
    }

    res.json({
      success: true,
      data: formattedProducts,
      count: formattedProducts.length,
      source: 'shopify'
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/admin/products/:productId/dates - Get all dates for a specific product
router.get('/products/:productId/dates', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const query = `
      SELECT 
        id,
        product_id,
        date,
        available_seats,
        booked_seats,
        is_active,
        created_at,
        updated_at
      FROM product_dates
      WHERE product_id = ?
      ORDER BY date ASC
    `;
    
    const [rows] = await pool.execute(query, [productId]);

    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching product dates:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/admin/products - Create or update a product
router.post('/products', async (req, res) => {
  try {
    const { product_id, variant_id, product_name, variant_name } = req.body;

    if (!product_id || !variant_id || !product_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: product_id, variant_id, product_name'
      });
    }

    const query = `
      INSERT INTO products (product_id, variant_id, product_name, variant_name)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        variant_id = VALUES(variant_id),
        product_name = VALUES(product_name),
        variant_name = VALUES(variant_name),
        updated_at = CURRENT_TIMESTAMP
    `;

    await pool.execute(query, [product_id, variant_id, product_name, variant_name || null]);

    res.status(201).json({
      success: true,
      message: 'Product created/updated successfully'
    });
  } catch (error) {
    console.error('Error creating/updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/admin/products/:productId/dates - Add or update a product date
router.post('/products/:productId/dates', async (req, res) => {
  try {
    const { productId } = req.params;
    const { date, available_seats, is_active } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      });
    }

    const query = `
      INSERT INTO product_dates (product_id, date, available_seats, is_active)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        available_seats = VALUES(available_seats),
        is_active = VALUES(is_active),
        updated_at = CURRENT_TIMESTAMP
    `;

    await pool.execute(query, [
      productId,
      date,
      available_seats || 0,
      is_active !== undefined ? is_active : true
    ]);

    res.status(201).json({
      success: true,
      message: 'Product date added/updated successfully'
    });
  } catch (error) {
    console.error('Error adding/updating product date:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// PUT /api/admin/products/:productId/dates/:dateId - Update a specific product date
router.put('/products/:productId/dates/:dateId', async (req, res) => {
  try {
    const { dateId } = req.params;
    const { date, available_seats, booked_seats, is_active } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (date !== undefined) {
      updateFields.push('date = ?');
      updateValues.push(date);
    }
    if (available_seats !== undefined) {
      updateFields.push('available_seats = ?');
      updateValues.push(available_seats);
    }
    if (booked_seats !== undefined) {
      updateFields.push('booked_seats = ?');
      updateValues.push(booked_seats);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateValues.push(dateId);

    const query = `
      UPDATE product_dates
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const [result] = await pool.execute(query, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product date not found'
      });
    }

    res.json({
      success: true,
      message: 'Product date updated successfully'
    });
  } catch (error) {
    console.error('Error updating product date:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// DELETE /api/admin/products/:productId/dates/:dateId - Delete a product date
router.delete('/products/:productId/dates/:dateId', async (req, res) => {
  try {
    const { dateId } = req.params;

    const query = 'DELETE FROM product_dates WHERE id = ?';
    const [result] = await pool.execute(query, [dateId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product date not found'
      });
    }

    res.json({
      success: true,
      message: 'Product date deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product date:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;

