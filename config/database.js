const mysql = require('mysql2/promise');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'booking_orders',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database and create tables
async function initializeDatabase() {
  try {
    console.log('Attempting to connect to MySQL database...');
    console.log(`Host: ${dbConfig.host}, Port: ${dbConfig.port}, Database: ${dbConfig.database}`);
    
    // Create database if it doesn't exist
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });

    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.end();

    // Create tables
    await createTables();
    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('\n❌ Database initialization error:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  MySQL connection refused. Please check:');
      console.error('1. Is MySQL server running?');
      console.error('2. Is the host and port correct? (default: localhost:3306)');
      console.error('3. Check your database credentials in config.env');
      console.error('\nTo start MySQL on Windows:');
      console.error('  net start mysql80 (or your MySQL service name)');
      console.error('\nTo start MySQL on macOS/Linux:');
      console.error('  sudo systemctl start mysql');
      console.error('  or: brew services start mysql');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n⚠️  Access denied. Please check:');
      console.error('1. Database username and password in config.env');
      console.error('2. User has proper permissions');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n⚠️  Host not found. Please check:');
      console.error('1. DB_HOST in config.env is correct');
    }
    
    throw error;
  }
}

// Create necessary tables
async function createTables() {
  const createBookingOrdersTable = `
    CREATE TABLE IF NOT EXISTS booking_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_dates JSON NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone_number VARCHAR(20) NOT NULL,
      email VARCHAR(255) NOT NULL,
      product_id BIGINT NOT NULL,
      variant_id BIGINT NOT NULL,
      quantity INT DEFAULT 1,
      shopify_checkout_id VARCHAR(255),
      shopify_checkout_url TEXT,
      status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_product_variant (product_id, variant_id),
      INDEX idx_created_at (created_at)
    )
  `;

  await pool.execute(createBookingOrdersTable);

  // Create products table for managing product dates and seats
  const createProductsTable = `
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id BIGINT NOT NULL UNIQUE,
      variant_id BIGINT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      variant_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_product_id (product_id)
    )
  `;

  await pool.execute(createProductsTable);

  // Create product_dates table for managing dates and available seats
  const createProductDatesTable = `
    CREATE TABLE IF NOT EXISTS product_dates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id BIGINT NOT NULL,
      date DATE NOT NULL,
      available_seats INT DEFAULT 0,
      booked_seats INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_product_date (product_id, date),
      INDEX idx_product_id (product_id),
      INDEX idx_date (date),
      INDEX idx_is_active (is_active)
    )
  `;

  await pool.execute(createProductDatesTable);
}

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

module.exports = {
  pool,
  initializeDatabase,
  testConnection
};
