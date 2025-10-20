-- MySQL Database Setup Script for Shopify Booking API
-- Run this script to manually create the database and table

-- Create database
CREATE DATABASE IF NOT EXISTS booking_orders;

-- Use the database
USE booking_orders;

-- Create booking_orders table
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
    
    -- Indexes for better performance
    INDEX idx_email (email),
    INDEX idx_product_variant (product_id, variant_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
);

-- Insert sample data (optional)
INSERT INTO booking_orders 
(booking_dates, first_name, last_name, phone_number, email, product_id, variant_id, quantity) 
VALUES 
('["2024-01-15", "2024-01-16"]', 'John', 'Doe', '+1234567890', 'john.doe@example.com', 123456789, 987654321, 1),
('["2024-01-20"]', 'Jane', 'Smith', '+1234567891', 'jane.smith@example.com', 123456789, 987654322, 1);

-- Show table structure
DESCRIBE booking_orders;

-- Show sample data
SELECT * FROM booking_orders;
