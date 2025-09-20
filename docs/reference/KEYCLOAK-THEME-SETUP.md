# 🎨 Keycloak Theme Customization Guide
-- File: centralized-services/KEYCLOAK-THEME-SETUP.md
-- Version: 2.0.0
-- Date: 2025-09-19
-- Description: คู่มือการปรับแต่ง Keycloak theme ให้สวยงามและใช้งานง่าย

## 🌟 **C.I.Group Corporate Theme Features**

### ✨ **Visual Enhancements**
- **Modern Design**: ดิไซน์ทันสมัยด้วย Gradient Background
- **Thai Typography**: ใช้ฟอนต์ Sarabun สำหรับภาษาไทย
- **Animated Background**: พื้นหลังเคลื่อนไหวแบบ subtle
- **Glassmorphism**: Card design แบบ backdrop blur
- **Responsive Design**: รองรับหน้าจอทุกขนาด

### 🚀 **Interactive Features**
- **Loading States**: แสดงสถานะ loading เมื่อกดปุ่ม
- **Form Validation**: ตรวจสอบข้อมูลแบบ real-time
- **Password Toggle**: ปุ่มแสดง/ซ่อนรหัสผ่าน
- **Ripple Effects**: เอฟเฟกต์การคลิกแบบ Material Design
- **Thai Greetings**: ข้อความทักทายตามเวลา

### 🌐 **Localization**
- **Thai Language**: แปลเป็นภาษาไทยครบถ้วน
- **Time-based Greetings**: สวัสดีตอนเช้า/บ่าย/เย็น
- **Cultural Adaptations**: ปรับให้เหมาะกับผู้ใช้ไทย

## 📁 **Theme Structure**

```
keycloak-themes/
└── cigroup-theme/
    └── login/
        ├── theme.properties          # Theme configuration
        ├── login.ftl                 # Login page template
        ├── messages/
        │   └── messages_th.properties # Thai translations
        └── resources/
            ├── css/
            │   ├── custom.css        # Custom styles
            │   └── variables.css     # Environment-based CSS variables
            ├── js/
            │   ├── custom.js         # Interactive features
            │   └── config.js         # Environment-based configuration
            └── img/                  # Theme images
```

## ⚙️ **การติดตั้งและใช้งาน**

### 1. **Enable Theme ใน Keycloak Admin**

#### Step 1: เข้าสู่ Admin Console
```
URL: http://auth.localhost/admin/
Username: admin
Password: Kc_Admin_SecureP@ss2024!
```

#### Step 2: ตั้งค่า Realm Theme
1. เลือก **Realm** ที่ต้องการ (เช่น C.I.Group หรือ master)
2. ไปที่ **Realm Settings** > **Themes** tab
3. ตั้งค่า:
   - **Login theme**: `cigroup-theme`
   - **Account theme**: `cigroup-theme` (ถ้ามี)
   - **Email theme**: `cigroup-theme` (ถ้ามี)
   - **Admin console theme**: `keycloak` (เก็บเป็น default)
4. คลิก **Save**

#### Step 3: ทดสอบ Theme
1. ไปที่ **Clients** > เลือก client ของคุณ
2. คลิก **Login test** หรือ
3. เปิด URL: `http://auth.localhost/realms/your-realm/protocol/openid-connect/auth?client_id=account&redirect_uri=http://auth.localhost/realms/your-realm/account/&response_type=code`

### 2. **การกำหนดค่าผ่าน Environment Variables**

#### การปรับแต่ง Theme ผ่าน .env File
ระบบใช้ไฟล์ `.env` ในการกำหนดค่า theme อัตโนมัติ:

```bash
# ===== COMPANY BRANDING =====
COMPANY_NAME="C.I.Group PCL."
COMPANY_SHORT_NAME="C.I.Group"
THEME_NAME="cigroup-theme"

# ===== THEME COLORS =====
THEME_PRIMARY_COLOR=#1e40af
THEME_PRIMARY_HOVER=#1d4ed8
THEME_SECONDARY_COLOR=#64748b
THEME_SUCCESS_COLOR=#10b981
THEME_WARNING_COLOR=#f59e0b
THEME_ERROR_COLOR=#ef4444

# ===== BACKGROUND =====
THEME_BACKGROUND_GRADIENT="linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)"

# ===== COMPANY LOGO =====
THEME_LOGO_URL=
THEME_LOGO_WIDTH=120px
THEME_LOGO_HEIGHT=60px
THEME_SHOW_EMOJI_PLACEHOLDER=true
THEME_EMOJI_PLACEHOLDER=🏢
```

#### สร้าง Theme จาก Environment Variables
```bash
# รัน script เพื่อสร้าง theme files จาก .env
bash scripts/configure-theme.sh

# Restart Keycloak เพื่อโหลด theme ใหม่
docker-compose restart keycloak
```

#### การปรับแต่งสีและโลโก้
```bash
# เปลี่ยนสีหลัก
THEME_PRIMARY_COLOR=#your-brand-color

# เปลี่ยน gradient background
THEME_BACKGROUND_GRADIENT="linear-gradient(135deg, #color1 0%, #color2 100%)"

# เพิ่มโลโก้บริษัท
THEME_LOGO_URL=https://example.com/logo.png
THEME_LOGO_WIDTH=150px
THEME_LOGO_HEIGHT=75px
THEME_SHOW_EMOJI_PLACEHOLDER=false
```

### 3. **การปรับแต่งแบบ Manual**

#### เพิ่มโลโก้บริษัท
1. วางไฟล์โลโก้ใน `resources/img/logo.png`
2. แก้ไข `custom.css`:
```css
.login-pf-brand::before {
  content: "";
  background-image: url('../img/logo.png');
  background-size: contain;
  background-repeat: no-repeat;
  width: 120px;
  height: 60px;
  display: block;
}
```

#### ปรับข้อความ
แก้ไข environment variables แล้วรัน script:
```bash
# แก้ไขใน .env
COMPANY_NAME="Your Company Name"
COMPANY_SHORT_NAME="YourCorp"

# รัน script เพื่ออัปเดต messages
bash scripts/configure-theme.sh
```

หรือแก้ไขโดยตรงใน `messages_th.properties`:
```properties
loginTitle=เข้าสู่ระบบ [ชื่อบริษัท]
welcome=ยินดีต้อนรับสู่ [ชื่อระบบ]
```

## 🎯 **Features ที่สามารถเพิ่มได้**

### 1. **Social Login Integration**

#### Google Login
1. ใน Keycloak Admin: **Identity Providers** > **Add provider** > **Google**
2. กรอก Google OAuth credentials
3. Theme จะแสดงปุ่ม Google Login อัตโนมัติ

#### Facebook Login
1. **Identity Providers** > **Add provider** > **Facebook**
2. กรอก Facebook App credentials
3. ปรับแต่งปุ่มใน `custom.css`

#### Line Login (สำหรับไทย)
1. **Identity Providers** > **Add provider** > **OpenID Connect v1.0**
2. ตั้งค่า Line Login endpoints
3. เพิ่มสไตล์ Line ใน CSS

### 2. **Multi-Factor Authentication**

#### SMS OTP
1. **Authentication** > **Flows** > สร้าง flow ใหม่
2. เพิ่ม SMS OTP step
3. กำหนด SMS provider (Twilio, etc.)

#### Google Authenticator
1. **Authentication** > **Required Actions** > เปิด OTP
2. Users จะถูกขอให้ตั้งค่า Authenticator app

#### Email OTP
1. ตั้งค่า SMTP ใน **Realm Settings** > **Email**
2. เปิดใช้ Email OTP ใน Authentication flows

### 3. **Custom User Attributes**

```javascript
// เพิ่มฟิลด์ในการสมัครสมาชิก
// ใน registration.ftl
<div class="form-group">
    <input type="text" id="user.attributes.employee_id"
           name="user.attributes.employee_id"
           placeholder="รหัสพนักงาน" />
</div>

<div class="form-group">
    <input type="text" id="user.attributes.department"
           name="user.attributes.department"
           placeholder="แผนก" />
</div>
```

### 4. **Advanced Security Features**

#### Password Policy
1. **Authentication** > **Password Policy**
2. กำหนดกฎ: ความยาว, ตัวเลข, อักษรพิเศษ
3. แสดงเงื่อนไขใน theme

#### Account Lockout
1. **Realm Settings** > **Security Defenses**
2. ตั้งค่า max login failures
3. แสดงข้อความแจ้งเตือนใน theme

#### Terms and Conditions
1. สร้าง **Required Action**: Terms and Conditions
2. เพิ่มหน้า terms.ftl ใน theme
3. แสดงข้อตกลงก่อน login

## 🛠️ **การพัฒนา Theme**

### Development Workflow
```bash
# 1. แก้ไข environment variables
vi .env

# 2. รัน script เพื่อสร้าง theme files ใหม่
bash scripts/configure-theme.sh

# 3. Restart Keycloak เพื่อโหลด changes
docker-compose restart keycloak

# 4. ทดสอบ
# เปิด browser ใน incognito mode
# ไปที่ login page เพื่อดูการเปลี่ยนแปลง

# หรือแก้ไขไฟล์โดยตรง (สำหรับ advanced users)
vi keycloak-themes/cigroup-theme/login/resources/css/custom.css
```

### Live Development (ไม่ต้อง restart)
```css
/* เพิ่มใน custom.css สำหรับ development */
@import url('http://localhost:3001/live-theme.css');
```

### Theme Cache Busting
```html
<!-- เพิ่มใน template สำหรับ force reload -->
<link rel="stylesheet" href="${url.resourcesPath}/css/custom.css?v=${.now?string('yyyyMMddHHmmss')}">
```

## 🎨 **ตัวอย่าง Customizations**

### Corporate Branding
```css
/* สีธนาคาร */
:root {
  --primary-color: #1e40af;
  --secondary-color: #64748b;
  --background-gradient: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
}

/* สีรัฐบาล */
:root {
  --primary-color: #7c2d12;
  --secondary-color: #a3a3a3;
  --background-gradient: linear-gradient(135deg, #7c2d12 0%, #dc2626 100%);
}

/* สีเทคโนโลยี */
:root {
  --primary-color: #059669;
  --secondary-color: #6b7280;
  --background-gradient: linear-gradient(135deg, #059669 0%, #10b981 100%);
}
```

### Seasonal Themes
```css
/* ธีมปีใหม่ */
body::before {
  background-image:
    radial-gradient(circle at 20% 80%, rgba(255, 215, 0, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 0, 0, 0.3) 0%, transparent 50%);
}

/* ธีมสงกรานต์ */
body::before {
  background-image:
    radial-gradient(circle at 20% 80%, rgba(0, 150, 255, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 200, 0, 0.3) 0%, transparent 50%);
}
```

### Industry-Specific
```css
/* Healthcare */
:root {
  --primary-color: #0ea5e9;
  --success-color: #059669;
  --warning-color: #f59e0b;
  --error-color: #dc2626;
}

/* Education */
:root {
  --primary-color: #7c3aed;
  --success-color: #059669;
  --background-gradient: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
}

/* Manufacturing */
:root {
  --primary-color: #ea580c;
  --secondary-color: #78716c;
  --background-gradient: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
}
```

## 📱 **Mobile Optimization**

```css
/* การปรับแต่งสำหรับมือถือ */
@media (max-width: 480px) {
  .card-pf {
    margin: 0.5rem !important;
    padding: 1.5rem !important;
    border-radius: 0 !important;
    min-height: 100vh !important;
  }

  .login-pf-brand::before {
    font-size: 2rem;
  }

  .form-control {
    padding: 14px 16px !important;
    font-size: 16px !important; /* ป้องกัน zoom ใน iOS */
  }
}

/* Touch-friendly buttons */
@media (hover: none) and (pointer: coarse) {
  .btn-primary {
    padding: 16px 24px !important;
    font-size: 1.1rem !important;
  }

  .form-control {
    padding: 16px !important;
  }
}
```

## 🔒 **Security Considerations**

### 1. **XSS Protection**
```html
<!-- ใช้ Keycloak sanitization -->
${kcSanitize(message)?no_esc}

<!-- หลีกเลี่ยง innerHTML โดยตรง -->
```

### 2. **Content Security Policy**
```html
<!-- เพิ่มใน template -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com;">
```

### 3. **Resource Loading**
```css
/* ใช้ relative paths */
background-image: url('../img/logo.png');

/* หลีกเลี่ยง external resources ที่ไม่จำเป็น */
```

## 🚀 **Performance Optimization**

### 1. **CSS Optimization**
```css
/* Minify CSS ใน production */
/* ใช้ tools เช่น cssnano */

/* Optimize animations */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 2. **Image Optimization**
```bash
# Optimize images
convert logo.png -resize 120x60 -quality 85 logo.webp

# Use appropriate formats
# PNG for logos with transparency
# WebP for photos
# SVG for icons
```

### 3. **Font Loading**
```css
/* Optimize font loading */
@font-face {
  font-family: 'Sarabun';
  src: url('../fonts/sarabun.woff2') format('woff2');
  font-display: swap;
}
```

## 📊 **Analytics & Monitoring**

### 1. **Login Analytics**
```javascript
// เพิ่มใน custom.js
document.addEventListener('DOMContentLoaded', function() {
    // Track login attempts
    const loginForm = document.getElementById('kc-form-login');
    if (loginForm) {
        loginForm.addEventListener('submit', function() {
            // Send analytics event
            if (typeof gtag !== 'undefined') {
                gtag('event', 'login_attempt', {
                    'event_category': 'authentication',
                    'event_label': 'assetflow_login'
                });
            }
        });
    }
});
```

### 2. **Error Tracking**
```javascript
// Track authentication errors
window.addEventListener('error', function(e) {
    console.error('Theme error:', e.error);
    // Send to error tracking service
});
```

## 🎉 **Next Steps**

1. **ปรับแต่ง Corporate Branding**
2. **เพิ่ม Social Login Providers**
3. **ตั้งค่า Multi-Factor Authentication**
4. **สร้าง Email Templates สวยๆ**
5. **เพิ่ม Custom User Attributes**
6. **ทดสอบบนอุปกรณ์ต่างๆ**

---

## 📞 **Support & Resources**

- **Keycloak Documentation**: https://www.keycloak.org/docs/
- **Theme Development**: https://www.keycloak.org/docs/latest/server_development/
- **FreeMarker Templates**: https://freemarker.apache.org/docs/

**🎨 C.I.Group Corporate Theme พร้อมใช้งานแล้ว! 🚀**

## 🚀 **Quick Start Guide**

### สำหรับการใช้งานครั้งแรก:
```bash
# 1. Copy และแก้ไข environment variables
cp .env.example .env
vi .env

# 2. สร้าง theme จาก configuration
bash scripts/configure-theme.sh

# 3. Restart Keycloak
docker-compose restart keycloak

# 4. เข้าไปตั้งค่าใน Keycloak Admin Console
# URL: http://auth.localhost/admin/
# Theme: cigroup-theme
```

### สำหรับการปรับแต่งอย่างรวดเร็ว:
```bash
# เปลี่ยนสีหลัก
echo 'THEME_PRIMARY_COLOR=#your-color' >> .env

# เพิ่มโลโก้
echo 'THEME_LOGO_URL=https://example.com/logo.png' >> .env

# อัปเดต theme
bash scripts/configure-theme.sh && docker-compose restart keycloak
```

**ลองเข้าไปดูที่: http://auth.localhost/ 🎨**