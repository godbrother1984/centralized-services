# คู่มือการเชื่อมต่อระบบ (Integration Guide)
-- File: centralized-services/docs/reference/INTEGRATION.md
-- Version: 2.3.0
-- Date: 2025-09-20
-- Description: คู่มือการเชื่อมต่อโครงการใหม่เข้ากับ Traefik Auto-Discovery, Keycloak Authentication, n8n Workflow Automation และ Central PostgreSQL Database

## สารบัญ
1. [ภาพรวมการเชื่อมต่อ](#ภาพรวมการเชื่อมต่อ)
2. [Traefik Auto-Discovery](#traefik-auto-discovery)
3. [การเตรียมความพร้อม](#การเตรียมความพร้อม)
4. [การเชื่อมต่อ Keycloak Authentication](#การเชื่อมต่อ-keycloak-authentication)
5. [การเชื่อมต่อ Central PostgreSQL](#การเชื่อมต่อ-central-postgresql)
6. [การทำงานร่วมกันระหว่าง Docker Stacks](#การทำงานร่วมกันระหว่าง-docker-stacks)
7. [ตัวอย่างโครงการ](#ตัวอย่างโครงการ)
8. [Best Practices](#best-practices)
9. [การแก้ไขปัญหา](#การแก้ไขปัญหา)

## ภาพรวมการเชื่อมต่อ

### สถาปัตยกรรมระบบ

#### Centralized Services (ระบบส่วนกลาง)
```
                    ┌─────────────────┐
                    │     Traefik     │
                    │ Reverse Proxy   │
                    └─────────┬───────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Keycloak     │ │      n8n        │ │ Central PostgreSQL│
│ Authentication  │ │ Workflow Auto   │ │    Database     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
 auth.localhost      n8n.localhost      localhost:15432
```

## Traefik Auto-Discovery

### 🚀 **การทำงานอัตโนมัติของ Traefik**

Traefik จะ **auto-discover** API container ใหม่และจัดการ reverse proxy อัตโนมัติเมื่อ:

1. **Container อยู่ใน network เดียวกัน** (`proxy-network`)
2. **มี labels ที่จำเป็น** สำหรับการ routing
3. **Traefik monitor Docker socket** แบบ real-time

### ✅ **ตัวอย่างการเพิ่ม API Container**

```yaml
# docker-compose.yml สำหรับ API ใหม่
version: '3.8'
services:
  my-api:
    image: my-api:latest
    container_name: my-api
    environment:
      # Database connection ผ่าน Traefik
      DB_HOST: localhost
      DB_PORT: 15432
      DB_NAME: my_project_db
      DB_USER: my_project_user
      DB_PASSWORD: my_project_password

      # Keycloak authentication
      KEYCLOAK_URL: http://auth.localhost
      KEYCLOAK_REALM: my-realm
      KEYCLOAK_CLIENT_ID: my-api-client
    networks:
      - proxy-network  # ต้องอยู่ใน network เดียวกับ Traefik
    labels:
      # เปิดใช้ Traefik auto-discovery
      - "traefik.enable=true"
      - "traefik.docker.network=proxy-network"

      # Router configuration - Traefik จะ auto-detect
      - "traefik.http.routers.my-api.rule=Host(\`api.localhost\`)"
      - "traefik.http.routers.my-api.entrypoints=web"
      - "traefik.http.services.my-api.loadbalancer.server.port=3000"

      # CORS middleware สำหรับ frontend
      - "traefik.http.routers.my-api.middlewares=api-cors"
      - "traefik.http.middlewares.api-cors.headers.accesscontrolallowmethods=GET,POST,PUT,DELETE,OPTIONS"
      - "traefik.http.middlewares.api-cors.headers.accesscontrolallowheaders=Origin,X-Requested-With,Content-Type,Accept,Authorization"
      - "traefik.http.middlewares.api-cors.headers.accesscontrolalloworiginlist=http://localhost:3000,http://localhost:3001"
      - "traefik.http.middlewares.api-cors.headers.accesscontrolallowcredentials=true"

networks:
  proxy-network:
    external: true
    name: proxy-network
```

### 🔄 **ขั้นตอนการ Auto-Discovery**

1. **เริ่ม container**:
   ```bash
   docker-compose up -d
   ```

2. **Traefik จะ detect ทันที**:
   - อ่าน labels จาก container
   - สร้าง routing rules อัตโนมัติ
   - เพิ่มใน load balancer

3. **เข้าถึงได้ทันที**:
   ```bash
   curl http://api.localhost/health
   ```

### 📋 **Labels ที่จำเป็น**

```yaml
labels:
  # เปิดใช้ Traefik (จำเป็น)
  - "traefik.enable=true"

  # กำหนด network (ถ้ามีหลาย network)
  - "traefik.docker.network=proxy-network"

  # Router - กำหนด domain และ entrypoint
  - "traefik.http.routers.my-api.rule=Host(\`api.localhost\`)"
  - "traefik.http.routers.my-api.entrypoints=web"

  # Service - บอก port ที่ API listen
  - "traefik.http.services.my-api.loadbalancer.server.port=3000"

  # Middleware (optional)
  - "traefik.http.routers.my-api.middlewares=api-cors,api-auth"
```

### 🌐 **Path-based Routing**

```yaml
# สำหรับ API หลายตัวใน domain เดียว
labels:
  - "traefik.http.routers.user-api.rule=Host(\`api.localhost\`) && PathPrefix(\`/users\`)"
  - "traefik.http.routers.order-api.rule=Host(\`api.localhost\`) && PathPrefix(\`/orders\`)"
  - "traefik.http.routers.product-api.rule=Host(\`api.localhost\`) && PathPrefix(\`/products\`)"
```

### ⚡ **Real-time Updates**

Traefik **ไม่ต้อง restart** เมื่อมี container ใหม่:
- ✅ เพิ่ม container → Traefik detect ทันที
- ✅ ลบ container → Traefik remove route ทันที
- ✅ แก้ไข labels → Traefik update ทันที

### 📱 **ตัวอย่าง Frontend + API Integration**

```yaml
# Frontend container
frontend:
  image: my-frontend:latest
  networks:
    - proxy-network
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.frontend.rule=Host(\`app.localhost\`)"
    - "traefik.http.services.frontend.loadbalancer.server.port=3000"
  # ไม่เปิด ports - บังคับให้ผ่าน Traefik

# API container
api:
  image: my-api:latest
  networks:
    - proxy-network
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.api.rule=Host(\`api.localhost\`)"
    - "traefik.http.services.api.loadbalancer.server.port=8000"
    - "traefik.http.routers.api.middlewares=api-cors,api-security"
  # ไม่เปิด ports - บังคับให้ผ่าน Traefik

networks:
  proxy-network:
    external: true
    name: proxy-network
```

### 🔒 **Security Best Practices**
- ✅ **ไม่เปิด ports ใน docker-compose** - บังคับให้ผ่าน Traefik
- ✅ **ใช้ internal networks** - containers สื่อสารกันภายใน
- ✅ **Security middleware** - headers และ CORS protection
- ✅ **Container isolation** - แยก network ระหว่าง services

### 🔍 **ตรวจสอบ Auto-Discovery**

```bash
# ดู Traefik dashboard
open http://traefik.localhost/dashboard/

# ตรวจสอบ services ที่ discover แล้ว
curl http://traefik.localhost/api/http/services

# ตรวจสอบ routers
curl http://traefik.localhost/api/http/routers
```

#### Integration กับโครงการภายนอก
```
┌─────────────────┐
│   Your Project  │─────┐
│   (Frontend)    │     │
└─────────────────┘     │    ┌─────────────────┐    ┌─────────────────┐
                        ├───▶│     Traefik     │───▶│    Keycloak     │
┌─────────────────┐     │    │ Reverse Proxy   │    │ Authentication  │
│   Your Project  │─────┘    │ (Auto-Discovery)│    │ (Centralized)   │
│   (Backend API) │          └─────────┬───────┘    └─────────────────┘
└─────────────────┘                    │
                                       ▼
                            ┌─────────────────┐
                            │ Central PostgreSQL│
                            │    Database     │
                            │ (Centralized)   │
                            └─────────────────┘
                          (via localhost:15432)
```

### 🎯 Services URLs
- **Keycloak Authentication**: `http://auth.localhost` (dev) / `https://auth.yourdomain.com` (prod)
- **n8n Workflow Automation**: `http://n8n.localhost` (dev) / `https://n8n.yourdomain.com` (prod)
- **Central PostgreSQL**: `localhost:15432` (accessible via Traefik TCP Router only)
- **Traefik Dashboard**: `http://traefik.localhost/dashboard/` (dev) / `https://traefik.yourdomain.com/dashboard/` (prod)

### 🔒 สิ่งสำคัญ: Database Security
- **Central PostgreSQL เข้าถึงผ่าน Traefik เท่านั้น** - ไม่เปิด direct ports
- **Your Backend API** เชื่อมต่อ Database โดยการเรียก `localhost:15432` → **Traefik รับ request แล้วส่งต่อไปยัง PostgreSQL container**
- **Frontend ไม่เชื่อมต่อ Database โดยตรง** - ต้องผ่าน Backend API
- **Authentication ผ่าน Keycloak** - Backend API เรียก `auth.localhost` → **Traefik รับ request แล้วส่งต่อไปยัง Keycloak**

### 🌐 Connection Flow
1. **Your Frontend** → **Your Backend API** (HTTP/HTTPS)
2. **Your Backend API** → **Traefik** → **Central PostgreSQL** (via `localhost:15432`)
3. **Your Frontend/Backend** → **Traefik** → **Keycloak** (via `auth.localhost`) for authentication

## การเตรียมความพร้อม

### 1. ตรวจสอบ Centralized Services
```bash
# ตรวจสอบสถานะ
cd centralized-services
docker compose ps

# ทดสอบการเชื่อมต่อ
curl -f http://auth.localhost/realms/master
psql "postgresql://postgres:[YOUR_DB_PASSWORD]@localhost:15432/postgres" -c "SELECT version();"
```

## 🔑 ข้อมูลการเข้าถึงระบบ

### Keycloak Authentication Service
- **Development URL**: http://auth.localhost
- **Admin Console**: http://auth.localhost/admin/
- **Username**: admin
- **Password**: [ดูในไฟล์ secrets/keycloak_admin_password.txt]
- **Realm**: master (หรือ realm ที่สร้างขึ้น)

### Central PostgreSQL Database
- **Host**: localhost:15432 (ผ่าน Traefik TCP proxy)
- **Database**: postgres (หรือ database ที่สร้างขึ้น)
- **Username**: postgres
- **Password**: [ดูในไฟล์ secrets/central_db_password.txt]
- **Connection String**: `postgresql://postgres:[YOUR_DB_PASSWORD]@localhost:15432/postgres`

### Traefik Dashboard (ระบบส่วนกลาง)
- **URL**: http://traefik.localhost/dashboard/
- **Username**: admin
- **Password**: [ดูในไฟล์ .env หรือใช้ basic auth ที่กำหนด]
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

### 🔐 **สิ่งสำคัญ: OAuth2/OIDC Redirect Flow**

**ใช้ redirect flow เท่านั้น - ห้ามใช้ iframe!**

#### ✅ **วิธีที่ถูกต้อง (Redirect Flow):**
```javascript
// ใช้ redirect flow
keycloak.init({
  onLoad: 'login-required',
  checkLoginIframe: false,  // ปิด iframe
  flow: 'standard'          // ใช้ redirect
});
```

#### ❌ **วิธีที่ผิด (Iframe - ถูกบล็อก):**
```javascript
// ห้ามใช้ - จะได้ CSP error
<iframe src="http://auth.localhost/"></iframe>
// Error: "frame-ancestors 'none'"
```

> 📖 **อ่านเพิ่มเติม**: ดูไฟล์ `fix-authentication-flow.md` สำหรับรายละเอียด

## การเชื่อมต่อ Keycloak Authentication

### 1. สร้าง Realm และ Client ใน Keycloak

#### เข้าสู่ Keycloak Admin Console
```bash
# Development
URL: http://auth.localhost/admin
# Production
URL: https://auth.cigblusolutions.com/admin

Username: admin
Password: [ดูในไฟล์ secrets/keycloak_admin_password.txt]
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

#### สร้าง Service Account และ Users

**🔐 Security Best Practice: ใช้ Service Account สำหรับระบบ**

```bash
# สร้าง Service Account สำหรับแอปพลิเคชัน
1. ไปที่ Clients > your-app-client > Service Account
2. Enable "Service Account Enabled"
3. สร้าง dedicated service account user
4. กำหนด roles ที่จำเป็นเท่านั้น

# สร้าง Regular Users สำหรับทดสอบ
1. Username: test.admin
   Email: admin@example.com
   Password: [ให้ผู้ใช้สร้างเองผ่าน forgot password]
   Roles: admin, user

2. Username: test.user
   Email: user@example.com
   Password: [ให้ผู้ใช้สร้างเองผ่าน forgot password]
   Roles: user

# ⚠️ หมายเหตุ: ไม่ควรใส่ password จริงในเอกสาร
# ให้ใช้ "Forgot Password" flow หรือ temporary password
```

**🛡️ Database Access Security:**
```bash
# สร้าง dedicated database user สำหรับแต่ละแอปพลิเคชัน
# ไม่ใช้ postgres root user ในการเชื่อมต่อ

# ตัวอย่างการสร้าง application user:
CREATE USER myapp_user WITH PASSWORD '[generate-strong-password]';
CREATE DATABASE myapp_db OWNER myapp_user;
GRANT CONNECT ON DATABASE myapp_db TO myapp_user;

# ให้สิทธิ์เฉพาะที่จำเป็น - หลักการ Principle of Least Privilege
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO myapp_user;
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
    // ใช้ OAuth2 redirect flow (ไม่ใช่ iframe)
    keycloak.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,  // ปิด iframe checking
      flow: 'standard'          // ใช้ redirect flow
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

// ใช้ OAuth2 redirect flow (ไม่ใช่ iframe)
keycloak.init({
  onLoad: 'check-sso',
  checkLoginIframe: false,  // ปิด iframe checking
  flow: 'standard'          // ใช้ redirect flow
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
# เชื่อมต่อ PostgreSQL ในฐานะ admin (ผ่าน Traefik TCP proxy)
psql -h localhost -p 15432 -U postgres -d postgres

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
  port: 15432,  // ผ่าน Traefik TCP proxy
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
DATABASE_URL = f"postgresql://{os.getenv('DB_USER', 'my_project_user')}:{os.getenv('DB_PASSWORD', 'secure_password_123')}@localhost:15432/{os.getenv('DB_NAME', 'my_project_db')}"

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
    url: jdbc:postgresql://localhost:15432/my_project_db
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

## การเชื่อมต่อ n8n Workflow Automation

### 🔧 **ภาพรวม n8n Integration**

n8n เป็น workflow automation platform ที่รวมอยู่ในระบบ Centralized Services สำหรับจัดการ automation workflows, API integrations และ scheduled tasks

#### การเข้าถึง n8n
- **URL**: http://n8n.localhost
- **Username**: admin
- **Password**: [ดูในไฟล์ secrets/n8n_admin_password.txt]
- **Database**: n8n_db (ใช้ Central PostgreSQL)

### 🚀 **การใช้งาน n8n กับโครงการของคุณ**

#### 1. การสร้าง Webhook สำหรับ API Integration
```javascript
// ตัวอย่างการเรียก n8n webhook จาก application
const axios = require('axios');

// Webhook URL จาก n8n workflow
const webhookUrl = 'http://n8n.localhost/webhook/your-webhook-id';

// ส่งข้อมูลไปยัง n8n workflow
async function triggerWorkflow(data) {
  try {
    const response = await axios.post(webhookUrl, {
      event: 'user_registered',
      userId: data.userId,
      email: data.email,
      timestamp: new Date().toISOString()
    });

    console.log('Workflow triggered:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to trigger workflow:', error.message);
    throw error;
  }
}

// การใช้งานใน Express.js route
app.post('/api/users/register', async (req, res) => {
  try {
    // สร้าง user ในฐานข้อมูล
    const newUser = await createUser(req.body);

    // Trigger n8n workflow สำหรับ welcome email
    await triggerWorkflow({
      userId: newUser.id,
      email: newUser.email
    });

    res.json({ success: true, user: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 2. การเชื่อมต่อ n8n กับ Keycloak
```javascript
// n8n HTTP Request Node configuration
// สำหรับเรียก Keycloak API
{
  "method": "POST",
  "url": "http://auth.localhost/admin/realms/your-realm/users",
  "headers": {
    "Authorization": "Bearer {{$json.keycloak_token}}",
    "Content-Type": "application/json"
  },
  "body": {
    "username": "{{$json.username}}",
    "email": "{{$json.email}}",
    "enabled": true,
    "credentials": [{
      "type": "password",
      "value": "{{$json.password}}",
      "temporary": false
    }]
  }
}
```

#### 3. การเชื่อมต่อ n8n กับ PostgreSQL
```sql
-- ตัวอย่าง SQL Query ใน n8n PostgreSQL Node
-- เชื่อมต่อไปยัง central-postgresql:5432
SELECT
  u.id,
  u.username,
  u.email,
  u.created_at,
  COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '{{$json.start_date}}'
GROUP BY u.id, u.username, u.email, u.created_at
ORDER BY order_count DESC;
```

### 📋 **Use Cases สำหรับ n8n**

#### 1. User Management Automation
- สร้าง user ใน Keycloak อัตโนมัติเมื่อมีการสมัครสมาชิกใหม่
- ส่ง welcome email
- เพิ่ม user เข้า groups และ roles ตามเงื่อนไข

#### 2. Data Synchronization
- Sync ข้อมูลระหว่าง databases
- Export/Import ข้อมูลจาก/ไป external systems
- Backup automation

#### 3. Monitoring และ Alerts
- ตรวจสอบ system health
- ส่ง alerts เมื่อมี errors
- Generate reports อัตโนมัติ

#### 4. API Integration
- เชื่อมต่อกับ third-party services
- Process webhooks จาก external systems
- Data transformation และ enrichment

### 🔒 **Security Considerations**

#### 1. n8n Basic Authentication
```bash
# Environment variables ใน docker-compose.yml
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=[ดูในไฟล์ secrets/n8n_admin_password.txt]
```

#### 2. Database Connection Security
- n8n ใช้ internal network เชื่อมต่อ PostgreSQL
- ไม่เปิด direct access จากภายนอก
- ใช้ strong passwords สำหรับ database credentials

#### 3. Webhook Security
```javascript
// ตัวอย่างการตรวจสอบ webhook signature
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === `sha256=${expectedSignature}`;
}

// ใช้ใน Express middleware
app.use('/webhook', (req, res, next) => {
  const signature = req.headers['x-signature'];
  const isValid = verifyWebhookSignature(
    JSON.stringify(req.body),
    signature,
    process.env.WEBHOOK_SECRET
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
});
```

## การทำงานร่วมกันระหว่าง Docker Stacks

### 🏗️ **แนวคิด Multi-Stack Architecture**

ระบบ Centralized Services รองรับการทำงานร่วมกันของหลายโครงการที่แยก Docker stack กัน ผ่าน **external networks** และ **shared services**

#### สถาปัตยกรรม Multi-Stack
```
┌─────────────────────────────────────────────────────────────────────┐
│                         proxy-network                               │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │  Stack 1:       │  │  Stack 2:       │  │  Stack 3:       │      │
│  │ Centralized     │  │  E-commerce     │  │    CRM          │      │
│  │  Services       │  │   Project       │  │  Project        │      │
│  │                 │  │                 │  │                 │      │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │      │
│  │ │   Traefik   │ │  │ │  Frontend   │ │  │ │   Web App   │ │      │
│  │ │  Keycloak   │ │  │ │   Backend   │ │  │ │             │ │      │
│  │ │ PostgreSQL  │ │  │ │             │ │  │ │             │ │      │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │  Stack 4:       │  │  Stack 5:       │  │  Stack N:       │      │
│  │ Inventory       │  │   Analytics     │  │  Future         │      │
│  │  System         │  │    Service      │  │  Projects       │      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### 🔗 **ข้อดีของ Multi-Stack Architecture**

#### ✅ **Independence & Isolation**
- **แยก lifecycle**: แต่ละโครงการ deploy/update/restart แยกกันได้
- **Team isolation**: ทีมต่างกันทำงานแยกกันโดยไม่รบกวนกัน
- **Resource isolation**: CPU, Memory แยกกันตาม stack
- **Version control**: แต่ละโครงการมี Git repository แยกกัน

#### ✅ **Shared Resources**
- **Single Authentication**: ใช้ Keycloak เดียวกันสำหรับทุกโครงการ
- **Central Database**: PostgreSQL เดียวกันแต่ database แยกกัน
- **Unified Routing**: Traefik จัดการ routing ให้ทุกโครงการ
- **SSL Management**: Certificate management รวมศูนย์

#### ✅ **Scalability**
- **Horizontal scaling**: เพิ่มโครงการใหม่ได้ง่าย
- **Service discovery**: Traefik จับ services ใหม่อัตโนมัติ
- **Load balancing**: แยก load ตาม domain/path

### 🛠️ **การตั้งค่า Multi-Stack**

#### 1. Directory Structure แนะนำ
```
project-ecosystem/
├── centralized-services/           # 🏛️ Infrastructure Stack
│   ├── docker-compose.yml
│   ├── INTEGRATION.md
│   ├── CLAUDE.md
│   └── examples/
│
├── ecommerce-platform/             # 🛒 E-commerce Stack
│   ├── docker-compose.yml
│   ├── frontend/
│   ├── backend/
│   ├── .env
│   └── docs/
│
├── crm-system/                     # 👥 CRM Stack
│   ├── docker-compose.yml
│   ├── webapp/
│   ├── api/
│   └── .env
│
├── inventory-management/           # 📦 Inventory Stack
│   ├── docker-compose.yml
│   ├── src/
│   └── .env
│
├── analytics-dashboard/            # 📊 Analytics Stack
│   ├── docker-compose.yml
│   ├── dashboard/
│   ├── data-processor/
│   └── .env
│
└── mobile-api-gateway/             # 📱 Mobile API Stack
    ├── docker-compose.yml
    ├── gateway/
    └── .env
```

#### 2. Network Configuration

**Centralized Services** (สร้าง network หลัก):
```yaml
# centralized-services/docker-compose.yml
networks:
  proxy-network:
    driver: bridge
    name: proxy-network
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

**โครงการอื่นๆ** (ใช้ external network):
```yaml
# ecommerce-platform/docker-compose.yml
networks:
  proxy-network:
    external: true
    name: proxy-network
```

#### 3. ตัวอย่าง Stack Configurations

##### Stack 2: E-commerce Platform
```yaml
# ecommerce-platform/docker-compose.yml
version: '3.8'
services:
  ecommerce-frontend:
    build: ./frontend
    container_name: ecommerce-frontend
    environment:
      - REACT_APP_KEYCLOAK_URL=http://auth.localhost/
      - REACT_APP_KEYCLOAK_REALM=ecommerce-realm
      - REACT_APP_API_URL=http://api.ecommerce.localhost
    networks:
      - proxy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ecommerce.rule=Host(`shop.localhost`)"
      - "traefik.http.routers.ecommerce.entrypoints=web"
      - "traefik.http.services.ecommerce.loadbalancer.server.port=80"
    restart: unless-stopped

  ecommerce-backend:
    build: ./backend
    container_name: ecommerce-backend
    environment:
      - NODE_ENV=development
      - KEYCLOAK_URL=http://auth.localhost/
      - KEYCLOAK_REALM=ecommerce-realm
      - KEYCLOAK_CLIENT_ID=ecommerce-backend
      - DB_HOST=localhost
      - DB_PORT=15432
      - DB_NAME=ecommerce_db
      - DB_USER=ecommerce_user
      - DB_PASSWORD=ecommerce_secure_pass
    networks:
      - proxy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ecommerce-api.rule=Host(`api.ecommerce.localhost`)"
      - "traefik.http.routers.ecommerce-api.entrypoints=web"
      - "traefik.http.services.ecommerce-api.loadbalancer.server.port=3000"
    restart: unless-stopped

networks:
  proxy-network:
    external: true
    name: proxy-network
```

##### Stack 3: CRM System
```yaml
# crm-system/docker-compose.yml
version: '3.8'
services:
  crm-webapp:
    build: ./webapp
    container_name: crm-webapp
    environment:
      - VUE_APP_KEYCLOAK_URL=http://auth.localhost/
      - VUE_APP_KEYCLOAK_REALM=crm-realm
      - VUE_APP_API_URL=http://api.crm.localhost
    networks:
      - proxy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.crm.rule=Host(`crm.localhost`)"
      - "traefik.http.routers.crm.entrypoints=web"
      - "traefik.http.services.crm.loadbalancer.server.port=80"

  crm-api:
    build: ./api
    container_name: crm-api
    environment:
      - KEYCLOAK_URL=http://auth.localhost/
      - KEYCLOAK_REALM=crm-realm
      - DB_HOST=localhost
      - DB_PORT=15432
      - DB_NAME=crm_db
      - DB_USER=crm_user
      - DB_PASSWORD=crm_secure_pass
    networks:
      - proxy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.crm-api.rule=Host(`api.crm.localhost`)"
      - "traefik.http.routers.crm-api.entrypoints=web"
      - "traefik.http.services.crm-api.loadbalancer.server.port=8080"

networks:
  proxy-network:
    external: true
    name: proxy-network
```

### 🚀 **Deployment Workflow**

#### 1. เริ่มต้น Ecosystem
```bash
# Step 1: เริ่ม Infrastructure Stack
cd centralized-services
docker-compose up -d

# ตรวจสอบ infrastructure
docker-compose ps
curl -f http://auth.localhost/health/ready
psql "postgresql://postgres:[YOUR_DB_PASSWORD]@localhost:15432/postgres" -c "SELECT version();"
```

#### 2. เตรียม Databases สำหรับแต่ละโครงการ
```bash
# สร้าง databases สำหรับทุกโครงการ
psql -h localhost -p 15432 -U postgres -d postgres << EOF
-- E-commerce Database
CREATE DATABASE ecommerce_db;
CREATE USER ecommerce_user WITH PASSWORD 'ecommerce_secure_pass';
GRANT ALL PRIVILEGES ON DATABASE ecommerce_db TO ecommerce_user;

-- CRM Database
CREATE DATABASE crm_db;
CREATE USER crm_user WITH PASSWORD 'crm_secure_pass';
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;

-- Inventory Database
CREATE DATABASE inventory_db;
CREATE USER inventory_user WITH PASSWORD 'inventory_secure_pass';
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;

-- Analytics Database
CREATE DATABASE analytics_db;
CREATE USER analytics_user WITH PASSWORD 'analytics_secure_pass';
GRANT ALL PRIVILEGES ON DATABASE analytics_db TO analytics_user;

-- n8n Workflow Database (ถูกสร้างแล้วอัตโนมัติ)
-- CREATE DATABASE n8n_db;
-- CREATE USER n8n_user WITH PASSWORD 'N8n_Secure_P@ssw0rd_2024!';
-- GRANT ALL PRIVILEGES ON DATABASE n8n_db TO n8n_user;
EOF
```

#### 3. สร้าง Keycloak Realms
```bash
# เข้า Keycloak Admin Console: http://auth.localhost/admin/
# Username: admin, Password: [ดูในไฟล์ secrets/keycloak_admin_password.txt]

# สร้าง Realms:
# 1. ecommerce-realm
# 2. crm-realm
# 3. inventory-realm
# 4. analytics-realm

# สร้าง Clients และ Users สำหรับแต่ละ realm
```

#### 4. Deploy แต่ละโครงการ
```bash
# E-commerce Platform
cd ../ecommerce-platform
docker-compose up -d

# CRM System
cd ../crm-system
docker-compose up -d

# Inventory Management
cd ../inventory-management
docker-compose up -d

# Analytics Dashboard
cd ../analytics-dashboard
docker-compose up -d
```

#### 5. ตรวจสอบการทำงาน
```bash
# ตรวจสอบ network connectivity
docker network inspect proxy-network

# ตรวจสอบ services
curl -f http://shop.localhost
curl -f http://crm.localhost
curl -f http://inventory.localhost
curl -f http://analytics.localhost

# ตรวจสอบ API endpoints
curl -f http://api.ecommerce.localhost/health
curl -f http://api.crm.localhost/health
```

### 🔄 **การจัดการ Lifecycle**

#### Individual Stack Management
```bash
# Update เฉพาะ E-commerce
cd ecommerce-platform
git pull origin main
docker-compose build
docker-compose up -d

# Restart เฉพาะ CRM (infrastructure ยังทำงานอยู่)
cd crm-system
docker-compose restart

# Scale เฉพาะ Analytics
cd analytics-dashboard
docker-compose up -d --scale analytics-worker=3

# Stop เฉพาะ Inventory (อื่นๆ ยังทำงาน)
cd inventory-management
docker-compose down
```

#### Full Ecosystem Management
```bash
# Stop ทุกอย่างยกเว้น infrastructure
cd ecommerce-platform && docker-compose down
cd crm-system && docker-compose down
cd inventory-management && docker-compose down
cd analytics-dashboard && docker-compose down

# Infrastructure ยังทำงานอยู่
cd centralized-services && docker-compose ps

# Start ทุกอย่างกลับ
cd ecommerce-platform && docker-compose up -d
cd crm-system && docker-compose up -d
cd inventory-management && docker-compose up -d
cd analytics-dashboard && docker-compose up -d
```

### 🛡️ **Security & Isolation**

#### Database Isolation
```sql
-- แต่ละโครงการมี database และ user แยกกัน
-- E-commerce ไม่สามารถเข้าถึง CRM database ได้

-- ตัวอย่าง: E-commerce user
GRANT CONNECT ON DATABASE ecommerce_db TO ecommerce_user;
REVOKE CONNECT ON DATABASE crm_db FROM ecommerce_user;
REVOKE CONNECT ON DATABASE inventory_db FROM ecommerce_user;
```

#### Network Isolation Options
```yaml
# หากต้องการ isolation เพิ่มเติม สามารถสร้าง subnet แยกได้
networks:
  proxy-network:
    external: true
    name: proxy-network

  ecommerce-internal:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/16
```

#### Environment Variables Security
```bash
# ใช้ Docker secrets หรือ external secret management
# แทนการใส่ password ใน .env files

# ตัวอย่าง Docker secrets
echo "ecommerce_secure_pass" | docker secret create ecommerce_db_password -
```

### 📊 **Monitoring & Observability**

#### Container Monitoring
```bash
# ดู resource usage ของทุก stack
docker stats

# ดู logs แยกตาม stack
docker-compose -f ecommerce-platform/docker-compose.yml logs -f
docker-compose -f crm-system/docker-compose.yml logs -f

# Health checks
curl -f http://traefik.localhost:8080/api/http/services
```

#### Service Discovery
```bash
# ดู services ทั้งหมดใน Traefik
curl -s http://traefik.localhost:8080/api/http/routers | jq '.[].rule'

# ดู containers ใน network
docker network inspect proxy-network --format='{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'
```

### 🎯 **Use Cases & Benefits**

#### Team Development
```bash
# Team Frontend: ทำงานเฉพาะ UI
cd ecommerce-platform/frontend
npm run dev  # local development

# Team Backend: ทำงานเฉพาะ API
cd ecommerce-platform/backend
docker-compose up -d  # ใช้ shared infrastructure

# Team DevOps: จัดการ infrastructure
cd centralized-services
docker-compose up -d  # maintain shared services
```

#### Gradual Migration
```bash
# Migration scenario: ย้าย legacy system ทีละส่วน

# Step 1: เริ่มด้วย authentication
cd centralized-services && docker-compose up -d

# Step 2: เพิ่ม new microservice
cd new-service && docker-compose up -d

# Step 3: ย้าย legacy service ทีละตัว
cd legacy-service-migrated && docker-compose up -d
cd legacy-service-original && docker-compose down  # ปิดเก่า
```

#### Environment Management
```bash
# Development environment
export COMPOSE_PROJECT_NAME=dev
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Staging environment
export COMPOSE_PROJECT_NAME=staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Production environment
export COMPOSE_PROJECT_NAME=prod
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
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
      - DB_PORT=15432
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
      - PGPASSWORD=[YOUR_DB_PASSWORD]
    networks:
      - proxy-network
    command: >
      bash -c "
        echo 'Waiting for central database...' &&
        until pg_isready -h localhost -p 15432 -U postgres; do sleep 1; done &&
        echo 'Creating project database and user...' &&
        psql -h localhost -p 15432 -U postgres -d postgres -c \"
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
KEYCLOAK_CLIENT_SECRET=[GET_FROM_KEYCLOAK_CLIENT_CREDENTIALS_TAB]

# Database Configuration
DB_HOST=localhost
DB_PORT=15432
DB_NAME=my_project_db
DB_USER=my_project_user  # สร้าง dedicated user - ไม่ใช้ postgres admin
DB_PASSWORD=[GENERATE_STRONG_PASSWORD]

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
# ไม่ต้อง db.localhost เพราะใช้ localhost:15432 ผ่าน Traefik
```

## Best Practices

### 1. Security Best Practices

#### Architecture Security
- **Centralized Authentication** - Keycloak เป็น single source of truth สำหรับ authentication
- **Database Isolation** - Central PostgreSQL เข้าถึงผ่าน Traefik TCP Router เท่านั้น (localhost:15432)
- **No Direct Database Access** - Frontend ไม่เชื่อมต่อ Database โดยตรง
- **Reverse Proxy Pattern** - Traefik จัดการ SSL, routing, load balancing
- **Network Segregation** - Services แยกตาม Docker networks

#### Implementation Security

**🔐 Credential Management:**
- **ไม่ hard-code passwords ในโค้ดหรือเอกสาร**
- ใช้ Environment Variables หรือ Secret Management
- สร้าง dedicated database users สำหรับแต่ละแอปพลิเคชัน
- ใช้ Service Accounts แทนการใช้ admin users
- เปลี่ยน default passwords ทั้งหมด

**🛡️ Authentication & Authorization:**
- ใช้ **OAuth2/OIDC** standard flows
- สร้าง **separate clients** สำหรับ frontend และ backend
- ใช้ **Service Account** สำหรับ machine-to-machine communication
- ตั้งค่า **proper scopes และ roles**
- ไม่ใช้ iframe embedding (ใช้ redirect flow)

**🌐 Network Security:**
- ใช้ HTTPS ใน production เท่านั้น
- ตั้งค่า CORS อย่างเหมาะสม
- ไม่เปิด database ports โดยตรง (ใช้ Traefik TCP Router)
- Validate และ sanitize input data
- Implement proper error handling
- ใช้ JWT tokens สำหรับ API authorization

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

### 3. Keycloak Service Account Best Practices

**📋 Step-by-Step Service Account Creation:**

```bash
# 1. สร้าง Client สำหรับ Backend Service
- Client ID: "my-backend-service"
- Client Type: "OpenID Connect"
- Client authentication: ON
- Standard flow: OFF (สำหรับ service account)
- Service accounts roles: ON

# 2. ตั้งค่า Service Account
- ไปที่ Clients > my-backend-service > Service Account
- บันทึก Client Secret จาก Credentials tab
- กำหนด roles ที่จำเป็นใน Service Account Roles tab

# 3. สร้าง Dedicated Roles
- สร้าง client-specific roles: "read-data", "write-data", "admin-access"
- กำหนดเฉพาะ permissions ที่จำเป็น
- ห้ามใช้ admin roles สำหรับ application services
```

**🔐 Service Account vs User Account:**

| Use Case | Account Type | Example |
|----------|--------------|---------|
| Machine-to-Machine API calls | Service Account | Backend service เรียก API |
| User login to frontend | User Account | ผู้ใช้ login ผ่าน web |
| Automated workflows | Service Account | n8n workflows เรียก APIs |
| Database migrations | Service Account | Dedicated migration user |

**🛡️ Security Guidelines:**
- **Service Accounts ไม่มี password** - ใช้ Client Credentials flow
- **แยก Service Account ต่างๆ** - ไม่ใช้ account เดียวกันหลายแอป
- **จำกัด Token Lifetime** - ตั้งค่า access token ให้หมดอายุเร็ว
- **Monitor Usage** - ติดตาม service account activities
- **Rotate Secrets** - เปลี่ยน client secrets เป็นระยะ

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
psql -h localhost -p 15432 -U postgres -c "SELECT version();"

# ตรวจสอบ user permissions
psql -h localhost -p 15432 -U my_project_user -d my_project_db -c "\dt"

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

## 📂 **ตัวอย่างโค้ดเพิ่มเติม**

สำหรับตัวอย่างการใช้งานที่สมบูรณ์และเป็นปัจจุบัน:

### React Frontend
- **ไฟล์**: `examples/react-auth-example.js`
- **คุณสมบัติ**: OAuth2 redirect flow, PKCE, token management, protected routes

### Node.js Backend
- **ไฟล์**: `examples/nodejs-auth-example.js`
- **คุณสมบัติ**: Express.js, role-based access, database integration, API endpoints

### Client Configuration
- **ไฟล์**: `examples/client-configurations.md`
- **คุณสมบัติ**: Keycloak client setup, environment variables, security best practices

### Troubleshooting
- **ไฟล์**: `fix-authentication-flow.md`
- **คุณสมบัติ**: แก้ปัญหา CSP errors, iframe vs redirect comparison

---

> 💡 **หมายเหตุ**: เอกสารนี้เป็นคู่มือสำหรับการเชื่อมต่อโครงการใหม่เข้ากับระบบ Centralized Services หากมีปัญหาหรือข้อสงสัย สามารถศึกษาเพิ่มเติมใน [CLAUDE.md](CLAUDE.md), [INSTALLATION.md](INSTALLATION.md) และ [CHANGELOG.md](CHANGELOG.md)