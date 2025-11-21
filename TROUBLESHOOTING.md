# Troubleshooting Server Startup Issues

## Problem: Server Not Starting - Database Connection Error

If you see `ECONNREFUSED` or database connection errors, follow these steps:

### Step 1: Check if MySQL is Running

**Windows:**
```powershell
# Check MySQL service status
Get-Service -Name "*mysql*"

# Start MySQL service (replace mysql80 with your service name)
net start mysql80
# or
net start MySQL80
```

**macOS:**
```bash
# Check if MySQL is running
brew services list

# Start MySQL
brew services start mysql
```

**Linux:**
```bash
# Check MySQL status
sudo systemctl status mysql

# Start MySQL
sudo systemctl start mysql
```

### Step 2: Create config.env File

1. Copy the example config file:
   ```bash
   cp config.env.example config.env
   ```

2. Edit `config.env` with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_actual_mysql_password
   DB_NAME=booking_orders
   DB_PORT=3306
   ```

### Step 3: Test MySQL Connection

**Windows:**
```powershell
mysql -u root -p
```

**macOS/Linux:**
```bash
mysql -u root -p
```

If you can connect, MySQL is working. If not, check your MySQL installation.

### Step 4: Install MySQL (If Not Installed)

**Windows:**
1. Download MySQL Installer from https://dev.mysql.com/downloads/installer/
2. Install MySQL Server
3. Remember the root password you set during installation
4. Update `config.env` with that password

**macOS:**
```bash
brew install mysql
brew services start mysql
mysql_secure_installation
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation
```

### Step 5: Try Starting Server Again

```bash
npm start
```

### Common Issues

1. **"Access denied" error:**
   - Check username and password in `config.env`
   - Make sure MySQL user has proper permissions

2. **"Can't connect to MySQL server":**
   - Make sure MySQL service is running
   - Check if port 3306 is correct
   - Check firewall settings

3. **"Unknown database":**
   - The database will be created automatically
   - Make sure MySQL user has CREATE DATABASE permission

### Quick Test

Run this to test your database connection:
```bash
node -e "const mysql = require('mysql2/promise'); mysql.createConnection({host:'localhost',user:'root',password:'YOUR_PASSWORD'}).then(() => console.log('✅ Connected!')).catch(e => console.log('❌ Error:', e.message))"
```

Replace `YOUR_PASSWORD` with your actual MySQL password.

