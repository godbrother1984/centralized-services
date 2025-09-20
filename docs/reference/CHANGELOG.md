# Changelog - Centralized Services
**File**: C:\Project\centralized-services\CHANGELOG.md
**Version**: 2.1.0
**Date**: 2025-09-18
**Time**: Current

## Version 2.1.0 (2025-09-18)

### 🔒 **Security Improvements**

#### Added
- **OAuth2/OIDC Redirect Flow**: แทนที่ iframe authentication ด้วย standard redirect flow
- **CSP Frame Protection**: รักษา `Content-Security-Policy: frame-ancestors 'none'`
- **X-Frame-Options**: รักษา `X-Frame-Options: DENY` เพื่อป้องกัน clickjacking
- **Security Headers**: เพิ่ม Strict-Transport-Security และ security headers อื่นๆ

#### Removed
- **Rate Limiting**: ปิด rate limiting เพื่อหลีกเลี่ยง 429 errors ในระหว่างการใช้งาน
- **ACME SSL**: ปิด Let's Encrypt certificate requests สำหรับ development
- **Iframe Support**: ลบการตั้งค่าที่รองรับ iframe authentication

### 🛠️ **Configuration Changes**

#### docker-compose.yml
```yaml
# Traefik Configuration
- ปิด ACME certificate resolver
- เปิด API insecure mode สำหรับ development
- ลบ rate limiting middlewares
- ปิด HTTPS routers สำหรับ development

# Keycloak Configuration
- ลบ CSP custom configuration ที่ขัดแย้ง
- ใช้ default security settings ของ Keycloak
- เปลี่ยน command กลับเป็น ["start-dev"]
```

#### Environment Variables
```yaml
# อัพเดต passwords เป็น production-ready
KEYCLOAK_ADMIN_PASSWORD: Kc_Admin_SecureP@ss2024!
POSTGRES_PASSWORD: postgres_admin_password
```

### 📁 **New Files**

#### Examples
- `examples/react-auth-example.js` - React OAuth2 redirect flow
- `examples/nodejs-auth-example.js` - Express.js backend integration
- `examples/client-configurations.md` - Keycloak client setup guide
- `examples/package.json` - Dependencies สำหรับตัวอย่าง

#### Documentation
- `fix-authentication-flow.md` - คู่มือแก้ปัญหา CSP frame-ancestors
- `CHANGELOG.md` - ไฟล์นี้

### 📝 **Documentation Updates**

#### README.md (v2.1.0)
- อัพเดต passwords ทั้งหมด
- เพิ่มส่วน Security Features
- เพิ่มตัวอย่าง OAuth2 redirect flow
- อัพเดต Keycloak URLs และ credentials

#### INSTALLATION.md (v2.1.0)
- อัพเดต description เป็น OAuth2/OIDC focus
- รักษาคู่มือการติดตั้งที่มีอยู่

#### CLAUDE.md
- อัพเดต admin password
- เพิ่ม Integration Guidelines ที่ครอบคลุม
- เพิ่ม OAuth2/OIDC best practices
- เพิ่มการอ้างอิงไปยัง examples

### 🔧 **Technical Changes**

#### Security
- **CSP Compliance**: ระบบตอนนี้เป็นไปตาม Content Security Policy
- **OAuth2 Standards**: ใช้ Authorization Code Flow ตามมาตรฐาน
- **PKCE Support**: รองรับ Proof Key for Code Exchange
- **State Protection**: รองรับ state parameter เพื่อป้องกัน CSRF

#### Performance
- **No Rate Limiting**: ลบ rate limiting เพื่อการใช้งานที่ราบรื่น
- **Faster Startup**: ลบ ACME certificate requests ที่ล้มเหลว

#### Compatibility
- **GUI Client Support**: PostgreSQL GUI clients ยังคงใช้งานได้ผ่าน TCP proxy
- **Standard Ports**: รักษา port mapping เดิม
- **Container Health**: รักษา health check configurations

### 🚀 **Migration Guide**

#### สำหรับโครงการใหม่
1. ใช้ตัวอย่างใน `examples/` folder
2. ตั้งค่า Keycloak client ตาม `examples/client-configurations.md`
3. ใช้ redirect flow แทน iframe

#### สำหรับโครงการเดิม
1. อัพเดต Keycloak admin password เป็น `Kc_Admin_SecureP@ss2024!`
2. เปลี่ยนจาก iframe เป็น redirect flow
3. อัพเดต connection URLs เป็น `http://auth.localhost/`

### ⚠️ **Breaking Changes**

#### Authentication Flow
- **Iframe authentication ไม่ทำงานแล้ว** (ถูกบล็อกโดย CSP)
- **ต้องใช้ OAuth2 redirect flow** เท่านั้น

#### Credentials
- **Keycloak admin password เปลี่ยน** จาก `admin123` เป็น `Kc_Admin_SecureP@ss2024!`

#### URLs
- **Keycloak URL เปลี่ยน** จาก `http://localhost:8080/` เป็น `http://auth.localhost/`

### 🔍 **Security Impact Assessment**

#### ไม่มีผลกระทบเชิงลบ
- การลบ custom CSP config ไม่ได้ลด security
- Keycloak default security แข็งแกร่งกว่า custom config
- OAuth2 redirect flow ปลอดภัยกว่า iframe

#### ผลกระทบเชิงบวก
- ป้องกัน clickjacking attacks ได้ดีขึ้น
- เป็นไปตาม OAuth2/OIDC standards
- รองรับ PKCE และ state protection

### 📋 **Testing**

#### Verified Features
- ✅ Traefik Dashboard: http://traefik.localhost/dashboard/
- ✅ Keycloak Admin: http://auth.localhost/admin/
- ✅ PostgreSQL: localhost:15432
- ✅ OAuth2 redirect flow
- ✅ Security headers

#### Test Commands
```bash
# ทดสอบ services
docker-compose ps

# ทดสอบ Traefik
curl -s -o /dev/null -w "%{http_code}" http://traefik.localhost/dashboard/

# ทดสอบ Keycloak
curl -s -o /dev/null -w "%{http_code}" http://auth.localhost/

# ทดสอบ PostgreSQL
psql "postgresql://postgres:postgres_admin_password@localhost:15432/postgres" -c "SELECT version();"
```

### 🎯 **Recommendations**

#### สำหรับ Production
1. เปิด HTTPS และ ACME certificates
2. ใช้ strong passwords ที่ไม่ซ้ำกัน
3. เปิด rate limiting กลับหากจำเป็น
4. ตั้งค่า proper domain names
5. ใช้ secrets management

#### สำหรับ Development
1. ใช้ configuration ปัจจุบัน
2. ทดสอบ OAuth2 flows ด้วย examples
3. ใช้ fix-authentication-flow.md เป็นแนวทาง

### 📞 **Support**

#### Documentation References
- `README.md` - Overview และ quick start
- `INSTALLATION.md` - คู่มือการติดตั้งแบบละเอียด
- `CLAUDE.md` - คู่มือสำหรับ developers
- `fix-authentication-flow.md` - แก้ปัญหา CSP
- `examples/` - ตัวอย่างการใช้งาน

#### Common Issues
- CSP frame-ancestors errors → ใช้ redirect flow
- 429 Rate limiting → ปิดแล้วใน v2.1.0
- SSL certificate errors → ปิด ACME ใน development
- Authentication flow → ดู examples folder

---

**สรุป**: Version 2.1.0 มุ่งเน้นการปรับปรุงความปลอดภัยและการใช้งานที่ถูกต้องตามมาตรฐาน OAuth2/OIDC โดยไม่ลดระดับการรักษาความปลอดภัย