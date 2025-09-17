# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ระบบบริการส่วนกลางที่ประกอบด้วย Keycloak Authentication Service และ Centralized PostgreSQL Database ผ่าน Traefik Reverse Proxy สำหรับให้บริการระบบต่างๆ ในองค์กร

## Architecture

### Services Stack
- **Traefik Reverse Proxy**: Version 3.0 สำหรับ load balancing และ SSL termination
- **Keycloak PostgreSQL Database**: Private PostgreSQL 15 สำหรับ Keycloak เท่านั้น
  - `keycloak_db`: ฐานข้อมูลสำหรับ Keycloak authentication data
- **Central PostgreSQL Database**: PostgreSQL 15 ผ่าน Traefik เท่านั้น สำหรับโครงการอื่นๆ
  - `postgres`: ฐานข้อมูลส่วนกลางสำหรับโครงการต่างๆ
- **Keycloak Authentication Server**: Version 24.0 สำหรับ identity และ access management

### Database Configuration
#### Keycloak Database (Private)
- **Database**: `keycloak_db` - Keycloak จะสร้าง tables อัตโนมัติ
- **Extensions**: uuid-ossp, pgcrypto สำหรับ Keycloak
- **Access**: Internal network เท่านั้น
- **Performance**: ปรับแต่งสำหรับ Keycloak

#### Central Database (Traefik Only)
- **Database**: `postgres` - สำหรับโครงการต่างๆ
- **Extensions**: uuid-ossp, pgcrypto, citext, hstore
- **Access**: ผ่าน Traefik proxy เท่านั้น
- **Features**: Common functions, audit capabilities
- **Timezone**: ตั้งค่าเป็น Asia/Bangkok
- **Performance**: ปรับแต่งสำหรับ concurrent connections

## Common Commands

### Service Management
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

### Database Operations
```bash
# เชื่อมต่อ Keycloak database (ผ่าน container เท่านั้น)
docker exec -it keycloak-postgresql psql -U keycloak_user -d keycloak_db

# เชื่อมต่อ Central database (ผ่าน Traefik proxy เท่านั้น)
psql -h localhost -p 5432 -U postgres -d postgres

# สำรองข้อมูล Keycloak database
docker exec keycloak-postgresql pg_dump -U keycloak_user keycloak_db > keycloak_backup.sql

# สำรองข้อมูล Central database
docker exec central-postgresql pg_dump -U postgres > central_backup.sql

# กู้คืนข้อมูล Keycloak database
docker exec -i keycloak-postgresql psql -U keycloak_user -d keycloak_db < keycloak_backup.sql

# กู้คืนข้อมูล Central database
docker exec -i central-postgresql psql -U postgres < central_backup.sql

# ตรวจสอบขนาดฐานข้อมูล
docker exec keycloak-postgresql psql -U keycloak_user -d keycloak_db -c "SELECT pg_size_pretty(pg_database_size('keycloak_db'));"
docker exec central-postgresql psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('postgres'));"

# Export Keycloak realm configuration
docker exec keycloak /opt/keycloak/bin/kc.sh export --realm=your-realm-name --file=/tmp/realm-export.json
docker cp keycloak:/tmp/realm-export.json ./realm-backup.json
```

## Service Access

### Traefik Dashboard
- **URL**: http://traefik.localhost/dashboard/
- **Username**: admin
- **Password**: secret
- **Features**: Service discovery, SSL certificates, routing rules

### Keycloak PostgreSQL Database (Private)
- **Access**: ผ่าน Docker container เท่านั้น (ไม่เปิดพอร์ตภายนอก)
- **Container**: keycloak-postgresql
- **Database**: keycloak_db
- **Username**: keycloak_user
- **Password**: keycloak_password
- **การเชื่อมต่อ**: `docker exec -it keycloak-postgresql psql -U keycloak_user -d keycloak_db`

### Central PostgreSQL Database (Traefik Only)
- **Host**: db.localhost:5432 (ผ่าน Traefik proxy เท่านั้น)
- **Database**: postgres
- **Username**: postgres
- **Password**: postgres_admin_password
- **การเชื่อมต่อ**: `psql "postgresql://postgres:postgres_admin_password@db.localhost:5432/postgres"`

### Keycloak Authentication
- **URL**: http://auth.localhost
- **Admin Console**: http://auth.localhost/admin
- **Admin Username**: admin
- **Admin Password**: admin123


## Central PostgreSQL Database Connection Guide

### การสร้าง Database และ User สำหรับโครงการใหม่
```bash
# เชื่อมต่อ Central PostgreSQL ในฐานะ admin
psql -h localhost -p 5432 -U postgres -d postgres

# สร้าง database ใหม่สำหรับโครงการ
CREATE DATABASE my_project_db;

# สร้าง user ใหม่สำหรับโครงการ
CREATE USER my_project_user WITH PASSWORD 'my_project_password';

# ให้สิทธิ์การใช้งาน database
GRANT ALL PRIVILEGES ON DATABASE my_project_db TO my_project_user;

# ให้สิทธิ์ในการสร้าง schema (ถ้าจำเป็น)
GRANT CREATE ON DATABASE my_project_db TO my_project_user;

# เชื่อมต่อไปยัง database ใหม่และให้สิทธิ์ schema
\c my_project_db
GRANT ALL ON SCHEMA public TO my_project_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO my_project_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO my_project_user;
```

### การเชื่อมต่อจากแอปพลิเคชัน

#### Node.js (pg library)
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'my_project_db',
  user: 'my_project_user',
  password: 'my_project_password',
  ssl: false, // สำหรับ development
  max: 20, // maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Connection string format
const connectionString = 'postgresql://my_project_user:my_project_password@localhost:15432/my_project_db';
```

#### Python (psycopg2)
```python
import psycopg2
from psycopg2 import pool

# Single connection
conn = psycopg2.connect(
    host="localhost",
    port="5432",
    database="my_project_db",
    user="my_project_user",
    password="my_project_password"
)

# Connection pool
connection_pool = psycopg2.pool.SimpleConnectionPool(
    1, 20,
    host="localhost",
    port="5432",
    database="my_project_db",
    user="my_project_user",
    password="my_project_password"
)
```

#### Java (JDBC)
```java
String url = "jdbc:postgresql://db.localhost:5432/my_project_db";
String username = "my_project_user";
String password = "my_project_password";

Connection connection = DriverManager.getConnection(url, username, password);
```

#### C# (.NET)
```csharp
string connectionString = "Host=localhost;Port=5432;Database=my_project_db;Username=my_project_user;Password=my_project_password";

using var connection = new NpgsqlConnection(connectionString);
connection.Open();
```

### Docker Compose สำหรับแอปพลิเคชันที่เชื่อมต่อ
```yaml
services:
  my-app:
    image: my-app:latest
    environment:
      DB_HOST: localhost
      DB_PORT: 5432
      DB_NAME: my_project_db
      DB_USER: my_project_user
      DB_PASSWORD: my_project_password
    networks:
      - proxy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.my-app.rule=Host(\`app.localhost\`)"

networks:
  proxy-network:
    external: true
    name: proxy-network
```

## Environment Variables สำหรับระบบที่เชื่อมต่อ
```bash
# Keycloak Configuration
KEYCLOAK_URL=http://auth.localhost
KEYCLOAK_REALM=your-realm-name
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret

# Central PostgreSQL Configuration (สำหรับโครงการอื่น)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=my_project_db
DB_USER=my_project_user
DB_PASSWORD=my_project_password

# หมายเหตุ: Keycloak PostgreSQL ไม่สามารถเข้าถึงจากภายนอกได้
# ใช้เฉพาะผ่าน Docker container และ Keycloak internal เท่านั้น
```

## Development Notes

### Language Requirements
- **Primary Language**: Thai สำหรับ UI text
- **Font**: Sarabun (Google Fonts)
- **Date Format**: Thai Buddhist calendar support (พ.ศ.)
- **Number Format**: Thai locale formatting

### Database Initialization
- ฐานข้อมูล Keycloak จะถูกสร้างอัตโนมัติผ่าน `init.sql`
- Extensions uuid-ossp และ pgcrypto ถูกติดตั้งไว้แล้ว
- ตั้งค่า timezone เป็น Asia/Bangkok
- ปรับแต่งการตั้งค่าเพื่อประสิทธิภาพที่ดี

### Health Checks
- PostgreSQL: ใช้คำสั่ง `pg_isready`
- Keycloak: HTTP health endpoint ที่ `/health/ready`
- Services มี dependency management พร้อม health check conditions

### Network Configuration
- **proxy-network**: สำหรับ services ที่เข้าถึงผ่าน Traefik
  - Traefik, Central PostgreSQL, Keycloak
- **keycloak-internal-network**: สำหรับ Keycloak และ Keycloak PostgreSQL
  - Keycloak PostgreSQL, Keycloak (dual network)
- External access: ผ่าน Traefik proxy เท่านั้น
- Keycloak PostgreSQL: Internal only (ไม่เปิดพอร์ตภายนอก)
- Internal communication ใช้ container names เป็น hostnames

## Installation & Configuration Guide

### 1. System Requirements
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Memory**: Minimum 4GB RAM
- **Storage**: 10GB+ available space
- **Network**: Ports 80, 443, 5432, 8080 must be available

### 2. Pre-Installation Steps

#### สำหรับ Development (localhost)
```bash
# ตรวจสอบ Docker
docker --version
docker-compose --version

# ดาวน์โหลดโครงการ
git clone <repository-url>
cd centralized-services

# ตั้งค่า environment variables
cp .env.example .env
# แก้ไข .env ตามต้องการ
```

#### ตั้งค่า Local Hosts
ดูรายละเอียดใน `hosts-setup.md`:
```bash
# Windows: เพิ่มใน C:\Windows\System32\drivers\etc\hosts
# macOS/Linux: เพิ่มใน /etc/hosts
127.0.0.1    auth.localhost
127.0.0.1    traefik.localhost
127.0.0.1    localhost
```

### 3. Installation Steps

#### Step 1: เริ่มต้นระบบ
```bash
# เริ่มบริการทั้งหมด
docker-compose up -d

# ตรวจสอบสถานะ
docker-compose ps

# ดู logs หากมีปัญหา
docker-compose logs -f
```

#### Step 2: รอให้ระบบเริ่มต้นเสร็จ
```bash
# ตรวจสอบ health ของแต่ละ service
docker-compose ps

# ตรวจสอบ Keycloak
curl -f http://auth.localhost/health/ready

# ตรวจสอบ PostgreSQL
psql -h localhost -p 5432 -U postgres -c "SELECT version();"
```

### 4. Production Configuration

#### Environment Variables ที่ต้องเปลี่ยน
```bash
# .env file สำหรับ production
POSTGRES_ADMIN_PASSWORD=<strong-password>
KEYCLOAK_DB_PASSWORD=<strong-password>
KEYCLOAK_ADMIN_PASSWORD=<strong-password>
ACME_EMAIL=admin@cigblusolutions.com

# Domain configuration
KEYCLOAK_DOMAIN=auth.cigblusolutions.com
TRAEFIK_DOMAIN=traefik.cigblusolutions.com
```

#### Docker Compose สำหรับ Production
```yaml
# docker-compose.prod.yml
services:
  traefik:
    command:
      - "--certificatesresolvers.myresolver.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    labels:
      - "traefik.http.routers.dashboard.rule=Host(\`${TRAEFIK_DOMAIN}\`)"

  keycloak:
    environment:
      KC_HOSTNAME: ${KEYCLOAK_DOMAIN}
      KC_HOSTNAME_STRICT: true
      KC_HOSTNAME_STRICT_HTTPS: true
      KC_HTTP_ENABLED: false
    labels:
      - "traefik.http.routers.keycloak.rule=Host(\`${KEYCLOAK_DOMAIN}\`)"
```

### 5. Keycloak Configuration Guide

#### การเข้าถึง Admin Console
```bash
# URL: http://auth.localhost/admin (development)
# URL: https://auth.cigblusolutions.com/admin (production)
# Username: admin
# Password: admin123 (ต้องเปลี่ยนใน production)
```

#### สร้าง Realm ใหม่
1. **เข้าสู่ Admin Console**
2. **Create Realm**:
   - Realm name: `my-organization`
   - Display name: `My Organization`
   - Enabled: `ON`

#### สร้าง Client สำหรับแอปพลิเคชัน
1. **ไปที่ Clients > Create Client**
2. **General Settings**:
   - Client type: `OpenID Connect`
   - Client ID: `my-web-app`
   - Name: `My Web Application`

3. **Capability config**:
   - Client authentication: `ON` (for confidential clients)
   - Authorization: `OFF` (unless needed)
   - Standard flow: `ON`
   - Direct access grants: `ON`

4. **Login settings**:
   - Root URL: `http://localhost:3000` (development)
   - Valid redirect URIs: `http://localhost:3000/*`
   - Web origins: `http://localhost:3000`

#### สร้าง Users
```bash
# ผ่าน Admin Console:
# Users > Add User
# Username: john.doe
# Email: john@company.com
# First name: John
# Last name: Doe
# Email verified: ON

# Set password:
# Credentials tab > Set password
# Password: user123
# Temporary: OFF
```

#### สร้าง Roles
```bash
# Realm roles:
# Realm settings > Roles > Create role
# Role name: admin
# Description: Administrator role

# Client roles:
# Clients > my-web-app > Roles > Create role
# Role name: user
# Description: Regular user role

# Assign roles to users:
# Users > john.doe > Role mappings
# Assign realm roles: admin
# Assign client roles: user
```

### 6. Integration Examples

#### Frontend Integration (React)
```javascript
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://auth.localhost/',
  realm: 'my-organization',
  clientId: 'my-web-app'
});

keycloak.init({
  onLoad: 'login-required',
  checkLoginIframe: false
}).then(authenticated => {
  console.log(authenticated ? 'User authenticated' : 'User not authenticated');
});
```

#### Backend Integration (Node.js)
```javascript
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore }, {
  realm: 'my-organization',
  'auth-server-url': 'http://auth.localhost/',
  'ssl-required': 'external',
  resource: 'my-web-app',
  credentials: {
    secret: 'your-client-secret'
  }
});

app.use(keycloak.middleware());
app.use('/protected', keycloak.protect(), (req, res) => {
  res.json({ message: 'Protected resource', user: req.kauth.grant.access_token.content });
});
```

### 7. Security Considerations

#### Production Security Checklist
- [ ] เปลี่ยน default passwords ทั้งหมด
- [ ] ใช้ strong passwords (12+ characters)
- [ ] Enable SSL/TLS certificates
- [ ] ตั้งค่า firewall rules
- [ ] ปิด Traefik dashboard ใน production
- [ ] ตั้งค่า backup schedules
- [ ] Enable audit logging
- [ ] ตั้งค่า resource limits
- [ ] ใช้ secrets management

#### Backup Strategy
```bash
# Daily database backup
0 2 * * * docker exec central-postgresql pg_dump -U postgres > /backup/central-$(date +\%Y\%m\%d).sql
0 3 * * * docker exec keycloak-postgresql pg_dump -U keycloak_user keycloak_db > /backup/keycloak-$(date +\%Y\%m\%d).sql

# Weekly Keycloak realm export
0 4 * * 0 docker exec keycloak /opt/keycloak/bin/kc.sh export --realm=my-organization --file=/tmp/realm-export.json
```

### Integration Guidelines
- สำหรับระบบที่ต้องการใช้ Keycloak authentication
- สร้าง Realm และ Client ตามความต้องการของแต่ละระบบ
- ใช้ OpenID Connect หรือ SAML สำหรับการ authentication
- รองรับ Single Sign-On (SSO) สำหรับหลายระบบ