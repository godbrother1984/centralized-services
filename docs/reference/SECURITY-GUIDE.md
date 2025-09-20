# 🔒 Security Implementation Guide

-- File: centralized-services/SECURITY-GUIDE.md
-- Version: 1.0.0
-- Date: 2025-09-19
-- Description: Comprehensive security configuration and best practices

## 🎯 **Security Overview**

ระบบใช้ **Defense in Depth** strategy ด้วย multiple layers of security:

1. **Network Security** - Firewalls, VPN, IP restrictions
2. **Application Security** - Authentication, authorization, input validation
3. **Container Security** - Isolation, least privilege, vulnerability scanning
4. **Data Security** - Encryption at rest and in transit
5. **Operational Security** - Monitoring, auditing, incident response

---

## 🌐 **1. Network Security**

### **1.1 Firewall Configuration**
```bash
# UFW Rules (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp    # HTTP (redirects to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Advanced rules
sudo ufw allow from 203.0.113.0/24 to any port 22    # SSH from office
sudo ufw allow from 198.51.100.0/24 to any port 22   # SSH from VPN
```

### **1.2 Network Segmentation**
```yaml
# Production Networks
networks:
  proxy-network:         # Public-facing services
    ipam:
      config:
        - subnet: 172.20.0.0/16

  keycloak-internal-network:  # Keycloak + DB only
    internal: true
    ipam:
      config:
        - subnet: 172.21.0.0/16

  database-network:      # Database access only
    internal: true
    ipam:
      config:
        - subnet: 172.22.0.0/16
```

### **1.3 IP Whitelisting**
```yaml
# Traefik Labels for IP Restrictions
labels:
  # Admin dashboard access
  - "traefik.http.middlewares.admin-whitelist.ipwhitelist.sourcerange=203.0.113.0/24,198.51.100.0/24"

  # Database access
  - "traefik.tcp.middlewares.db-whitelist.ipwhitelist.sourcerange=203.0.113.0/24"

  # Development access
  - "traefik.http.middlewares.dev-whitelist.ipwhitelist.sourcerange=192.168.1.0/24"
```

---

## 🔐 **2. Authentication & Authorization**

### **2.1 Keycloak Security Configuration**

#### **Realm Security Settings:**
```json
{
  "realm": "production",
  "enabled": true,
  "sslRequired": "external",
  "registrationAllowed": false,
  "registrationEmailAsUsername": true,
  "rememberMe": true,
  "verifyEmail": true,
  "loginWithEmailAllowed": true,
  "duplicateEmailsAllowed": false,
  "resetPasswordAllowed": true,
  "editUsernameAllowed": false,
  "bruteForceProtected": true,
  "permanentLockout": false,
  "maxFailureWaitSeconds": 900,
  "minimumQuickLoginWaitSeconds": 60,
  "waitIncrementSeconds": 60,
  "quickLoginCheckMilliSeconds": 1000,
  "maxDeltaTimeSeconds": 43200,
  "failureFactor": 30
}
```

#### **Password Policy:**
```json
{
  "passwordPolicy": "hashIterations(27500) and length(12) and notUsername and digits(2) and lowerCase(2) and upperCase(2) and specialChars(1) and notEmail"
}
```

#### **Client Security:**
```json
{
  "clientId": "production-app",
  "protocol": "openid-connect",
  "publicClient": false,
  "bearerOnly": false,
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  "serviceAccountsEnabled": true,
  "authorizationServicesEnabled": true,
  "frontchannelLogout": true,
  "attributes": {
    "saml.assertion.signature": "true",
    "saml.force.post.binding": "true",
    "saml.multivalued.roles": "false",
    "saml.encrypt": "true",
    "post.logout.redirect.uris": "+"
  }
}
```

### **2.2 Multi-Factor Authentication**

#### **TOTP Configuration:**
```json
{
  "requiredActions": [
    {
      "alias": "CONFIGURE_TOTP",
      "name": "Configure OTP",
      "providerId": "CONFIGURE_TOTP",
      "enabled": true,
      "defaultAction": false,
      "priority": 10,
      "config": {}
    }
  ],
  "otpPolicyType": "totp",
  "otpPolicyAlgorithm": "HmacSHA1",
  "otpPolicyInitialCounter": 0,
  "otpPolicyDigits": 6,
  "otpPolicyLookAheadWindow": 1,
  "otpPolicyPeriod": 30
}
```

#### **SMS OTP (Optional):**
```yaml
# SMS Provider Configuration
environment:
  SMS_PROVIDER: twilio
  TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
  TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
  TWILIO_PHONE_NUMBER: ${TWILIO_PHONE_NUMBER}
```

---

## 🛡️ **3. Container Security**

### **3.1 Image Security**
```dockerfile
# Use specific tags, not 'latest'
FROM postgres:15.4-alpine

# Run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Set ownership and permissions
COPY --chown=appuser:appgroup app.js /app/
RUN chmod +x /app/app.js

USER appuser
```

### **3.2 Container Runtime Security**
```yaml
services:
  api:
    security_opt:
      - no-new-privileges:true    # Prevent privilege escalation
    cap_drop:
      - ALL                       # Drop all capabilities
    cap_add:
      - CHOWN                     # Add only needed capabilities
    read_only: true               # Read-only root filesystem
    tmpfs:
      - /tmp                      # Writable temp directory
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### **3.3 Secret Management**
```yaml
# Docker Secrets (Production)
secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    external: true
    name: production_api_key

services:
  api:
    secrets:
      - source: db_password
        target: /run/secrets/db_password
        uid: "1001"
        gid: "1001"
        mode: 0400
```

---

## 🔒 **4. SSL/TLS Configuration**

### **4.1 Let's Encrypt Configuration**
```yaml
# Traefik SSL Configuration
command:
  - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
  - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
  - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
  - "--certificatesresolvers.letsencrypt.acme.caserver=https://acme-v02.api.letsencrypt.org/directory"

labels:
  # Force HTTPS
  - "traefik.http.routers.api.tls.certresolver=letsencrypt"
  - "traefik.http.routers.api.entrypoints=websecure"

  # Redirect HTTP to HTTPS
  - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
  - "traefik.http.routers.api-http.middlewares=redirect-to-https"
```

### **4.2 Security Headers**
```yaml
# Security Headers Middleware
labels:
  - "traefik.http.middlewares.security-headers.headers.customresponseheaders.X-Content-Type-Options=nosniff"
  - "traefik.http.middlewares.security-headers.headers.customresponseheaders.X-Frame-Options=DENY"
  - "traefik.http.middlewares.security-headers.headers.customresponseheaders.X-XSS-Protection=1; mode=block"
  - "traefik.http.middlewares.security-headers.headers.customresponseheaders.Strict-Transport-Security=max-age=31536000; includeSubDomains; preload"
  - "traefik.http.middlewares.security-headers.headers.customresponseheaders.Referrer-Policy=strict-origin-when-cross-origin"
  - "traefik.http.middlewares.security-headers.headers.customresponseheaders.Content-Security-Policy=default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
```

### **4.3 TLS Configuration**
```yaml
# Modern TLS Configuration
- "traefik.http.middlewares.tls-security.headers.customresponseheaders.Strict-Transport-Security=max-age=31536000; includeSubDomains; preload"

# TLS Version Control
command:
  - "--entrypoints.websecure.http.tls.options=modern@file"

# TLS Options File
tls:
  options:
    modern:
      minVersion: "VersionTLS12"
      cipherSuites:
        - "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
        - "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305"
        - "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
```

---

## 🔍 **5. Database Security**

### **5.1 PostgreSQL Security Configuration**
```conf
# postgresql.conf
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
ssl_ca_file = 'ca.crt'
ssl_crl_file = 'ca.crl'

# Connection security
password_encryption = scram-sha-256
tcp_keepalives_idle = 600
tcp_keepalives_interval = 30
tcp_keepalives_count = 3

# Logging for security auditing
log_connections = on
log_disconnections = on
log_checkpoints = on
log_lock_waits = on
log_statement = 'mod'
log_min_duration_statement = 1000
```

### **5.2 Database Access Control**
```conf
# pg_hba.conf
# TYPE  DATABASE    USER        ADDRESS         METHOD

# Local connections
local   all         postgres                    peer
local   all         all                         scram-sha-256

# Remote connections (restricted)
host    all         postgres    172.20.0.0/16   scram-sha-256
host    postgres    app_user    172.20.0.0/16   scram-sha-256

# Reject all others
host    all         all         0.0.0.0/0       reject
```

### **5.3 Database User Management**
```sql
-- Create application user with limited privileges
CREATE USER app_user WITH
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  CONNECTION LIMIT 50
  PASSWORD 'strong_password_here';

-- Grant minimal required permissions
GRANT CONNECT ON DATABASE app_db TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Create read-only user for reports
CREATE USER readonly_user WITH
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  CONNECTION LIMIT 10
  PASSWORD 'readonly_password_here';

GRANT CONNECT ON DATABASE app_db TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
```

---

## 📊 **6. Monitoring & Auditing**

### **6.1 Security Monitoring**
```yaml
# Log Configuration
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
    labels: "service,environment"

# Audit Log Collection
volumes:
  - /var/log/audit:/var/log/audit:ro
  - /var/log/auth.log:/var/log/auth.log:ro
```

### **6.2 Intrusion Detection**
```bash
# Install and configure fail2ban
sudo apt install fail2ban

# Custom jail configuration
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/*error.log
maxretry = 3
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### **6.3 Security Alerts**
```bash
#!/bin/bash
# security-monitor.sh

# Check for suspicious activities
ALERT_EMAIL="security@yourcompany.com"

# Monitor failed login attempts
FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log | tail -10 | wc -l)
if [ $FAILED_LOGINS -gt 5 ]; then
    echo "Multiple failed login attempts detected" | mail -s "Security Alert" $ALERT_EMAIL
fi

# Monitor Docker daemon
if ! systemctl is-active --quiet docker; then
    echo "Docker daemon is not running" | mail -s "Service Alert" $ALERT_EMAIL
fi

# Monitor SSL certificate expiration
CERT_EXPIRY=$(openssl s_client -connect auth.yourcompany.com:443 -servername auth.yourcompany.com 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
EXPIRY_DATE=$(date -d "$CERT_EXPIRY" +%s)
CURRENT_DATE=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_DATE - $CURRENT_DATE) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "SSL certificate expires in $DAYS_UNTIL_EXPIRY days" | mail -s "Certificate Alert" $ALERT_EMAIL
fi
```

---

## 🔄 **7. Incident Response**

### **7.1 Security Incident Playbook**

#### **Detection Phase:**
1. **Automated Alerts** - Monitor logs and metrics
2. **Manual Review** - Regular security assessments
3. **User Reports** - Security incident reporting

#### **Response Phase:**
```bash
# Emergency response procedures

# 1. Isolate affected systems
docker-compose down service_name

# 2. Preserve evidence
cp /var/log/audit/audit.log /backup/incident-$(date +%Y%m%d_%H%M%S)/
docker logs container_name > /backup/incident-logs.txt

# 3. Assess damage
# Review access logs, database changes, configuration modifications

# 4. Contain threat
# Block malicious IPs, disable compromised accounts
sudo ufw insert 1 deny from malicious_ip
```

#### **Recovery Phase:**
```bash
# 1. Apply security patches
sudo apt update && sudo apt upgrade -y
docker-compose pull && docker-compose up -d

# 2. Restore from backup if needed
./restore.sh /backup/clean-backup-date

# 3. Reset compromised credentials
# Generate new passwords, update secrets
./scripts/rotate-passwords.sh

# 4. Verify system integrity
./scripts/security-audit.sh
```

### **7.2 Communication Plan**
```yaml
# Incident Response Contacts
stakeholders:
  security_team: "security@yourcompany.com"
  infrastructure: "ops@yourcompany.com"
  management: "ciso@yourcompany.com"
  external_support: "support@vendor.com"

# Communication templates
notifications:
  initial: "Security incident detected - investigating"
  update: "Incident update - containment in progress"
  resolution: "Security incident resolved - system restored"
```

---

## 🔐 **8. Compliance & Governance**

### **8.1 Security Policies**
- **Access Control Policy** - User access management
- **Data Protection Policy** - Data handling procedures
- **Incident Response Policy** - Security incident procedures
- **Change Management Policy** - Configuration change control
- **Backup and Recovery Policy** - Data protection procedures

### **8.2 Regular Security Tasks**

#### **Daily:**
- [ ] Review security alerts and logs
- [ ] Monitor system performance and availability
- [ ] Check backup completion status

#### **Weekly:**
- [ ] Review access logs for anomalies
- [ ] Update security signatures and definitions
- [ ] Test backup restoration procedures

#### **Monthly:**
- [ ] Security patch management
- [ ] Access review and cleanup
- [ ] Security awareness training
- [ ] Vulnerability assessment

#### **Quarterly:**
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Policy review and updates
- [ ] Disaster recovery testing
- [ ] Password rotation

---

## 🎯 **Security Metrics & KPIs**

### **Security Metrics:**
- **Mean Time to Detection (MTTD)** - Average time to detect incidents
- **Mean Time to Response (MTTR)** - Average time to respond to incidents
- **Vulnerability Remediation Time** - Time to patch vulnerabilities
- **Access Review Compliance** - Percentage of access reviews completed
- **Security Training Completion** - Staff security training completion rate

### **Monitoring Dashboard:**
```yaml
# Key security indicators to monitor
metrics:
  authentication:
    - failed_login_attempts
    - successful_logins
    - concurrent_sessions

  network:
    - blocked_ips
    - suspicious_connections
    - traffic_anomalies

  system:
    - unauthorized_access_attempts
    - privilege_escalations
    - file_integrity_violations

  application:
    - api_error_rates
    - database_connection_failures
    - certificate_expiration_warnings
```

---

## 🛡️ **Security Best Practices Summary**

### **✅ Implemented:**
1. **Defense in Depth** - Multiple security layers
2. **Least Privilege** - Minimal access rights
3. **Zero Trust** - Verify everything
4. **Continuous Monitoring** - Real-time security monitoring
5. **Incident Response** - Prepared response procedures
6. **Regular Updates** - Automated security updates
7. **Backup & Recovery** - Comprehensive backup strategy
8. **Access Control** - Strong authentication and authorization

### **🔒 Key Security Features:**
- **Multi-factor Authentication** - TOTP and SMS support
- **IP Whitelisting** - Restricted admin access
- **SSL/TLS Encryption** - End-to-end encryption
- **Container Isolation** - Network and process isolation
- **Secret Management** - Secure credential storage
- **Audit Logging** - Comprehensive activity logging
- **Vulnerability Scanning** - Regular security assessments
- **Automated Backups** - Disaster recovery preparedness

**🎉 ระบบมีความปลอดภัยระดับ Enterprise พร้อมใช้งาน Production!** 🚀