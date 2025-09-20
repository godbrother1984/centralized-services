# ⚡ Quick Start Guide

-- File: centralized-services/QUICK-START.md
-- Version: 1.0.0
-- Date: 2025-09-19
-- Description: 15-minute quick deployment for testing and development

## 🎯 **Quick Deployment (15 minutes)**

> ⚠️ **For Development/Testing Only** - Use [PRODUCTION-DEPLOY-GUIDE.md](PRODUCTION-DEPLOY-GUIDE.md) for production

### **Prerequisites:**
- Docker & Docker Compose installed
- Ports 80, 443, 8080 available

---

## 🚀 **Step 1: Download & Setup (2 minutes)**

```bash
# Clone repository
git clone <repository-url>
cd centralized-services

# Create hosts entries (Linux/Mac)
echo "127.0.0.1 traefik.localhost auth.localhost n8n.localhost api.localhost" | sudo tee -a /etc/hosts

# Windows: Add to C:\Windows\System32\drivers\etc\hosts
# 127.0.0.1 traefik.localhost auth.localhost n8n.localhost api.localhost
```

---

## 🐳 **Step 2: Start Services (3 minutes)**

```bash
# Start development environment
docker-compose up -d

# Wait for services to start
sleep 60

# Check status
docker-compose ps
```

---

## ✅ **Step 3: Access Services (1 minute)**

### **Available Services:**
- **Traefik Dashboard**: http://traefik.localhost/dashboard/ (admin:secret)
- **Keycloak Admin**: http://auth.localhost/admin (admin:Kc_Admin_SecureP@ss2024!)
- **n8n Automation**: http://n8n.localhost (admin:N8n_Admin_SecureP@ss2024!)

### **Quick Test:**
```bash
# Test health endpoints
curl http://auth.localhost/health/ready
curl http://n8n.localhost/healthz
```

---

## 🛠️ **Step 4: Basic Configuration (5 minutes)**

### **Setup Keycloak:**
1. Go to http://auth.localhost/admin
2. Login: admin / Kc_Admin_SecureP@ss2024!
3. Create Realm: "test-realm"
4. Go to Realm Settings → Themes → Login theme: "cigroup-theme"

### **Test API Example:**
```bash
# Start example API
cd example-api
docker-compose up -d

# Test API
curl http://api.localhost/health
curl http://api.localhost/datetime

# Access Swagger docs
open http://api.localhost/docs
```

---

## 🔧 **Step 5: Development Tools (2 minutes)**

### **Database Access:**
```bash
# Connect to central database
psql -h localhost -p 15432 -U postgres -d postgres

# Password: postgres_admin_password
```

### **Useful Commands:**
```bash
# View logs
docker-compose logs -f

# Restart service
docker-compose restart keycloak

# Stop all
docker-compose down

# Reset everything
docker-compose down -v
```

---

## 📚 **Next Steps:**

### **For Development:**
- Read [docs/reference/INTEGRATION.md](docs/reference/INTEGRATION.md) for adding your apps
- Check [example-api/](example-api/) for API integration examples
- Review [docs/reference/KEYCLOAK-THEME-SETUP.md](docs/reference/KEYCLOAK-THEME-SETUP.md) for customization

### **For Production:**
- Follow [PRODUCTION-DEPLOY-GUIDE.md](PRODUCTION-DEPLOY-GUIDE.md)
- Review [docs/reference/SECURITY-GUIDE.md](docs/reference/SECURITY-GUIDE.md)
- Setup monitoring and backups

---

## 🆘 **Quick Troubleshooting:**

### **Services won't start:**
```bash
# Check Docker
docker --version

# Check ports
sudo netstat -tlnp | grep -E ':80|:443|:8080'

# Reset and try again
docker-compose down -v
docker-compose up -d
```

### **Can't access services:**
```bash
# Check hosts file
cat /etc/hosts | grep localhost

# Test direct access
curl http://localhost:80
```

### **Database issues:**
```bash
# Check database logs
docker-compose logs central-postgresql

# Connect directly to container
docker exec -it central-postgresql psql -U postgres
```

**🎉 Quick development environment ready in 15 minutes!** 🚀