# Shopify Booking API

A Node.js API that handles booking data and integrates with Shopify to create checkouts with custom attributes. The system stores booking information in a MySQL database and provides endpoints to manage and retrieve order data.

## Features

- ✅ Accept booking data via REST API
- ✅ Create Shopify checkouts with custom attributes
- ✅ Store booking data in MySQL database
- ✅ Retrieve and filter order data
- ✅ Export orders to CSV
- ✅ Order statistics and analytics
- ✅ Input validation and error handling

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- Shopify store with API access

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shopify-booking-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `config.env` and update with your credentials:
   ```bash
   # Server Configuration
   PORT=3000

   # Shopify Configuration
   SHOPIFY_STORE_URL=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your_access_token
   SHOPIFY_API_VERSION=2023-07

   # MySQL Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=booking_orders
   DB_PORT=3306
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Booking Endpoints

#### Create Booking
**POST** `/api/booking/create`

Creates a new booking, generates a Shopify checkout, and stores the data in the database.

**Request Body:**
```json
{
  "booking_dates": ["2024-01-15", "2024-01-16"],
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890",
  "email": "john.doe@example.com",
  "product_id": 123456789,
  "variant_id": 987654321,
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking_id": 1,
    "checkout_url": "https://your-store.myshopify.com/checkout/...",
    "checkout_id": "checkout_token",
    "product_info": {
      "product_title": "Product Name",
      "variant_title": "Variant Name",
      "price": "99.99"
    }
  }
}
```

#### Get Booking Details
**GET** `/api/booking/:id`

Retrieves details of a specific booking.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "booking_dates": ["2024-01-15", "2024-01-16"],
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

#### Update Booking Status
**PUT** `/api/booking/:id/status`

Updates the status of a booking.

**Request Body:**
```json
{
  "status": "completed"
}
```

Valid statuses: `pending`, `completed`, `cancelled`

### Orders Endpoints

#### Get All Orders
**GET** `/api/orders`

Retrieves all orders with pagination and filtering options.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `status` - Filter by status
- `email` - Filter by email (partial match)
- `product_id` - Filter by product ID
- `start_date` - Filter by creation date (from)
- `end_date` - Filter by creation date (to)
- `sort_by` - Sort field (default: created_at)
- `sort_order` - Sort direction: ASC/DESC (default: DESC)

**Example:**
```
GET /api/orders?page=1&limit=20&status=pending&sort_by=created_at&sort_order=DESC
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_records": 50,
      "per_page": 10,
      "has_next_page": true,
      "has_prev_page": false
    }
  }
}
```

#### Get Order Statistics
**GET** `/api/orders/stats`

Returns order statistics and analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_orders": 100,
      "pending_orders": 25,
      "completed_orders": 70,
      "cancelled_orders": 5,
      "today_orders": 3,
      "week_orders": 15,
      "month_orders": 45
    },
    "top_products": [
      {
        "product_id": 123456789,
        "order_count": 25
      }
    ]
  }
}
```

#### Export Orders
**GET** `/api/orders/export`

Exports orders to CSV format.

**Query Parameters:**
- `status` - Filter by status
- `start_date` - Filter by creation date (from)
- `end_date` - Filter by creation date (to)

**Response:** CSV file download

#### Delete Order
**DELETE** `/api/orders/:id`

Deletes a specific order from the database.

### Health Check
**GET** `/health`

Returns API health status.

## Database Schema

The `booking_orders` table structure:

```sql
CREATE TABLE booking_orders (
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Error Handling

The API returns standardized error responses:

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## Shopify Integration

The API integrates with Shopify using the REST API to:

1. **Validate Products/Variants** - Ensures the provided product and variant IDs exist
2. **Create Checkouts** - Creates Shopify checkouts with custom attributes containing booking data
3. **Custom Attributes** - Stores booking information in checkout custom attributes:
   - `booking_dates` - JSON string of booking dates
   - `first_name` - Customer first name
   - `last_name` - Customer last name
   - `phone_number` - Customer phone number
   - `email` - Customer email

## Development

### Running in Development Mode
```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when files change.

### Testing the API

You can test the API endpoints using tools like Postman, curl, or any HTTP client.

Example curl command:
```bash
curl -X POST http://localhost:3000/api/booking/create \
  -H "Content-Type: application/json" \
  -d '{
    "booking_dates": ["2024-01-15", "2024-01-16"],
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1234567890",
    "email": "john.doe@example.com",
    "product_id": 123456789,
    "variant_id": 987654321
  }'
```

## Security Considerations

- Store sensitive credentials in environment variables
- Use HTTPS in production
- Implement rate limiting for production use
- Validate and sanitize all input data
- Use proper database connection pooling
- Implement proper logging for production monitoring

## License

MIT License
