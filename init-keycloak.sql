-- Keycloak PostgreSQL Database Initialization Script
-- File: centralized-services/init-keycloak.sql
-- Version: 3.0.0
-- Date: 2025-09-17
-- Time: Updated for separate Keycloak database

-- เพิ่ม extensions ที่จำเป็นสำหรับ Keycloak
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ตั้งค่า timezone สำหรับ Thailand
SET timezone = 'Asia/Bangkok';

-- เพิ่มการตั้งค่าเพื่อปรับปรุงประสิทธิภาพของ Keycloak
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '128MB';
ALTER SYSTEM SET effective_cache_size = '512MB';
ALTER SYSTEM SET maintenance_work_mem = '32MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '8MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
SELECT pg_reload_conf();

-- สร้าง schema เพิ่มเติมถ้าจำเป็น
-- Keycloak จะสร้าง tables เองอัตโนมัติเมื่อเริ่มทำงาน

-- Log การเริ่มต้น
DO $$
BEGIN
    RAISE NOTICE 'Keycloak database initialization completed successfully';
    RAISE NOTICE 'Database: %', current_database();
    RAISE NOTICE 'User: %', current_user;
    RAISE NOTICE 'Timezone: %', current_setting('timezone');
END
$$;