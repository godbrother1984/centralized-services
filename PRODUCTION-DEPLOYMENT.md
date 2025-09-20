# 🚀 Production Deployment Guide

-- File: centralized-services/PRODUCTION-DEPLOYMENT.md
-- Version: 1.0.0
-- Date: 2025-09-19
-- Description: Complete guide for deploying centralized services to production

## 📋 **Pre-Production Checklist**

### ✅ **Infrastructure Requirements**
- [ ] **Server**: Minimum 4 CPU cores, 8GB RAM, 100GB SSD
- [ ] **Domain**: Registered domain with DNS control
- [ ] **SSL**: Domain validation for Let's Encrypt
- [ ] **Network**: Static IP address
- [ ] **Backup**: S3-compatible storage for backups
- [ ] **Monitoring**: Email/SMS alerting capability

### ✅ **Security Requirements**
- [ ] **Firewall**: Configured to allow only necessary ports (80, 443, SSH)
- [ ] **SSH**: Key-based authentication only
- [ ] **Updates**: Latest OS security patches
- [ ] **Secrets**: Strong passwords generated for all services
- [ ] **IP Whitelist**: Admin access restricted to known IPs
- [ ] **SSL**: Valid certificates for all domains

## 🔧 **Step 1: Server Preparation**

### **1.1 Install Docker & Docker Compose**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### **1.2 Configure Firewall**
```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Check status
sudo ufw status
```

### **1.3 Create Application Directory**
```bash
sudo mkdir -p /opt/centralized-services
sudo chown $USER:$USER /opt/centralized-services
cd /opt/centralized-services
```

## 📁 **Step 2: Deploy Application Files**

### **2.1 Upload Project Files**
```bash
# Using git (recommended)
git clone <your-repository-url> .

# Or using rsync
rsync -avz --exclude='.git' ./centralized-services/ user@server:/opt/centralized-services/
```

### **2.2 Set File Permissions**
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Set secure permissions for secrets directory
chmod 700 secrets/
chmod 600 secrets/*.txt
```

## 🔐 **Step 3: Configure Production Environment**

### **3.1 Create Environment File**
```bash
# Copy production template
cp .env.production .env

# Edit configuration
nano .env
```

### **3.2 Required Environment Variables**
```bash
# ===== DOMAINS (Replace with your actual domains) =====
TRAEFIK_DOMAIN=traefik.yourcompany.com
KEYCLOAK_DOMAIN=auth.yourcompany.com
N8N_DOMAIN=n8n.yourcompany.com

# ===== SSL =====
ACME_EMAIL=admin@yourcompany.com

# ===== SECURITY =====
ADMIN_IP_WHITELIST=203.0.113.0/24    # Your office IP range
DB_ACCESS_IP_WHITELIST=203.0.113.0/24

# ===== BASIC AUTH =====
# Generate: htpasswd -nbB admin your_strong_password
TRAEFIK_BASIC_AUTH=admin:$2y$10$your_bcrypt_hash_here
```

### **3.3 Generate Secrets**
```bash
# Generate strong passwords for each service
openssl rand -base64 32 > secrets/keycloak_admin_password.txt
openssl rand -base64 32 > secrets/keycloak_db_password.txt
openssl rand -base64 32 > secrets/central_db_password.txt
openssl rand -base64 32 > secrets/n8n_admin_password.txt
openssl rand -base64 32 > secrets/n8n_db_password.txt

# Secure permissions
chmod 600 secrets/*.txt
```

## 🌐 **Step 4: DNS Configuration**

### **4.1 Create DNS Records**
```bash
# A Records (replace IP with your server IP)
traefik.yourcompany.com.    A    203.0.113.10
auth.yourcompany.com.       A    203.0.113.10
n8n.yourcompany.com.        A    203.0.113.10

# Optional: CNAME for api subdomain
api.yourcompany.com.        CNAME    traefik.yourcompany.com.
```

### **4.2 Verify DNS Propagation**
```bash
# Test DNS resolution
nslookup auth.yourcompany.com
dig auth.yourcompany.com

# Test from multiple locations
curl -I http://auth.yourcompany.com
```

## 🚀 **Step 5: Production Deployment**

### **5.1 Start Services**
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Monitor startup
docker-compose -f docker-compose.prod.yml logs -f
```

### **5.2 Verify Service Health**
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check service health
curl -f https://auth.yourcompany.com/health/ready
curl -f https://traefik.yourcompany.com/ping
curl -f https://n8n.yourcompany.com/healthz
```

### **5.3 SSL Certificate Verification**
```bash
# Check SSL certificates
openssl s_client -connect auth.yourcompany.com:443 -servername auth.yourcompany.com

# Verify certificate details
curl -vI https://auth.yourcompany.com 2>&1 | grep -A 5 "Server certificate"
```

## ⚙️ **Step 6: Initial Configuration**

### **6.1 Configure Keycloak**
1. **Access Admin Console**: https://auth.yourcompany.com/admin
2. **Login**: admin / (password from secrets/keycloak_admin_password.txt)
3. **Create Realm**: Set up your organization realm
4. **Configure Theme**: Enable C.I.Group corporate theme
5. **Create Clients**: Set up client applications
6. **Create Users**: Add initial users and roles

### **6.2 Configure n8n**
1. **Access Interface**: https://n8n.yourcompany.com
2. **Login**: admin / (password from secrets/n8n_admin_password.txt)
3. **Setup Workflows**: Import or create automation workflows
4. **Configure Credentials**: Set up external service connections

### **6.3 Configure Traefik Dashboard**
1. **Access Dashboard**: https://traefik.yourcompany.com/dashboard/
2. **Login**: admin / (configured in TRAEFIK_BASIC_AUTH)
3. **Verify Routes**: Check all services are properly routed
4. **Monitor Metrics**: Review traffic and health metrics

## 🔄 **Step 7: Backup Configuration**

### **7.1 Create Backup Script**
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Database backups
docker exec central-postgresql-prod pg_dump -U postgres > $BACKUP_DIR/central_db.sql
docker exec keycloak-postgresql-prod pg_dump -U keycloak_user keycloak_db > $BACKUP_DIR/keycloak_db.sql

# Configuration backups
cp -r /opt/centralized-services $BACKUP_DIR/config
cp -r /var/lib/docker/volumes $BACKUP_DIR/volumes

# Upload to S3 (if configured)
if [ -n "$BACKUP_S3_BUCKET" ]; then
    aws s3 sync $BACKUP_DIR s3://$BACKUP_S3_BUCKET/backups/$(date +%Y%m%d_%H%M%S)/
fi

# Clean old backups (keep 7 days)
find /backup -type d -mtime +7 -exec rm -rf {} +
```

### **7.2 Setup Automated Backups**
```bash
# Make script executable
chmod +x backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /opt/centralized-services/backup.sh >> /var/log/backup.log 2>&1" | crontab -
```

## 📊 **Step 8: Monitoring Setup**

### **8.1 Health Check Monitoring**
```bash
#!/bin/bash
# health-check.sh

SERVICES=("https://auth.yourcompany.com/health/ready" "https://n8n.yourcompany.com/healthz")
EMAIL="alerts@yourcompany.com"

for service in "${SERVICES[@]}"; do
    if ! curl -f -s "$service" > /dev/null; then
        echo "Service $service is down!" | mail -s "Service Alert" $EMAIL
    fi
done
```

### **8.2 Log Monitoring**
```bash
# Setup log rotation
sudo tee /etc/logrotate.d/docker-compose > /dev/null <<EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
EOF
```

## 🔒 **Step 9: Security Hardening**

### **9.1 Regular Security Updates**
```bash
#!/bin/bash
# security-update.sh

# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Clean unused images
docker image prune -f

# Check for security vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock anchore/grype:latest image_name
```

### **9.2 Access Control**
```bash
# Regularly review and update IP whitelists
# Check authentication logs
sudo journalctl -u ssh -f

# Monitor failed login attempts
sudo grep "Failed password" /var/log/auth.log
```

## 🔄 **Step 10: Maintenance Procedures**

### **10.1 Rolling Updates**
```bash
# Update single service without downtime
docker-compose -f docker-compose.prod.yml up -d --no-deps keycloak

# Scale services for zero downtime
docker-compose -f docker-compose.prod.yml up -d --scale api=2
```

### **10.2 Troubleshooting**
```bash
# Check service logs
docker-compose -f docker-compose.prod.yml logs service_name

# Check resource usage
docker stats

# Check disk space
df -h
docker system df
```

## 📋 **Production Checklist**

### **After Deployment:**
- [ ] ✅ All services accessible via HTTPS
- [ ] ✅ SSL certificates valid and auto-renewing
- [ ] ✅ Traefik dashboard secured and accessible
- [ ] ✅ Keycloak admin console working
- [ ] ✅ n8n interface functional
- [ ] ✅ Database connections secure
- [ ] ✅ Backups configured and tested
- [ ] ✅ Monitoring alerts working
- [ ] ✅ Log rotation configured
- [ ] ✅ Security updates scheduled
- [ ] ✅ Documentation updated
- [ ] ✅ Team access configured
- [ ] ✅ Disaster recovery plan documented

## 🚨 **Emergency Procedures**

### **Service Recovery**
```bash
# Quick service restart
docker-compose -f docker-compose.prod.yml restart service_name

# Full system restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Restore from backup
./restore.sh /backup/20250919_020000
```

### **Emergency Contacts**
- **Infrastructure**: admin@yourcompany.com
- **Database**: dba@yourcompany.com
- **Security**: security@yourcompany.com

## 📞 **Support & Maintenance**

### **Regular Tasks (Weekly):**
- Check service health and logs
- Review security alerts
- Verify backup completion
- Monitor resource usage

### **Regular Tasks (Monthly):**
- Update system packages
- Update Docker images
- Review access logs
- Test disaster recovery
- Rotate secrets (quarterly)

**🎉 Production deployment complete! Your centralized services are now running securely in production.** 🚀