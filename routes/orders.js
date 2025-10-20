const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/orders - Get all orders with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      email,
      product_id,
      start_date,
      end_date,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause for filtering
    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }

    if (email) {
      whereClause += ' AND email LIKE ?';
      queryParams.push(`%${email}%`);
    }

    if (product_id) {
      whereClause += ' AND product_id = ?';
      queryParams.push(product_id);
    }

    if (start_date) {
      whereClause += ' AND created_at >= ?';
      queryParams.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND created_at <= ?';
      queryParams.push(end_date);
    }

    // Validate sort parameters
    const validSortFields = ['id', 'created_at', 'updated_at', 'status', 'email', 'first_name', 'last_name'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM booking_orders ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, queryParams);
    const totalRecords = countResult[0].total;

    // Get paginated results
    const dataQuery = `
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
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.execute(dataQuery, [...queryParams, limitNum, offset]);

    // Parse JSON fields
    const orders = rows.map(order => ({
      ...order,
      booking_dates: JSON.parse(order.booking_dates)
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalRecords / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_records: totalRecords,
          per_page: limitNum,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/orders/stats - Get order statistics
router.get('/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_orders,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as week_orders,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as month_orders
      FROM booking_orders
    `;

    const [stats] = await pool.execute(statsQuery);

    // Get top products
    const topProductsQuery = `
      SELECT 
        product_id,
        COUNT(*) as order_count
      FROM booking_orders
      GROUP BY product_id
      ORDER BY order_count DESC
      LIMIT 10
    `;

    const [topProducts] = await pool.execute(topProductsQuery);

    res.json({
      success: true,
      data: {
        overview: stats[0],
        top_products: topProducts
      }
    });

  } catch (error) {
    console.error('Error fetching order statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/orders/export - Export orders to CSV
router.get('/export', async (req, res) => {
  try {
    const {
      status,
      start_date,
      end_date
    } = req.query;

    // Build WHERE clause for filtering
    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }

    if (start_date) {
      whereClause += ' AND created_at >= ?';
      queryParams.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND created_at <= ?';
      queryParams.push(end_date);
    }

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
        status,
        created_at,
        updated_at
      FROM booking_orders 
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const [rows] = await pool.execute(query, queryParams);

    // Convert to CSV format
    const csvHeader = 'ID,Booking Dates,First Name,Last Name,Phone,Email,Product ID,Variant ID,Quantity,Checkout ID,Status,Created At,Updated At\n';
    
    const csvData = rows.map(row => {
      const bookingDates = JSON.parse(row.booking_dates).join(';');
      return [
        row.id,
        `"${bookingDates}"`,
        `"${row.first_name}"`,
        `"${row.last_name}"`,
        `"${row.phone_number}"`,
        `"${row.email}"`,
        row.product_id,
        row.variant_id,
        row.quantity,
        `"${row.shopify_checkout_id || ''}"`,
        row.status,
        row.created_at,
        row.updated_at
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="booking_orders_${Date.now()}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// DELETE /api/orders/:id - Delete a specific order
router.delete('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;

    const deleteQuery = 'DELETE FROM booking_orders WHERE id = ?';
    const [result] = await pool.execute(deleteQuery, [orderId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
