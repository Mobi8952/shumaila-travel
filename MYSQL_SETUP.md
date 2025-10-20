# MySQL Database Setup Guide

This guide will help you set up MySQL database for the Shopify Booking API project.

## Option 1: Automatic Setup (Recommended)

The project includes an automatic database setup script that will create the database and tables for you.

### Prerequisites
1. MySQL server must be installed and running
2. You need MySQL root access or a user with CREATE DATABASE privileges

### Steps

1. **Configure your database credentials** in `config.env`:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=booking_orders
   DB_PORT=3306
   ```

2. **Run the setup script**:
   ```bash
   cd setup
   node database-setup.js
   ```

3. **Start your application**:
   ```bash
   npm start
   ```

The database will be automatically created when you start the server!

---

## Option 2: Manual MySQL Installation & Setup

### Windows

#### Method 1: MySQL Installer (Recommended)
1. **Download MySQL Installer**
   - Go to https://dev.mysql.com/downloads/installer/
   - Download "mysql-installer-community" (larger file)

2. **Install MySQL**
   - Run the installer
   - Choose "Developer Default" setup type
   - Set root password (remember this!)
   - Complete the installation

3. **Verify Installation**
   ```cmd
   mysql --version
   ```

#### Method 2: Using Chocolatey
```cmd
# Install Chocolatey first if you don't have it
# Then install MySQL
choco install mysql

# Start MySQL service
net start mysql80
```

### macOS

#### Method 1: Using Homebrew (Recommended)
```bash
# Install MySQL
brew install mysql

# Start MySQL service
brew services start mysql

# Secure installation (set root password)
mysql_secure_installation
```

#### Method 2: MySQL Installer
1. Download from https://dev.mysql.com/downloads/mysql/
2. Install the .dmg package
3. Start MySQL from System Preferences

### Linux (Ubuntu/Debian)

```bash
# Update package index
sudo apt update

# Install MySQL
sudo apt install mysql-server

# Start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure installation
sudo mysql_secure_installation
```

### Linux (CentOS/RHEL/Fedora)

```bash
# Install MySQL
sudo dnf install mysql-server  # Fedora
# OR
sudo yum install mysql-server  # CentOS/RHEL

# Start and enable MySQL
sudo systemctl start mysqld
sudo systemctl enable mysqld

# Get temporary root password
sudo grep 'temporary password' /var/log/mysqld.log

# Secure installation
sudo mysql_secure_installation
```

---

## Option 3: Manual Database Creation

If you prefer to create the database manually:

### Step 1: Connect to MySQL
```bash
mysql -u root -p
```

### Step 2: Run the SQL script
```sql
-- Copy and paste the contents of setup/database-setup.sql
-- Or run the file directly:
source /path/to/your/project/setup/database-setup.sql;
```

### Step 3: Verify the setup
```sql
USE booking_orders;
SHOW TABLES;
DESCRIBE booking_orders;
SELECT * FROM booking_orders;
```

---

## Option 4: Using Docker (Alternative)

If you prefer using Docker:

### Step 1: Create docker-compose.yml
```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    container_name: booking_mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: booking_orders
      MYSQL_USER: booking_user
      MYSQL_PASSWORD: booking_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./setup/database-setup.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  mysql_data:
```

### Step 2: Start MySQL container
```bash
docker-compose up -d
```

### Step 3: Update config.env
```env
DB_HOST=localhost
DB_USER=booking_user
DB_PASSWORD=booking_password
DB_NAME=booking_orders
DB_PORT=3306
```

---

## Testing Database Connection

### Method 1: Using the setup script
```bash
cd setup
node database-setup.js
```

### Method 2: Using MySQL command line
```bash
mysql -u root -p -e "SELECT 'Connection successful!' as status;"
```

### Method 3: Using the API health check
```bash
# Start your server
npm start

# Check health endpoint
curl http://localhost:3000/health
```

---

## Common Issues & Solutions

### Issue 1: "Access denied for user 'root'@'localhost'"
**Solution:**
```bash
# Reset MySQL root password
sudo mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'new_password';
FLUSH PRIVILEGES;
EXIT;
```

### Issue 2: "Can't connect to MySQL server"
**Solutions:**
- Check if MySQL service is running:
  - Windows: `net start mysql80`
  - macOS: `brew services start mysql`
  - Linux: `sudo systemctl start mysql`
- Verify port 3306 is not blocked by firewall

### Issue 3: "Unknown database 'booking_orders'"
**Solution:** Run the automatic setup script or create the database manually.

### Issue 4: MySQL not in PATH
**Solution:**
- Windows: Add MySQL bin directory to PATH
- macOS: Add to ~/.zshrc: `export PATH="/usr/local/mysql/bin:$PATH"`
- Linux: Usually installed in PATH automatically

---

## Database Schema Overview

The `booking_orders` table includes:

| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Auto-incrementing primary key |
| booking_dates | JSON | Array of booking dates |
| first_name | VARCHAR(100) | Customer first name |
| last_name | VARCHAR(100) | Customer last name |
| phone_number | VARCHAR(20) | Customer phone number |
| email | VARCHAR(255) | Customer email |
| product_id | BIGINT | Shopify product ID |
| variant_id | BIGINT | Shopify variant ID |
| quantity | INT | Quantity (default: 1) |
| shopify_checkout_id | VARCHAR(255) | Shopify checkout ID |
| shopify_checkout_url | TEXT | Shopify checkout URL |
| status | ENUM | pending/completed/cancelled |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

---

## Next Steps

After setting up MySQL:

1. **Configure your Shopify credentials** in `config.env`
2. **Install project dependencies**: `npm install`
3. **Start the server**: `npm start`
4. **Test the API**: Use the endpoints documented in README.md

Need help? Check the troubleshooting section above or refer to the main README.md file.
