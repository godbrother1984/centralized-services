/**
 * React Keycloak Authentication Example
 * File: C:\Project\centralized-services\examples\react-auth-example.js
 * Version: 1.0.0
 * Date: 2025-09-18
 * Time: Current
 *
 * ตัวอย่างการใช้ OAuth2/OIDC redirect flow กับ React application
 */

import React, { useEffect, useState } from 'react';
import Keycloak from 'keycloak-js';

// Keycloak configuration
const keycloakConfig = {
  url: process.env.NODE_ENV === 'production'
    ? 'https://auth.cigblusolutions.com/'
    : 'http://auth.localhost/',
  realm: 'my-organization',
  clientId: 'my-web-app'
};

// Initialize Keycloak instance
const keycloak = new Keycloak(keycloakConfig);

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Keycloak with redirect flow
    keycloak.init({
      onLoad: 'login-required', // หรือ 'check-sso' สำหรับ optional login
      checkLoginIframe: false, // ปิด iframe checking
      pkceMethod: 'S256', // ใช้ PKCE สำหรับความปลอดภัย
      redirectUri: window.location.origin + '/auth/callback',
      responseMode: 'query' // ใช้ query parameters
    }).then(authenticated => {
      setAuthenticated(authenticated);
      setLoading(false);

      if (authenticated) {
        // โหลดข้อมูล user profile
        keycloak.loadUserProfile().then(profile => {
          setUser(profile);
        });
      }
    }).catch(error => {
      console.error('Keycloak initialization failed:', error);
      setLoading(false);
    });

    // Token refresh
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).then(refreshed => {
        if (refreshed) {
          console.log('Token refreshed');
        } else {
          console.log('Token not refreshed, login required');
          keycloak.login();
        }
      }).catch(() => {
        console.log('Failed to refresh token');
        keycloak.login();
      });
    };
  }, []);

  const login = () => {
    keycloak.login({
      redirectUri: window.location.origin + '/auth/callback'
    });
  };

  const logout = () => {
    keycloak.logout({
      redirectUri: window.location.origin
    });
  };

  const getToken = () => {
    return keycloak.token;
  };

  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = await keycloak.updateToken(5);

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${keycloak.token}`,
        'Content-Type': 'application/json'
      }
    });
  };

  if (loading) {
    return <div>กำลังโหลด...</div>;
  }

  if (!authenticated) {
    return (
      <div>
        <h1>ระบบตรวจสอบสิทธิ์</h1>
        <p>กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
        <button onClick={login}>เข้าสู่ระบบ</button>
      </div>
    );
  }

  return (
    <div>
      <h1>ยินดีต้อนรับ, {user?.firstName} {user?.lastName}</h1>
      <p>อีเมล: {user?.email}</p>
      <p>Username: {user?.username}</p>

      <div>
        <h3>User Roles:</h3>
        <ul>
          {keycloak.realmAccess?.roles?.map(role => (
            <li key={role}>{role}</li>
          ))}
        </ul>
      </div>

      <button onClick={logout}>ออกจากระบบ</button>

      <div>
        <h3>Protected API Call Example:</h3>
        <button onClick={async () => {
          try {
            const response = await makeAuthenticatedRequest('/api/protected-endpoint');
            const data = await response.json();
            console.log('Protected data:', data);
          } catch (error) {
            console.error('API call failed:', error);
          }
        }}>
          เรียกใช้ Protected API
        </button>
      </div>
    </div>
  );
}

export default App;

// Protected Route Component
export const ProtectedRoute = ({ children, roles = [] }) => {
  const hasRole = (role) => {
    return keycloak.realmAccess?.roles?.includes(role);
  };

  const hasRequiredRole = roles.length === 0 || roles.some(role => hasRole(role));

  if (!keycloak.authenticated) {
    keycloak.login();
    return null;
  }

  if (!hasRequiredRole) {
    return <div>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</div>;
  }

  return children;
};

// Usage example:
// <ProtectedRoute roles={['admin', 'manager']}>
//   <AdminPanel />
// </ProtectedRoute>