-- Migration v2: re-run FK fix using pg_constraint (catches directus_files etc.)
-- The previous migration used information_schema which missed some internal tables.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            c.conname  AS constraint_name,
            t.relname  AS table_name,
            a.attname  AS column_name
        FROM pg_constraint c
        JOIN pg_class     t  ON c.conrelid  = t.oid
        JOIN pg_class     tf ON c.confrelid = tf.oid
        JOIN pg_attribute a  ON a.attrelid  = t.oid AND a.attnum = ANY(c.conkey)
        WHERE c.contype   = 'f'
          AND tf.relname  = 'directus_users'
          AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY t.relname, a.attname
    LOOP
        EXECUTE format(
            'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
            r.table_name, r.constraint_name
        );
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES directus_users(id) ON DELETE SET NULL',
            r.table_name, r.constraint_name, r.column_name
        );
        RAISE NOTICE 'Fixed: % (%) -> ON DELETE SET NULL', r.table_name, r.column_name;
    END LOOP;
END $$;
