-- Initial PostgreSQL setup
-- This file runs when the PostgreSQL container is first created.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Optional: Create additional schemas or roles here
-- CREATE SCHEMA IF NOT EXISTS app;
