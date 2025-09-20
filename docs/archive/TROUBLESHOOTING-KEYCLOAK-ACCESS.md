# แก้ปัญหา Keycloak External Access
**File**: C:\Project\centralized-services\TROUBLESHOOTING-KEYCLOAK-ACCESS.md
**Version**: 1.0.0
**Date**: 2025-09-18
**Time**: Current

## 🚨 **ปัญหาที่พบ**

Developer รายงานว่า:
- Keycloak container ทำงานอยู่แต่ไม่ได้ expose port สำหรับ external access
- ไม่มี port mapping จาก host ไปยัง container port 8080
- Frontend ไม่สามารถเชื่อมต่อ http://auth.localhost/ ได้

## ✅ **สถานะปัจจุบัน**

ระบบ Centralized Services ทำงานถูกต้องแล้ว:

### ✅ **Keycloak Container**
```bash
# ตรวจสอบ container
docker-compose ps keycloak
# STATUS: Up (healthy)

# ตรวจสอบ connectivity
curl -I http://auth.localhost/
# RESULT: HTTP/1.1 302 Found
```

### ✅ **Traefik Routing**
```bash
# ตรวจสอบ routing
curl -s http://traefik.localhost:8080/api/http/routers | grep keycloak
# RESULT: keycloak@docker router exists
```

### ✅ **DNS Resolution**
```bash
# ตรวจสอบ DNS
ping -n 1 auth.localhost
# RESULT: Reply from 127.0.0.1
```

## 🎯 **ปัญหาจริง: Realm Configuration**

ปัญหาไม่ได้อยู่ที่ infrastructure แต่อยู่ที่ **Keycloak ยังไม่ได้สร้าง realm สำหรับแอปพลิเคชัน**

## 🛠️ **วิธีแก้ไข: สร้าง Realm และ Client**

### 1. เข้าสู่ Keycloak Admin Console

```bash
# URL: http://auth.localhost/admin/
# Username: admin
# Password: Kc_Admin_SecureP@ss2024!
```

### 2. สร้าง Realm สำหรับ AssetFlow

#### Step 1: Create Realm
1. คลิก dropdown "master" มุมซ้ายบน
2. คลิก "Create realm"
3. ใส่ข้อมูล:
   - **Realm name**: `assetflow`
   - **Display name**: `AssetFlow System`
   - **Enabled**: `ON`
4. คลิก "Create"

#### Step 2: Create Client for Frontend
1. เลือก realm "assetflow"
2. ไปที่ "Clients" > "Create client"
3. **General Settings**:
   - **Client type**: `OpenID Connect`
   - **Client ID**: `assetflow-frontend`
   - **Name**: `AssetFlow Frontend Application`
4. **Capability config**:
   - **Client authentication**: `OFF` (สำหรับ public client)
   - **Authorization**: `OFF`
   - **Standard flow**: `ON`
   - **Direct access grants**: `ON`
   - **Implicit flow**: `OFF`
5. **Login settings**:
   ```
   Root URL: http://localhost:3000
   Valid redirect URIs:
   - http://localhost:3000/*
   - http://assetflow.localhost/*

   Valid post logout redirect URIs:
   - http://localhost:3000
   - http://assetflow.localhost

   Web origins:
   - http://localhost:3000
   - http://assetflow.localhost
   ```

#### Step 3: Create Client for Backend API
1. สร้าง client ใหม่:
   - **Client ID**: `assetflow-backend`
   - **Client authentication**: `ON` (สำหรับ confidential client)
2. ใน "Credentials" tab จดบันทึก **Client secret**

### 3. สร้าง Test User

#### Step 1: Create User
1. ไปที่ "Users" > "Add user"
2. ใส่ข้อมูล:
   - **Username**: `testuser`
   - **Email**: `test@assetflow.com`
   - **First name**: `Test`
   - **Last name**: `User`
   - **Email verified**: `ON`
3. คลิก "Create"

#### Step 2: Set Password
1. ไปที่ "Credentials" tab
2. คลิก "Set password"
3. ใส่ password: `testpass123`
4. **Temporary**: `OFF`
5. คลิก "Set password"

### 4. ทดสอบการเข้าถึง

```bash
# ทดสอบ realm endpoint
curl -s http://auth.localhost/realms/assetflow/.well-known/openid_connect_configuration

# ผลลัพธ์ที่ต้องการ: JSON configuration
```

## 📋 **Configuration สำหรับ AssetFlow**

### Frontend Configuration (.env)
```bash
# React Environment Variables
REACT_APP_KEYCLOAK_URL=http://auth.localhost/
REACT_APP_KEYCLOAK_REALM=assetflow
REACT_APP_KEYCLOAK_CLIENT_ID=assetflow-frontend
```

### Backend Configuration (.env)
```bash
# Node.js Environment Variables
KEYCLOAK_URL=http://auth.localhost/
KEYCLOAK_REALM=assetflow
KEYCLOAK_CLIENT_ID=assetflow-backend
KEYCLOAK_CLIENT_SECRET=<client-secret-from-keycloak>
```

### Frontend Integration (React)
```javascript
// src/keycloak.js
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://auth.localhost/',
  realm: 'assetflow',
  clientId: 'assetflow-frontend'
});

export default keycloak;
```

```javascript
// src/App.js
import React, { useEffect, useState } from 'react';
import keycloak from './keycloak';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    keycloak.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,  // ใช้ redirect flow
      flow: 'standard'
    }).then(auth => {
      setAuthenticated(auth);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {authenticated ? (
        <div>
          <h1>Welcome to AssetFlow!</h1>
          <button onClick={() => keycloak.logout()}>Logout</button>
        </div>
      ) : (
        <div>
          <h1>AssetFlow Login</h1>
          <button onClick={() => keycloak.login()}>Login</button>
        </div>
      )}
    </div>
  );
}

export default App;
```

## 🔍 **การทดสอบ**

### 1. ทดสอบ Realm
```bash
curl -s http://auth.localhost/realms/assetflow/.well-known/openid_connect_configuration | jq .issuer
# ผลลัพธ์: "http://auth.localhost/realms/assetflow"
```

### 2. ทดสอบ Authentication Flow
1. เปิด browser ไปที่ `http://localhost:3000`
2. คลิก "Login"
3. จะ redirect ไปที่ Keycloak login page
4. ใส่ credentials: `testuser` / `testpass123`
5. จะ redirect กลับไปที่ application

### 3. ทดสอบ Token
```javascript
// ใน browser console หลัง login
console.log(keycloak.token);
console.log(keycloak.tokenParsed);
```

## 🚨 **หากยังไม่ได้:**

### ตรวจสอบ Hosts File
```bash
# Windows: C:\Windows\System32\drivers\etc\hosts
# macOS/Linux: /etc/hosts

# ต้องมีบรรทัดนี้:
127.0.0.1    auth.localhost
127.0.0.1    traefik.localhost
127.0.0.1    assetflow.localhost  # หากใช้
```

### ตรวจสอบ Firewall
```bash
# Windows: ตรวจสอบว่า port 80 เปิดอยู่
netstat -an | findstr :80

# ผลลัพธ์ที่ต้องการ:
# TCP    0.0.0.0:80             0.0.0.0:0              LISTENING
```

### ตรวจสอบ Docker Network
```bash
# ตรวจสอบ network
docker network inspect proxy-network

# ตรวจสอบ containers ใน network
docker network inspect proxy-network --format='{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'
```

## 📞 **ขั้นตอนถัดไป**

1. ✅ ทำตามขั้นตอนด้านบนเพื่อสร้าง realm และ client
2. ✅ อัพเดต frontend configuration
3. ✅ ทดสอบ authentication flow
4. ✅ แจ้งผลการทดสอบกลับ

**หลังจากทำตามนี้แล้ว AssetFlow ควรจะเชื่อมต่อ Keycloak ได้แล้ว!** 🎉

---

## 📋 **Quick Commands**

```bash
# ตรวจสอบ centralized services
cd centralized-services
docker-compose ps

# ตรวจสอบ logs
docker-compose logs keycloak

# Restart หากจำเป็น
docker-compose restart keycloak

# เข้า admin console
# URL: http://auth.localhost/admin/
# Username: admin
# Password: Kc_Admin_SecureP@ss2024!
```