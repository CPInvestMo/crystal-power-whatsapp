# Crystal Power WhatsApp API - Deployment Guide

## 🚀 Production Deployment Instructions

This guide provides step-by-step instructions for deploying the Crystal Power WhatsApp Business API integration to production environments.

## ⚠️ Pre-Deployment Requirements

### Legal Compliance Checklist

**MANDATORY BEFORE DEPLOYMENT:**

1. **Legal Counsel Review** ✅ Required
   - Engage qualified Egyptian data privacy counsel
   - Complete PDPL compliance review
   - Obtain written deployment authorization

2. **Data Protection Officer Certification** ✅ Required
   - Privacy Impact Assessment sign-off
   - Technical measures verification
   - PDPC registration confirmation

3. **Executive Authorization** ✅ Required
   - Crystal Power Investments management approval
   - Legal risk acceptance documentation
   - Insurance verification completed

### Technical Prerequisites

- **Server Requirements**: Linux/Ubuntu 20.04+ or Windows Server 2019+
- **Node.js**: Version 16.0.0 or higher
- **Memory**: Minimum 2GB RAM, recommended 4GB+
- **Storage**: Minimum 10GB available space
- **Network**: HTTPS-capable domain with SSL certificate
- **Database**: SQLite (included) or PostgreSQL/MySQL for scale

## 🛠️ Deployment Methods

### Method 1: VPS/Dedicated Server Deployment

#### Step 1: Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y

# Install SSL certificate (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y
```

#### Step 2: Application Setup

```bash
# Create application directory
sudo mkdir -p /var/www/crystal-power-whatsapp
cd /var/www/crystal-power-whatsapp

# Clone repository
git clone https://github.com/crystal-power-investments/whatsapp-webhook.git .

# Install dependencies
npm install --production

# Copy environment configuration
cp config/env.example .env

# Edit environment variables
sudo nano .env
```

#### Step 3: Environment Configuration

Edit `.env` file with production values:

```env
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=your_production_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_PHONE=+20XXXXXXXXX
WEBHOOK_VERIFY_TOKEN=your_secure_webhook_token

# Server Configuration
PORT=3000
NODE_ENV=production
HOST=0.0.0.0

# Database Configuration (if using external DB)
DATABASE_URL=postgresql://user:password@localhost:5432/crystal_power

# Security Configuration
SESSION_SECRET=your_secure_session_secret
ENCRYPTION_KEY=your_32_character_encryption_key

# Legal & Compliance
DPO_EMAIL=dpo@crystalpower.eg
LEGAL_CONTACT=legal@crystalpower.eg
INCIDENT_EMAIL=incident@crystalpower.eg

# Monitoring & Logging
LOG_LEVEL=info
ENABLE_AUDIT_LOG=true
AUDIT_RETENTION_DAYS=2555  # 7 years as per PDPL
```

#### Step 4: SSL Certificate Setup

```bash
# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Verify certificate auto-renewal
sudo certbot renew --dry-run
```

#### Step 5: Nginx Configuration

Create `/etc/nginx/sites-available/crystal-power-whatsapp`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Static files
    location /static/ {
        alias /var/www/crystal-power-whatsapp/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API and webhook endpoints
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /webhook {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/crystal-power-whatsapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 6: Process Management with PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'crystal-power-whatsapp',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/crystal-power/error.log',
    out_file: '/var/log/crystal-power/out.log',
    log_file: '/var/log/crystal-power/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

Start the application:

```bash
# Create log directory
sudo mkdir -p /var/log/crystal-power
sudo chown ubuntu:ubuntu /var/log/crystal-power

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### Method 2: Docker Deployment

#### Step 1: Create Dockerfile

```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S crystal -u 1001

# Change ownership
RUN chown -R crystal:nodejs /usr/src/app
USER crystal

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "src/server.js"]
```

#### Step 2: Docker Compose Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./data:/usr/src/app/data
      - ./logs:/usr/src/app/logs
    restart: unless-stopped
    depends_on:
      - redis
    networks:
      - crystal-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - crystal-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - crystal-network

volumes:
  redis_data:

networks:
  crystal-network:
    driver: bridge
```

#### Step 3: Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Scale application
docker-compose up -d --scale app=3
```

### Method 3: Cloud Platform Deployment

#### AWS Elastic Beanstalk

1. **Prepare Application**
   ```bash
   # Create deployment package
   zip -r crystal-power-whatsapp.zip . -x "*.git*" "node_modules/*"
   ```

2. **Deploy to Elastic Beanstalk**
   - Create new application in AWS Console
   - Upload deployment package
   - Configure environment variables
   - Set up load balancer and auto-scaling

#### Google Cloud Platform

1. **Create App Engine Configuration**
   
   Create `app.yaml`:
   ```yaml
   runtime: nodejs18
   
   env_variables:
     NODE_ENV: production
     WHATSAPP_ACCESS_TOKEN: your_token
   
   automatic_scaling:
     min_instances: 1
     max_instances: 10
   
   handlers:
   - url: /static
     static_dir: public
   
   - url: /.*
     script: auto
   ```

2. **Deploy Application**
   ```bash
   gcloud app deploy
   ```

#### Heroku Deployment

1. **Prepare Heroku Configuration**
   
   Create `Procfile`:
   ```
   web: node src/server.js
   ```

2. **Deploy to Heroku**
   ```bash
   # Login to Heroku
   heroku login
   
   # Create application
   heroku create crystal-power-whatsapp
   
   # Set environment variables
   heroku config:set NODE_ENV=production
   heroku config:set WHATSAPP_ACCESS_TOKEN=your_token
   
   # Deploy application
   git push heroku main
   ```

## 🔧 Post-Deployment Configuration

### WhatsApp Business API Webhook Setup

1. **Configure Webhook URL**
   - Go to Meta Business Manager
   - Navigate to WhatsApp Business API settings
   - Set webhook URL: `https://your-domain.com/webhook`
   - Set verify token from your environment variables

2. **Subscribe to Events**
   - Enable message events
   - Enable delivery status events
   - Test webhook connectivity

3. **Verify Integration**
   - Send test message to business number
   - Check server logs for webhook reception
   - Verify dashboard shows new conversation

### Database Setup (if using external DB)

#### PostgreSQL Configuration

```sql
-- Create database
CREATE DATABASE crystal_power_whatsapp;

-- Create user
CREATE USER crystal_power WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE crystal_power_whatsapp TO crystal_power;

-- Connect to database
\c crystal_power_whatsapp;

-- Run migration scripts (if available)
-- \i migrations/001_initial_schema.sql
```

### Monitoring & Logging Setup

#### Log Rotation Configuration

Create `/etc/logrotate.d/crystal-power`:

```
/var/log/crystal-power/*.log {
    daily
    missingok
    rotate 365
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
```

#### System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Setup log monitoring
sudo tail -f /var/log/crystal-power/combined.log

# Monitor PM2 processes
pm2 monit
```

## 🔒 Security Hardening

### Firewall Configuration

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Deny all other incoming traffic
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### Security Headers

Ensure these headers are set in Nginx configuration:

```nginx
# Security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; img-src 'self' data: https:;";
```

### Environment Security

```bash
# Secure environment file
chmod 600 .env
chown ubuntu:ubuntu .env

# Secure application directory
chmod -R 755 /var/www/crystal-power-whatsapp
chown -R ubuntu:ubuntu /var/www/crystal-power-whatsapp
```

## 📊 Performance Optimization

### Node.js Optimization

```javascript
// In server.js, add performance configurations
process.env.UV_THREADPOOL_SIZE = 128;

// Enable compression
const compression = require('compression');
app.use(compression());

// Set appropriate timeouts
server.timeout = 30000;
server.keepAliveTimeout = 5000;
server.headersTimeout = 60000;
```

### Database Optimization

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_conversations_phone ON conversations(phone_number);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_leads_score ON leads(lead_score);
```

## 🚨 Troubleshooting

### Common Issues

1. **Webhook Not Receiving Messages**
   - Check firewall settings
   - Verify SSL certificate
   - Test webhook URL accessibility
   - Check Meta webhook configuration

2. **High Memory Usage**
   - Monitor with `pm2 monit`
   - Adjust `max_memory_restart` in PM2 config
   - Check for memory leaks in application

3. **Database Connection Issues**
   - Verify database credentials
   - Check network connectivity
   - Monitor connection pool usage

### Log Analysis

```bash
# Check application logs
pm2 logs crystal-power-whatsapp

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check system logs
sudo journalctl -u nginx -f
sudo journalctl -u pm2-ubuntu -f
```

## 📈 Monitoring & Maintenance

### Health Checks

Create automated health check script:

```bash
#!/bin/bash
# health-check.sh

# Check application health
curl -f http://localhost:3000/health || exit 1

# Check database connectivity
node -e "require('./src/database').testConnection()" || exit 1

# Check disk space
df -h | awk '$5 > 80 {print "Disk space warning: " $5 " used on " $1}' | grep -q . && exit 1

echo "All health checks passed"
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/crystal-power"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
sqlite3 /var/www/crystal-power-whatsapp/data/database.sqlite ".backup $BACKUP_DIR/database_$DATE.sqlite"

# Backup configuration
cp /var/www/crystal-power-whatsapp/.env $BACKUP_DIR/env_$DATE.backup

# Backup logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /var/log/crystal-power/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.sqlite" -mtime +30 -delete
find $BACKUP_DIR -name "*.backup" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### Automated Updates

```bash
#!/bin/bash
# update.sh

cd /var/www/crystal-power-whatsapp

# Pull latest changes
git pull origin main

# Install dependencies
npm ci --production

# Restart application
pm2 restart crystal-power-whatsapp

# Verify health
sleep 10
curl -f http://localhost:3000/health || pm2 restart crystal-power-whatsapp
```

## 📞 Support & Maintenance

### Production Support Contacts

- **Technical Support**: support@crystalpower.eg
- **System Administrator**: admin@crystalpower.eg
- **Emergency Contact**: +20-XXX-XXX-XXXX

### Maintenance Schedule

- **Daily**: Health checks, log monitoring
- **Weekly**: Security updates, backup verification
- **Monthly**: Performance review, capacity planning
- **Quarterly**: Security audit, dependency updates

---

**⚠️ Important**: This deployment guide assumes legal compliance review has been completed. Do not deploy to production without proper legal authorization as outlined in the Legal Compliance Checklist.

For additional support or questions about deployment, contact the Crystal Power technical team at support@crystalpower.eg.
