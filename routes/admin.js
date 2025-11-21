const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

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

// GET /api/admin/products - Get all products
router.get('/products', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.product_id,
        p.variant_id,
        p.product_name,
        p.variant_name,
        COUNT(DISTINCT pd.id) as total_dates,
        SUM(CASE WHEN pd.is_active = TRUE THEN 1 ELSE 0 END) as active_dates,
        SUM(pd.available_seats) as total_available_seats,
        SUM(pd.booked_seats) as total_booked_seats,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN product_dates pd ON p.product_id = pd.product_id
      GROUP BY p.id, p.product_id, p.variant_id, p.product_name, p.variant_name, p.created_at, p.updated_at
      ORDER BY p.created_at DESC
    `;
    
    const [rows] = await pool.execute(query);

    res.json({
      success: true,
      data: rows,
      count: rows.length
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

