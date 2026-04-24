-- Migration: fix all custom-table FK constraints pointing to directus_users
-- Changes restrict behavior to ON DELETE SET NULL so users can be deleted safely.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name
        FROM information_schema.table_constraints  tc
        JOIN information_schema.key_column_usage   kcu ON tc.constraint_name  = kcu.constraint_name
                                                       AND tc.table_schema     = kcu.table_schema
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        JOIN information_schema.table_constraints  tc2 ON rc.unique_constraint_name = tc2.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc2.table_name     = 'directus_users'
          AND tc.table_schema    = 'public'
        ORDER BY tc.table_name, kcu.column_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
            r.table_name, r.constraint_name
        );
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES directus_users(id) ON DELETE SET NULL',
            r.table_name, r.constraint_name, r.column_name
        );
        RAISE NOTICE 'Fixed: % (%) -> directus_users ON DELETE SET NULL', r.table_name, r.column_name;
    END LOOP;
END $$;
