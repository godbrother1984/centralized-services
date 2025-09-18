# คู่มือการติดตั้งระบบ Centralized Services
-- File: centralized-services/INSTALLATION.md
-- Version: 2.1.0
-- Date: 2025-09-18
-- Description: คู่มือการติดตั้งและตั้งค่าระบบ Centralized Services พร้อม OAuth2/OIDC Redirect Flow และ Production Security

## สารบัญ
1. [ความต้องการของระบบ](#ความต้องการของระบบ)
2. [การเตรียมความพร้อม](#การเตรียมความพร้อม)
3. [การติดตั้งสำหรับ Development](#การติดตั้งสำหรับ-development)
4. [การติดตั้งสำหรับ Production](#การติดตั้งสำหรับ-production)
5. [การตั้งค่าเริ่มต้น](#การตั้งค่าเริ่มต้น)
6. [การแก้ไขปัญหา](#การแก้ไขปัญหา)

## ความต้องการของระบบ

### ซอฟต์แวร์ที่จำเป็น
- **Docker**: Version 20.10 หรือใหม่กว่า
- **Docker Compose**: Version 2.0 หรือใหม่กว่า
- **Git**: สำหรับดาวน์โหลดโครงการ

### ฮาร์ดแวร์ที่แนะนำ
- **RAM**: อย่างน้อย 4GB (แนะนำ 8GB สำหรับ production)
- **Storage**: อย่างน้อย 10GB พื้นที่ว่าง
- **CPU**: 2 cores หรือมากกว่า

### Network Requirements
- **Ports ที่ต้องว่าง**:
  - `80`: HTTP traffic (Traefik)
  - `443`: HTTPS traffic (Traefik)
  - `15432`: PostgreSQL (Traefik TCP proxy)
  - `8080`: Traefik Dashboard (Development only)

## การเตรียมความพร้อม

### 1. ติดตั้ง Docker
#### Windows
```powershell
# ดาวน์โหลดจาก https://docs.docker.com/desktop/windows/install/
# หรือใช้ winget
winget install Docker.DockerDesktop
```

#### macOS
```bash
# ใช้ Homebrew
brew install --cask docker

# หรือดาวน์โหลดจาก https://docs.docker.com/desktop/mac/install/
```

#### Linux (Ubuntu/Debian)
```bash
# Update package index
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
```

### 2. ตรวจสอบการติดตั้ง
```bash
# ตรวจสอบ Docker version
docker --version

# ตรวจสอบ Docker Compose version
docker compose version

# ทดสอบ Docker
docker run hello-world
```

## การติดตั้งสำหรับ Development

### 1. ดาวน์โหลดโครงการ
```bash
# Clone repository
git clone <repository-url>
cd centralized-services

# ตรวจสอบไฟล์ทั้งหมด
ls -la
```

### 2. ตั้งค่า Environment Variables
```bash
# สำเนาไฟล์ตัวอย่าง
cp .env.example .env

# แก้ไขไฟล์ .env (optional สำหรับ development)
nano .env
```

#### ไฟล์ .env สำหรับ Development
```bash
# PostgreSQL Configuration
POSTGRES_ADMIN_PASSWORD=postgres_admin_password
KEYCLOAK_DB_PASSWORD=keycloak_password

# Keycloak Configuration
KEYCLOAK_ADMIN_PASSWORD=admin123

# Traefik Configuration
TRAEFIK_API_DASHBOARD=true
ACME_EMAIL=admin@cigblusolutions.com

# Local Development Domains
KEYCLOAK_DOMAIN=auth.localhost
TRAEFIK_DOMAIN=traefik.localhost
```

### 3. ตั้งค่า Local Hosts
#### Windows
```powershell
# เปิด PowerShell ในฐานะ Administrator
# แก้ไขไฟล์ hosts
notepad C:\Windows\System32\drivers\etc\hosts

# เพิ่มบรรทัดเหล่านี้:
127.0.0.1    auth.localhost
127.0.0.1    traefik.localhost
127.0.0.1    db.localhost
```

#### macOS/Linux
```bash
# แก้ไขไฟล์ hosts
sudo nano /etc/hosts

# เพิ่มบรรทัดเหล่านี้:
127.0.0.1    auth.localhost
127.0.0.1    traefik.localhost
127.0.0.1    db.localhost
```

### 4. เริ่มต้นระบบ
```bash
# เริ่มบริการทั้งหมด
docker compose up -d

# ตรวจสอบสถานะ
docker compose ps

# ดู logs
docker compose logs -f
```

### 5. ตรวจสอบการทำงาน
```bash
# ตรวจสอบ Traefik Dashboard (ต้อง login)
curl -u admin:secret -f http://traefik.localhost/dashboard/

# ตรวจสอบ Keycloak
curl -f http://auth.localhost/realms/master

# ตรวจสอบ PostgreSQL ผ่าน Traefik TCP Router
psql "postgresql://postgres:postgres_admin_password@localhost:15432/postgres" -c "SELECT version();"

# ทดสอบ Rate Limiting (ควรได้ HTTP 429 หลังจาก burst limit)
seq 1 6 | xargs -I {} -P 6 sh -c 'curl -w "Request {} - Status: %{http_code}\n" -o /dev/null -s -u admin:secret http://traefik.localhost/dashboard/'
```

## การติดตั้งสำหรับ Production บน Ubuntu Server

### ขั้นตอนเตรียม Ubuntu Server

#### 1. อัปเดต System และติดตั้ง Dependencies
```bash
# อัปเดต package lists
sudo apt update && sudo apt upgrade -y

# ติดตั้ง dependencies ที่จำเป็น
sudo apt install -y curl wget git nano htop unzip ufw

# ติดตั้ง certbot สำหรับ SSL certificates (backup)
sudo apt install -y certbot

# ตั้งค่า timezone
sudo timedatectl set-timezone Asia/Bangkok
```

#### 2. ติดตั้ง Docker และ Docker Compose
```bash
# ลบ Docker เก่า (ถ้ามี)
sudo apt remove -y docker docker-engine docker.io containerd runc

# ติดตั้ง dependencies สำหรับ Docker
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# เพิ่ม Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# เพิ่ม Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# อัปเดต package lists และติดตั้ง Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# เพิ่ม user ปัจจุบันเข้า docker group
sudo usermod -aG docker $USER

# เริ่มต้น Docker service
sudo systemctl enable docker
sudo systemctl start docker

# ออกจาก session และเข้าใหม่เพื่อให้ group มีผล
echo "Please logout and login again to apply docker group membership"
```

#### 3. ตั้งค่า Firewall
```bash
# เปิดใช้งาน UFW
sudo ufw enable

# อนุญาต SSH
sudo ufw allow 22/tcp

# อนุญาต HTTP และ HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# อนุญาต PostgreSQL port สำหรับ external access
sudo ufw allow 15432/tcp

# ตรวจสอบสถานะ firewall
sudo ufw status
```

#### 4. ตั้งค่า Swap (สำหรับ server ที่ RAM น้อย)
```bash
# สร้าง swap file 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# เพิ่มใน /etc/fstab เพื่อให้ mount อัตโนมัติ
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# ตั้งค่า swappiness
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

## การติดตั้งสำหรับ Production

### 1. เตรียม Server และ Domain Names

#### ตั้งค่า DNS Records
```bash
# ใน DNS provider ของคุณ ตั้งค่า A records:
# auth.yourdomain.com -> YOUR_SERVER_IP
# traefik.yourdomain.com -> YOUR_SERVER_IP (optional สำหรับ admin dashboard)
# db.yourdomain.com -> YOUR_SERVER_IP (optional สำหรับ database access)

# ตัวอย่าง:
# auth.cigblusolutions.com -> 203.0.113.10
# traefik.cigblusolutions.com -> 203.0.113.10
```

#### Clone โปรเจกต์บน Server
```bash
# เข้าสู่ server ผ่าน SSH
ssh user@your-server-ip

# Clone repository
git clone https://github.com/your-username/centralized-services.git
cd centralized-services

# ตรวจสอบไฟล์
ls -la
```

### 2. ตั้งค่า Environment Variables สำหรับ Production
```bash
# สร้าง strong passwords
POSTGRES_PASS=$(openssl rand -base64 32)
KEYCLOAK_DB_PASS=$(openssl rand -base64 32)
KEYCLOAK_ADMIN_PASS=$(openssl rand -base64 32)
TRAEFIK_DASHBOARD_PASS=$(openssl rand -base64 32 | head -c 16)

# สร้างไฟล์ .env สำหรับ production
cat > .env << EOF
# PostgreSQL Configuration
POSTGRES_ADMIN_PASSWORD=$POSTGRES_PASS
KEYCLOAK_DB_PASSWORD=$KEYCLOAK_DB_PASS

# Keycloak Configuration
KEYCLOAK_ADMIN_PASSWORD=$KEYCLOAK_ADMIN_PASS

# Traefik Configuration
TRAEFIK_API_DASHBOARD=false
TRAEFIK_DASHBOARD_PASSWORD=$TRAEFIK_DASHBOARD_PASS
ACME_EMAIL=admin@yourdomain.com

# Production Domains (แก้ไขตาม domain ของคุณ)
KEYCLOAK_DOMAIN=auth.yourdomain.com
TRAEFIK_DOMAIN=traefik.yourdomain.com
EOF

# แสดง passwords สำหรับเก็บไว้
echo "===== เก็บข้อมูลเหล่านี้ไว้ในที่ปลอดภัย ====="
echo "PostgreSQL Admin Password: $POSTGRES_PASS"
echo "Keycloak DB Password: $KEYCLOAK_DB_PASS"
echo "Keycloak Admin Password: $KEYCLOAK_ADMIN_PASS"
echo "Traefik Dashboard Password: $TRAEFIK_DASHBOARD_PASS"
echo "================================================"

# สำรองไฟล์ .env
cp .env .env.backup
chmod 600 .env .env.backup
```

### 3. สร้าง Production Docker Compose พร้อม Security และ Rate Limiting
```bash
# สร้างไฟล์ docker-compose.prod.yml พร้อม security features
cat > docker-compose.prod.yml << 'EOF'
services:
  # Traefik Reverse Proxy สำหรับ Production
  traefik:
    image: traefik:v3.0
    container_name: traefik-prod
    command:
      - "--api.dashboard=false"  # ปิด dashboard ใน production
      - "--log.level=WARN"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.postgres.address=:15432"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--entrypoints.web.http.redirections.entrypoint.permanent=true"
    ports:
      - "80:80"
      - "443:443"
      - "15432:15432"  # PostgreSQL TCP Router
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt_data:/letsencrypt
    networks:
      - proxy-network
    restart: unless-stopped
    # Security: ไม่เปิด dashboard ใน production

  # Keycloak PostgreSQL Database (Internal)
  keycloak-postgresql:
    image: postgres:15
    container_name: keycloak-postgresql-prod
    environment:
      POSTGRES_DB: keycloak_db
      POSTGRES_USER: keycloak_user
      POSTGRES_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
      POSTGRES_HOST_AUTH_METHOD: md5
    volumes:
      - keycloak_postgresql_data:/var/lib/postgresql/data
      - ./init-keycloak.sql:/docker-entrypoint-initdb.d/init-keycloak.sql
    networks:
      - keycloak-internal-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak_user -d keycloak_db"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Central PostgreSQL Database (ผ่าน Traefik)
  central-postgresql:
    image: postgres:15
    container_name: central-postgresql-prod
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_ADMIN_PASSWORD}
      POSTGRES_INITDB_ARGS: "--auth-host=md5"
    volumes:
      - central_postgresql_data:/var/lib/postgresql/data
      - ./init-central.sql:/docker-entrypoint-initdb.d/init-central.sql
      - ./pg_hba_custom.conf:/var/lib/postgresql/data/pg_hba.conf
    networks:
      - proxy-network
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      # TCP Router สำหรับ PostgreSQL
      - "traefik.tcp.routers.postgres-router.rule=HostSNI(`*`)"
      - "traefik.tcp.routers.postgres-router.entrypoints=postgres"
      - "traefik.tcp.routers.postgres-router.service=postgres-service"
      - "traefik.tcp.services.postgres-service.loadbalancer.server.port=5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Keycloak Authentication Server
  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    container_name: keycloak-prod
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://keycloak-postgresql:5432/keycloak_db
      KC_DB_USERNAME: keycloak_user
      KC_DB_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
      KC_HOSTNAME: ${KEYCLOAK_DOMAIN}
      KC_HOSTNAME_STRICT: true
      KC_HOSTNAME_STRICT_HTTPS: true
      KC_HTTP_ENABLED: false
      KC_HOSTNAME_STRICT_BACKCHANNEL: false
      KC_PROXY: edge
    depends_on:
      keycloak-postgresql:
        condition: service_healthy
    networks:
      - proxy-network
      - keycloak-internal-network
    restart: unless-stopped
    command: start  # Production mode
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=proxy-network"
      - "traefik.http.routers.keycloak.rule=Host(`${KEYCLOAK_DOMAIN}`)"
      - "traefik.http.routers.keycloak.entrypoints=websecure"
      - "traefik.http.routers.keycloak.middlewares=keycloak-rate-limit,keycloak-security"
      - "traefik.http.routers.keycloak.tls.certresolver=myresolver"
      - "traefik.http.services.keycloak.loadbalancer.server.port=8080"
      # Production Rate Limiting - เข้มงวดกว่า development
      - "traefik.http.middlewares.keycloak-rate-limit.ratelimit.average=5"
      - "traefik.http.middlewares.keycloak-rate-limit.ratelimit.period=60s"
      - "traefik.http.middlewares.keycloak-rate-limit.ratelimit.burst=3"
      # Security Headers
      - "traefik.http.middlewares.keycloak-security.headers.customresponseheaders.X-Frame-Options=DENY"
      - "traefik.http.middlewares.keycloak-security.headers.customresponseheaders.X-Content-Type-Options=nosniff"
      - "traefik.http.middlewares.keycloak-security.headers.customresponseheaders.Referrer-Policy=strict-origin-when-cross-origin"
      - "traefik.http.middlewares.keycloak-security.headers.customresponseheaders.Strict-Transport-Security=max-age=31536000; includeSubDomains"
    healthcheck:
      test: ["CMD-SHELL", "exec 3<>/dev/tcp/127.0.0.1/8080"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 90s

volumes:
  keycloak_postgresql_data:
    driver: local
  central_postgresql_data:
    driver: local
  letsencrypt_data:
    driver: local

networks:
  proxy-network:
    driver: bridge
    name: proxy-network-prod
  keycloak-internal-network:
    driver: bridge
    name: keycloak-internal-network-prod
EOF
```

### 4. เริ่มต้นระบบ Production
```bash
# ตรวจสอบ configuration ก่อนเริ่มต้น
docker compose -f docker-compose.prod.yml config

# เริ่มระบบ Production
docker compose -f docker-compose.prod.yml up -d

# ตรวจสอบสถานะ containers
docker compose -f docker-compose.prod.yml ps

# ติดตาม logs เพื่อดูการ startup
docker compose -f docker-compose.prod.yml logs -f
```

### 5. ตรวจสอบการทำงานของระบบ Production
```bash
# รอให้ระบบเริ่มต้นเสร็จ (2-3 นาที)
sleep 180

# ตรวจสอบ SSL Certificate generation
docker compose -f docker-compose.prod.yml logs traefik | grep -i certificate

# ทดสอบ Keycloak HTTPS
curl -f https://auth.yourdomain.com/realms/master

# ทดสอบ PostgreSQL connection
psql "postgresql://postgres:$POSTGRES_PASS@yourdomain.com:15432/postgres" -c "SELECT version();"

# ตรวจสอบ health status
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### 6. ตั้งค่า Monitoring และ Logging
```bash
# สร้าง directory สำหรับ logs
mkdir -p /var/log/centralized-services

# ตั้งค่า log rotation
sudo tee /etc/logrotate.d/centralized-services << EOF
/var/log/centralized-services/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF

# สร้าง monitoring script
tee ~/check-services.sh << 'EOF'
#!/bin/bash
echo "=== Centralized Services Health Check ==="
echo "Date: $(date)"
echo
echo "Container Status:"
docker compose -f ~/centralized-services/docker-compose.prod.yml ps
echo
echo "Disk Usage:"
df -h /var/lib/docker
echo
echo "Memory Usage:"
free -h
echo
echo "CPU Usage:"
top -bn1 | head -5
EOF

chmod +x ~/check-services.sh

# เพิ่ม cron job สำหรับ health check
(crontab -l 2>/dev/null; echo "0 */6 * * * ~/check-services.sh >> /var/log/centralized-services/health-check.log 2>&1") | crontab -
```

## การตั้งค่าเริ่มต้น

## ข้อมูลการเข้าถึงระบบ

### 🔒 ข้อมูลการเข้าถึงระบบ

#### Keycloak Admin Console
- **Development URL**: http://auth.localhost/admin/
- **Production URL**: https://auth.yourdomain.com/admin/
- **Username**: admin
- **Password**: (ดูจาก environment variables)
  - Development: `Kc_Admin_SecureP@ss2024!`
  - Production: `$KEYCLOAK_ADMIN_PASSWORD`
- **Rate Limiting**:
  - Development: 10 requests/30s, burst 5
  - Production: 5 requests/60s, burst 3

#### Traefik Dashboard
- **Development URL**: http://traefik.localhost/dashboard/
- **Production**: ปิดการใช้งานเพื่อความปลอดภัย
- **Username**: admin
- **Password**: secret (Development only)
- **Rate Limiting**: 3 requests/10s, burst 2

#### Central PostgreSQL Database
- **Development Host**: localhost:15432
- **Production Host**: yourdomain.com:15432
- **Database**: postgres
- **Username**: postgres
- **Password**:
  - Development: `postgres_admin_password`
  - Production: `$POSTGRES_ADMIN_PASSWORD`
- **Connection String**:
  ```bash
  # Development
  psql "postgresql://postgres:postgres_admin_password@localhost:15432/postgres"

  # Production
  psql "postgresql://postgres:$POSTGRES_ADMIN_PASSWORD@yourdomain.com:15432/postgres"
  ```
- **GUI Clients**: Host: yourdomain.com, Port: 15432, SSL: Disable

#### วิธีการรอ Rate Limit Reset
1. **รอให้หมดเวลา**:
   - Traefik Dashboard: 10 วินาที
   - Keycloak: 30-60 วินาที (ขึ้นอยู่กับ environment)
2. **Restart Traefik**: `docker compose restart traefik`
3. **เปลี่ยน IP**: ใช้ VPN หรือ proxy

#### การจัดการ Passwords
```bash
# ดู passwords ปัจจุบัน (Production)
cat .env | grep PASSWORD

# สร้าง password ใหม่
openssl rand -base64 32

# อัปเดต password ใน .env และ restart services
nano .env
docker compose -f docker-compose.prod.yml restart
```

### 1. เข้าถึง Keycloak Admin Console
กใช้ข้อมูลข้างบนเพื่อเข้าสู่ระบบ

### 2. สร้าง Realm แรก
1. เข้าสู่ Admin Console
2. คลิก **"Create Realm"**
3. ใส่ชื่อ: `my-organization`
4. คลิก **"Create"**

### 3. สร้าง Client แรก
1. ไปที่ **Clients > Create Client**
2. **General Settings**:
   - Client type: `OpenID Connect`
   - Client ID: `my-web-app`
   - Name: `My Web Application`
3. **Capability config**:
   - Client authentication: `ON`
   - Standard flow: `ON`
   - Direct access grants: `ON`
4. **Login settings**:
   - Valid redirect URIs: `https://yourapp.com/*`
   - Web origins: `https://yourapp.com`

### 4. สร้าง User แรก
1. ไปที่ **Users > Add User**
2. กรอกข้อมูล:
   - Username: `john.doe`
   - Email: `john@company.com`
   - First name: `John`
   - Last name: `Doe`
   - Email verified: `ON`
3. คลิก **"Create"**
4. ไปที่ **Credentials tab**
5. ตั้งรหัสผ่าน และเลือก **Temporary: OFF**

## การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

#### 1. Port ถูกใช้งานแล้ว
```bash
# ตรวจสอบ port ที่ใช้งาน
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
sudo netstat -tulpn | grep :15432
sudo netstat -tulpn | grep :8080

# หยุดบริการที่ขัดแย้ง
sudo systemctl stop apache2  # หรือ nginx
sudo systemctl stop postgresql
sudo systemctl stop nginx

# ตรวจสอบและ kill process ที่ใช้ port
sudo lsof -i :80
sudo kill -9 <PID>
```

#### 2. DNS ไม่ resolve
```bash
# ตรวจสอบ hosts file
cat /etc/hosts | grep localhost

# ทดสอบ DNS
nslookup auth.localhost
ping auth.localhost
```

#### 3. Keycloak ไม่เริ่มต้น
```bash
# ดู logs ของ Keycloak
docker compose logs keycloak

# ตรวจสอบการเชื่อมต่อฐานข้อมูล
docker compose logs keycloak-postgresql

# รีสตาร์ท services
docker compose restart keycloak
```

#### 4. SSL Certificate ไม่ได้ (Production)
```bash
# ตรวจสอบ Traefik logs
docker compose -f docker-compose.prod.yml logs traefik | grep -i cert

# ตรวจสอบ DNS propagation
nslookup auth.yourdomain.com
dig auth.yourdomain.com

# ทดสอบ HTTP challenge
curl -I http://auth.yourdomain.com/.well-known/acme-challenge/test

# ตรวจสอบ Let's Encrypt rate limits
# ดูที่ https://letsencrypt.org/docs/rate-limits/

# ลบ certificates และลองใหม่ (ระวัง rate limit!)
docker compose -f docker-compose.prod.yml down
docker volume rm centralized-services_letsencrypt_data
docker compose -f docker-compose.prod.yml up -d

# สำหรับ staging testing (ใช้ staging CA)
# เพิ่ม --certificatesresolvers.myresolver.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory
```

#### 5. Rate Limiting ทำงานมากเกินไป
```bash
# ตรวจสอบ rate limiting logs
docker compose logs traefik | grep -i "429\|rate\|limit"

# ปรับ rate limiting (ชั่วคราว)
# แก้ไขค่าใน docker-compose.yml:
# average: จำนวน requests ต่อ period
# period: ช่วงเวลา (10s, 1m, 1h)
# burst: จำนวน requests ที่อนุญาตในช่วงแรก

# Restart หลังแก้ไข
docker compose restart traefik
```

### การ Reset ระบบ
```bash
# หยุดบริการทั้งหมด
docker compose down

# ลบข้อมูลทั้งหมด (ระวัง!)
docker compose down -v

# ลบ images (optional)
docker system prune -a

# เริ่มใหม่
docker compose up -d
```

### การตรวจสอบ Health
```bash
# ตรวจสอบสถานะ containers
docker compose ps

# ตรวจสอบ resource usage
docker stats

# ตรวจสอบ logs
docker compose logs --tail=50

# ตรวจสอบ network
docker network ls
docker network inspect proxy-network
```

### การสำรองข้อมูล (Production)
```bash
# สร้าง backup directory
mkdir -p /home/$(whoami)/backups
cd /home/$(whoami)/backups

# สำรองฐานข้อมูล
echo "Creating database backups..."
docker exec central-postgresql-prod pg_dump -U postgres postgres > central-db-$(date +%Y%m%d-%H%M).sql
docker exec keycloak-postgresql-prod pg_dump -U keycloak_user keycloak_db > keycloak-db-$(date +%Y%m%d-%H%M).sql

# สำรอง Keycloak realm configuration
echo "Backing up Keycloak realms..."
docker exec keycloak-prod /opt/keycloak/bin/kc.sh export --realm=my-organization --file=/tmp/realm-export.json --users realm_file
docker cp keycloak-prod:/tmp/realm-export.json realm-export-$(date +%Y%m%d-%H%M).json

# สำรอง Docker volumes
echo "Backing up Docker volumes..."
docker run --rm -v centralized-services_central_postgresql_data:/data -v $(pwd):/backup alpine tar czf /backup/central-volume-$(date +%Y%m%d-%H%M).tar.gz -C /data .
docker run --rm -v centralized-services_keycloak_postgresql_data:/data -v $(pwd):/backup alpine tar czf /backup/keycloak-volume-$(date +%Y%m%d-%H%M).tar.gz -C /data .
docker run --rm -v centralized-services_letsencrypt_data:/data -v $(pwd):/backup alpine tar czf /backup/letsencrypt-$(date +%Y%m%d-%H%M).tar.gz -C /data .

# สำรอง configuration files
echo "Backing up configuration files..."
cp ~/centralized-services/.env config-$(date +%Y%m%d-%H%M).env
cp ~/centralized-services/docker-compose.prod.yml docker-compose-$(date +%Y%m%d-%H%M).yml

# บีบอัดทั้งหมด
tar czf full-backup-$(date +%Y%m%d-%H%M).tar.gz *.sql *.json *.tar.gz *.env *.yml

# ลบไฟล์เก่าที่เกิน 30 วัน
find /home/$(whoami)/backups -name "*.tar.gz" -mtime +30 -delete
find /home/$(whoami)/backups -name "*.sql" -mtime +30 -delete

echo "Backup completed: full-backup-$(date +%Y%m%d-%H%M).tar.gz"
```

### ตั้งค่า Automated Backup
```bash
# สร้าง backup script
tee ~/backup-centralized-services.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/$(whoami)/backups"
mkdir -p $BACKUP_DIR
cd $BACKUP_DIR

# Database backups
docker exec central-postgresql-prod pg_dump -U postgres postgres > central-db-$(date +%Y%m%d-%H%M).sql
docker exec keycloak-postgresql-prod pg_dump -U keycloak_user keycloak_db > keycloak-db-$(date +%Y%m%d-%H%M).sql

# Compress and cleanup
tar czf daily-backup-$(date +%Y%m%d).tar.gz *.sql
rm *.sql

# Keep only 7 days of daily backups
find $BACKUP_DIR -name "daily-backup-*.tar.gz" -mtime +7 -delete

# Log
echo "$(date): Backup completed" >> $BACKUP_DIR/backup.log
EOF

chmod +x ~/backup-centralized-services.sh

# เพิ่ม cron job สำหรับ daily backup เวลา 02:00
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup-centralized-services.sh") | crontab -

# ตรวจสอบ cron jobs
crontab -l
```

## ขั้นตอนถัดไป
1. อ่าน [README.md](README.md) สำหรับรายละเอียดการใช้งาน
2. ดู [CLAUDE.md](CLAUDE.md) สำหรับคู่มือ development
3. ศึกษาการเชื่อมต่อกับแอปพลิเคชันของคุณ
4. ตั้งค่า backup schedules สำหรับ production