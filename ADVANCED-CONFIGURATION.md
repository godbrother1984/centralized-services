# ⚙️ Advanced Configuration Guide

-- File: centralized-services/ADVANCED-CONFIGURATION.md
-- Version: 1.0.0
-- Date: 2025-09-19
-- Description: Advanced configurations and optional features for production

## 📋 **Overview**

This guide covers **advanced configurations** and **optional features** that are not required for basic production deployment but can enhance security, performance, and functionality.

> 💡 **Note**: Complete the [PRODUCTION-DEPLOY-GUIDE.md](PRODUCTION-DEPLOY-GUIDE.md) first before implementing these advanced features.

---

## 🔒 **Advanced Security Configuration**

### **1. IP Whitelisting for Admin Access**

#### **Update Environment Variables**
```bash
# Edit .env file
nano .env

# Replace these values with your actual IP ranges
ADMIN_IP_WHITELIST=203.0.113.0/24,198.51.100.0/24  # Your office/VPN IPs
DB_ACCESS_IP_WHITELIST=203.0.113.0/24               # Database access IPs
```

#### **Apply Changes**
```bash
# Restart services to apply IP restrictions
docker-compose -f docker-compose.prod.yml up -d
```

### **2. Enhanced Authentication**

#### **Setup Multi-Factor Authentication (MFA)**
```bash
# Access Keycloak Admin Console
# https://auth.yourdomain.com/admin

# Navigate to: Authentication → Required Actions
# Enable: Configure OTP
# Users will be prompted to setup TOTP on next login
```

#### **Configure Password Policy**
```bash
# In Keycloak Admin Console:
# Authentication → Password Policy

# Recommended settings:
# - Minimum length: 12
# - Require digits: 2
# - Require lowercase: 2
# - Require uppercase: 2
# - Require special characters: 1
# - Not username
# - Not email
```

### **3. SSL Certificate Management**

#### **Custom SSL Certificates (Optional)**
```bash
# If you have custom certificates instead of Let's Encrypt
mkdir -p ssl/
cp your-certificate.crt ssl/
cp your-private-key.key ssl/
cp ca-bundle.crt ssl/

# Update docker-compose.prod.yml volumes:
volumes:
  - ./ssl:/ssl:ro
```

#### **SSL Security Headers**
```yaml
# Already configured in production compose file
# Includes: HSTS, X-Frame-Options, X-Content-Type-Options
```

---

## 📊 **Advanced Monitoring & Backup**

### **1. Automated Backup System**

#### **Create Backup Script**
```bash
# Create comprehensive backup script
cat > backup-system.sh << 'EOF'
#!/bin/bash

# Configuration
BACKUP_DIR="/opt/backups"
RETENTION_DAYS=30
S3_BUCKET="your-backup-bucket"  # Optional
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"

# Create backup directory
mkdir -p "$BACKUP_PATH"

echo "Starting backup at $(date)"

# Database backups
echo "Backing up databases..."
docker exec central-postgresql-prod pg_dump -U postgres > "$BACKUP_PATH/central_db.sql"
docker exec keycloak-postgresql-prod pg_dump -U keycloak_user keycloak_db > "$BACKUP_PATH/keycloak_db.sql"

# Keycloak realm export
echo "Exporting Keycloak realms..."
docker exec keycloak-prod /opt/keycloak/bin/kc.sh export --file=/tmp/realm-export.json
docker cp keycloak-prod:/tmp/realm-export.json "$BACKUP_PATH/keycloak-realms.json"

# Configuration backup
echo "Backing up configuration..."
tar -czf "$BACKUP_PATH/config.tar.gz" \
  /opt/centralized-services/*.yml \
  /opt/centralized-services/.env \
  /opt/centralized-services/secrets/ \
  --exclude=secrets/*.txt

# Docker volumes backup
echo "Backing up volumes..."
docker run --rm -v central_postgresql_data:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/volumes.tar.gz /data

# Upload to S3 (if configured)
if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
    echo "Uploading to S3..."
    aws s3 sync "$BACKUP_PATH" "s3://$S3_BUCKET/backups/$DATE/"
fi

# Cleanup old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +

echo "Backup completed at $(date)"
echo "Backup location: $BACKUP_PATH"
EOF

chmod +x backup-system.sh
```

#### **Schedule Automated Backups**
```bash
# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /opt/centralized-services/backup-system.sh >> /var/log/backup.log 2>&1
```

#### **Test Backup System**
```bash
# Run backup manually to test
./backup-system.sh

# Verify backup was created
ls -la /opt/backups/
```

### **2. System Monitoring**

#### **Create Health Check Script**
```bash
cat > health-check.sh << 'EOF'
#!/bin/bash

# Configuration
ALERT_EMAIL="admin@yourdomain.com"
SERVICES=("https://auth.yourdomain.com/health/ready" "https://n8n.yourdomain.com/healthz")

# Check each service
for service in "${SERVICES[@]}"; do
    if ! curl -f -s --max-time 10 "$service" > /dev/null 2>&1; then
        echo "Service $service is down!" | mail -s "Service Alert: $(hostname)" "$ALERT_EMAIL"
        echo "$(date): Service $service is down" >> /var/log/health-check.log
    fi
done

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "Disk usage is ${DISK_USAGE}%" | mail -s "Disk Space Alert: $(hostname)" "$ALERT_EMAIL"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    echo "Memory usage is ${MEMORY_USAGE}%" | mail -s "Memory Alert: $(hostname)" "$ALERT_EMAIL"
fi
EOF

chmod +x health-check.sh

# Schedule health checks (every 5 minutes)
crontab -e
# Add: */5 * * * * /opt/centralized-services/health-check.sh
```

### **3. Log Management**

#### **Setup Log Rotation**
```bash
# Create log rotation configuration
sudo tee /etc/logrotate.d/centralized-services > /dev/null << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=100M
    missingok
    delaycompress
    copytruncate
}

/opt/centralized-services/logs/*.log {
    rotate 30
    daily
    compress
    missingok
    delaycompress
    create 644 root root
}
EOF
```

#### **Centralized Logging (Optional)**
```yaml
# Add to docker-compose.prod.yml for centralized logging
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - monitoring-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    networks:
      - monitoring-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.kibana.rule=Host(`logs.yourdomain.com`)"
      - "traefik.http.routers.kibana.entrypoints=websecure"
      - "traefik.http.routers.kibana.tls.certresolver=letsencrypt"

volumes:
  elasticsearch_data:

networks:
  monitoring-network:
    driver: bridge
```

---

## 🚀 **Performance Optimization**

### **1. Database Performance Tuning**

#### **PostgreSQL Optimization**
```bash
# Create optimized postgresql.conf
cat > postgresql-optimized.conf << 'EOF'
# Memory Settings (adjust based on your server)
shared_buffers = 2GB                    # 25% of total RAM
effective_cache_size = 6GB              # 75% of total RAM
work_mem = 16MB
maintenance_work_mem = 512MB

# Connection Settings
max_connections = 100
superuser_reserved_connections = 3

# Performance Settings
random_page_cost = 1.1
effective_io_concurrency = 200
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8

# WAL Settings for Better Performance
wal_level = replica
max_wal_size = 4GB
min_wal_size = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 64MB

# Logging for Performance Analysis
log_min_duration_statement = 1000       # Log slow queries
log_checkpoints = on
log_connections = on
log_disconnections = on

# Autovacuum Tuning
autovacuum_max_workers = 4
autovacuum_naptime = 30s
EOF

# Update docker-compose.prod.yml to use optimized config
# volumes:
#   - ./postgresql-optimized.conf:/etc/postgresql/postgresql.conf
```

### **2. Traefik Performance**

#### **Enable Traefik Metrics**
```yaml
# Add to traefik service in docker-compose.prod.yml
command:
  - "--metrics.prometheus=true"
  - "--metrics.prometheus.addEntryPointsLabels=true"
  - "--metrics.prometheus.addServicesLabels=true"
  - "--api.dashboard=true"
  - "--api.debug=false"

labels:
  # Expose metrics endpoint
  - "traefik.http.routers.metrics.rule=Host(`traefik.yourdomain.com`) && Path(`/metrics`)"
  - "traefik.http.routers.metrics.entrypoints=websecure"
  - "traefik.http.routers.metrics.tls.certresolver=letsencrypt"
```

### **3. Container Resource Optimization**

#### **Fine-tune Resource Limits**
```yaml
# Example optimized resource allocation
services:
  keycloak:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.5'
        reservations:
          memory: 1G
          cpus: '0.5'

  central-postgresql:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 2G
          cpus: '1.0'
```

---

## 🔧 **Advanced Features**

### **1. Custom Domain Integration**

#### **API Subdomain Setup**
```bash
# Add DNS record
api.yourdomain.com    A    your-server-ip

# Add to any API container
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.your-api.rule=Host(`api.yourdomain.com`)"
  - "traefik.http.routers.your-api.entrypoints=websecure"
  - "traefik.http.routers.your-api.tls.certresolver=letsencrypt"
```

### **2. Development Environment**

#### **Create Development Override**
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  traefik:
    command:
      - "--api.debug=true"
      - "--log.level=DEBUG"
    ports:
      - "8080:8080"  # Expose dashboard port

  keycloak:
    environment:
      KC_LOG_LEVEL: DEBUG

  central-postgresql:
    ports:
      - "5432:5432"  # Expose database port for development
```

### **3. Staging Environment**

#### **Create Staging Configuration**
```bash
# Copy and modify for staging
cp .env .env.staging

# Update domains in .env.staging
TRAEFIK_DOMAIN=staging-traefik.yourdomain.com
KEYCLOAK_DOMAIN=staging-auth.yourdomain.com
N8N_DOMAIN=staging-n8n.yourdomain.com

# Deploy staging
docker-compose -f docker-compose.prod.yml --env-file .env.staging up -d
```

---

## 🔄 **Maintenance Procedures**

### **1. Rolling Updates**

#### **Zero-Downtime Service Updates**
```bash
# Update specific service without downtime
docker-compose -f docker-compose.prod.yml pull keycloak
docker-compose -f docker-compose.prod.yml up -d --no-deps keycloak

# Scale API services for load balancing
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

### **2. Database Maintenance**

#### **Regular Database Maintenance**
```bash
# Create maintenance script
cat > db-maintenance.sh << 'EOF'
#!/bin/bash

echo "Starting database maintenance..."

# Vacuum and analyze databases
docker exec central-postgresql-prod psql -U postgres -c "VACUUM ANALYZE;"
docker exec keycloak-postgresql-prod psql -U keycloak_user -d keycloak_db -c "VACUUM ANALYZE;"

# Update statistics
docker exec central-postgresql-prod psql -U postgres -c "ANALYZE;"

# Check for bloated tables
docker exec central-postgresql-prod psql -U postgres -c "
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;"

echo "Database maintenance completed."
EOF

chmod +x db-maintenance.sh

# Schedule weekly maintenance
crontab -e
# Add: 0 3 * * 0 /opt/centralized-services/db-maintenance.sh >> /var/log/db-maintenance.log 2>&1
```

### **3. Security Updates**

#### **Automated Security Updates**
```bash
cat > security-update.sh << 'EOF'
#!/bin/bash

echo "Starting security updates..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
cd /opt/centralized-services
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Clean unused images
docker image prune -f

# Check for vulnerabilities (if trivy is installed)
if command -v trivy &> /dev/null; then
    trivy image quay.io/keycloak/keycloak:24.0.5
    trivy image postgres:15-alpine
fi

echo "Security updates completed."
EOF

chmod +x security-update.sh

# Schedule monthly security updates
crontab -e
# Add: 0 4 1 * * /opt/centralized-services/security-update.sh >> /var/log/security-update.log 2>&1
```

---

## 🆘 **Advanced Troubleshooting**

### **1. Performance Issues**

#### **Database Performance Analysis**
```bash
# Check slow queries
docker exec central-postgresql-prod psql -U postgres -c "
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"

# Check connection usage
docker exec central-postgresql-prod psql -U postgres -c "
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;"
```

#### **Container Resource Usage**
```bash
# Monitor resource usage
docker stats --no-stream

# Check container logs for memory issues
docker-compose -f docker-compose.prod.yml logs | grep -i "out of memory\|oom"
```

### **2. SSL Certificate Issues**

#### **Certificate Debugging**
```bash
# Check certificate details
openssl s_client -connect auth.yourdomain.com:443 -servername auth.yourdomain.com

# Check Let's Encrypt logs
docker-compose -f docker-compose.prod.yml logs traefik | grep -i acme

# Force certificate renewal
docker exec traefik-prod rm -f /letsencrypt/acme.json
docker-compose -f docker-compose.prod.yml restart traefik
```

### **3. Network Issues**

#### **Network Debugging**
```bash
# Test internal network connectivity
docker exec keycloak-prod ping central-postgresql-prod

# Check network configuration
docker network inspect proxy-network-prod

# Test external connectivity
docker exec traefik-prod nslookup auth.yourdomain.com
```

---

## 📞 **Expert Support**

### **Professional Services Available:**
- **Custom Theme Development**
- **Advanced Security Hardening**
- **Performance Optimization**
- **High Availability Setup**
- **Disaster Recovery Planning**
- **24/7 Monitoring Setup**

### **Enterprise Features:**
- **Multi-region Deployment**
- **Advanced Backup Strategies**
- **Compliance Configuration (GDPR, SOC2)**
- **Integration with External Identity Providers**
- **Custom Authentication Flows**

---

**💡 These advanced configurations are optional but recommended for enterprise production environments.** 🚀