# Postman API Testing Guide

This guide will help you test all the APIs locally using Postman.

## Server Information
- **Base URL**: `http://localhost:3000`
- **Server Status**: ✅ Running on port 3000

## 🚀 Quick Setup

1. **Open Postman**
2. **Create a new Collection** called "Shopify Booking API"
3. **Set Collection Variables** (optional):
   - `base_url`: `http://localhost:3000`
   - `booking_id`: (will be set dynamically)

---

## 📋 API Endpoints to Test

### 1. Health Check
**Purpose**: Verify server is running

**Request**:
- **Method**: `GET`
- **URL**: `http://localhost:3000/health`
- **Headers**: None required

**Expected Response**:
```json
{
  "status": "OK",
  "message": "Shopify Booking API is running"
}
```

---

### 2. Create Booking
**Purpose**: Create a new booking with customer and product information

**Request**:
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/booking/create`
- **Headers**: 
  - `Content-Type`: `application/json`

**Body** (raw JSON):
```json
{
  "booking_dates": ["2024-02-15", "2024-02-16"],
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890",
  "email": "john.doe@example.com",
  "product_id": 123456789,
  "variant_id": 987654321,
  "quantity": 1
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking_id": 1,
    "checkout_url": "https://shumailstravel.myshopify.com/checkout/...",
    "checkout_id": "checkout_token",
    "product_info": {
      "product_title": "Product Name",
      "variant_title": "Variant Name",
      "price": "99.99"
    }
  }
}
```

**Test Variations**:
- Try with different booking dates
- Test with missing required fields (should return 400 error)
- Test with invalid email format (should return 400 error)

---

### 3. Get Specific Booking
**Purpose**: Retrieve details of a specific booking

**Request**:
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/booking/1` (replace 1 with actual booking ID)
- **Headers**: None required

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "booking_dates": ["2024-02-15", "2024-02-16"],
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1234567890",
    "email": "john.doe@example.com",
    "product_id": 123456789,
    "variant_id": 987654321,
    "quantity": 1,
    "shopify_checkout_id": "checkout_token",
    "shopify_checkout_url": "https://...",
    "status": "pending",
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T10:00:00.000Z"
  }
}
```

---

### 4. Update Booking Status
**Purpose**: Update the status of a booking

**Request**:
- **Method**: `PUT`
- **URL**: `http://localhost:3000/api/booking/1/status` (replace 1 with actual booking ID)
- **Headers**: 
  - `Content-Type`: `application/json`

**Body** (raw JSON):
```json
{
  "status": "completed"
}
```

**Valid Status Values**: `pending`, `completed`, `cancelled`

**Expected Response**:
```json
{
  "success": true,
  "message": "Booking status updated successfully"
}
```

---

### 5. Get All Orders
**Purpose**: Retrieve all orders with pagination and filtering

**Request**:
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/orders`
- **Headers**: None required

**Query Parameters** (optional):
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `status`: Filter by status (`pending`, `completed`, `cancelled`)
- `email`: Filter by email (partial match)
- `product_id`: Filter by product ID
- `start_date`: Filter by creation date (from) - format: `YYYY-MM-DD`
- `end_date`: Filter by creation date (to) - format: `YYYY-MM-DD`
- `sort_by`: Sort field (`id`, `created_at`, `updated_at`, `status`, `email`)
- `sort_order`: Sort direction (`ASC` or `DESC`)

**Example URLs**:
- Basic: `http://localhost:3000/api/orders`
- With pagination: `http://localhost:3000/api/orders?page=1&limit=5`
- With filtering: `http://localhost:3000/api/orders?status=pending&sort_by=created_at&sort_order=DESC`
- With date range: `http://localhost:3000/api/orders?start_date=2024-01-01&end_date=2024-12-31`

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "booking_dates": ["2024-02-15", "2024-02-16"],
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+1234567890",
        "email": "john.doe@example.com",
        "product_id": 123456789,
        "variant_id": 987654321,
        "quantity": 1,
        "shopify_checkout_id": "checkout_token",
        "shopify_checkout_url": "https://...",
        "status": "pending",
        "created_at": "2024-01-01T10:00:00.000Z",
        "updated_at": "2024-01-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_records": 1,
      "per_page": 10,
      "has_next_page": false,
      "has_prev_page": false
    }
  }
}
```

---

### 6. Get Order Statistics
**Purpose**: Get order statistics and analytics

**Request**:
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/orders/stats`
- **Headers**: None required

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_orders": 5,
      "pending_orders": 2,
      "completed_orders": 2,
      "cancelled_orders": 1,
      "today_orders": 1,
      "week_orders": 3,
      "month_orders": 5
    },
    "top_products": [
      {
        "product_id": 123456789,
        "order_count": 3
      }
    ]
  }
}
```

---

### 7. Export Orders to CSV
**Purpose**: Export orders to CSV file

**Request**:
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/orders/export`
- **Headers**: None required

**Query Parameters** (optional):
- `status`: Filter by status
- `start_date`: Filter by creation date (from)
- `end_date`: Filter by creation date (to)

**Example URLs**:
- All orders: `http://localhost:3000/api/orders/export`
- Pending only: `http://localhost:3000/api/orders/export?status=pending`
- Date range: `http://localhost:3000/api/orders/export?start_date=2024-01-01&end_date=2024-12-31`

**Expected Response**: CSV file download

---

### 8. Delete Order
**Purpose**: Delete a specific order

**Request**:
- **Method**: `DELETE`
- **URL**: `http://localhost:3000/api/orders/1` (replace 1 with actual order ID)
- **Headers**: None required

**Expected Response**:
```json
{
  "success": true,
  "message": "Order deleted successfully"
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Complete Booking Flow
1. **Create a booking** using POST `/api/booking/create`
2. **Get the booking** using GET `/api/booking/{id}` (use ID from step 1)
3. **Update status** using PUT `/api/booking/{id}/status`
4. **View all orders** using GET `/api/orders`

### Scenario 2: Error Handling
1. **Missing fields**: Try creating booking without required fields
2. **Invalid email**: Use malformed email address
3. **Non-existent booking**: Try to get booking with ID 999
4. **Invalid status**: Try to update status with invalid value

### Scenario 3: Filtering and Pagination
1. **Create multiple bookings** with different data
2. **Test pagination**: Use different page and limit values
3. **Test filtering**: Filter by status, email, dates
4. **Test sorting**: Try different sort fields and orders

---

## 📝 Postman Collection Setup

### Environment Variables
Create a Postman environment with these variables:
- `base_url`: `http://localhost:3000`
- `booking_id`: (will be set by tests)

### Pre-request Scripts
For dynamic booking ID, add this to collection pre-request script:
```javascript
// Set booking_id from previous response if available
if (pm.response && pm.response.json() && pm.response.json().data && pm.response.json().data.booking_id) {
    pm.environment.set("booking_id", pm.response.json().data.booking_id);
}
```

### Tests Scripts
Add these test scripts to verify responses:

**For Create Booking**:
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has booking_id", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('booking_id');
    pm.environment.set("booking_id", jsonData.data.booking_id);
});
```

**For Get Orders**:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has orders array", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('orders');
    pm.expect(jsonData.data.orders).to.be.an('array');
});
```

---

## 🔍 Sample Test Data

### Booking Data Variations
```json
// Standard booking
{
  "booking_dates": ["2024-03-15", "2024-03-16"],
  "first_name": "Alice",
  "last_name": "Johnson",
  "phone_number": "+1987654321",
  "email": "alice.johnson@example.com",
  "product_id": 111111111,
  "variant_id": 222222222,
  "quantity": 1
}

// Multi-day booking
{
  "booking_dates": ["2024-04-01", "2024-04-02", "2024-04-03"],
  "first_name": "Bob",
  "last_name": "Smith",
  "phone_number": "+1555666777",
  "email": "bob.smith@example.com",
  "product_id": 333333333,
  "variant_id": 444444444,
  "quantity": 2
}
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Connection Refused
**Error**: `curl: Unable to connect to the remote server`
**Solution**: Make sure the server is running with `npm start`

### Issue 2: 400 Bad Request
**Error**: Missing required fields
**Solution**: Check that all required fields are included in the request body

### Issue 3: 404 Not Found
**Error**: Booking/Order not found
**Solution**: Use a valid ID that exists in the database

### Issue 4: 500 Internal Server Error
**Error**: Database connection issues
**Solution**: Check MySQL connection and ensure database is running

---

## 📊 Expected Database State

After running the database setup, you should have:
- Database: `booking_orders`
- Table: `booking_orders`
- Sample records: 2 initial bookings

You can verify this by checking the orders endpoint: `GET /api/orders`

---

**Happy Testing! 🎉**

Remember to test both success and error scenarios to ensure your API handles all cases properly.
