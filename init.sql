-- Keycloak PostgreSQL Database Initialization Script
-- File: centralized-services/init.sql
-- Version: 2.0.0
-- Date: 2025-09-17
-- Time: Updated for Keycloak-only setup

-- สร้างฐานข้อมูลสำหรับ Keycloak
-- Database สำหรับ Keycloak ถูกสร้างไว้แล้วใน docker-compose environment

-- เพิ่ม extensions ที่จำเป็นสำหรับ Keycloak
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- สร้าง schema สำหรับ Keycloak (หากต้องการ)
-- Keycloak จะสร้าง tables เองอัตโนมัติเมื่อเริ่มทำงาน

-- ตั้งค่า timezone สำหรับ Thailand
SET timezone = 'Asia/Bangkok';

-- เพิ่มการตั้งค่าเพื่อปรับปรุงประสิทธิภาพของ Keycloak
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
SELECT pg_reload_conf();