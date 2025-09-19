// Path: frontend/src/pages/Login.tsx
// Version: 2.1
// Date: 2025-09-19
// Time: 15:00

import React, { useState, useEffect } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/auth/LoadingSpinner';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const { login, isAuthenticated, loading, error } = useAuth();
  const location = useLocation();

  const from = (location.state as any)?.from || '/dashboard';

  useEffect(() => {
    if (error) {
      setLocalLoading(false);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    try {
      setLocalLoading(true);
      await login({ email, password, rememberMe });
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  // Show loading spinner during authentication process
  if (loading && !localLoading) {
    return <LoadingSpinner fullScreen message="กำลังตรวจสอบการเข้าสู่ระบบ..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">AssetFlow</h1>
          <p className="text-gray-600">ระบบจองทรัพย์สินสำหรับองค์กร</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              อีเมล
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@assetflow.com"
              className="input-field"
              required
              disabled={localLoading || loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              required
              disabled={localLoading || loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                disabled={localLoading || loading}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                จดจำการเข้าสู่ระบบ
              </label>
            </div>

            <Link
              to="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-500 font-medium"
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>

          <button
            type="submit"
            disabled={localLoading || loading || !email || !password}
            className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {localLoading || loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                กำลังเข้าสู่ระบบ...
              </div>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>
        </form>

        {/* Additional Options */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            ยังไม่มีบัญชี?{' '}
            <Link
              to="/register"
              className="text-primary-600 hover:text-primary-500 font-medium"
            >
              สมัครสมาชิก
            </Link>
          </p>
        </div>

        {/* Demo Info - Only show in development */}
        {import.meta.env.DEV && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>สำหรับทดสอบ:</strong> admin@assetflow.com / admin123<br />
              ระบบใช้ Keycloak Authentication ผ่าน Backend<br />
              Realm: {import.meta.env.VITE_KEYCLOAK_REALM || 'assetflow-realm'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;