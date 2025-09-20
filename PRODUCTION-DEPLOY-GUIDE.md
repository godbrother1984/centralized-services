# 🚀 Production Deployment Guide

-- File: centralized-services/PRODUCTION-DEPLOY-GUIDE.md
-- Version: 1.0.0
-- Date: 2025-09-19
-- Description: Step-by-step production deployment guide - Essential steps only

## 📋 **Prerequisites Checklist**

### ✅ **Before You Start:**
- [ ] **Server**: Ubuntu 20.04+ with 4+ CPU cores, 8+ GB RAM, 100+ GB SSD
- [ ] **Domain**: Registered domain with DNS access
- [ ] **Email**: Valid email for SSL certificates
- [ ] **SSH Access**: Root or sudo access to server
- [ ] **Internet**: Server can reach internet for SSL certificates

### ⏱️ **Estimated Time:** 30-45 minutes

---

## 🖥️ **STEP 1: Server Setup (5 minutes)**

### **1.1 Connect to Server**
```bash
# SSH to your server
ssh root@your-server-ip

# Or with sudo user
ssh username@your-server-ip
```

### **1.2 Update System**
```bash
# Update package list and install updates
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl git ufw htpasswd
```

### **1.3 Configure Firewall**
```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Verify firewall status
sudo ufw status
```

---

## 🐳 **STEP 2: Install Docker (5 minutes)**

### **2.1 Install Docker**
```bash
# Download and install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Start and enable Docker
sudo systemctl enable docker
sudo systemctl start docker
```

### **2.2 Install Docker Compose**
```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### **2.3 Logout and Login**
```bash
# Log out and log back in for group changes to take effect
exit

# SSH back in
ssh username@your-server-ip
```

---

## 📁 **STEP 3: Deploy Application (10 minutes)**

### **3.1 Create Application Directory**
```bash
# Create and navigate to application directory
sudo mkdir -p /opt/centralized-services
sudo chown $USER:$USER /opt/centralized-services
cd /opt/centralized-services
```

### **3.2 Upload Application Files**

**Option A: Using Git (Recommended)**
```bash
# Clone repository
git clone <your-repository-url> .

# Or if already downloaded, upload via SCP
```

**Option B: Using SCP**
```bash
# From your local machine
scp -r ./centralized-services/* username@your-server-ip:/opt/centralized-services/
```

### **3.3 Set Permissions**
```bash
# Set executable permissions
chmod +x scripts/*.sh 2>/dev/null || true

# Create secrets directory
mkdir -p secrets
chmod 700 secrets
```

---

## 🌐 **STEP 4: Configure DNS (5 minutes)**

### **4.1 Create DNS Records**
```bash
# Add these A records in your domain DNS:
# Replace "203.0.113.10" with your actual server IP

traefik.yourdomain.com     A    203.0.113.10
auth.yourdomain.com        A    203.0.113.10
n8n.yourdomain.com         A    203.0.113.10
```

### **4.2 Verify DNS Propagation**
```bash
# Test DNS resolution (wait 5-10 minutes after creating records)
nslookup auth.yourdomain.com
dig auth.yourdomain.com

# Should return your server IP
```

---

## 🔐 **STEP 5: Generate Secrets (5 minutes)**

### **5.1 Generate Strong Passwords**
```bash
# Generate passwords for all services
echo "$(openssl rand -base64 32)" > secrets/keycloak_admin_password.txt
echo "$(openssl rand -base64 32)" > secrets/keycloak_db_password.txt
echo "$(openssl rand -base64 32)" > secrets/central_db_password.txt
echo "$(openssl rand -base64 32)" > secrets/n8n_admin_password.txt
echo "$(openssl rand -base64 32)" > secrets/n8n_db_password.txt

# Secure permissions
chmod 600 secrets/*.txt

# Verify passwords were created
ls -la secrets/
```

### **5.2 Generate Traefik Basic Auth**
```bash
# Generate bcrypt hash for Traefik dashboard
# Replace "your-admin-password" with a strong password
ADMIN_PASSWORD="your-admin-password"
TRAEFIK_HASH=$(htpasswd -nbB admin "$ADMIN_PASSWORD")

# Save for next step
echo "Your Traefik hash: $TRAEFIK_HASH"
```

---

## ⚙️ **STEP 6: Configure Environment (5 minutes)**

### **6.1 Create Production Environment File**
```bash
# Create .env file
cat > .env << 'EOF'
# ===== DOMAIN CONFIGURATION =====
# Replace with your actual domains
TRAEFIK_DOMAIN=traefik.yourdomain.com
KEYCLOAK_DOMAIN=auth.yourdomain.com
N8N_DOMAIN=n8n.yourdomain.com

# ===== SSL CONFIGURATION =====
# Replace with your email
ACME_EMAIL=admin@yourdomain.com

# ===== SECURITY CONFIGURATION =====
# Replace with your office/home IP range
ADMIN_IP_WHITELIST=0.0.0.0/0
DB_ACCESS_IP_WHITELIST=0.0.0.0/0

# ===== TRAEFIK BASIC AUTH =====
# Replace with the hash generated in previous step
TRAEFIK_BASIC_AUTH=admin:$$2y$$10$$your_hash_here

# ===== COMPANY BRANDING =====
COMPANY_NAME="Your Company"
COMPANY_SHORT_NAME="YourCorp"
THEME_NAME="yourcompany-theme"

# ===== THEME COLORS =====
THEME_PRIMARY_COLOR=#1e40af
THEME_BACKGROUND_GRADIENT="linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)"
THEME_LOGO_URL=
THEME_SHOW_EMOJI_PLACEHOLDER=true
THEME_EMOJI_PLACEHOLDER=🏢
EOF
```

### **6.2 Edit Configuration**
```bash
# Edit the .env file with your actual values
nano .env

# Important: Replace these values:
# - yourdomain.com with your actual domain
# - admin@yourdomain.com with your email
# - TRAEFIK_BASIC_AUTH with the hash from step 5.2
# - ADMIN_IP_WHITELIST with your IP range (optional: keep 0.0.0.0/0 for now)
```

### **6.3 Verify Configuration**
```bash
# Check that all variables are set
cat .env | grep -E "DOMAIN|EMAIL|BASIC_AUTH"
```

---

## 🚀 **STEP 7: Deploy Services (10 minutes)**

### **7.1 Start Production Services**
```bash
# Deploy using production configuration
docker-compose -f docker-compose.prod.yml up -d

# This will take 5-10 minutes to download images and start services
```

### **7.2 Monitor Deployment**
```bash
# Watch the deployment progress
docker-compose -f docker-compose.prod.yml logs -f

# Wait for all services to show "healthy" status
# Press Ctrl+C to stop following logs

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### **7.3 Wait for SSL Certificates**
```bash
# Wait 2-3 minutes for Let's Encrypt certificates
sleep 180

# Check certificate status
docker-compose -f docker-compose.prod.yml logs traefik | grep -i "certificate"
```

---

## ✅ **STEP 8: Verify Deployment (5 minutes)**

### **8.1 Test HTTPS Access**
```bash
# Test each service (replace yourdomain.com with your domain)
curl -I https://auth.yourdomain.com/health/ready
curl -I https://n8n.yourdomain.com/healthz
curl -I https://traefik.yourdomain.com/ping
```

### **8.2 Access Services**

**Open in your browser:**
1. **Keycloak**: https://auth.yourdomain.com/admin
   - Username: `admin`
   - Password: (from `secrets/keycloak_admin_password.txt`)

2. **n8n**: https://n8n.yourdomain.com
   - Username: `admin`
   - Password: (from `secrets/n8n_admin_password.txt`)

3. **Traefik Dashboard**: https://traefik.yourdomain.com/dashboard/
   - Username: `admin`
   - Password: (the password you used in step 5.2)

### **8.3 Get Passwords**
```bash
# Display all passwords for easy access
echo "=== SERVICE PASSWORDS ==="
echo "Keycloak Admin: $(cat secrets/keycloak_admin_password.txt)"
echo "n8n Admin: $(cat secrets/n8n_admin_password.txt)"
echo "Traefik Dashboard: your-admin-password (from step 5.2)"
```

---

## 🎯 **STEP 9: Initial Configuration (Optional)**

### **9.1 Configure Keycloak**
1. **Login to Keycloak Admin**: https://auth.yourdomain.com/admin
2. **Create Realm**: Click "Create Realm" → Name: "your-company"
3. **Configure Theme**:
   - Realm Settings → Themes
   - Login theme: `cigroup-theme`
   - Save
4. **Create Client**: Clients → Create Client → OpenID Connect

### **9.2 Configure n8n**
1. **Login to n8n**: https://n8n.yourdomain.com
2. **Setup Profile**: Complete initial setup
3. **Test Workflow**: Create a simple test workflow

---

## ✅ **Deployment Complete!**

### **🎉 Your services are now running:**
- ✅ **Keycloak Authentication**: https://auth.yourdomain.com
- ✅ **n8n Workflow Automation**: https://n8n.yourdomain.com
- ✅ **Traefik Dashboard**: https://traefik.yourdomain.com/dashboard/
- ✅ **SSL Certificates**: Auto-renewing Let's Encrypt
- ✅ **Database**: PostgreSQL with secure access
- ✅ **Monitoring**: Health checks and logging

### **🔐 Security Status:**
- ✅ **HTTPS Enforced**: All traffic encrypted
- ✅ **Secure Passwords**: Generated strong passwords
- ✅ **Container Isolation**: Services isolated in networks
- ✅ **Firewall Configured**: Only necessary ports open
- ✅ **Admin Protection**: Basic auth on dashboard

---

## 🛠️ **Post-Deployment Commands**

### **View Logs**
```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# View specific service logs
docker-compose -f docker-compose.prod.yml logs keycloak
docker-compose -f docker-compose.prod.yml logs traefik
```

### **Restart Services**
```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart keycloak
```

### **Update Services**
```bash
# Pull latest images and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### **Stop Services**
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove all data (DANGER!)
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🆘 **Troubleshooting**

### **SSL Certificate Issues**
```bash
# Check certificate logs
docker-compose -f docker-compose.prod.yml logs traefik | grep -i acme

# Force certificate renewal
docker-compose -f docker-compose.prod.yml restart traefik
```

### **Service Not Starting**
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check service logs
docker-compose -f docker-compose.prod.yml logs [service-name]

# Restart problematic service
docker-compose -f docker-compose.prod.yml restart [service-name]
```

### **DNS Issues**
```bash
# Test DNS from server
nslookup auth.yourdomain.com

# Test external DNS
dig @8.8.8.8 auth.yourdomain.com
```

### **Can't Access Services**
```bash
# Check firewall
sudo ufw status

# Check if ports are listening
sudo netstat -tlnp | grep -E ':80|:443'

# Check container networking
docker network ls
```

---

## 📞 **Support**

### **Log Collection for Support**
```bash
# Collect system information
cat > system-info.txt << EOF
Date: $(date)
System: $(uname -a)
Docker: $(docker --version)
Docker Compose: $(docker-compose --version)
Services: $(docker-compose -f docker-compose.prod.yml ps)
EOF

# Collect logs
docker-compose -f docker-compose.prod.yml logs > deployment-logs.txt

# Send system-info.txt and deployment-logs.txt for support
```

**🎉 Production deployment complete! Your centralized services are now live and secure.** 🚀