# คู่มือการเชื่อมต่อระบบ (Integration Guide)
-- File: centralized-services/INTEGRATION.md
-- Version: 1.0.0
-- Date: 2025-09-17
-- Description: คู่มือการเชื่อมต่อโครงการใหม่เข้ากับ Keycloak Authentication และ Central PostgreSQL Database

## สารบัญ
1. [ภาพรวมการเชื่อมต่อ](#ภาพรวมการเชื่อมต่อ)
2. [การเตรียมความพร้อม](#การเตรียมความพร้อม)
3. [การเชื่อมต่อ Keycloak Authentication](#การเชื่อมต่อ-keycloak-authentication)
4. [การเชื่อมต่อ Central PostgreSQL](#การเชื่อมต่อ-central-postgresql)
5. [ตัวอย่างโครงการ](#ตัวอย่างโครงการ)
6. [Best Practices](#best-practices)
7. [การแก้ไขปัญหา](#การแก้ไขปัญหา)

## ภาพรวมการเชื่อมต่อ

### สถาปัตยกรรมระบบ

#### Centralized Services (ระบบส่วนกลาง)
```
                    ┌─────────────────┐
                    │     Traefik     │
                    │ Reverse Proxy   │
                    └─────────┬───────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼
    ┌─────────────────┐ ┌─────────────────┐
    │    Keycloak     │ │ Central PostgreSQL│
    │ Authentication  │ │    Database     │
    └─────────────────┘ └─────────────────┘
     auth.localhost      db.localhost:5432
```

#### Integration กับโครงการภายนอก
```
┌─────────────────┐
│   Your Project  │─────┐
│   (Frontend)    │     │
└─────────────────┘     │    ┌─────────────────┐    ┌─────────────────┐
                        ├───▶│     Traefik     │───▶│    Keycloak     │
┌─────────────────┐     │    │ Reverse Proxy   │    │ Authentication  │
│   Your Project  │─────┘    │ (Centralized)   │    │ (Centralized)   │
│   (Backend API) │          └─────────┬───────┘    └─────────────────┘
└─────────────────┘                    │
                                       ▼
                            ┌─────────────────┐
                            │ Central PostgreSQL│
                            │    Database     │
                            │ (Centralized)   │
                            └─────────────────┘
                          (via db.localhost:5432)
```

### 🎯 Services URLs
- **Keycloak Authentication**: `http://auth.localhost` (dev) / `https://auth.cigblusolutions.com` (prod)
- **Central PostgreSQL**: `db.localhost:5432` (accessible via Traefik proxy only)
- **Traefik Dashboard**: `http://traefik.localhost/dashboard/` (login: admin/secret)

### 🔒 สิ่งสำคัญ: Database Security
- **Central PostgreSQL เข้าถึงผ่าน Traefik เท่านั้น** - ไม่เปิด direct ports
- **Your Backend API** เชื่อมต่อ Database โดยการเรียก `db.localhost:5432` → **Traefik รับ request แล้วส่งต่อไปยัง PostgreSQL container**
- **Frontend ไม่เชื่อมต่อ Database โดยตรง** - ต้องผ่าน Backend API
- **Authentication ผ่าน Keycloak** - Backend API เรียก `auth.localhost` → **Traefik รับ request แล้วส่งต่อไปยัง Keycloak**

### 🌐 Connection Flow
1. **Your Frontend** → **Your Backend API** (HTTP/HTTPS)
2. **Your Backend API** → **Traefik** → **Central PostgreSQL** (via `db.localhost:5432`)
3. **Your Frontend/Backend** → **Traefik** → **Keycloak** (via `auth.localhost`) for authentication

## การเตรียมความพร้อม

### 1. ตรวจสอบ Centralized Services
```bash
# ตรวจสอบสถานะ
cd centralized-services
docker compose ps

# ทดสอบการเชื่อมต่อ
curl -f http://auth.localhost/realms/master
psql "postgresql://postgres:postgres_admin_password@db.localhost:5432/postgres" -c "SELECT version();"
```

## 🔑 ข้อมูลการเข้าถึงระบบ

### Keycloak Authentication Service
- **Development URL**: http://auth.localhost
- **Admin Console**: http://auth.localhost/admin/
- **Username**: admin
- **Password**: admin123
- **Realm**: master (หรือ realm ที่สร้างขึ้น)

### Central PostgreSQL Database
- **Host**: db.localhost:5432 (ผ่าน Traefik)
- **Database**: postgres (หรือ database ที่สร้างขึ้น)
- **Username**: postgres
- **Password**: postgres_admin_password
- **Connection String**: `postgresql://postgres:postgres_admin_password@db.localhost:5432/postgres`

### Traefik Dashboard (ระบบส่วนกลาง)
- **URL**: http://traefik.localhost/dashboard/
- **Username**: admin
- **Password**: secret
```

### 2. เตรียม Network สำหรับโครงการใหม่
```bash
# โครงการใหม่ต้องใช้ proxy-network เดียวกัน
docker network create proxy-network 2>/dev/null || echo "Network already exists"
```

### 3. Directory Structure แนะนำ
```
project-root/
├── my-new-project/
│   ├── docker-compose.yml
│   ├── .env
│   ├── src/
│   └── docs/
└── centralized-services/
    ├── docker-compose.yml
    ├── INTEGRATION.md (this file)
    └── ...
```

## การเชื่อมต่อ Keycloak Authentication

### 1. สร้าง Realm และ Client ใน Keycloak

#### เข้าสู่ Keycloak Admin Console
```bash
# Development
URL: http://auth.localhost/admin
# Production
URL: https://auth.cigblusolutions.com/admin

Username: admin
Password: admin123 (หรือดูจาก .env)
```

#### สร้าง Realm สำหรับโครงการ
1. **Create New Realm**:
   - Realm name: `my-project-realm`
   - Display name: `My Project System`
   - Enabled: `ON`

#### สร้าง Client สำหรับแอปพลิเคชัน
1. **General Settings**:
   - Client type: `OpenID Connect`
   - Client ID: `my-project-frontend`
   - Name: `My Project Frontend Application`

2. **Capability Configuration**:
   - Client authentication: `OFF` (สำหรับ Public clients เช่น React, Vue)
   - Client authentication: `ON` (สำหรับ Confidential clients เช่น Backend APIs)
   - Authorization: `OFF`
   - Standard flow: `ON`
   - Direct access grants: `ON`
   - Implicit flow: `OFF`
   - Service accounts roles: `ON` (สำหรับ backend services)

3. **Login Settings**:
   ```
   Root URL: http://localhost:3000
   Valid redirect URIs:
   - http://localhost:3000/*
   - http://myapp.localhost/*
   - https://myapp.cigblusolutions.com/* (production)

   Valid post logout redirect URIs:
   - http://localhost:3000
   - http://myapp.localhost
   - https://myapp.cigblusolutions.com (production)

   Web origins:
   - http://localhost:3000
   - http://myapp.localhost
   - https://myapp.cigblusolutions.com (production)
   ```

#### สร้าง Roles
```bash
# Realm Roles (ระดับระบบ)
1. admin - ผู้ดูแลระบบ
2. user - ผู้ใช้งานทั่วไป
3. manager - ผู้จัดการ

# Client Roles (ระดับแอปพลิเคชัน)
1. view_reports - ดูรายงาน
2. edit_data - แก้ไขข้อมูล
3. delete_records - ลบข้อมูล
```

#### สร้าง Users ตัวอย่าง
```bash
# Test Users
1. Username: test.admin
   Email: admin@myproject.com
   Password: admin123
   Roles: admin, user

2. Username: test.user
   Email: user@myproject.com
   Password: user123
   Roles: user
```

### 2. Frontend Integration

#### React.js Integration
```bash
# ติดตั้ง Keycloak adapter
npm install keycloak-js
```

```javascript
// src/keycloak.js
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://auth.localhost/',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'my-project-realm',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'my-project-frontend'
});

export default keycloak;
```

```javascript
// src/App.js
import React, { useEffect, useState } from 'react';
import keycloak from './keycloak';

function App() {
  const [keycloakAuth, setKeycloakAuth] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      checkLoginIframe: false
    }).then(authenticated => {
      setKeycloakAuth(authenticated);
      if (authenticated) {
        // ดึงข้อมูล user
        keycloak.loadUserInfo().then(userInfo => {
          setUserInfo(userInfo);
        });
      }
    }).catch(error => {
      console.error('Keycloak initialization failed:', error);
    });
  }, []);

  const login = () => {
    keycloak.login({
      redirectUri: window.location.origin
    });
  };

  const logout = () => {
    keycloak.logout({
      redirectUri: window.location.origin
    });
  };

  if (keycloakAuth === null) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {keycloakAuth ? (
        <div>
          <h1>ยินดีต้อนรับ, {userInfo?.name || userInfo?.preferred_username}</h1>
          <p>Email: {userInfo?.email}</p>
          <p>Roles: {keycloak.realmAccess?.roles?.join(', ')}</p>
          <button onClick={logout}>ออกจากระบบ</button>
        </div>
      ) : (
        <div>
          <h1>กรุณาเข้าสู่ระบบ</h1>
          <button onClick={login}>เข้าสู่ระบบ</button>
        </div>
      )}
    </div>
  );
}

export default App;
```

```bash
# .env สำหรับ React
REACT_APP_KEYCLOAK_URL=http://auth.localhost/
REACT_APP_KEYCLOAK_REALM=my-project-realm
REACT_APP_KEYCLOAK_CLIENT_ID=my-project-frontend
```

#### Vue.js Integration
```bash
# ติดตั้ง Keycloak adapter
npm install keycloak-js
```

```javascript
// src/plugins/keycloak.js
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: process.env.VUE_APP_KEYCLOAK_URL || 'http://auth.localhost/',
  realm: process.env.VUE_APP_KEYCLOAK_REALM || 'my-project-realm',
  clientId: process.env.VUE_APP_KEYCLOAK_CLIENT_ID || 'my-project-frontend'
});

export default keycloak;
```

```javascript
// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import keycloak from './plugins/keycloak';

let app;

keycloak.init({
  onLoad: 'check-sso',
  checkLoginIframe: false
}).then(authenticated => {
  app = createApp(App);

  app.config.globalProperties.$keycloak = keycloak;
  app.config.globalProperties.$authenticated = authenticated;

  app.mount('#app');
}).catch(error => {
  console.error('Keycloak initialization failed:', error);
});
```

### 3. Backend Integration

#### Node.js Express Integration
```bash
# ติดตั้ง dependencies
npm install keycloak-connect express-session
```

```javascript
// server.js
const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const app = express();

// Session configuration
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

// Keycloak configuration
const keycloak = new Keycloak({ store: memoryStore }, {
  realm: process.env.KEYCLOAK_REALM || 'my-project-realm',
  'auth-server-url': process.env.KEYCLOAK_URL || 'http://auth.localhost/',
  'ssl-required': 'external',
  resource: process.env.KEYCLOAK_CLIENT_ID || 'my-project-backend',
  credentials: {
    secret: process.env.KEYCLOAK_CLIENT_SECRET
  },
  'verify-token-audience': true,
  'use-resource-role-mappings': true,
  'confidential-port': 0
});

app.use(keycloak.middleware());

// Protected routes
app.get('/api/public', (req, res) => {
  res.json({ message: 'Public endpoint - no authentication required' });
});

app.get('/api/protected', keycloak.protect(), (req, res) => {
  res.json({
    message: 'Protected endpoint',
    user: req.kauth.grant.access_token.content
  });
});

app.get('/api/admin', keycloak.protect('admin'), (req, res) => {
  res.json({
    message: 'Admin only endpoint',
    user: req.kauth.grant.access_token.content
  });
});

// Role-based protection
app.get('/api/manager', keycloak.protect('realm:manager'), (req, res) => {
  res.json({ message: 'Manager access required' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### Python FastAPI Integration
```bash
# ติดตั้ง dependencies
pip install fastapi python-keycloak python-jose[cryptography] python-multipart
```

```python
# main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from keycloak import KeycloakOpenID
import jwt
import os

app = FastAPI(title="My Project API")

# Keycloak configuration
keycloak_openid = KeycloakOpenID(
    server_url=os.getenv('KEYCLOAK_URL', 'http://auth.localhost/'),
    client_id=os.getenv('KEYCLOAK_CLIENT_ID', 'my-project-backend'),
    realm_name=os.getenv('KEYCLOAK_REALM', 'my-project-realm'),
    client_secret_key=os.getenv('KEYCLOAK_CLIENT_SECRET')
)

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # Verify token
        token_info = keycloak_openid.introspect(credentials.credentials)
        if not token_info.get('active'):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is not active"
            )
        return token_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

def require_role(required_role: str):
    def role_checker(token_info: dict = Depends(verify_token)):
        user_roles = token_info.get('realm_access', {}).get('roles', [])
        if required_role not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required"
            )
        return token_info
    return role_checker

@app.get("/api/public")
async def public_endpoint():
    return {"message": "Public endpoint - no authentication required"}

@app.get("/api/protected")
async def protected_endpoint(token_info: dict = Depends(verify_token)):
    return {
        "message": "Protected endpoint",
        "user": token_info.get('preferred_username'),
        "roles": token_info.get('realm_access', {}).get('roles', [])
    }

@app.get("/api/admin")
async def admin_endpoint(token_info: dict = Depends(require_role("admin"))):
    return {
        "message": "Admin only endpoint",
        "user": token_info.get('preferred_username')
    }
```

## การเชื่อมต่อ Central PostgreSQL

### 1. สร้าง Database และ User สำหรับโครงการ

```bash
# เชื่อมต่อ PostgreSQL ในฐานะ admin
psql -h localhost -p 5432 -U postgres -d postgres

# สร้าง database สำหรับโครงการใหม่
CREATE DATABASE my_project_db
  WITH
  OWNER = postgres
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.utf8'
  LC_CTYPE = 'en_US.utf8'
  TABLESPACE = pg_default
  CONNECTION LIMIT = -1
  TEMPLATE = template0;

-- สร้าง user สำหรับโครงการ
CREATE USER my_project_user WITH
  PASSWORD 'secure_password_123'
  CREATEDB
  LOGIN;

-- ให้สิทธิ์การใช้งาน database
GRANT ALL PRIVILEGES ON DATABASE my_project_db TO my_project_user;

-- เชื่อมต่อไปยัง database ใหม่
\c my_project_db

-- ให้สิทธิ์ schema
GRANT ALL ON SCHEMA public TO my_project_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO my_project_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO my_project_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO my_project_user;

-- ตั้งค่า default privileges สำหรับ objects ที่จะสร้างในอนาคต
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO my_project_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO my_project_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO my_project_user;
```

### 2. Database Connection Examples

#### Node.js (pg library)
```javascript
// database.js
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: process.env.DB_NAME || 'my_project_db',
  user: process.env.DB_USER || 'my_project_user',
  password: process.env.DB_PASSWORD || 'secure_password_123',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

module.exports = pool;
```

```javascript
// Example usage with Express
const express = require('express');
const pool = require('./database');

const app = express();
app.use(express.json());

// GET users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CREATE user
app.post('/api/users', async (req, res) => {
  const { username, email } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
      [username, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### Python (SQLAlchemy)
```python
# database.py
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

# Database URL
DATABASE_URL = f"postgresql://{os.getenv('DB_USER', 'my_project_user')}:{os.getenv('DB_PASSWORD', 'secure_password_123')}@db.localhost:5432/{os.getenv('DB_NAME', 'my_project_db')}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

```python
# FastAPI example
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import get_db, User

app = FastAPI()

@app.get("/api/users")
async def get_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users

@app.post("/api/users")
async def create_user(username: str, email: str, db: Session = Depends(get_db)):
    user = User(username=username, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

#### Java Spring Boot
```java
// application.yml
spring:
  datasource:
    url: jdbc:postgresql://db.localhost:5432/my_project_db
    username: my_project_user
    password: secure_password_123
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
    show-sql: true
```

```java
// User.java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String username;

    @Column(unique = true)
    private String email;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Constructors, getters, setters
}
```

## ตัวอย่างโครงการ

### Full Stack Application (React + Node.js)

#### docker-compose.yml สำหรับโครงการใหม่
```yaml
version: '3.8'

services:
  # Frontend React Application
  my-project-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: my-project-frontend
    environment:
      - REACT_APP_KEYCLOAK_URL=http://auth.localhost/
      - REACT_APP_KEYCLOAK_REALM=my-project-realm
      - REACT_APP_KEYCLOAK_CLIENT_ID=my-project-frontend
      - REACT_APP_API_URL=http://api.myproject.localhost
    networks:
      - proxy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.my-project-frontend.rule=Host(`myproject.localhost`)"
      - "traefik.http.routers.my-project-frontend.entrypoints=web"
      - "traefik.http.services.my-project-frontend.loadbalancer.server.port=80"
    restart: unless-stopped

  # Backend API
  my-project-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: my-project-backend
    environment:
      - NODE_ENV=development
      - PORT=3001
      - KEYCLOAK_URL=http://auth.localhost/
      - KEYCLOAK_REALM=my-project-realm
      - KEYCLOAK_CLIENT_ID=my-project-backend
      - KEYCLOAK_CLIENT_SECRET=your-client-secret
      - DB_HOST=localhost
      - DB_PORT=5432
      - DB_NAME=my_project_db
      - DB_USER=my_project_user
      - DB_PASSWORD=secure_password_123
    networks:
      - proxy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.my-project-backend.rule=Host(`api.myproject.localhost`)"
      - "traefik.http.routers.my-project-backend.entrypoints=web"
      - "traefik.http.services.my-project-backend.loadbalancer.server.port=3001"
    restart: unless-stopped
    depends_on:
      - my-project-db-setup

  # Database initialization service
  my-project-db-setup:
    image: postgres:15
    container_name: my-project-db-setup
    environment:
      - PGPASSWORD=postgres_admin_password
    networks:
      - proxy-network
    command: >
      bash -c "
        echo 'Waiting for central database...' &&
        until pg_isready -h localhost -p 5432 -U postgres; do sleep 1; done &&
        echo 'Creating project database and user...' &&
        psql -h localhost -p 5432 -U postgres -d postgres -c \"
          CREATE DATABASE my_project_db;
          CREATE USER my_project_user WITH PASSWORD 'secure_password_123';
          GRANT ALL PRIVILEGES ON DATABASE my_project_db TO my_project_user;
        \" || echo 'Database might already exist' &&
        echo 'Database setup completed'
      "
    restart: "no"

networks:
  proxy-network:
    external: true
    name: proxy-network
```

#### .env สำหรับโครงการ
```bash
# Keycloak Configuration
KEYCLOAK_URL=http://auth.localhost/
KEYCLOAK_REALM=my-project-realm
KEYCLOAK_CLIENT_ID_FRONTEND=my-project-frontend
KEYCLOAK_CLIENT_ID_BACKEND=my-project-backend
KEYCLOAK_CLIENT_SECRET=your-client-secret-from-keycloak

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=my_project_db
DB_USER=my_project_user
DB_PASSWORD=secure_password_123

# API Configuration
API_URL=http://api.myproject.localhost

# Frontend Configuration
FRONTEND_URL=http://myproject.localhost
```

#### Local hosts setup เพิ่มเติม
```bash
# เพิ่มใน /etc/hosts หรือ C:\Windows\System32\drivers\etc\hosts
127.0.0.1    myproject.localhost
127.0.0.1    api.myproject.localhost
127.0.0.1    db.localhost
```

## Best Practices

### 1. Security Best Practices

#### Architecture Security
- **Centralized Authentication** - Keycloak เป็น single source of truth สำหรับ authentication
- **Database Isolation** - Central PostgreSQL เข้าถึงผ่าน Traefik เท่านั้น (db.localhost:5432)
- **No Direct Database Access** - Frontend ไม่เชื่อมต่อ Database โดยตรง
- **Reverse Proxy Pattern** - Traefik จัดการ SSL, routing, load balancing
- **Network Segregation** - Services แยกตาม Docker networks

#### Implementation Security
```bash
# ใช้ environment variables สำหรับ sensitive data
- ไม่ hard-code passwords ในโค้ด
- ใช้ HTTPS ใน production
- ตั้งค่า CORS อย่างเหมาะสม
- Validate และ sanitize input data
- Implement proper error handling
- ไม่เปิด database ports โดยตรง
- ใช้ JWT tokens สำหรับ API authorization
```

### 2. Database Best Practices
```sql
-- ใช้ migrations สำหรับ schema changes
-- สร้าง indexes สำหรับ queries ที่ใช้บ่อย
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ใช้ foreign keys สำหรับ referential integrity
ALTER TABLE orders ADD CONSTRAINT fk_orders_user_id
  FOREIGN KEY (user_id) REFERENCES users(id);

-- ใช้ UUID สำหรับ primary keys (หากเหมาะสม)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
ALTER TABLE users ADD COLUMN uuid UUID DEFAULT uuid_generate_v4();
```

### 3. Keycloak Best Practices
```bash
# Role-based access control
- สร้าง roles ที่เฉพาะเจาะจง
- ใช้ realm roles สำหรับ system-wide permissions
- ใช้ client roles สำหรับ application-specific permissions
- Implement least privilege principle

# Token management
- ตั้งค่า token expiration อย่างเหมาะสม
- Implement token refresh mechanism
- ใช้ refresh tokens อย่างปลอดภัย
```

### 4. Development Workflow
```bash
# 1. เริ่ม centralized services
cd centralized-services
docker compose up -d

# 2. สร้าง realm และ client ใน Keycloak
# 3. สร้าง database และ user ใน PostgreSQL
# 4. เริ่มโครงการใหม่
cd ../my-new-project
docker compose up -d

# 5. Test integration
curl -f http://myproject.localhost
curl -f http://api.myproject.localhost/health
```

## การแก้ไขปัญหา

### 1. Keycloak Connection Issues
```bash
# ตรวจสอบ Keycloak service
curl -f http://auth.localhost/health/ready

# ตรวจสอบ realm และ client configuration
# ตรวจสอบ redirect URIs
# ตรวจสอบ CORS settings

# Debug token issues
# ใช้ Keycloak admin console เพื่อ introspect tokens
# ตรวจสอบ token expiration
```

### 2. Database Connection Issues
```bash
# ตรวจสอบการเชื่อมต่อ
psql -h localhost -p 5432 -U postgres -c "SELECT version();"

# ตรวจสอบ user permissions
psql -h localhost -p 5432 -U my_project_user -d my_project_db -c "\dt"

# ตรวจสอบ network connectivity
docker network inspect proxy-network
```

### 3. CORS Issues
```javascript
// Backend CORS configuration (Express)
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://myproject.localhost',
    'https://myproject.cigblusolutions.com'
  ],
  credentials: true
}));
```

### 4. Network Issues
```bash
# ตรวจสอบ network
docker network ls
docker network inspect proxy-network

# ตรวจสอบ container connectivity
docker exec my-project-backend ping auth.localhost
docker exec my-project-backend ping localhost
```

### 5. Common Error Messages และวิธีแก้
```bash
# "CORS error"
- ตรวจสอบ CORS configuration ใน backend
- ตรวจสอบ valid origins ใน Keycloak client settings

# "Database connection refused"
- ตรวจสอบ database container ทำงานหรือไม่
- ตรวจสอบ network connectivity
- ตรวจสอบ credentials

# "Invalid token"
- ตรวจสอบ token expiration
- ตรวจสอบ client configuration
- ตรวจสอบ realm settings

# "Permission denied"
- ตรวจสอบ user roles
- ตรวจสอบ role mappings
- ตรวจสอบ client roles configuration
```

---

> 💡 **หมายเหตุ**: เอกสารนี้เป็นคู่มือสำหรับการเชื่อมต่อโครงการใหม่เข้ากับระบบ Centralized Services หากมีปัญหาหรือข้อสงสัย สามารถศึกษาเพิ่มเติมใน [CLAUDE.md](CLAUDE.md) และ [INSTALLATION.md](INSTALLATION.md)