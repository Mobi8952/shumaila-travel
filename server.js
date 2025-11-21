const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config({ path: './config.env' });

const bookingRoutes = require('./routes/booking');
const ordersRoutes = require('./routes/orders');
const { initializeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/booking', bookingRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', require('./routes/admin'));

// Serve static files for admin panel
app.use(express.static('public'));

// Admin panel route
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Shopify Booking API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log('\n🚀 Server started successfully!');
      console.log(`📍 Server is running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🎛️  Admin panel: http://localhost:${PORT}/admin`);
      console.log(`📋 API base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('\n❌ Failed to start server due to database connection error');
    console.error('Please fix the database connection issue and try again.\n');
    process.exit(1);
  }
}

startServer();
