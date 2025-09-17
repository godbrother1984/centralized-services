#!/bin/bash
# File: centralized-services/init-multiple-databases.sh
# Version: 1.0.0
# Date: 2025-09-15
# Time: Created for centralized services setup

set -e
set -u

function create_user_and_database() {
    local database=$1
    local user=$2
    local password=$3

    echo "Creating database '$database' and user '$user'..."

    # Create user if it doesn't exist
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        DO \$\$
        BEGIN
            CREATE ROLE $user LOGIN PASSWORD '$password';
            EXCEPTION WHEN duplicate_object THEN RAISE NOTICE '%, skipping', SQLERRM USING ERRCODE = SQLSTATE;
        END
        \$\$;
EOSQL

    # Create database if it doesn't exist
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        SELECT 'CREATE DATABASE $database OWNER $user'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$database')\gexec
EOSQL

    # Grant privileges
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$database" <<-EOSQL
        GRANT ALL PRIVILEGES ON DATABASE $database TO $user;
        GRANT ALL PRIVILEGES ON SCHEMA public TO $user;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $user;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $user;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $user;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $user;
EOSQL

    echo "Database '$database' and user '$user' created successfully!"
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"

    # Create Keycloak Database
    create_user_and_database "keycloak_db" "keycloak_user" "keycloak_password"

    echo "Multiple databases created successfully!"
fi