-- 20250819065021_add_map_versioning_columns.sql
BEGIN;
ALTER TABLE IF EXISTS learning_maps
	ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
	ADD COLUMN IF NOT EXISTS last_modified_by uuid NULL REFERENCES auth.users(id),
	ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS map_nodes
	ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
	ADD COLUMN IF NOT EXISTS last_modified_by uuid NULL REFERENCES auth.users(id),
	ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
COMMIT;