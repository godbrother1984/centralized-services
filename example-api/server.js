// Example DateTime API Server
// File: example-api/server.js
// Version: 1.0.0
// Date: 2025-09-19

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const moment = require('moment-timezone');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Example DateTime API',
      version: '1.0.0',
      description: 'ตัวอย่าง API สำหรับ Traefik Auto-Discovery พร้อม Swagger Documentation',
      contact: {
        name: 'C.I.Group PCL.',
        email: 'support@cigroup.co.th'
      }
    },
    servers: [
      {
        url: 'http://api.localhost',
        description: 'API Server (ผ่าน Traefik Reverse Proxy)'
      }
    ],
    tags: [
      {
        name: 'DateTime',
        description: 'การจัดการวันที่และเวลา'
      },
      {
        name: 'Health',
        description: 'ตรวจสอบสถานะระบบ'
      }
    ]
  },
  apis: ['./server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'C.I.Group API Documentation'
}));

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: ตรวจสอบสถานะ API
 *     description: endpoint สำหรับตรวจสอบว่า API ทำงานปกติหรือไม่
 *     responses:
 *       200:
 *         description: API ทำงานปกติ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 message:
 *                   type: string
 *                   example: "API is running successfully"
 *                 timestamp:
 *                   type: string
 *                   example: "2025-09-19T10:30:00+07:00"
 *                 server:
 *                   type: string
 *                   example: "Example DateTime API v1.0.0"
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API is running successfully',
    timestamp: moment().tz('Asia/Bangkok').format(),
    server: 'Example DateTime API v1.0.0'
  });
});

/**
 * @swagger
 * /datetime:
 *   get:
 *     tags: [DateTime]
 *     summary: ข้อมูลวันที่และเวลาปัจจุบัน
 *     description: ดึงข้อมูลวันที่และเวลาปัจจุบันในรูปแบบต่างๆ
 *     responses:
 *       200:
 *         description: ข้อมูลวันที่และเวลาปัจจุบัน
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 current:
 *                   type: object
 *                   properties:
 *                     iso:
 *                       type: string
 *                       example: "2025-09-19T10:30:00+07:00"
 *                     timestamp:
 *                       type: number
 *                       example: 1726715400000
 *                     thai:
 *                       type: string
 *                       example: "19 กันยายน 2568 เวลา 10:30:00"
 *                     buddhist_year:
 *                       type: number
 *                       example: 2568
 *                 timezone:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Asia/Bangkok"
 *                     offset:
 *                       type: string
 *                       example: "+07:00"
 *                     abbr:
 *                       type: string
 *                       example: "ICT"
 *                 formats:
 *                   type: object
 *                   properties:
 *                     date_only:
 *                       type: string
 *                       example: "2025-09-19"
 *                     time_only:
 *                       type: string
 *                       example: "10:30:00"
 *                     datetime_readable:
 *                       type: string
 *                       example: "19 September 2025, 10:30 AM"
 *                     thai_date:
 *                       type: string
 *                       example: "19 กันยายน 2568"
 */
app.get('/datetime', (req, res) => {
  const now = moment().tz('Asia/Bangkok');

  // Thai months
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const buddhist_year = now.year() + 543;
  const thai_month = thaiMonths[now.month()];

  res.json({
    current: {
      iso: now.format(),
      timestamp: now.valueOf(),
      thai: `${now.date()} ${thai_month} ${buddhist_year} เวลา ${now.format('HH:mm:ss')}`,
      buddhist_year: buddhist_year
    },
    timezone: {
      name: 'Asia/Bangkok',
      offset: now.format('Z'),
      abbr: 'ICT'
    },
    formats: {
      date_only: now.format('YYYY-MM-DD'),
      time_only: now.format('HH:mm:ss'),
      datetime_readable: now.format('DD MMMM YYYY, HH:mm A'),
      thai_date: `${now.date()} ${thai_month} ${buddhist_year}`
    }
  });
});

/**
 * @swagger
 * /datetime/timezone/{timezone}:
 *   get:
 *     tags: [DateTime]
 *     summary: ข้อมูลเวลาตาม timezone ที่กำหนด
 *     description: ดึงข้อมูลวันที่และเวลาปัจจุบันตาม timezone ที่ระบุ
 *     parameters:
 *       - in: path
 *         name: timezone
 *         required: true
 *         schema:
 *           type: string
 *         description: timezone ที่ต้องการ (เช่น Asia/Bangkok, America/New_York)
 *         example: "Asia/Tokyo"
 *     responses:
 *       200:
 *         description: ข้อมูลเวลาตาม timezone ที่กำหนด
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timezone:
 *                   type: string
 *                   example: "Asia/Tokyo"
 *                 current_time:
 *                   type: string
 *                   example: "2025-09-19T12:30:00+09:00"
 *                 formatted:
 *                   type: string
 *                   example: "19 September 2025, 12:30 PM"
 *                 offset:
 *                   type: string
 *                   example: "+09:00"
 *       400:
 *         description: timezone ไม่ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid timezone"
 *                 message:
 *                   type: string
 *                   example: "Please provide a valid timezone (e.g., Asia/Bangkok)"
 */
app.get('/datetime/timezone/:timezone', (req, res) => {
  const { timezone } = req.params;

  try {
    const timeInZone = moment().tz(timezone);

    res.json({
      timezone: timezone,
      current_time: timeInZone.format(),
      formatted: timeInZone.format('DD MMMM YYYY, HH:mm A'),
      offset: timeInZone.format('Z'),
      utc_offset_hours: timeInZone.utcOffset() / 60
    });
  } catch (error) {
    res.status(400).json({
      error: 'Invalid timezone',
      message: 'Please provide a valid timezone (e.g., Asia/Bangkok, America/New_York)',
      available_examples: [
        'Asia/Bangkok',
        'Asia/Tokyo',
        'America/New_York',
        'Europe/London',
        'Australia/Sydney'
      ]
    });
  }
});

/**
 * @swagger
 * /datetime/format:
 *   post:
 *     tags: [DateTime]
 *     summary: จัดรูปแบบวันที่และเวลาตามที่กำหนด
 *     description: แปลงวันที่และเวลาเป็นรูปแบบที่ต้องการ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               datetime:
 *                 type: string
 *                 description: วันที่และเวลาที่ต้องการแปลง (ISO string หรือ timestamp)
 *                 example: "2025-09-19T10:30:00+07:00"
 *               format:
 *                 type: string
 *                 description: รูปแบบที่ต้องการ (moment.js format)
 *                 example: "DD/MM/YYYY HH:mm:ss"
 *               timezone:
 *                 type: string
 *                 description: timezone ที่ต้องการแสดงผล
 *                 example: "Asia/Bangkok"
 *     responses:
 *       200:
 *         description: ผลลัพธ์การจัดรูปแบบ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 input:
 *                   type: string
 *                   example: "2025-09-19T10:30:00+07:00"
 *                 output:
 *                   type: string
 *                   example: "19/09/2025 10:30:00"
 *                 format_used:
 *                   type: string
 *                   example: "DD/MM/YYYY HH:mm:ss"
 *                 timezone:
 *                   type: string
 *                   example: "Asia/Bangkok"
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 */
app.post('/datetime/format', (req, res) => {
  const { datetime, format = 'YYYY-MM-DD HH:mm:ss', timezone = 'Asia/Bangkok' } = req.body;

  if (!datetime) {
    return res.status(400).json({
      error: 'Missing datetime',
      message: 'Please provide datetime field'
    });
  }

  try {
    const parsedTime = moment(datetime).tz(timezone);

    if (!parsedTime.isValid()) {
      return res.status(400).json({
        error: 'Invalid datetime',
        message: 'Please provide a valid datetime string or timestamp'
      });
    }

    res.json({
      input: datetime,
      output: parsedTime.format(format),
      format_used: format,
      timezone: timezone,
      is_valid: parsedTime.isValid()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Format error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /:
 *   get:
 *     tags: [Health]
 *     summary: API Information
 *     description: ข้อมูลพื้นฐานของ API และลิงก์ไปยัง documentation
 *     responses:
 *       200:
 *         description: ข้อมูล API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "Example DateTime API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 description:
 *                   type: string
 *                   example: "ตัวอย่าง API สำหรับ Traefik Auto-Discovery"
 *                 documentation:
 *                   type: string
 *                   example: "/docs"
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["/health", "/datetime", "/datetime/timezone/:timezone"]
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Example DateTime API',
    version: '1.0.0',
    description: 'ตัวอย่าง API สำหรับ Traefik Auto-Discovery พร้อม Swagger Documentation',
    documentation: '/docs',
    endpoints: [
      'GET /',
      'GET /health',
      'GET /datetime',
      'GET /datetime/timezone/:timezone',
      'POST /datetime/format'
    ],
    links: {
      swagger_ui: '/docs',
      swagger_json: '/docs.json'
    },
    access: {
      api_url: 'http://api.localhost',
      note: 'All access must go through Traefik reverse proxy'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.originalUrl} not found`,
    available_endpoints: [
      '/',
      '/health',
      '/datetime',
      '/datetime/timezone/:timezone',
      '/docs'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong!'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Example DateTime API is running on port ${PORT}`);
  console.log(`🌐 API Access: http://api.localhost (ผ่าน Traefik เท่านั้น)`);
  console.log(`📖 API Documentation: http://api.localhost/docs`);
  console.log(`⚡ Health Check: http://api.localhost/health`);
  console.log(`🔒 Direct access ถูกปิดเพื่อความปลอดภัย`);
});

module.exports = app;