# Centralized Services with Traefik Proxy
-- File: centralized-services/README.md
-- Version: 2.0.0
-- Date: 2025-09-18
-- Description: ระบบบริการส่วนกลางพร้อม Rate Limiting และ Security

## Overview
ระบบบริการส่วนกลางที่ประกอบด้วย Keycloak Authentication Service และ PostgreSQL Database ผ่าน Traefik Reverse Proxy พร้อม **Rate Limiting**, **Security Headers** และ **SSL/TLS** สำหรับให้บริการระบบต่างๆ ในองค์กรอย่างปลอดภัย

## Services

### 1. Traefik Reverse Proxy
- **Container**: `traefik`
- **Version**: 3.0
- **Dashboard**: http://traefik.localhost/dashboard/ (admin:secret)
- **Features**: Auto SSL, Load Balancing, Service Discovery

### 2. Keycloak PostgreSQL Database (Private)
- **Container**: `keycloak-postgresql`
- **Access**: Internal only (เฉพาะ Keycloak เท่านั้น)
- **Database**: `keycloak_db`
- **User**: keycloak_user / keycloak_password
- **Network**: keycloak-internal-network

### 3. Central PostgreSQL Database (Traefik TCP Router)
- **Container**: `central-postgresql`
- **Access**: ผ่าน Traefik TCP Router (localhost:15432)
- **Admin User**: postgres / postgres_admin_password
- **Database**: `postgres` (สำหรับโครงการต่างๆ)
- **การเชื่อมต่อ**: `psql "postgresql://postgres:postgres_admin_password@localhost:15432/postgres"`
- **GUI Clients**: รองรับ pgAdmin, DBeaver ผ่าน localhost:15432

### 4. Keycloak Authentication Server
- **Container**: `keycloak`
- **Version**: 24.0
- **URL**: http://auth.localhost
- **Admin Console**: http://auth.localhost/admin
- **ข้อมูลเข้าสู่ระบบ Admin**: admin / admin123


## การเริ่มใช้งาน (Quick Start)

> 📖 **สำหรับคู่มือการติดตั้งที่ละเอียด**: ดูไฟล์ [INSTALLATION.md](INSTALLATION.md)

### 1. ตั้งค่า Local Hosts
ดูไฟล์ `hosts-setup.md` สำหรับการตั้งค่า local domains

### 2. เริ่มต้นบริการ
```bash
# เริ่มบริการทั้งหมด
docker-compose up -d

# ตรวจสอบสถานะบริการ
docker-compose ps

# ดูบันทึกการทำงาน
docker-compose logs -f traefik
docker-compose logs -f keycloak-postgresql
docker-compose logs -f central-postgresql
docker-compose logs -f keycloak

# หยุดบริการ
docker-compose down

# รีเซ็ตข้อมูลทั้งหมด (รวมฐานข้อมูล)
docker-compose down -v
```

### 3. การเข้าถึงบริการ
- **Traefik Dashboard**: http://traefik.localhost/dashboard/ (admin:secret)
- **Keycloak Admin**: http://auth.localhost/admin/ (admin:admin123)
- **Central PostgreSQL**: `psql "postgresql://postgres:postgres_admin_password@localhost:15432/postgres"`

## การเข้าถึงฐานข้อมูล

### Keycloak PostgreSQL Database (Private)
- **Access**: Internal only (ไม่เปิดให้เข้าถึงจากภายนอก)
- **Container**: keycloak-postgresql
- **Database**: keycloak_db
- **User**: keycloak_user / keycloak_password
- **การเชื่อมต่อ**: ผ่าน container เท่านั้น
  ```bash
  docker exec -it keycloak-postgresql psql -U keycloak_user -d keycloak_db
  ```

### Central PostgreSQL Database (Traefik TCP Router)
- **Host**: localhost (ผ่าน Traefik TCP Router)
- **Port**: 15432
- **Admin User**: postgres / postgres_admin_password
- **Database**: postgres (สำหรับโครงการต่างๆ)
- **คำสั่งเชื่อมต่อ**:
  ```bash
  # ผ่าน Traefik TCP Router
  psql -h localhost -p 15432 -U postgres -d postgres

  # GUI Clients (pgAdmin, DBeaver)
  Host: localhost, Port: 15432, User: postgres, Password: postgres_admin_password

  # ผ่าน container (สำหรับ admin/backup)
  docker exec -it central-postgresql psql -U postgres
  ```

## ตัวอย่างการเชื่อมต่อ

### Central PostgreSQL Database (สำหรับโครงการอื่น)
```javascript
// Node.js - ตัวอย่างการเชื่อมต่อ Central PostgreSQL ผ่าน Traefik TCP Router
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost', // ผ่าน Traefik TCP Router
  port: 15432,
  database: 'your_project_db',
  user: 'your_project_user',
  password: 'your_project_password',
});

// หรือใช้ connection string
const connectionString = 'postgresql://your_project_user:your_project_password@localhost:15432/your_project_db';
```

### การเชื่อมต่อ Keycloak Authentication
```javascript
// สำหรับเชื่อมต่อ Keycloak Authentication
const keycloakConfig = {
  realm: 'your-realm-name',
  'auth-server-url': 'http://auth.localhost/',
  'ssl-required': 'external',
  resource: 'your-client-id',
  'verify-token-audience': true,
  credentials: {
    secret: 'your-client-secret'
  },
  'use-resource-role-mappings': true,
  'confidential-port': 0
};
```

### Environment Variables สำหรับระบบที่เชื่อมต่อ
```bash
# Keycloak Configuration
KEYCLOAK_URL=http://auth.localhost
KEYCLOAK_REALM=your-realm-name
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret

# PostgreSQL Configuration (สำหรับโครงการที่ต้องการ database)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_project_db
DB_USER=your_project_user
DB_PASSWORD=your_project_password
```

## การตั้งค่า Keycloak

### การเข้าถึง Admin Console
- URL: http://auth.localhost/admin
- Username: admin
- Password: admin123

### การตั้งค่า Realm และ Client
1. **สร้าง Realm ใหม่**:
   - เข้าสู่ Admin Console
   - คลิก "Create Realm"
   - ใส่ชื่อ realm ที่ต้องการ (เช่น `my-realm`)

2. **สร้าง Client**:
   - เลือก realm ที่สร้างแล้ว
   - ไปที่ Clients > Create Client
   - ใส่ Client ID (เช่น `my-app`)
   - เลือก Client Type: `OpenID Connect`

3. **ตั้งค่า Client**:
   - Valid redirect URIs: `http://your-app-domain/*`
   - Web origins: `http://your-app-domain`
   - Access Type: `confidential` (สำหรับ backend) หรือ `public` (สำหรับ frontend)

4. **สร้าง Users และ Roles**:
   - ไปที่ Users > Add User
   - ตั้งค่า username, email, password
   - สร้าง Roles และกำหนดให้ users

## การตรวจสอบสุขภาพระบบ (Health Checks)

บริการทั้งสองมีระบบตรวจสอบสุขภาพ:
- **PostgreSQL**: ใช้คำสั่ง `pg_isready`
- **Keycloak**: ใช้ HTTP health endpoint ที่ `/health/ready`

## การจัดการ Volume

- **Volume**: `postgresql_data` และ `pgadmin_data`
- **ที่ตั้ง**: Docker managed volume
- **ความคงทน**: ข้อมูลจะอยู่ครบแม้ container จะ restart

## Network

- **Network**: `keycloak-network`
- **ประเภท**: Bridge network
- **การสื่อสารภายใน**: Services สามารถสื่อสารกันผ่าน container names

## การใช้งานร่วมกับระบบอื่น

ระบบ Keycloak นี้สามารถใช้ร่วมกับ:
- **Web Applications**: ระบบเว็บที่ต้องการ authentication
- **Mobile Applications**: แอพมือถือที่ต้องการ login
- **API Services**: บริการ API ที่ต้องการการยืนยันตัวตน
- **Microservices**: ระบบ microservices ที่ต้องการ single sign-on

## การสำรองและกู้คืนข้อมูล (Backup & Restore)

### สำรองข้อมูล Keycloak Database
```bash
docker exec keycloak-postgresql pg_dump -U keycloak_user keycloak_db > keycloak_backup.sql
```

### กู้คืนข้อมูล Keycloak Database
```bash
docker exec -i keycloak-postgresql psql -U keycloak_user -d keycloak_db < keycloak_backup.sql
```

### สำรองข้อมูล Keycloak Configuration
```bash
# Export realm configuration
docker exec keycloak /opt/keycloak/bin/kc.sh export --realm=your-realm-name --file=/tmp/realm-export.json
docker cp keycloak:/tmp/realm-export.json ./realm-backup.json
```

## การตรวจสอบระบบ (Monitoring)

### ตรวจสอบขนาดฐานข้อมูล
```bash
docker exec keycloak-postgresql psql -U keycloak_user -d keycloak_db -c "
SELECT pg_size_pretty(pg_database_size('keycloak_db')) as keycloak_size;
"
```

### ตรวจสอบการใช้งานหน่วยความจำ
```bash
docker stats keycloak keycloak-postgresql
```

## การแก้ไขปัญหา (Troubleshooting)

### ปัญหาที่พบบ่อย
1. **Port ชน**: ตรวจสอบให้แน่ใจว่า port 5432, 8080, และ 8081 ว่าง
2. **Permission ผิด**: ตรวจสอบสิทธิ์ไฟล์ init scripts
3. **เชื่อมต่อฐานข้อมูลไม่ได้**: ตรวจสอบ credentials และ network connectivity
4. **Keycloak เริ่มช้า**: รอให้ฐานข้อมูลเริ่มต้นเสร็จก่อน

### การดู Logs
```bash
# ดู logs ทั้งหมด
docker-compose logs

# ติดตาม logs แบบ real-time
docker-compose logs -f postgresql
docker-compose logs -f keycloak

# ดู logs 50 บรรทัดล่าสุด
docker-compose logs --tail=50
```

## การเชื่อมต่อจากระบบภายนอก

### ตัวอย่างการใช้งานจาก Frontend (React)
```javascript
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8080/',
  realm: 'your-realm-name',
  clientId: 'your-client-id'
});

keycloak.init({ onLoad: 'login-required' });
```

### ตัวอย่างการใช้งานจาก Backend (Node.js)
```javascript
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore }, {
  realm: 'your-realm-name',
  'auth-server-url': 'http://localhost:8080/',
  'ssl-required': 'external',
  resource: 'your-client-id',
  credentials: {
    secret: 'your-client-secret'
  }
});
```

## การแก้ปัญหา PostgreSQL GUI Clients

### ปัญหาที่เจอ
GUI PostgreSQL clients (pgAdmin, DBeaver) ไม่สามารถเชื่อมต่อผ่าน Traefik ได้ แต่ command line tools ใช้งานได้ปกติ

### สาเหตุและวิธีแก้
**สาเหตุ**: Traefik v3.0 TCP Proxy มี compatibility issues กับ GUI clients เนื่องจาก SSL/TLS handling

**วิธีแก้**: ใช้ TCP Router configuration ที่เฉพาะเจาะจง:

```yaml
labels:
  - "traefik.enable=true"
  # TCP Router Definition
  - "traefik.tcp.routers.postgres-router.rule=HostSNI(`*`)"
  - "traefik.tcp.routers.postgres-router.entrypoints=postgres"
  - "traefik.tcp.routers.postgres-router.service=postgres-service"
  - "traefik.tcp.routers.postgres-router.tls=false"  # สำคัญ: ปิด TLS
  # TCP Service Definition
  - "traefik.tcp.services.postgres-service.loadbalancer.server.port=5432"
```

### การตั้งค่า GUI Clients
- **Host**: `localhost`
- **Port**: `15432`
- **Database**: `postgres`
- **Username**: `postgres`
- **Password**: `postgres_admin_password`
- **SSL Mode**: `Disable` (สำคัญ)

### Architecture ที่ได้
```
GUI Clients → localhost:15432 → Traefik TCP Router → PostgreSQL Container
```