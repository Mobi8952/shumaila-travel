const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../config.env' });

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔄 Starting database setup...');
    
    // Create connection without specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to MySQL server');

    // Create database
    const dbName = process.env.DB_NAME || 'booking_orders';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database '${dbName}' created/verified`);

    // Close connection and reconnect with database specified
    await connection.end();
    
    // Reconnect with database specified
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      database: dbName
    });

    // Create table
    const createTableQuery = `
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
        INDEX idx_created_at (created_at),
        INDEX idx_status (status)
      )
    `;

    await connection.execute(createTableQuery);
    console.log('✅ Table "booking_orders" created/verified');

    // Insert sample data (optional)
    const sampleDataQuery = `
      INSERT IGNORE INTO booking_orders 
      (id, booking_dates, first_name, last_name, phone_number, email, product_id, variant_id, quantity) 
      VALUES 
      (1, '["2024-01-15", "2024-01-16"]', 'John', 'Doe', '+1234567890', 'john.doe@example.com', 123456789, 987654321, 1),
      (2, '["2024-01-20"]', 'Jane', 'Smith', '+1234567891', 'jane.smith@example.com', 123456789, 987654322, 1)
    `;

    await connection.execute(sampleDataQuery);
    console.log('✅ Sample data inserted');

    // Verify setup
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM booking_orders');
    console.log(`✅ Database setup complete! Total records: ${rows[0].count}`);

    // Show table structure
    const [columns] = await connection.execute('DESCRIBE booking_orders');
    console.log('\n📋 Table Structure:');
    console.table(columns);

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Check your MySQL username and password in config.env');
      console.log('2. Make sure MySQL server is running');
      console.log('3. Verify the user has CREATE DATABASE privileges');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Make sure MySQL server is running');
      console.log('2. Check if MySQL is running on the correct port (default: 3306)');
      console.log('3. Verify the host address in config.env');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 Database connection closed');
    }
  }
}

// Run setup
setupDatabase();
