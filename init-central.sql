-- Centralized PostgreSQL Database Initialization Script
-- File: centralized-services/init-centralized.sql
-- Version: 3.0.0
-- Date: 2025-09-17
-- Time: Created for centralized database for multiple projects

-- เพิ่ม extensions ที่มักใช้ในโครงการทั่วไป
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "hstore";

-- ตั้งค่า timezone สำหรับ Thailand
SET timezone = 'Asia/Bangkok';

-- เพิ่มการตั้งค่าเพื่อปรับปรุงประสิทธิภาพทั่วไป
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- ตั้งค่าสำหรับ concurrent connections
ALTER SYSTEM SET max_wal_size = '2GB';
ALTER SYSTEM SET min_wal_size = '80MB';

-- Reload configuration
SELECT pg_reload_conf();

-- สร้าง common functions ที่มักใช้
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- สร้าง common audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_row record;
    include_values boolean = false;
    log_diffs boolean = false;
    h_old hstore;
    h_new hstore;
    excluded_cols text[] = ARRAY[]::text[];
BEGIN
    IF TG_WHEN <> 'AFTER' THEN
        RAISE EXCEPTION 'audit.if_modified_func() may only run as an AFTER trigger';
    END IF;

    audit_row = ROW(
        nextval('audit_id_seq'),                -- audit_id
        TG_TABLE_SCHEMA::text,                  -- schema_name
        TG_TABLE_NAME::text,                    -- table_name
        TG_RELID,                               -- relid
        session_user::text,                     -- session_user_name
        current_timestamp,                      -- action_tstamp
        statement_timestamp(),                  -- stm_tstamp
        clock_timestamp(),                      -- action_tstamp_clock
        txid_current(),                         -- transaction_id
        current_setting('application_name'),    -- client_application
        inet_client_addr(),                     -- client_addr
        inet_client_port(),                     -- client_port
        current_query(),                        -- client_query
        TG_OP::text,                           -- action
        NULL, NULL,                            -- row_data, changed_fields
        'f'                                    -- statement_only
    );

    IF NOT TG_ARGV[0]::boolean IS DISTINCT FROM 'f'::boolean THEN
        audit_row.client_query = NULL;
    END IF;

    IF TG_ARGV[1] IS NOT NULL THEN
        excluded_cols = TG_ARGV[1]::text[];
    END IF;

    IF (TG_OP = 'UPDATE' AND TG_LEVEL = 'ROW') THEN
        audit_row.row_data = hstore(OLD.*) - excluded_cols;
        audit_row.changed_fields = (hstore(NEW.*) - audit_row.row_data) - excluded_cols;
        IF audit_row.changed_fields = hstore('') THEN
            -- All changed fields are ignored. Skip this update.
            RETURN NULL;
        END IF;
    ELSIF (TG_OP = 'DELETE' AND TG_LEVEL = 'ROW') THEN
        audit_row.row_data = hstore(OLD.*) - excluded_cols;
    ELSIF (TG_OP = 'INSERT' AND TG_LEVEL = 'ROW') THEN
        audit_row.row_data = hstore(NEW.*) - excluded_cols;
    ELSIF (TG_LEVEL = 'STATEMENT' AND TG_OP IN ('INSERT','UPDATE','DELETE','TRUNCATE')) THEN
        audit_row.statement_only = 't';
    ELSE
        RAISE EXCEPTION '[audit.if_modified_func] - Trigger func added as trigger for unhandled case: %, %',TG_OP, TG_LEVEL;
        RETURN NULL;
    END IF;

    -- ในที่นี้จะไม่ได้สร้าง audit table จริง แต่แสดงตัวอย่างเท่านั้น
    -- ถ้าต้องการใช้งาน audit ให้สร้าง audit table ขึ้นมา

    RETURN CASE TG_OP WHEN 'INSERT' THEN NEW WHEN 'UPDATE' THEN NEW ELSE OLD END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- สร้าง sequence สำหรับ audit
CREATE SEQUENCE IF NOT EXISTS audit_id_seq;

-- สร้าง database และ user สำหรับ n8n workflow automation
CREATE USER n8n_user WITH PASSWORD 'N8n_Secure_P@ssw0rd_2024!';
CREATE DATABASE n8n_db OWNER n8n_user;

-- ให้สิทธิ์การใช้งาน database
GRANT ALL PRIVILEGES ON DATABASE n8n_db TO n8n_user;
GRANT CREATE ON DATABASE n8n_db TO n8n_user;

-- เข้าใช้ n8n database เพื่อตั้งค่าเพิ่มเติม
\c n8n_db

-- ให้สิทธิ์ schema public
GRANT ALL ON SCHEMA public TO n8n_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO n8n_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO n8n_user;

-- ตั้งค่า default privileges สำหรับ tables และ sequences ที่จะสร้างใหม่
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO n8n_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO n8n_user;

-- สร้าง extensions ที่ n8n อาจต้องการ
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ตั้งค่า timezone
SET timezone = 'Asia/Bangkok';

-- กลับไปยัง postgres database เพื่อสร้าง user อื่นๆ (ถ้ามี)
\c postgres

-- Log การเริ่มต้น
DO $$
BEGIN
    RAISE NOTICE 'Centralized database initialization completed successfully';
    RAISE NOTICE 'Database: %', current_database();
    RAISE NOTICE 'User: %', current_user;
    RAISE NOTICE 'Timezone: %', current_setting('timezone');
    RAISE NOTICE 'Available Extensions: uuid-ossp, pgcrypto, citext, hstore';
    RAISE NOTICE 'Common functions created: update_updated_at_column, audit_trigger_function';
    RAISE NOTICE 'n8n database and user created successfully';
    RAISE NOTICE 'n8n_db: Database for n8n workflow automation';
    RAISE NOTICE 'n8n_user: User with full access to n8n_db';
END
$$;