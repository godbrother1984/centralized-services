# แก้ไขปัญหา CORS สำหรับ Backend API
-- File: centralized-services/CORS-BACKEND-SETUP.md
-- Version: 1.0.0
-- Date: 2025-09-18
-- Description: วิธีการแก้ไขปัญหา CORS สำหรับ backend APIs ที่ไม่ได้อยู่ใน Traefik network

## 🚨 **ปัญหาที่พบ**

```
Access to fetch at 'http://localhost:3003/api/setup/test-database'
from origin 'http://localhost:3004' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ **วิธีแก้ไข**

### 1. **Express.js Backend (Node.js)**

#### วิธีที่ 1: ใช้ cors middleware (แนะนำ)
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    'http://assetflow.localhost'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Auth-Token'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Your routes
app.get('/api/setup/test-database', (req, res) => {
  res.json({ success: true, message: 'Database connection successful' });
});

app.listen(3003, () => {
  console.log('Backend server running on port 3003');
});
```

#### วิธีที่ 2: Manual CORS headers
```javascript
const express = require('express');
const app = express();

// Manual CORS middleware
app.use((req, res, next) => {
  // Allow origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    'http://assetflow.localhost'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  // Allow methods
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');

  // Allow headers
  res.setHeader('Access-Control-Allow-Headers',
    'Origin,X-Requested-With,Content-Type,Accept,Authorization,X-API-Key,X-Auth-Token'
  );

  // Allow credentials
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Cache preflight
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Your routes
app.get('/api/setup/test-database', (req, res) => {
  res.json({ success: true, message: 'Database connection successful' });
});

app.listen(3003, () => {
  console.log('Backend server running on port 3003');
});
```

### 2. **FastAPI Backend (Python)**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "http://assetflow.localhost"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Authorization",
        "X-API-Key",
        "X-Auth-Token"
    ],
)

@app.get("/api/setup/test-database")
async def test_database():
    return {"success": True, "message": "Database connection successful"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3003)
```

### 3. **Spring Boot Backend (Java)**

```java
@RestController
@CrossOrigin(origins = {
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "http://assetflow.localhost"
}, allowCredentials = "true")
public class SetupController {

    @GetMapping("/api/setup/test-database")
    public ResponseEntity<Map<String, Object>> testDatabase() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Database connection successful");
        return ResponseEntity.ok(response);
    }
}

// หรือ Global Configuration
@Configuration
@EnableWebMvc
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "http://localhost:3002",
                    "http://localhost:3003",
                    "http://localhost:3004",
                    "http://localhost:3005",
                    "http://assetflow.localhost"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
```

### 4. **ASP.NET Core Backend (C#)**

```csharp
// Program.cs หรือ Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddCors(options =>
    {
        options.AddPolicy("AllowSpecificOrigins", builder =>
        {
            builder.WithOrigins(
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002",
                "http://localhost:3003",
                "http://localhost:3004",
                "http://localhost:3005",
                "http://assetflow.localhost"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .SetPreflightMaxAge(TimeSpan.FromDays(1));
        });
    });
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    app.UseCors("AllowSpecificOrigins");
    // ... other middleware
}

[ApiController]
[Route("api/setup")]
public class SetupController : ControllerBase
{
    [HttpGet("test-database")]
    public IActionResult TestDatabase()
    {
        return Ok(new { success = true, message = "Database connection successful" });
    }
}
```

## 🔧 **วิธีการทดสอบ**

### 1. ทดสอบ OPTIONS preflight request
```bash
curl -X OPTIONS \
  -H "Origin: http://localhost:3004" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v http://localhost:3003/api/setup/test-database
```

**คำตอบที่ต้องการ:**
```
< Access-Control-Allow-Origin: http://localhost:3004
< Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
< Access-Control-Allow-Headers: Origin,X-Requested-With,Content-Type,Accept,Authorization
< Access-Control-Allow-Credentials: true
< Access-Control-Max-Age: 86400
```

### 2. ทดสอบ GET request
```bash
curl -X GET \
  -H "Origin: http://localhost:3004" \
  -v http://localhost:3003/api/setup/test-database
```

**คำตอบที่ต้องการ:**
```
< Access-Control-Allow-Origin: http://localhost:3004
< Access-Control-Allow-Credentials: true
< Content-Type: application/json

{"success": true, "message": "Database connection successful"}
```

### 3. ทดสอบจาก Browser Console
```javascript
// ทดสอบใน browser console (เปิดจาก http://localhost:3004)
fetch('http://localhost:3003/api/setup/test-database', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include'
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

## 🚀 **วิธีการปรับใช้ในโครงการ**

### 1. เพิ่ม CORS package
```bash
# Node.js
npm install cors

# Python
pip install fastapi[all]

# Java (ใน pom.xml)
<!-- Spring Boot Web includes CORS support -->

# .NET Core
# CORS included by default
```

### 2. อัพเดต backend code
- เพิ่ม CORS middleware ตามตัวอย่างด้านบน
- ตรวจสอบว่า origins ครอบคลุมทุก ports ที่ต้องการ
- เปิดใช้งาน credentials หากจำเป็น

### 3. Restart backend service
```bash
# Node.js
npm restart
# หรือ
pm2 restart app

# Python
uvicorn main:app --reload --port 3003

# Java
./mvnw spring-boot:run

# .NET Core
dotnet run
```

## 🛡️ **Security Considerations**

### 1. Production Environment
```javascript
// สำหรับ production ควรจำกัด origins
const corsOptions = {
  origin: [
    'https://yourdomain.com',
    'https://app.yourdomain.com'
  ],
  credentials: true
};
```

### 2. Environment-based Configuration
```javascript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:3004'],
  credentials: true
};
```

### 3. API Key Authentication
```javascript
// เพิ่ม API key validation
app.use('/api', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
});
```

## 📞 **หากยังมีปัญหา**

1. **ตรวจสอบ Network tab** ใน browser DevTools
2. **ดู Console errors** ที่แสดงรายละเอียด CORS error
3. **ทดสอบด้วย curl** เพื่อดู response headers
4. **ตรวจสอบ backend logs** หา error messages
5. **ลอง disable CORS temporarily** เพื่อทดสอบว่า API ทำงานปกติ

```javascript
// Disable CORS temporarily (สำหรับ debugging เท่านั้น)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});
```

**หลังจากแก้ไข backend จะสามารถเรียก API จาก frontend ได้ปกติ!** ✅