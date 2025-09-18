# Client Configuration Examples
**File**: C:\Project\centralized-services\examples\client-configurations.md
**Version**: 1.0.0
**Date**: 2025-09-18
**Time**: Current

## Keycloak Client Configuration

### 1. Web Application Client (React/Angular/Vue)

#### Client Settings
```json
{
  "clientId": "my-web-app",
  "name": "My Web Application",
  "description": "Frontend web application",
  "rootUrl": "http://localhost:3000",
  "adminUrl": "",
  "baseUrl": "/",
  "surrogateAuthRequired": false,
  "enabled": true,
  "alwaysDisplayInConsole": false,
  "clientAuthenticatorType": "client-secret",
  "secret": "generated-client-secret",
  "redirectUris": [
    "http://localhost:3000/*",
    "http://localhost:3000/auth/callback"
  ],
  "webOrigins": [
    "http://localhost:3000"
  ],
  "notBefore": 0,
  "bearerOnly": false,
  "consentRequired": false,
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": true,
  "serviceAccountsEnabled": false,
  "publicClient": false,
  "frontchannelLogout": false,
  "protocol": "openid-connect",
  "attributes": {
    "saml.assertion.signature": "false",
    "saml.force.post.binding": "false",
    "saml.multivalued.roles": "false",
    "saml.encrypt": "false",
    "post.logout.redirect.uris": "+",
    "oauth2.device.authorization.grant.enabled": "false",
    "backchannel.logout.revoke.offline.tokens": "false",
    "saml.server.signature": "false",
    "saml.server.signature.keyinfo.ext": "false",
    "exclude.session.state.from.auth.response": "false",
    "backchannel.logout.session.required": "true",
    "client_credentials.use_refresh_token": "false",
    "saml_force_name_id_format": "false",
    "saml.client.signature": "false",
    "tls.client.certificate.bound.access.tokens": "false",
    "saml.authnstatement": "false",
    "display.on.consent.screen": "false",
    "saml.onetimeuse.condition": "false"
  }
}
```

### 2. Backend API Client (Node.js/Python/.NET)

#### Client Settings
```json
{
  "clientId": "my-api-backend",
  "name": "My API Backend",
  "description": "Backend API server",
  "rootUrl": "http://localhost:8000",
  "adminUrl": "",
  "baseUrl": "/",
  "surrogateAuthRequired": false,
  "enabled": true,
  "alwaysDisplayInConsole": false,
  "clientAuthenticatorType": "client-secret",
  "secret": "api-backend-secret",
  "redirectUris": [
    "http://localhost:8000/auth/*"
  ],
  "webOrigins": [],
  "notBefore": 0,
  "bearerOnly": true,
  "consentRequired": false,
  "standardFlowEnabled": false,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  "serviceAccountsEnabled": true,
  "publicClient": false,
  "frontchannelLogout": false,
  "protocol": "openid-connect"
}
```

### 3. Mobile Application Client

#### Client Settings
```json
{
  "clientId": "my-mobile-app",
  "name": "My Mobile Application",
  "description": "iOS/Android mobile application",
  "rootUrl": "com.mycompany.myapp://",
  "adminUrl": "",
  "baseUrl": "",
  "surrogateAuthRequired": false,
  "enabled": true,
  "alwaysDisplayInConsole": false,
  "clientAuthenticatorType": "client-secret",
  "redirectUris": [
    "com.mycompany.myapp://oauth/callback"
  ],
  "webOrigins": [],
  "notBefore": 0,
  "bearerOnly": false,
  "consentRequired": false,
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  "serviceAccountsEnabled": false,
  "publicClient": true,
  "frontchannelLogout": false,
  "protocol": "openid-connect",
  "attributes": {
    "pkce.code.challenge.method": "S256"
  }
}
```

## Environment Variables Configuration

### Development Environment (.env.development)
```bash
# Keycloak Configuration
KEYCLOAK_URL=http://auth.localhost
KEYCLOAK_REALM=my-organization
KEYCLOAK_CLIENT_ID=my-web-app
KEYCLOAK_CLIENT_SECRET=your-client-secret

# Frontend Configuration
REACT_APP_KEYCLOAK_URL=http://auth.localhost
REACT_APP_KEYCLOAK_REALM=my-organization
REACT_APP_KEYCLOAK_CLIENT_ID=my-web-app

# Backend Configuration
NODE_ENV=development
SESSION_SECRET=dev-session-secret
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=15432
DB_NAME=my_project_db
DB_USER=my_project_user
DB_PASSWORD=my_project_password
```

### Production Environment (.env.production)
```bash
# Keycloak Configuration
KEYCLOAK_URL=https://auth.cigblusolutions.com
KEYCLOAK_REALM=production-realm
KEYCLOAK_CLIENT_ID=production-web-app
KEYCLOAK_CLIENT_SECRET=strong-production-secret

# Frontend Configuration
REACT_APP_KEYCLOAK_URL=https://auth.cigblusolutions.com
REACT_APP_KEYCLOAK_REALM=production-realm
REACT_APP_KEYCLOAK_CLIENT_ID=production-web-app

# Backend Configuration
NODE_ENV=production
SESSION_SECRET=strong-production-session-secret
FRONTEND_URL=https://app.cigblusolutions.com

# Database Configuration
DB_HOST=localhost
DB_PORT=15432
DB_NAME=production_db
DB_USER=production_user
DB_PASSWORD=strong-production-password

# SSL Configuration
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/private.key
```

## OAuth2/OIDC Flow Examples

### 1. Authorization Code Flow (Recommended)

#### Step 1: Redirect to Authorization Endpoint
```javascript
const authUrl = new URL(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid_connect/auth`);
authUrl.searchParams.append('client_id', CLIENT_ID);
authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('scope', 'openid profile email');
authUrl.searchParams.append('state', generateRandomState());
authUrl.searchParams.append('code_challenge', codeChallenge);
authUrl.searchParams.append('code_challenge_method', 'S256');

window.location.href = authUrl.toString();
```

#### Step 2: Handle Callback
```javascript
// ใน /auth/callback route
const urlParams = new URLSearchParams(window.location.search);
const authCode = urlParams.get('code');
const state = urlParams.get('state');

// Verify state parameter
if (state !== storedState) {
  throw new Error('Invalid state parameter');
}

// Exchange code for tokens
const tokenResponse = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid_connect/token`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET, // สำหรับ confidential clients
    code: authCode,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier // สำหรับ PKCE
  })
});

const tokens = await tokenResponse.json();
// tokens.access_token, tokens.refresh_token, tokens.id_token
```

### 2. Token Refresh Flow
```javascript
const refreshToken = async (refreshToken) => {
  const response = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid_connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken
    })
  });

  if (response.ok) {
    return await response.json();
  } else {
    throw new Error('Token refresh failed');
  }
};
```

### 3. Logout Flow
```javascript
const logout = async (refreshToken) => {
  // Revoke refresh token
  await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid_connect/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken
    })
  });

  // Clear local storage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');

  // Redirect to logout URL
  const logoutUrl = new URL(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid_connect/logout`);
  logoutUrl.searchParams.append('post_logout_redirect_uri', window.location.origin);

  window.location.href = logoutUrl.toString();
};
```

## Security Best Practices

### 1. PKCE (Proof Key for Code Exchange)
```javascript
// Generate code verifier and challenge
const generateCodeVerifier = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
};

const generateCodeChallenge = async (verifier) => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
};
```

### 2. State Parameter Validation
```javascript
const generateState = () => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
};

// Store in sessionStorage during redirect
sessionStorage.setItem('oauth_state', state);

// Verify on callback
const storedState = sessionStorage.getItem('oauth_state');
if (receivedState !== storedState) {
  throw new Error('Invalid state parameter');
}
```

### 3. Token Storage
```javascript
// Secure token storage
const storeTokens = (tokens) => {
  // Use httpOnly cookies for refresh tokens (backend)
  // Use memory/sessionStorage for access tokens (frontend)

  // Frontend (less secure but practical)
  sessionStorage.setItem('access_token', tokens.access_token);

  // Backend (more secure)
  // Store refresh token in httpOnly cookie
  res.cookie('refresh_token', tokens.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
};
```

### 4. API Request with Bearer Token
```javascript
const makeAuthenticatedRequest = async (url, options = {}) => {
  const accessToken = sessionStorage.getItem('access_token');

  if (!accessToken) {
    throw new Error('No access token available');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
};
```

## Common Implementation Patterns

### React Hook for Authentication
```javascript
import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (token) {
        const userInfo = await fetchUserInfo(token);
        setUser(userInfo);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    // Redirect to Keycloak
    redirectToKeycloak();
  };

  const logout = async () => {
    await logoutFromKeycloak();
    setUser(null);
    sessionStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```