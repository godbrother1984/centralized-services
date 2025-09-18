/**
 * Node.js Express Keycloak Authentication Example
 * File: C:\Project\centralized-services\examples\nodejs-auth-example.js
 * Version: 1.0.0
 * Date: 2025-09-18
 * Time: Current
 *
 * ตัวอย่างการใช้ OAuth2/OIDC redirect flow กับ Express.js backend
 */

const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Session store configuration
const memoryStore = new session.MemoryStore();

// Keycloak configuration
const keycloakConfig = {
  realm: 'my-organization',
  'auth-server-url': process.env.NODE_ENV === 'production'
    ? 'https://auth.cigblusolutions.com/'
    : 'http://auth.localhost/',
  'ssl-required': 'external',
  resource: 'my-web-app',
  'public-client': false, // สำหรับ confidential client
  credentials: {
    secret: process.env.KEYCLOAK_CLIENT_SECRET || 'your-client-secret'
  },
  'confidential-port': 0,
  'policy-enforcer': {}
};

// Initialize Keycloak
const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

// Middleware setup
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(keycloak.middleware({
  logout: '/logout',
  admin: '/admin'
}));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Centralized Services API',
    authenticated: req.kauth?.grant?.access_token ? true : false,
    timestamp: new Date().toISOString()
  });
});

// Login route - redirect to Keycloak
app.get('/auth/login', keycloak.protect(), (req, res) => {
  res.json({
    message: 'Login successful',
    user: req.kauth.grant.access_token.content,
    roles: req.kauth.grant.access_token.content.realm_access?.roles || []
  });
});

// Logout route
app.get('/auth/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// Protected route - requires authentication
app.get('/api/protected', keycloak.protect(), (req, res) => {
  const token = req.kauth.grant.access_token.content;

  res.json({
    message: 'This is a protected resource',
    user: {
      username: token.preferred_username,
      email: token.email,
      name: token.name,
      roles: token.realm_access?.roles || []
    },
    timestamp: new Date().toISOString()
  });
});

// Admin only route
app.get('/api/admin', keycloak.protect('realm:admin'), (req, res) => {
  res.json({
    message: 'Admin only resource',
    user: req.kauth.grant.access_token.content.preferred_username,
    timestamp: new Date().toISOString()
  });
});

// Role-based protection example
app.get('/api/manager', keycloak.protect((token, req) => {
  const roles = token.content.realm_access?.roles || [];
  return roles.includes('admin') || roles.includes('manager');
}), (req, res) => {
  res.json({
    message: 'Manager or Admin resource',
    user: req.kauth.grant.access_token.content.preferred_username,
    timestamp: new Date().toISOString()
  });
});

// Database operation with user context
app.get('/api/user-data', keycloak.protect(), async (req, res) => {
  try {
    const token = req.kauth.grant.access_token.content;
    const userId = token.sub;

    // ตัวอย่างการเชื่อมต่อฐานข้อมูล
    const { Pool } = require('pg');
    const pool = new Pool({
      host: 'localhost',
      port: 15432,
      database: 'my_project_db',
      user: 'my_project_user',
      password: 'my_project_password'
    });

    const result = await pool.query(
      'SELECT * FROM user_data WHERE user_id = $1',
      [userId]
    );

    res.json({
      message: 'User data retrieved successfully',
      data: result.rows,
      user: token.preferred_username
    });

    pool.end();
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Failed to retrieve user data',
      message: error.message
    });
  }
});

// Token verification middleware for API calls
app.use('/api/verify-token', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    // Verify token with Keycloak
    const response = await fetch(`${keycloakConfig['auth-server-url']}realms/${keycloakConfig.realm}/protocol/openid_connect/userinfo`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const userInfo = await response.json();
      res.json({
        valid: true,
        user: userInfo
      });
    } else {
      res.status(401).json({
        valid: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    res.status(500).json({
      valid: false,
      error: 'Token verification failed'
    });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Application error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔐 Keycloak URL: ${keycloakConfig['auth-server-url']}`);
  console.log(`🏠 Realm: ${keycloakConfig.realm}`);
  console.log(`📱 Client: ${keycloakConfig.resource}`);
});

module.exports = app;