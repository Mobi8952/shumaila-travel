const express = require('express');
const router = express.Router();
const { createCheckout, getProduct, getVariant, isShopifyConfigured } = require('../config/shopify');
const { pool } = require('../config/database');

// Validation middleware
const validateBookingData = (req, res, next) => {
  const { 
    booking_dates, 
    first_name, 
    last_name, 
    phone_number, 
    email, 
    product_id, 
    variant_id 
  } = req.body;

  // Check required fields
  if (!booking_dates || !first_name || !last_name || !phone_number || !email || !product_id || !variant_id) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required_fields: [
        'booking_dates', 
        'first_name', 
        'last_name', 
        'phone_number', 
        'email', 
        'product_id', 
        'variant_id'
      ]
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  // Validate booking_dates is an array
  if (!Array.isArray(booking_dates) || booking_dates.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'booking_dates must be a non-empty array'
    });
  }

  next();
};

// POST /api/booking/create - Create booking with Shopify checkout
router.post('/create', validateBookingData, async (req, res) => {
  try {
    const {
      booking_dates,
      first_name,
      last_name,
      phone_number,
      email,
      product_id,
      variant_id,
      quantity = 1
    } = req.body;

    let checkoutResult = { success: true, checkout_id: null, checkout_url: null };
    let productResult = { success: true, product: { title: 'Test Product' } };
    let variantResult = { success: true, variant: { title: 'Test Variant', price: '0.00' } };

    // Only use Shopify if configured
    if (isShopifyConfigured()) {
      // Verify product and variant exist in Shopify
      [productResult, variantResult] = await Promise.all([
        getProduct(product_id),
        getVariant(variant_id)
      ]);

      if (!productResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid product ID',
          details: productResult.error
        });
      }

      if (!variantResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid variant ID',
          details: variantResult.error
        });
      }

      // Create Shopify checkout
      checkoutResult = await createCheckout({
        booking_dates,
        first_name,
        last_name,
        phone_number,
        email,
        product_id,
        variant_id,
        quantity
      });

      if (!checkoutResult.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create Shopify checkout',
          details: checkoutResult.error
        });
      }
    } else {
      console.log('⚠️  Shopify not configured - creating booking without checkout');
    }

    // Store booking data in database
    const insertQuery = `
      INSERT INTO booking_orders 
      (booking_dates, first_name, last_name, phone_number, email, product_id, variant_id, quantity, shopify_checkout_id, shopify_checkout_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(insertQuery, [
      JSON.stringify(booking_dates),
      first_name,
      last_name,
      phone_number,
      email,
      product_id,
      variant_id,
      quantity,
      checkoutResult.checkout_id,
      checkoutResult.checkout_url
    ]);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking_id: result.insertId,
        checkout_url: checkoutResult.checkout_url,
        checkout_id: checkoutResult.checkout_id,
        product_info: {
          product_title: productResult.product.title,
          variant_title: variantResult.variant.title,
          price: variantResult.variant.price
        }
      }
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/booking/:id - Get specific booking details
router.get('/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;

    const query = 'SELECT * FROM booking_orders WHERE id = ?';
    const [rows] = await pool.execute(query, [bookingId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = rows[0];
    booking.booking_dates = JSON.parse(booking.booking_dates);

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// PUT /api/booking/:id/status - Update booking status
router.put('/:id/status', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;

    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: pending, completed, or cancelled'
      });
    }

    const updateQuery = 'UPDATE booking_orders SET status = ?, updated_at = NOW() WHERE id = ?';
    const [result] = await pool.execute(updateQuery, [status, bookingId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking status updated successfully'
    });

  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
