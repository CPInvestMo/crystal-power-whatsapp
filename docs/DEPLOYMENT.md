# Crystal Intelligence WhatsApp Integration - Deployment Guide

Complete production deployment guide for the Crystal Intelligence WhatsApp Business integration system.

## 🚀 Quick Deployment

### Automated Deployment
```bash
# Make deployment script executable
chmod +x deploy.sh

# Deploy to production
./deploy.sh --environment production --domain whatsapp.crystalintelligence.com

# Deploy to staging
./deploy.sh --environment staging --domain staging-whatsapp.crystalintelligence.com
```

## 📋 Prerequisites

### System Requirements
- **Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2**
- **Node.js 16+** and npm
- **Nginx** (for reverse proxy)
- **PM2** (for process management)
- **Certbot** (for SSL certificates)
- **4GB RAM minimum** (8GB recommended)
- **2 CPU cores minimum** (4 cores recommended)

### WhatsApp Business API Setup
1. **Meta Business Account** with WhatsApp Business API access
2. **Approved WhatsApp Business phone number**
3. **Meta App** configured for WhatsApp Business
4. **Access tokens** and credentials from Meta Developer Console

## 🔧 Manual Deployment Steps

### 1. Server Preparation

#### Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl wget git nginx certbot python3-certbot-nginx -y
```

#### Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y
node --version  # Should be 18.x or higher
```

#### Install PM2
```bash
sudo npm install -g pm2
pm2 --version
```

### 2. Application Setup

#### Clone Repository
```bash
git clone <your-repository-url> crystal-whatsapp-integration
cd crystal-whatsapp-integration
```

#### Install Dependencies
```bash
npm ci --production
```

#### Configure Environment
```bash
# Copy and configure environment variables
cp .env.example .env
nano .env
```

**Essential Environment Variables:**
```env
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=EAAF...your_access_token
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345

# Webhook Configuration
WEBHOOK_VERIFY_TOKEN=your_secure_verify_token_here
WEBHOOK_SECRET=your_webhook_signature_secret
WEBHOOK_URL=https://yourdomain.com/webhook

# Server Configuration
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com
```

### 3. SSL Certificate Setup

#### Using Certbot (Let's Encrypt)
```bash
sudo certbot --nginx -d yourdomain.com
```

#### Manual Certificate Installation
```bash
# Copy your certificate files
sudo cp your-certificate.crt /etc/ssl/certs/
sudo cp your-private-key.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/your-private-key.key
```

### 4. Nginx Configuration

Create `/etc/nginx/sites-available/crystal-whatsapp`:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=webhook:10m rate=60r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=100r/m;

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_session_cache shared:SSL:1m;
    ssl_session_timeout 10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Root directory
    root /home/ubuntu/crystal-whatsapp-integration;
    index index.html;
    
    # WhatsApp Webhook (Critical for WhatsApp Business API)
    location /webhook {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting for webhooks
        limit_req zone=webhook burst=20 nodelay;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # API Endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting for API
        limit_req zone=api burst=10 nodelay;
    }
    
    # Health Check
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
        
        # Allow health checks without rate limiting
        limit_req zone=general burst=5 nodelay;
    }
    
    # Static Files
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Access-Control-Allow-Origin "*";
        }
        
        # Security for sensitive files
        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }
        
        # Block access to sensitive files
        location ~ \.(env|log|bak)$ {
            deny all;
            access_log off;
            log_not_found off;
        }
    }
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        application/javascript
        application/json
        application/xml
        text/css
        text/javascript
        text/xml
        text/plain;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/crystal-whatsapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. PM2 Process Management

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'crystal-whatsapp',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Health monitoring
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Auto-restart on file changes in production (disabled)
    ignore_watch: ["node_modules", "logs", ".git"]
  }]
};
```

Start the application:
```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by PM2
```

### 6. Firewall Configuration

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 🔍 Testing Deployment

### 1. Health Check
```bash
# Local health check
curl http://localhost:3000/health

# External health check
curl https://yourdomain.com/health
```

### 2. Webhook Verification
```bash
# Test webhook endpoint
curl "https://yourdomain.com/webhook?hub.mode=subscribe&hub.verify_token=your_verify_token&hub.challenge=test"
```

### 3. WhatsApp Webhook Test
```bash
# Run automated webhook tests
node scripts/test-webhook.js --url https://yourdomain.com/webhook
```

### 4. Application Interface
Visit `https://yourdomain.com` to access the web interface.

## 📊 Monitoring & Maintenance

### PM2 Monitoring
```bash
# Check process status
pm2 status

# View logs
pm2 logs crystal-whatsapp

# Monitor resources
pm2 monit

# Restart application
pm2 restart crystal-whatsapp

# Reload with zero downtime
pm2 reload crystal-whatsapp
```

### System Monitoring
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check network connections
netstat -tlnp

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Log Management
```bash
# Install PM2 log rotation
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress false

# Manual log cleanup
pm2 flush crystal-whatsapp
```

## 🔐 Security Hardening

### 1. System Security
```bash
# Update system packages regularly
sudo apt update && sudo apt upgrade -y

# Install fail2ban for intrusion prevention
sudo apt install fail2ban -y

# Configure fail2ban for Nginx
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
# Edit /etc/fail2ban/jail.local to enable nginx sections
```

### 2. Application Security
- **Environment Variables**: Never commit `.env` files
- **API Keys**: Rotate WhatsApp API tokens regularly
- **Webhook Security**: Always use webhook signature verification
- **Rate Limiting**: Monitor and adjust rate limits based on usage
- **Input Validation**: Validate all incoming webhook data

### 3. Nginx Security
```bash
# Hide Nginx version
echo "server_tokens off;" >> /etc/nginx/nginx.conf

# Add security headers (already included in config above)
```

## 💾 Backup & Recovery

### Automated Backup Script
```bash
#!/bin/bash

# Backup configuration
BACKUP_DIR="/var/backups/crystal-whatsapp"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/home/ubuntu/crystal-whatsapp-integration"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup application files
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" \
    --exclude=node_modules \
    --exclude=logs \
    --exclude=.git \
    "$APP_DIR"

# Backup environment configuration
cp "$APP_DIR/.env" "$BACKUP_DIR/env_$DATE.bak"

# Backup Nginx configuration
cp /etc/nginx/sites-available/crystal-whatsapp "$BACKUP_DIR/nginx_$DATE.conf"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.bak" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.conf" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/app_$DATE.tar.gz"
```

Setup daily backups:
```bash
# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /path/to/backup.sh") | crontab -
```

### Recovery Process
```bash
# Stop application
pm2 stop crystal-whatsapp

# Restore from backup
cd /home/ubuntu
tar -xzf /var/backups/crystal-whatsapp/app_YYYYMMDD_HHMMSS.tar.gz

# Restore environment
cp /var/backups/crystal-whatsapp/env_YYYYMMDD_HHMMSS.bak crystal-whatsapp-integration/.env

# Install dependencies
cd crystal-whatsapp-integration
npm ci --production

# Restart application
pm2 restart crystal-whatsapp
```

## 🚀 Performance Optimization

### 1. Node.js Optimization
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable production optimizations
export NODE_ENV=production
```

### 2. PM2 Optimization
```javascript
// In ecosystem.config.js
{
  instances: 'max',  // Use all CPU cores
  exec_mode: 'cluster',
  max_memory_restart: '1G',
  node_args: '--max-old-space-size=1024'
}
```

### 3. Nginx Optimization
```nginx
# In /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_comp_level 6;
gzip_min_length 1000;

# Buffer sizes
client_body_buffer_size 128k;
client_max_body_size 10m;
```

### 4. System Optimization
```bash
# Increase file descriptor limits
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# Optimize TCP settings
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
sysctl -p
```

## 🆘 Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check PM2 logs
pm2 logs crystal-whatsapp

# Check if port is available
netstat -tlnp | grep :3000

# Verify environment variables
pm2 show crystal-whatsapp
```

#### 2. Webhook Not Receiving Messages
```bash
# Test webhook URL
curl -X GET "https://yourdomain.com/webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test"

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Verify WhatsApp webhook configuration in Meta Developer Console
```

#### 3. SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

#### 4. High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart application
pm2 restart crystal-whatsapp

# Adjust memory limits in ecosystem.config.js
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- **Weekly**: Review logs and performance metrics
- **Monthly**: Update system packages and dependencies
- **Quarterly**: Rotate API keys and review security settings
- **Yearly**: Review and update SSL certificates

### Monitoring Checklist
- [ ] Application health checks
- [ ] WhatsApp API connectivity
- [ ] SSL certificate expiry
- [ ] Disk space usage
- [ ] Memory and CPU usage
- [ ] Log file sizes
- [ ] Backup integrity

### Emergency Contacts
- **Technical Support**: support@crystalintelligence.com
- **Infrastructure Team**: DevOps team contact
- **WhatsApp Business Support**: Meta Business Support

---

**Crystal Intelligence WhatsApp Integration** - Production deployment completed! 🎉

Your WhatsApp Business integration is now live and ready to handle real estate customer conversations with AI-powered lead processing.