# 🕒 Example DateTime API

-- File: example-api/README.md
-- Version: 1.0.0
-- Date: 2025-09-19
-- Description: ตัวอย่าง API สำหรับทดสอบ Traefik Auto-Discovery พร้อม Swagger Documentation

## 📋 **คุณสมบัติ**

### ✨ **API Endpoints**
- `GET /` - ข้อมูลพื้นฐานของ API
- `GET /health` - ตรวจสอบสถานะ API
- `GET /datetime` - วันที่และเวลาปัจจุบัน (รองรับปฏิทิน พ.ศ.)
- `GET /datetime/timezone/:timezone` - เวลาตาม timezone ที่กำหนด
- `POST /datetime/format` - จัดรูปแบบวันที่และเวลา

### 🎯 **Traefik Auto-Discovery**
- ✅ Auto-detect โดย Traefik
- ✅ CORS configuration
- ✅ Security headers
- ✅ Health checks

### 📖 **Swagger Documentation**
- Interactive API documentation
- ทดสอบ API ได้ทันทีผ่าน web interface
- รองรับภาษาไทย

## 🚀 **การใช้งาน**

### 1. **สร้างและเริ่ม API**
```bash
# ไปยังโฟลเดอร์ example-api
cd example-api

# Build และเริ่ม container
docker-compose up -d --build

# ตรวจสอบสถานะ
docker-compose ps
```

### 2. **ตรวจสอบ Traefik Discovery**
```bash
# ดู Traefik dashboard
open http://traefik.localhost/dashboard/

# ควรเห็น example-api ใน HTTP services
```

### 3. **เข้าถึง API**

#### ผ่าน Traefik Reverse Proxy (เท่านั้น)
- **API Base**: http://api.localhost
- **Swagger Docs**: http://api.localhost/docs
- **Health Check**: http://api.localhost/health

> 🔒 **หมายเหตุ**: Direct access ถูกปิดเพื่อความปลอดภัย ต้องผ่าน Traefik เท่านั้น

## 📚 **ตัวอย่างการใช้งาน**

### 1. **ข้อมูลพื้นฐาน**
```bash
curl http://api.localhost/
```

Response:
```json
{
  "name": "Example DateTime API",
  "version": "1.0.0",
  "description": "ตัวอย่าง API สำหรับ Traefik Auto-Discovery",
  "documentation": "/docs",
  "endpoints": [
    "GET /",
    "GET /health",
    "GET /datetime",
    "GET /datetime/timezone/:timezone",
    "POST /datetime/format"
  ]
}
```

### 2. **วันที่และเวลาปัจจุบัน**
```bash
curl http://api.localhost/datetime
```

Response:
```json
{
  "current": {
    "iso": "2025-09-19T10:30:00+07:00",
    "timestamp": 1726715400000,
    "thai": "19 กันยายน 2568 เวลา 10:30:00",
    "buddhist_year": 2568
  },
  "timezone": {
    "name": "Asia/Bangkok",
    "offset": "+07:00",
    "abbr": "ICT"
  },
  "formats": {
    "date_only": "2025-09-19",
    "time_only": "10:30:00",
    "datetime_readable": "19 September 2025, 10:30 AM",
    "thai_date": "19 กันยายน 2568"
  }
}
```

### 3. **เวลาตาม Timezone**
```bash
curl http://api.localhost/datetime/timezone/Asia/Tokyo
```

Response:
```json
{
  "timezone": "Asia/Tokyo",
  "current_time": "2025-09-19T12:30:00+09:00",
  "formatted": "19 September 2025, 12:30 PM",
  "offset": "+09:00",
  "utc_offset_hours": 9
}
```

### 4. **จัดรูปแบบวันที่**
```bash
curl -X POST http://api.localhost/datetime/format \
  -H "Content-Type: application/json" \
  -d '{
    "datetime": "2025-09-19T10:30:00+07:00",
    "format": "DD/MM/YYYY HH:mm:ss",
    "timezone": "Asia/Bangkok"
  }'
```

Response:
```json
{
  "input": "2025-09-19T10:30:00+07:00",
  "output": "19/09/2025 10:30:00",
  "format_used": "DD/MM/YYYY HH:mm:ss",
  "timezone": "Asia/Bangkok",
  "is_valid": true
}
```

## 🔧 **Development**

### Local Development
```bash
# Install dependencies
npm install

# Start development server (สำหรับ development เท่านั้น)
npm run dev

# หมายเหตุ: ใน production ต้องผ่าน Traefik เท่านั้น
```

### Docker Development
```bash
# Build และ deploy ผ่าน docker-compose (แนะนำ)
docker-compose up -d --build

# API จะพร้อมใช้งานที่ http://api.localhost
```

### 🔒 **Security Note**
- Production deployment ไม่เปิด direct port access
- ทุกการเข้าถึงต้องผ่าน Traefik reverse proxy
- ได้รับ security headers และ CORS protection

## 🌐 **Network Configuration**

API นี้ใช้ `proxy-network` ที่มีอยู่แล้วใน centralized-services:

```yaml
networks:
  proxy-network:
    external: true
    name: proxy-network
```

## 🏷️ **Traefik Labels**

```yaml
labels:
  # เปิดใช้ auto-discovery
  - "traefik.enable=true"
  - "traefik.docker.network=proxy-network"

  # Router configuration
  - "traefik.http.routers.example-api.rule=Host(\`api.localhost\`)"
  - "traefik.http.routers.example-api.entrypoints=web"
  - "traefik.http.services.example-api.loadbalancer.server.port=3000"

  # Middleware
  - "traefik.http.routers.example-api.middlewares=example-api-cors,example-api-security"
```

## 📊 **Health Checks**

API มี health check ทั้งใน Docker และ application level:

```bash
# Docker health check
docker-compose ps

# Application health check
curl http://api.localhost/health
```

## 🛑 **หยุดและลบ API**

```bash
# หยุด API
docker-compose down

# ลบ images
docker-compose down --rmi all

# ลบ volumes (ถ้ามี)
docker-compose down -v
```

## 🔍 **Monitoring & Logs**

```bash
# ดู logs
docker-compose logs -f example-api

# ดู logs แบบ real-time
docker logs -f example-datetime-api

# Monitor resource usage
docker stats example-datetime-api
```

## 🚀 **ทดสอบ Auto-Discovery**

1. **เริ่ม API**: `docker-compose up -d --build`
2. **ตรวจสอบ Traefik**: http://traefik.localhost/dashboard/
3. **ทดสอบ API**: http://api.localhost/health
4. **ดู Documentation**: http://api.localhost/docs

**API จะถูก Traefik auto-discover และพร้อมใช้งานทันที!** ⚡

## 🔒 **Security Features**
- ✅ **ไม่เปิด Direct Port Access** - บังคับให้ผ่าน Traefik เท่านั้น
- ✅ **Security Headers** - X-Frame-Options, X-Content-Type-Options
- ✅ **CORS Protection** - กำหนด allowed origins
- ✅ **Container Isolation** - อยู่ใน internal network
- ✅ **Health Checks** - ตรวจสอบสถานะอัตโนมัติ

## 🔗 **Links**
- **API Base**: http://api.localhost
- **Swagger Documentation**: http://api.localhost/docs
- **Traefik Dashboard**: http://traefik.localhost/dashboard/
- **Health Check**: http://api.localhost/health

> 🛡️ **ทุกการเข้าถึงต้องผ่าน Traefik Reverse Proxy เพื่อความปลอดภัย**