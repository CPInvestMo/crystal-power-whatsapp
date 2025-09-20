#!/bin/bash

# Crystal Intelligence WhatsApp Integration Deployment Script
# Automated deployment for production environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Crystal Intelligence WhatsApp Integration"
VERSION="1.0.0"
NODE_VERSION="16"
PM2_APP_NAME="crystal-whatsapp"

# Default values
ENVIRONMENT="production"
DOMAIN=""
SSL_ENABLED=true
BACKUP_ENABLED=true
MONITORING_ENABLED=true

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "=================================================================="
    echo "  $PROJECT_NAME"
    echo "  Deployment Script v$VERSION"
    echo "=================================================================="
    echo -e "${NC}"
}

# Check system requirements
check_requirements() {
    log_step "Checking system requirements..."
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        log_error "Please do not run this script as root"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js $NODE_VERSION or higher."
        exit 1
    fi
    
    NODE_CURRENT=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_CURRENT" -lt "$NODE_VERSION" ]; then
        log_error "Node.js version $NODE_VERSION or higher is required. Current: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        log_warning "Git is not installed. Some features may not work."
    fi
    
    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        log_info "PM2 is not installed. Installing PM2..."
        npm install -g pm2
    fi
    
    log_success "System requirements check completed"
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -d|--domain)
                DOMAIN="$2"
                shift 2
                ;;
            --no-ssl)
                SSL_ENABLED=false
                shift
                ;;
            --no-backup)
                BACKUP_ENABLED=false
                shift
                ;;
            --no-monitoring)
                MONITORING_ENABLED=false
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set deployment environment (production, staging, development)"
    echo "  -d, --domain DOMAIN     Set domain name for the application"
    echo "  --no-ssl               Disable SSL certificate setup"
    echo "  --no-backup            Disable backup configuration"
    echo "  --no-monitoring        Disable monitoring setup"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --environment production --domain whatsapp.crystalintelligence.com"
    echo "  $0 --environment staging --no-ssl"
}

# Validate configuration
validate_config() {
    log_step "Validating configuration..."
    
    if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "development" ]; then
        log_error "Invalid environment: $ENVIRONMENT. Must be 'production', 'staging', or 'development'"
        exit 1
    fi
    
    if [ "$ENVIRONMENT" = "production" ] && [ -z "$DOMAIN" ]; then
        log_error "Domain is required for production deployment"
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        log_error ".env file not found. Please copy .env.example to .env and configure it."
        exit 1
    fi
    
    log_success "Configuration validation completed"
}

# Install dependencies
install_dependencies() {
    log_step "Installing dependencies..."
    
    # Install Node.js dependencies
    npm ci --production
    
    if [ $? -eq 0 ]; then
        log_success "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
}

# Build application
build_application() {
    log_step "Building application..."
    
    # Run tests
    log_info "Running tests..."
    npm test
    
    if [ $? -eq 0 ]; then
        log_success "All tests passed"
    else
        log_error "Tests failed. Deployment aborted."
        exit 1
    fi
    
    # Build production assets (if build script exists)
    if npm run build &>/dev/null; then
        log_success "Application built successfully"
    else
        log_info "No build script found, skipping build step"
    fi
}

# Setup SSL certificate
setup_ssl() {
    if [ "$SSL_ENABLED" = true ] && [ -n "$DOMAIN" ]; then
        log_step "Setting up SSL certificate..."
        
        # Check if certbot is installed
        if command -v certbot &> /dev/null; then
            log_info "Requesting SSL certificate for $DOMAIN..."
            
            # Request certificate (this is a simplified example)
            # In production, you'd want more robust error handling
            sudo certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN"
            
            if [ $? -eq 0 ]; then
                log_success "SSL certificate obtained successfully"
            else
                log_warning "Failed to obtain SSL certificate. Continuing without SSL."
                SSL_ENABLED=false
            fi
        else
            log_warning "Certbot not found. Please install certbot for SSL certificate management."
            SSL_ENABLED=false
        fi
    fi
}

# Setup nginx
setup_nginx() {
    if [ -n "$DOMAIN" ]; then
        log_step "Setting up Nginx configuration..."
        
        # Create nginx configuration
        NGINX_CONFIG="/etc/nginx/sites-available/$PM2_APP_NAME"
        
        sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'" always;
    
    # Webhook endpoint
    location /webhook {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Rate limiting
        limit_req zone=webhook burst=20 nodelay;
    }
    
    # API endpoints
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Rate limiting
        limit_req zone=api burst=10 nodelay;
    }
    
    # Static files
    location / {
        root $(pwd);
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=webhook:10m rate=60r/m;
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;
EOF

        # Enable SSL if available
        if [ "$SSL_ENABLED" = true ]; then
            sudo tee -a "$NGINX_CONFIG" > /dev/null <<EOF

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Include the same configuration as above but for HTTPS
    # ... (configuration would be repeated here)
}
EOF
        fi
        
        # Enable site
        sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/
        
        # Test nginx configuration
        sudo nginx -t
        
        if [ $? -eq 0 ]; then
            sudo systemctl reload nginx
            log_success "Nginx configuration setup completed"
        else
            log_error "Nginx configuration test failed"
            exit 1
        fi
    fi
}

# Setup PM2 configuration
setup_pm2() {
    log_step "Setting up PM2 process manager..."
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: '$ENVIRONMENT',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3000
    },
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

    # Create logs directory
    mkdir -p logs
    
    # Stop existing PM2 process
    pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
    pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
    
    # Start application with PM2
    pm2 start ecosystem.config.js --env "$ENVIRONMENT"
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 to start on system boot
    pm2 startup
    
    log_success "PM2 setup completed"
}

# Setup monitoring
setup_monitoring() {
    if [ "$MONITORING_ENABLED" = true ]; then
        log_step "Setting up monitoring..."
        
        # Install PM2 monitoring
        pm2 install pm2-logrotate
        
        # Configure log rotation
        pm2 set pm2-logrotate:max_size 10M
        pm2 set pm2-logrotate:retain 30
        pm2 set pm2-logrotate:compress false
        
        log_success "Monitoring setup completed"
    fi
}

# Setup backup
setup_backup() {
    if [ "$BACKUP_ENABLED" = true ]; then
        log_step "Setting up backup system..."
        
        # Create backup script
        cat > backup.sh <<EOF
#!/bin/bash

# Crystal Intelligence Backup Script
BACKUP_DIR="/var/backups/$PM2_APP_NAME"
DATE=\$(date +%Y%m%d_%H%M%S)
APP_DIR=\$(pwd)

# Create backup directory
mkdir -p "\$BACKUP_DIR"

# Backup application files
tar -czf "\$BACKUP_DIR/app_\$DATE.tar.gz" \\
    --exclude=node_modules \\
    --exclude=logs \\
    --exclude=.git \\
    "\$APP_DIR"

# Backup environment configuration
cp .env "\$BACKUP_DIR/env_\$DATE.bak"

# Keep only last 7 days of backups
find "\$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
find "\$BACKUP_DIR" -name "*.bak" -mtime +7 -delete

echo "Backup completed: \$BACKUP_DIR/app_\$DATE.tar.gz"
EOF

        chmod +x backup.sh
        
        # Add to crontab (daily backup at 2 AM)
        (crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/backup.sh") | crontab -
        
        log_success "Backup system setup completed"
    fi
}

# Verify deployment
verify_deployment() {
    log_step "Verifying deployment..."
    
    # Wait for application to start
    sleep 5
    
    # Check if PM2 process is running
    if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
        log_success "PM2 process is running"
    else
        log_error "PM2 process is not running"
        return 1
    fi
    
    # Check if application responds to health check
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_success "Application health check passed"
    else
        log_error "Application health check failed"
        return 1
    fi
    
    # Check webhook endpoint
    if curl -f "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=test" > /dev/null 2>&1; then
        log_success "Webhook endpoint is accessible"
    else
        log_warning "Webhook endpoint test failed (this may be expected if verify token is different)"
    fi
    
    log_success "Deployment verification completed"
}

# Print deployment summary
print_summary() {
    echo -e "${CYAN}"
    echo "=================================================================="
    echo "  Deployment Summary"
    echo "=================================================================="
    echo -e "${NC}"
    echo "Environment: $ENVIRONMENT"
    echo "Domain: ${DOMAIN:-'Not configured'}"
    echo "SSL: $([ "$SSL_ENABLED" = true ] && echo 'Enabled' || echo 'Disabled')"
    echo "PM2 App Name: $PM2_APP_NAME"
    echo "Application URL: http://localhost:3000"
    if [ -n "$DOMAIN" ]; then
        echo "Public URL: $([ "$SSL_ENABLED" = true ] && echo 'https' || echo 'http')://$DOMAIN"
    fi
    echo ""
    echo "Useful commands:"
    echo "  pm2 status                 - Check application status"
    echo "  pm2 logs $PM2_APP_NAME     - View application logs"
    echo "  pm2 restart $PM2_APP_NAME  - Restart application"
    echo "  pm2 stop $PM2_APP_NAME     - Stop application"
    echo "  ./backup.sh                - Create manual backup"
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
}

# Main deployment function
main() {
    print_banner
    
    parse_arguments "$@"
    check_requirements
    validate_config
    install_dependencies
    build_application
    setup_ssl
    setup_nginx
    setup_pm2
    setup_monitoring
    setup_backup
    
    if verify_deployment; then
        print_summary
    else
        log_error "Deployment verification failed. Please check the logs and try again."
        exit 1
    fi
}

# Error handling
trap 'log_error "Deployment failed on line $LINENO"' ERR

# Run main function
main "$@"