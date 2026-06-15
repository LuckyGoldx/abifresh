-- ============================================================================
-- SUPABASE SCHEMA CACHE FIX
-- Run this ONCE in Supabase SQL Editor to permanently fix schema cache issues
-- ============================================================================

-- STEP 1: Reload PostgREST schema cache immediately
-- This tells PostgREST to re-read ALL tables, columns, and relationships
NOTIFY pgrst, 'reload schema';

-- STEP 2: Create automatic schema cache reloading
-- This event trigger will automatically reload the schema cache
-- whenever you CREATE, ALTER, or DROP any table/column/function
-- So you'll NEVER have schema cache issues again!

-- Create the event trigger function
CREATE OR REPLACE FUNCTION pgrst_ddl_watch() RETURNS event_trigger AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA',
      'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE',
      'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE',
      'CREATE VIEW', 'ALTER VIEW',
      'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW',
      'CREATE FUNCTION', 'ALTER FUNCTION',
      'CREATE TRIGGER',
      'CREATE TYPE', 'ALTER TYPE',
      'CREATE RULE',
      'COMMENT'
    )
    AND cmd.schema_name IS DISTINCT FROM 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$ LANGUAGE plpgsql;

-- Create the DROP event trigger function
CREATE OR REPLACE FUNCTION pgrst_drop_watch() RETURNS event_trigger AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema',
      'table',
      'foreign table',
      'view',
      'materialized view',
      'function',
      'trigger',
      'type',
      'rule'
    )
    AND obj.is_temporary IS false
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (safe re-run)
DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch;
DROP EVENT TRIGGER IF EXISTS pgrst_drop_watch;

-- Create the event triggers
CREATE EVENT TRIGGER pgrst_ddl_watch
  ON ddl_command_end
  EXECUTE PROCEDURE pgrst_ddl_watch();

CREATE EVENT TRIGGER pgrst_drop_watch
  ON sql_drop
  EXECUTE PROCEDURE pgrst_drop_watch();

-- STEP 3: Verify all required tables exist
-- This will show you which tables are actually in your database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- STEP 4: Verify staff_sales has commission column
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'staff_sales'
ORDER BY ordinal_position;

-- STEP 5: Verify staff_expenses has correct columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'staff_expenses'
ORDER BY ordinal_position;
