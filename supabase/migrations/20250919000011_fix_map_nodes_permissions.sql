-- Fix map_nodes permissions - restore UPDATE and DELETE for authenticated users
-- The 20250915095735_remote_schema.sql migration revoked all permissions
-- Previous migrations only restored SELECT and INSERT permissions
-- This migration restores the missing UPDATE and DELETE permissions needed for map editing

-- Restore UPDATE permission for authenticated users to modify map nodes
GRANT UPDATE ON table "public"."map_nodes" TO "authenticated";

-- Restore DELETE permission for authenticated users to remove map nodes
GRANT DELETE ON table "public"."map_nodes" TO "authenticated";

-- Also need to restore permissions for related tables that nodes interact with
-- Node content table permissions
GRANT INSERT ON table "public"."node_content" TO "authenticated";
GRANT UPDATE ON table "public"."node_content" TO "authenticated";
GRANT DELETE ON table "public"."node_content" TO "authenticated";

-- Node paths table permissions (for connecting nodes)
GRANT INSERT ON table "public"."node_paths" TO "authenticated";
GRANT UPDATE ON table "public"."node_paths" TO "authenticated";
GRANT DELETE ON table "public"."node_paths" TO "authenticated";

-- Log this permission restoration
COMMENT ON TABLE "public"."map_nodes" IS 'Map node CRUD permissions restored on 2025-09-19 - users can now create/update/delete nodes based on RLS policies';