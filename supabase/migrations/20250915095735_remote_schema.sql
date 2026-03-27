drop extension if exists "pg_net";

set check_function_bodies = off;

-- extensions.grant_pg_cron_access and extensions.grant_pg_net_access are owned
-- by supabase_admin on hosted Supabase. Skipped here to allow local db reset.

drop policy "Allow all operations with app-level permissions" on "public"."assignment_group_members";

drop policy "team_leaders_insert_team_maps" on "public"."classroom_team_maps";

drop policy "members_can_view_teams" on "public"."classroom_teams";

drop policy "members_can_view_team_memberships" on "public"."team_memberships";

revoke delete on table "public"."admin_activity_log" from "anon";

revoke insert on table "public"."admin_activity_log" from "anon";

revoke references on table "public"."admin_activity_log" from "anon";

revoke select on table "public"."admin_activity_log" from "anon";

revoke trigger on table "public"."admin_activity_log" from "anon";

revoke truncate on table "public"."admin_activity_log" from "anon";

revoke update on table "public"."admin_activity_log" from "anon";

revoke delete on table "public"."admin_activity_log" from "authenticated";

revoke insert on table "public"."admin_activity_log" from "authenticated";

revoke references on table "public"."admin_activity_log" from "authenticated";

revoke select on table "public"."admin_activity_log" from "authenticated";

revoke trigger on table "public"."admin_activity_log" from "authenticated";

revoke truncate on table "public"."admin_activity_log" from "authenticated";

revoke update on table "public"."admin_activity_log" from "authenticated";

revoke delete on table "public"."admin_activity_log" from "service_role";

revoke insert on table "public"."admin_activity_log" from "service_role";

revoke references on table "public"."admin_activity_log" from "service_role";

revoke select on table "public"."admin_activity_log" from "service_role";

revoke trigger on table "public"."admin_activity_log" from "service_role";

revoke truncate on table "public"."admin_activity_log" from "service_role";

revoke update on table "public"."admin_activity_log" from "service_role";

revoke delete on table "public"."assessment_submissions" from "anon";

revoke insert on table "public"."assessment_submissions" from "anon";

revoke references on table "public"."assessment_submissions" from "anon";

revoke select on table "public"."assessment_submissions" from "anon";

revoke trigger on table "public"."assessment_submissions" from "anon";

revoke truncate on table "public"."assessment_submissions" from "anon";

revoke update on table "public"."assessment_submissions" from "anon";

revoke delete on table "public"."assessment_submissions" from "authenticated";

revoke insert on table "public"."assessment_submissions" from "authenticated";

revoke references on table "public"."assessment_submissions" from "authenticated";

revoke select on table "public"."assessment_submissions" from "authenticated";

revoke trigger on table "public"."assessment_submissions" from "authenticated";

revoke truncate on table "public"."assessment_submissions" from "authenticated";

revoke update on table "public"."assessment_submissions" from "authenticated";

revoke delete on table "public"."assessment_submissions" from "service_role";

revoke insert on table "public"."assessment_submissions" from "service_role";

revoke references on table "public"."assessment_submissions" from "service_role";

revoke select on table "public"."assessment_submissions" from "service_role";

revoke trigger on table "public"."assessment_submissions" from "service_role";

revoke truncate on table "public"."assessment_submissions" from "service_role";

revoke update on table "public"."assessment_submissions" from "service_role";

revoke delete on table "public"."assignment_enrollments" from "anon";

revoke insert on table "public"."assignment_enrollments" from "anon";

revoke references on table "public"."assignment_enrollments" from "anon";

revoke select on table "public"."assignment_enrollments" from "anon";

revoke trigger on table "public"."assignment_enrollments" from "anon";

revoke truncate on table "public"."assignment_enrollments" from "anon";

revoke update on table "public"."assignment_enrollments" from "anon";

revoke delete on table "public"."assignment_enrollments" from "authenticated";

revoke insert on table "public"."assignment_enrollments" from "authenticated";

revoke references on table "public"."assignment_enrollments" from "authenticated";

revoke select on table "public"."assignment_enrollments" from "authenticated";

revoke trigger on table "public"."assignment_enrollments" from "authenticated";

revoke truncate on table "public"."assignment_enrollments" from "authenticated";

revoke update on table "public"."assignment_enrollments" from "authenticated";

revoke delete on table "public"."assignment_enrollments" from "service_role";

revoke insert on table "public"."assignment_enrollments" from "service_role";

revoke references on table "public"."assignment_enrollments" from "service_role";

revoke select on table "public"."assignment_enrollments" from "service_role";

revoke trigger on table "public"."assignment_enrollments" from "service_role";

revoke truncate on table "public"."assignment_enrollments" from "service_role";

revoke update on table "public"."assignment_enrollments" from "service_role";

revoke delete on table "public"."assignment_group_assignments" from "anon";

revoke insert on table "public"."assignment_group_assignments" from "anon";

revoke references on table "public"."assignment_group_assignments" from "anon";

revoke select on table "public"."assignment_group_assignments" from "anon";

revoke trigger on table "public"."assignment_group_assignments" from "anon";

revoke truncate on table "public"."assignment_group_assignments" from "anon";

revoke update on table "public"."assignment_group_assignments" from "anon";

revoke delete on table "public"."assignment_group_assignments" from "authenticated";

revoke insert on table "public"."assignment_group_assignments" from "authenticated";

revoke references on table "public"."assignment_group_assignments" from "authenticated";

revoke select on table "public"."assignment_group_assignments" from "authenticated";

revoke trigger on table "public"."assignment_group_assignments" from "authenticated";

revoke truncate on table "public"."assignment_group_assignments" from "authenticated";

revoke update on table "public"."assignment_group_assignments" from "authenticated";

revoke delete on table "public"."assignment_group_assignments" from "service_role";

revoke insert on table "public"."assignment_group_assignments" from "service_role";

revoke references on table "public"."assignment_group_assignments" from "service_role";

revoke select on table "public"."assignment_group_assignments" from "service_role";

revoke trigger on table "public"."assignment_group_assignments" from "service_role";

revoke truncate on table "public"."assignment_group_assignments" from "service_role";

revoke update on table "public"."assignment_group_assignments" from "service_role";

revoke delete on table "public"."assignment_group_members" from "anon";

revoke insert on table "public"."assignment_group_members" from "anon";

revoke references on table "public"."assignment_group_members" from "anon";

revoke select on table "public"."assignment_group_members" from "anon";

revoke trigger on table "public"."assignment_group_members" from "anon";

revoke truncate on table "public"."assignment_group_members" from "anon";

revoke update on table "public"."assignment_group_members" from "anon";

revoke delete on table "public"."assignment_group_members" from "authenticated";

revoke insert on table "public"."assignment_group_members" from "authenticated";

revoke references on table "public"."assignment_group_members" from "authenticated";

revoke select on table "public"."assignment_group_members" from "authenticated";

revoke trigger on table "public"."assignment_group_members" from "authenticated";

revoke truncate on table "public"."assignment_group_members" from "authenticated";

revoke update on table "public"."assignment_group_members" from "authenticated";

revoke delete on table "public"."assignment_group_members" from "service_role";

revoke insert on table "public"."assignment_group_members" from "service_role";

revoke references on table "public"."assignment_group_members" from "service_role";

revoke select on table "public"."assignment_group_members" from "service_role";

revoke trigger on table "public"."assignment_group_members" from "service_role";

revoke truncate on table "public"."assignment_group_members" from "service_role";

revoke update on table "public"."assignment_group_members" from "service_role";

revoke delete on table "public"."assignment_groups" from "anon";

revoke insert on table "public"."assignment_groups" from "anon";

revoke references on table "public"."assignment_groups" from "anon";

revoke select on table "public"."assignment_groups" from "anon";

revoke trigger on table "public"."assignment_groups" from "anon";

revoke truncate on table "public"."assignment_groups" from "anon";

revoke update on table "public"."assignment_groups" from "anon";

revoke delete on table "public"."assignment_groups" from "authenticated";

revoke insert on table "public"."assignment_groups" from "authenticated";

revoke references on table "public"."assignment_groups" from "authenticated";

revoke select on table "public"."assignment_groups" from "authenticated";

revoke trigger on table "public"."assignment_groups" from "authenticated";

revoke truncate on table "public"."assignment_groups" from "authenticated";

revoke update on table "public"."assignment_groups" from "authenticated";

revoke delete on table "public"."assignment_groups" from "service_role";

revoke insert on table "public"."assignment_groups" from "service_role";

revoke references on table "public"."assignment_groups" from "service_role";

revoke select on table "public"."assignment_groups" from "service_role";

revoke trigger on table "public"."assignment_groups" from "service_role";

revoke truncate on table "public"."assignment_groups" from "service_role";

revoke update on table "public"."assignment_groups" from "service_role";

revoke delete on table "public"."assignment_nodes" from "anon";

revoke insert on table "public"."assignment_nodes" from "anon";

revoke references on table "public"."assignment_nodes" from "anon";

revoke select on table "public"."assignment_nodes" from "anon";

revoke trigger on table "public"."assignment_nodes" from "anon";

revoke truncate on table "public"."assignment_nodes" from "anon";

revoke update on table "public"."assignment_nodes" from "anon";

revoke delete on table "public"."assignment_nodes" from "authenticated";

revoke insert on table "public"."assignment_nodes" from "authenticated";

revoke references on table "public"."assignment_nodes" from "authenticated";

revoke select on table "public"."assignment_nodes" from "authenticated";

revoke trigger on table "public"."assignment_nodes" from "authenticated";

revoke truncate on table "public"."assignment_nodes" from "authenticated";

revoke update on table "public"."assignment_nodes" from "authenticated";

revoke delete on table "public"."assignment_nodes" from "service_role";

revoke insert on table "public"."assignment_nodes" from "service_role";

revoke references on table "public"."assignment_nodes" from "service_role";

revoke select on table "public"."assignment_nodes" from "service_role";

revoke trigger on table "public"."assignment_nodes" from "service_role";

revoke truncate on table "public"."assignment_nodes" from "service_role";

revoke update on table "public"."assignment_nodes" from "service_role";

revoke delete on table "public"."branches" from "anon";

revoke insert on table "public"."branches" from "anon";

revoke references on table "public"."branches" from "anon";

revoke select on table "public"."branches" from "anon";

revoke trigger on table "public"."branches" from "anon";

revoke truncate on table "public"."branches" from "anon";

revoke update on table "public"."branches" from "anon";

revoke delete on table "public"."branches" from "authenticated";

revoke insert on table "public"."branches" from "authenticated";

revoke references on table "public"."branches" from "authenticated";

revoke select on table "public"."branches" from "authenticated";

revoke trigger on table "public"."branches" from "authenticated";

revoke truncate on table "public"."branches" from "authenticated";

revoke update on table "public"."branches" from "authenticated";

revoke delete on table "public"."branches" from "service_role";

revoke insert on table "public"."branches" from "service_role";

revoke references on table "public"."branches" from "service_role";

revoke select on table "public"."branches" from "service_role";

revoke trigger on table "public"."branches" from "service_role";

revoke truncate on table "public"."branches" from "service_role";

revoke update on table "public"."branches" from "service_role";

revoke delete on table "public"."chat_messages" from "anon";

revoke insert on table "public"."chat_messages" from "anon";

revoke references on table "public"."chat_messages" from "anon";

revoke select on table "public"."chat_messages" from "anon";

revoke trigger on table "public"."chat_messages" from "anon";

revoke truncate on table "public"."chat_messages" from "anon";

revoke update on table "public"."chat_messages" from "anon";

revoke delete on table "public"."chat_messages" from "authenticated";

revoke insert on table "public"."chat_messages" from "authenticated";

revoke references on table "public"."chat_messages" from "authenticated";

revoke select on table "public"."chat_messages" from "authenticated";

revoke trigger on table "public"."chat_messages" from "authenticated";

revoke truncate on table "public"."chat_messages" from "authenticated";

revoke update on table "public"."chat_messages" from "authenticated";

revoke delete on table "public"."chat_messages" from "service_role";

revoke insert on table "public"."chat_messages" from "service_role";

revoke references on table "public"."chat_messages" from "service_role";

revoke select on table "public"."chat_messages" from "service_role";

revoke trigger on table "public"."chat_messages" from "service_role";

revoke truncate on table "public"."chat_messages" from "service_role";

revoke update on table "public"."chat_messages" from "service_role";

revoke delete on table "public"."classroom_assignments" from "anon";

revoke insert on table "public"."classroom_assignments" from "anon";

revoke references on table "public"."classroom_assignments" from "anon";

revoke select on table "public"."classroom_assignments" from "anon";

revoke trigger on table "public"."classroom_assignments" from "anon";

revoke truncate on table "public"."classroom_assignments" from "anon";

revoke update on table "public"."classroom_assignments" from "anon";

revoke delete on table "public"."classroom_assignments" from "authenticated";

revoke insert on table "public"."classroom_assignments" from "authenticated";

revoke references on table "public"."classroom_assignments" from "authenticated";

revoke select on table "public"."classroom_assignments" from "authenticated";

revoke trigger on table "public"."classroom_assignments" from "authenticated";

revoke truncate on table "public"."classroom_assignments" from "authenticated";

revoke update on table "public"."classroom_assignments" from "authenticated";

revoke delete on table "public"."classroom_assignments" from "service_role";

revoke insert on table "public"."classroom_assignments" from "service_role";

revoke references on table "public"."classroom_assignments" from "service_role";

revoke select on table "public"."classroom_assignments" from "service_role";

revoke trigger on table "public"."classroom_assignments" from "service_role";

revoke truncate on table "public"."classroom_assignments" from "service_role";

revoke update on table "public"."classroom_assignments" from "service_role";

revoke delete on table "public"."classroom_maps" from "anon";

revoke insert on table "public"."classroom_maps" from "anon";

revoke references on table "public"."classroom_maps" from "anon";

revoke select on table "public"."classroom_maps" from "anon";

revoke trigger on table "public"."classroom_maps" from "anon";

revoke truncate on table "public"."classroom_maps" from "anon";

revoke update on table "public"."classroom_maps" from "anon";

revoke delete on table "public"."classroom_maps" from "authenticated";

revoke insert on table "public"."classroom_maps" from "authenticated";

revoke references on table "public"."classroom_maps" from "authenticated";

revoke select on table "public"."classroom_maps" from "authenticated";

revoke trigger on table "public"."classroom_maps" from "authenticated";

revoke truncate on table "public"."classroom_maps" from "authenticated";

revoke update on table "public"."classroom_maps" from "authenticated";

revoke delete on table "public"."classroom_maps" from "service_role";

revoke insert on table "public"."classroom_maps" from "service_role";

revoke references on table "public"."classroom_maps" from "service_role";

revoke select on table "public"."classroom_maps" from "service_role";

revoke trigger on table "public"."classroom_maps" from "service_role";

revoke truncate on table "public"."classroom_maps" from "service_role";

revoke update on table "public"."classroom_maps" from "service_role";

revoke delete on table "public"."classroom_memberships" from "anon";

revoke insert on table "public"."classroom_memberships" from "anon";

revoke references on table "public"."classroom_memberships" from "anon";

revoke select on table "public"."classroom_memberships" from "anon";

revoke trigger on table "public"."classroom_memberships" from "anon";

revoke truncate on table "public"."classroom_memberships" from "anon";

revoke update on table "public"."classroom_memberships" from "anon";

revoke delete on table "public"."classroom_memberships" from "authenticated";

revoke insert on table "public"."classroom_memberships" from "authenticated";

revoke references on table "public"."classroom_memberships" from "authenticated";

revoke select on table "public"."classroom_memberships" from "authenticated";

revoke trigger on table "public"."classroom_memberships" from "authenticated";

revoke truncate on table "public"."classroom_memberships" from "authenticated";

revoke update on table "public"."classroom_memberships" from "authenticated";

revoke delete on table "public"."classroom_memberships" from "service_role";

revoke insert on table "public"."classroom_memberships" from "service_role";

revoke references on table "public"."classroom_memberships" from "service_role";

revoke select on table "public"."classroom_memberships" from "service_role";

revoke trigger on table "public"."classroom_memberships" from "service_role";

revoke truncate on table "public"."classroom_memberships" from "service_role";

revoke update on table "public"."classroom_memberships" from "service_role";

revoke delete on table "public"."classroom_team_maps" from "anon";

revoke insert on table "public"."classroom_team_maps" from "anon";

revoke references on table "public"."classroom_team_maps" from "anon";

revoke select on table "public"."classroom_team_maps" from "anon";

revoke trigger on table "public"."classroom_team_maps" from "anon";

revoke truncate on table "public"."classroom_team_maps" from "anon";

revoke update on table "public"."classroom_team_maps" from "anon";

revoke delete on table "public"."classroom_team_maps" from "authenticated";

revoke insert on table "public"."classroom_team_maps" from "authenticated";

revoke references on table "public"."classroom_team_maps" from "authenticated";

revoke select on table "public"."classroom_team_maps" from "authenticated";

revoke trigger on table "public"."classroom_team_maps" from "authenticated";

revoke truncate on table "public"."classroom_team_maps" from "authenticated";

revoke update on table "public"."classroom_team_maps" from "authenticated";

revoke delete on table "public"."classroom_team_maps" from "service_role";

revoke insert on table "public"."classroom_team_maps" from "service_role";

revoke references on table "public"."classroom_team_maps" from "service_role";

revoke select on table "public"."classroom_team_maps" from "service_role";

revoke trigger on table "public"."classroom_team_maps" from "service_role";

revoke truncate on table "public"."classroom_team_maps" from "service_role";

revoke update on table "public"."classroom_team_maps" from "service_role";

revoke delete on table "public"."classroom_teams" from "anon";

revoke insert on table "public"."classroom_teams" from "anon";

revoke references on table "public"."classroom_teams" from "anon";

revoke select on table "public"."classroom_teams" from "anon";

revoke trigger on table "public"."classroom_teams" from "anon";

revoke truncate on table "public"."classroom_teams" from "anon";

revoke update on table "public"."classroom_teams" from "anon";

revoke delete on table "public"."classroom_teams" from "authenticated";

revoke insert on table "public"."classroom_teams" from "authenticated";

revoke references on table "public"."classroom_teams" from "authenticated";

revoke select on table "public"."classroom_teams" from "authenticated";

revoke trigger on table "public"."classroom_teams" from "authenticated";

revoke truncate on table "public"."classroom_teams" from "authenticated";

revoke update on table "public"."classroom_teams" from "authenticated";

revoke delete on table "public"."classroom_teams" from "service_role";

revoke insert on table "public"."classroom_teams" from "service_role";

revoke references on table "public"."classroom_teams" from "service_role";

revoke select on table "public"."classroom_teams" from "service_role";

revoke trigger on table "public"."classroom_teams" from "service_role";

revoke truncate on table "public"."classroom_teams" from "service_role";

revoke update on table "public"."classroom_teams" from "service_role";

revoke delete on table "public"."classrooms" from "anon";

revoke insert on table "public"."classrooms" from "anon";

revoke references on table "public"."classrooms" from "anon";

revoke select on table "public"."classrooms" from "anon";

revoke trigger on table "public"."classrooms" from "anon";

revoke truncate on table "public"."classrooms" from "anon";

revoke update on table "public"."classrooms" from "anon";

revoke delete on table "public"."classrooms" from "authenticated";

revoke insert on table "public"."classrooms" from "authenticated";

revoke references on table "public"."classrooms" from "authenticated";

revoke select on table "public"."classrooms" from "authenticated";

revoke trigger on table "public"."classrooms" from "authenticated";

revoke truncate on table "public"."classrooms" from "authenticated";

revoke update on table "public"."classrooms" from "authenticated";

revoke delete on table "public"."classrooms" from "service_role";

revoke insert on table "public"."classrooms" from "service_role";

revoke references on table "public"."classrooms" from "service_role";

revoke select on table "public"."classrooms" from "service_role";

revoke trigger on table "public"."classrooms" from "service_role";

revoke truncate on table "public"."classrooms" from "service_role";

revoke update on table "public"."classrooms" from "service_role";

revoke delete on table "public"."cohort_map_enrollments" from "anon";

revoke insert on table "public"."cohort_map_enrollments" from "anon";

revoke references on table "public"."cohort_map_enrollments" from "anon";

revoke select on table "public"."cohort_map_enrollments" from "anon";

revoke trigger on table "public"."cohort_map_enrollments" from "anon";

revoke truncate on table "public"."cohort_map_enrollments" from "anon";

revoke update on table "public"."cohort_map_enrollments" from "anon";

revoke delete on table "public"."cohort_map_enrollments" from "authenticated";

revoke insert on table "public"."cohort_map_enrollments" from "authenticated";

revoke references on table "public"."cohort_map_enrollments" from "authenticated";

revoke select on table "public"."cohort_map_enrollments" from "authenticated";

revoke trigger on table "public"."cohort_map_enrollments" from "authenticated";

revoke truncate on table "public"."cohort_map_enrollments" from "authenticated";

revoke update on table "public"."cohort_map_enrollments" from "authenticated";

revoke delete on table "public"."cohort_map_enrollments" from "service_role";

revoke insert on table "public"."cohort_map_enrollments" from "service_role";

revoke references on table "public"."cohort_map_enrollments" from "service_role";

revoke select on table "public"."cohort_map_enrollments" from "service_role";

revoke trigger on table "public"."cohort_map_enrollments" from "service_role";

revoke truncate on table "public"."cohort_map_enrollments" from "service_role";

revoke update on table "public"."cohort_map_enrollments" from "service_role";

revoke delete on table "public"."cohorts" from "anon";

revoke insert on table "public"."cohorts" from "anon";

revoke references on table "public"."cohorts" from "anon";

revoke select on table "public"."cohorts" from "anon";

revoke trigger on table "public"."cohorts" from "anon";

revoke truncate on table "public"."cohorts" from "anon";

revoke update on table "public"."cohorts" from "anon";

revoke delete on table "public"."cohorts" from "authenticated";

revoke insert on table "public"."cohorts" from "authenticated";

revoke references on table "public"."cohorts" from "authenticated";

revoke select on table "public"."cohorts" from "authenticated";

revoke trigger on table "public"."cohorts" from "authenticated";

revoke truncate on table "public"."cohorts" from "authenticated";

revoke update on table "public"."cohorts" from "authenticated";

revoke delete on table "public"."cohorts" from "service_role";

revoke insert on table "public"."cohorts" from "service_role";

revoke references on table "public"."cohorts" from "service_role";

revoke select on table "public"."cohorts" from "service_role";

revoke trigger on table "public"."cohorts" from "service_role";

revoke truncate on table "public"."cohorts" from "service_role";

revoke update on table "public"."cohorts" from "service_role";

revoke delete on table "public"."communities" from "anon";

revoke insert on table "public"."communities" from "anon";

revoke references on table "public"."communities" from "anon";

revoke select on table "public"."communities" from "anon";

revoke trigger on table "public"."communities" from "anon";

revoke truncate on table "public"."communities" from "anon";

revoke update on table "public"."communities" from "anon";

revoke delete on table "public"."communities" from "authenticated";

revoke insert on table "public"."communities" from "authenticated";

revoke references on table "public"."communities" from "authenticated";

revoke select on table "public"."communities" from "authenticated";

revoke trigger on table "public"."communities" from "authenticated";

revoke truncate on table "public"."communities" from "authenticated";

revoke update on table "public"."communities" from "authenticated";

revoke delete on table "public"."communities" from "service_role";

revoke insert on table "public"."communities" from "service_role";

revoke references on table "public"."communities" from "service_role";

revoke select on table "public"."communities" from "service_role";

revoke trigger on table "public"."communities" from "service_role";

revoke truncate on table "public"."communities" from "service_role";

revoke update on table "public"."communities" from "service_role";

revoke delete on table "public"."community_images" from "anon";

revoke insert on table "public"."community_images" from "anon";

revoke references on table "public"."community_images" from "anon";

revoke select on table "public"."community_images" from "anon";

revoke trigger on table "public"."community_images" from "anon";

revoke truncate on table "public"."community_images" from "anon";

revoke update on table "public"."community_images" from "anon";

revoke delete on table "public"."community_images" from "authenticated";

revoke insert on table "public"."community_images" from "authenticated";

revoke references on table "public"."community_images" from "authenticated";

revoke select on table "public"."community_images" from "authenticated";

revoke trigger on table "public"."community_images" from "authenticated";

revoke truncate on table "public"."community_images" from "authenticated";

revoke update on table "public"."community_images" from "authenticated";

revoke delete on table "public"."community_images" from "service_role";

revoke insert on table "public"."community_images" from "service_role";

revoke references on table "public"."community_images" from "service_role";

revoke select on table "public"."community_images" from "service_role";

revoke trigger on table "public"."community_images" from "service_role";

revoke truncate on table "public"."community_images" from "service_role";

revoke update on table "public"."community_images" from "service_role";

revoke delete on table "public"."community_mentors" from "anon";

revoke insert on table "public"."community_mentors" from "anon";

revoke references on table "public"."community_mentors" from "anon";

revoke select on table "public"."community_mentors" from "anon";

revoke trigger on table "public"."community_mentors" from "anon";

revoke truncate on table "public"."community_mentors" from "anon";

revoke update on table "public"."community_mentors" from "anon";

revoke delete on table "public"."community_mentors" from "authenticated";

revoke insert on table "public"."community_mentors" from "authenticated";

revoke references on table "public"."community_mentors" from "authenticated";

revoke select on table "public"."community_mentors" from "authenticated";

revoke trigger on table "public"."community_mentors" from "authenticated";

revoke truncate on table "public"."community_mentors" from "authenticated";

revoke update on table "public"."community_mentors" from "authenticated";

revoke delete on table "public"."community_mentors" from "service_role";

revoke insert on table "public"."community_mentors" from "service_role";

revoke references on table "public"."community_mentors" from "service_role";

revoke select on table "public"."community_mentors" from "service_role";

revoke trigger on table "public"."community_mentors" from "service_role";

revoke truncate on table "public"."community_mentors" from "service_role";

revoke update on table "public"."community_mentors" from "service_role";

revoke delete on table "public"."community_posts" from "anon";

revoke insert on table "public"."community_posts" from "anon";

revoke references on table "public"."community_posts" from "anon";

revoke select on table "public"."community_posts" from "anon";

revoke trigger on table "public"."community_posts" from "anon";

revoke truncate on table "public"."community_posts" from "anon";

revoke update on table "public"."community_posts" from "anon";

revoke delete on table "public"."community_posts" from "authenticated";

revoke insert on table "public"."community_posts" from "authenticated";

revoke references on table "public"."community_posts" from "authenticated";

revoke select on table "public"."community_posts" from "authenticated";

revoke trigger on table "public"."community_posts" from "authenticated";

revoke truncate on table "public"."community_posts" from "authenticated";

revoke update on table "public"."community_posts" from "authenticated";

revoke delete on table "public"."community_posts" from "service_role";

revoke insert on table "public"."community_posts" from "service_role";

revoke references on table "public"."community_posts" from "service_role";

revoke select on table "public"."community_posts" from "service_role";

revoke trigger on table "public"."community_posts" from "service_role";

revoke truncate on table "public"."community_posts" from "service_role";

revoke update on table "public"."community_posts" from "service_role";

revoke delete on table "public"."community_projects" from "anon";

revoke insert on table "public"."community_projects" from "anon";

revoke references on table "public"."community_projects" from "anon";

revoke select on table "public"."community_projects" from "anon";

revoke trigger on table "public"."community_projects" from "anon";

revoke truncate on table "public"."community_projects" from "anon";

revoke update on table "public"."community_projects" from "anon";

revoke delete on table "public"."community_projects" from "authenticated";

revoke insert on table "public"."community_projects" from "authenticated";

revoke references on table "public"."community_projects" from "authenticated";

revoke select on table "public"."community_projects" from "authenticated";

revoke trigger on table "public"."community_projects" from "authenticated";

revoke truncate on table "public"."community_projects" from "authenticated";

revoke update on table "public"."community_projects" from "authenticated";

revoke delete on table "public"."community_projects" from "service_role";

revoke insert on table "public"."community_projects" from "service_role";

revoke references on table "public"."community_projects" from "service_role";

revoke select on table "public"."community_projects" from "service_role";

revoke trigger on table "public"."community_projects" from "service_role";

revoke truncate on table "public"."community_projects" from "service_role";

revoke update on table "public"."community_projects" from "service_role";

revoke delete on table "public"."connections" from "anon";

revoke insert on table "public"."connections" from "anon";

revoke references on table "public"."connections" from "anon";

revoke select on table "public"."connections" from "anon";

revoke trigger on table "public"."connections" from "anon";

revoke truncate on table "public"."connections" from "anon";

revoke update on table "public"."connections" from "anon";

revoke delete on table "public"."connections" from "authenticated";

revoke insert on table "public"."connections" from "authenticated";

revoke references on table "public"."connections" from "authenticated";

revoke select on table "public"."connections" from "authenticated";

revoke trigger on table "public"."connections" from "authenticated";

revoke truncate on table "public"."connections" from "authenticated";

revoke update on table "public"."connections" from "authenticated";

revoke delete on table "public"."connections" from "service_role";

revoke insert on table "public"."connections" from "service_role";

revoke references on table "public"."connections" from "service_role";

revoke select on table "public"."connections" from "service_role";

revoke trigger on table "public"."connections" from "service_role";

revoke truncate on table "public"."connections" from "service_role";

revoke update on table "public"."connections" from "service_role";

revoke delete on table "public"."emotions" from "anon";

revoke insert on table "public"."emotions" from "anon";

revoke references on table "public"."emotions" from "anon";

revoke select on table "public"."emotions" from "anon";

revoke trigger on table "public"."emotions" from "anon";

revoke truncate on table "public"."emotions" from "anon";

revoke update on table "public"."emotions" from "anon";

revoke delete on table "public"."emotions" from "authenticated";

revoke insert on table "public"."emotions" from "authenticated";

revoke references on table "public"."emotions" from "authenticated";

revoke select on table "public"."emotions" from "authenticated";

revoke trigger on table "public"."emotions" from "authenticated";

revoke truncate on table "public"."emotions" from "authenticated";

revoke update on table "public"."emotions" from "authenticated";

revoke delete on table "public"."emotions" from "service_role";

revoke insert on table "public"."emotions" from "service_role";

revoke references on table "public"."emotions" from "service_role";

revoke select on table "public"."emotions" from "service_role";

revoke trigger on table "public"."emotions" from "service_role";

revoke truncate on table "public"."emotions" from "service_role";

revoke update on table "public"."emotions" from "service_role";

revoke delete on table "public"."engagement" from "anon";

revoke insert on table "public"."engagement" from "anon";

revoke references on table "public"."engagement" from "anon";

revoke select on table "public"."engagement" from "anon";

revoke trigger on table "public"."engagement" from "anon";

revoke truncate on table "public"."engagement" from "anon";

revoke update on table "public"."engagement" from "anon";

revoke delete on table "public"."engagement" from "authenticated";

revoke insert on table "public"."engagement" from "authenticated";

revoke references on table "public"."engagement" from "authenticated";

revoke select on table "public"."engagement" from "authenticated";

revoke trigger on table "public"."engagement" from "authenticated";

revoke truncate on table "public"."engagement" from "authenticated";

revoke update on table "public"."engagement" from "authenticated";

revoke delete on table "public"."engagement" from "service_role";

revoke insert on table "public"."engagement" from "service_role";

revoke references on table "public"."engagement" from "service_role";

revoke select on table "public"."engagement" from "service_role";

revoke trigger on table "public"."engagement" from "service_role";

revoke truncate on table "public"."engagement" from "service_role";

revoke update on table "public"."engagement" from "service_role";

revoke delete on table "public"."impacts" from "anon";

revoke insert on table "public"."impacts" from "anon";

revoke references on table "public"."impacts" from "anon";

revoke select on table "public"."impacts" from "anon";

revoke trigger on table "public"."impacts" from "anon";

revoke truncate on table "public"."impacts" from "anon";

revoke update on table "public"."impacts" from "anon";

revoke delete on table "public"."impacts" from "authenticated";

revoke insert on table "public"."impacts" from "authenticated";

revoke references on table "public"."impacts" from "authenticated";

revoke select on table "public"."impacts" from "authenticated";

revoke trigger on table "public"."impacts" from "authenticated";

revoke truncate on table "public"."impacts" from "authenticated";

revoke update on table "public"."impacts" from "authenticated";

revoke delete on table "public"."impacts" from "service_role";

revoke insert on table "public"."impacts" from "service_role";

revoke references on table "public"."impacts" from "service_role";

revoke select on table "public"."impacts" from "service_role";

revoke trigger on table "public"."impacts" from "service_role";

revoke truncate on table "public"."impacts" from "service_role";

revoke update on table "public"."impacts" from "service_role";

revoke delete on table "public"."influences" from "anon";

revoke insert on table "public"."influences" from "anon";

revoke references on table "public"."influences" from "anon";

revoke select on table "public"."influences" from "anon";

revoke trigger on table "public"."influences" from "anon";

revoke truncate on table "public"."influences" from "anon";

revoke update on table "public"."influences" from "anon";

revoke delete on table "public"."influences" from "authenticated";

revoke insert on table "public"."influences" from "authenticated";

revoke references on table "public"."influences" from "authenticated";

revoke select on table "public"."influences" from "authenticated";

revoke trigger on table "public"."influences" from "authenticated";

revoke truncate on table "public"."influences" from "authenticated";

revoke update on table "public"."influences" from "authenticated";

revoke delete on table "public"."influences" from "service_role";

revoke insert on table "public"."influences" from "service_role";

revoke references on table "public"."influences" from "service_role";

revoke select on table "public"."influences" from "service_role";

revoke trigger on table "public"."influences" from "service_role";

revoke truncate on table "public"."influences" from "service_role";

revoke update on table "public"."influences" from "service_role";

revoke delete on table "public"."insights" from "anon";

revoke insert on table "public"."insights" from "anon";

revoke references on table "public"."insights" from "anon";

revoke select on table "public"."insights" from "anon";

revoke trigger on table "public"."insights" from "anon";

revoke truncate on table "public"."insights" from "anon";

revoke update on table "public"."insights" from "anon";

revoke delete on table "public"."insights" from "authenticated";

revoke insert on table "public"."insights" from "authenticated";

revoke references on table "public"."insights" from "authenticated";

revoke select on table "public"."insights" from "authenticated";

revoke trigger on table "public"."insights" from "authenticated";

revoke truncate on table "public"."insights" from "authenticated";

revoke update on table "public"."insights" from "authenticated";

revoke delete on table "public"."insights" from "service_role";

revoke insert on table "public"."insights" from "service_role";

revoke references on table "public"."insights" from "service_role";

revoke select on table "public"."insights" from "service_role";

revoke trigger on table "public"."insights" from "service_role";

revoke truncate on table "public"."insights" from "service_role";

revoke update on table "public"."insights" from "service_role";

revoke delete on table "public"."interests" from "anon";

revoke insert on table "public"."interests" from "anon";

revoke references on table "public"."interests" from "anon";

revoke select on table "public"."interests" from "anon";

revoke trigger on table "public"."interests" from "anon";

revoke truncate on table "public"."interests" from "anon";

revoke update on table "public"."interests" from "anon";

revoke delete on table "public"."interests" from "authenticated";

revoke insert on table "public"."interests" from "authenticated";

revoke references on table "public"."interests" from "authenticated";

revoke select on table "public"."interests" from "authenticated";

revoke trigger on table "public"."interests" from "authenticated";

revoke truncate on table "public"."interests" from "authenticated";

revoke update on table "public"."interests" from "authenticated";

revoke delete on table "public"."interests" from "service_role";

revoke insert on table "public"."interests" from "service_role";

revoke references on table "public"."interests" from "service_role";

revoke select on table "public"."interests" from "service_role";

revoke trigger on table "public"."interests" from "service_role";

revoke truncate on table "public"."interests" from "service_role";

revoke update on table "public"."interests" from "service_role";

revoke delete on table "public"."learning_maps" from "anon";

revoke insert on table "public"."learning_maps" from "anon";

revoke references on table "public"."learning_maps" from "anon";

revoke select on table "public"."learning_maps" from "anon";

revoke trigger on table "public"."learning_maps" from "anon";

revoke truncate on table "public"."learning_maps" from "anon";

revoke update on table "public"."learning_maps" from "anon";

revoke delete on table "public"."learning_maps" from "authenticated";

revoke insert on table "public"."learning_maps" from "authenticated";

revoke references on table "public"."learning_maps" from "authenticated";

revoke select on table "public"."learning_maps" from "authenticated";

revoke trigger on table "public"."learning_maps" from "authenticated";

revoke truncate on table "public"."learning_maps" from "authenticated";

revoke update on table "public"."learning_maps" from "authenticated";

revoke delete on table "public"."learning_maps" from "service_role";

revoke insert on table "public"."learning_maps" from "service_role";

revoke references on table "public"."learning_maps" from "service_role";

revoke select on table "public"."learning_maps" from "service_role";

revoke trigger on table "public"."learning_maps" from "service_role";

revoke truncate on table "public"."learning_maps" from "service_role";

revoke update on table "public"."learning_maps" from "service_role";

revoke delete on table "public"."learning_paths" from "anon";

revoke insert on table "public"."learning_paths" from "anon";

revoke references on table "public"."learning_paths" from "anon";

revoke select on table "public"."learning_paths" from "anon";

revoke trigger on table "public"."learning_paths" from "anon";

revoke truncate on table "public"."learning_paths" from "anon";

revoke update on table "public"."learning_paths" from "anon";

revoke delete on table "public"."learning_paths" from "authenticated";

revoke insert on table "public"."learning_paths" from "authenticated";

revoke references on table "public"."learning_paths" from "authenticated";

revoke select on table "public"."learning_paths" from "authenticated";

revoke trigger on table "public"."learning_paths" from "authenticated";

revoke truncate on table "public"."learning_paths" from "authenticated";

revoke update on table "public"."learning_paths" from "authenticated";

revoke delete on table "public"."learning_paths" from "service_role";

revoke insert on table "public"."learning_paths" from "service_role";

revoke references on table "public"."learning_paths" from "service_role";

revoke select on table "public"."learning_paths" from "service_role";

revoke trigger on table "public"."learning_paths" from "service_role";

revoke truncate on table "public"."learning_paths" from "service_role";

revoke update on table "public"."learning_paths" from "service_role";

revoke delete on table "public"."map_nodes" from "anon";

revoke insert on table "public"."map_nodes" from "anon";

revoke references on table "public"."map_nodes" from "anon";

revoke select on table "public"."map_nodes" from "anon";

revoke trigger on table "public"."map_nodes" from "anon";

revoke truncate on table "public"."map_nodes" from "anon";

revoke update on table "public"."map_nodes" from "anon";

revoke delete on table "public"."map_nodes" from "authenticated";

revoke insert on table "public"."map_nodes" from "authenticated";

revoke references on table "public"."map_nodes" from "authenticated";

revoke select on table "public"."map_nodes" from "authenticated";

revoke trigger on table "public"."map_nodes" from "authenticated";

revoke truncate on table "public"."map_nodes" from "authenticated";

revoke update on table "public"."map_nodes" from "authenticated";

revoke delete on table "public"."map_nodes" from "service_role";

revoke insert on table "public"."map_nodes" from "service_role";

revoke references on table "public"."map_nodes" from "service_role";

revoke select on table "public"."map_nodes" from "service_role";

revoke trigger on table "public"."map_nodes" from "service_role";

revoke truncate on table "public"."map_nodes" from "service_role";

revoke update on table "public"."map_nodes" from "service_role";

revoke delete on table "public"."milestones" from "anon";

revoke insert on table "public"."milestones" from "anon";

revoke references on table "public"."milestones" from "anon";

revoke select on table "public"."milestones" from "anon";

revoke trigger on table "public"."milestones" from "anon";

revoke truncate on table "public"."milestones" from "anon";

revoke update on table "public"."milestones" from "anon";

revoke delete on table "public"."milestones" from "authenticated";

revoke insert on table "public"."milestones" from "authenticated";

revoke references on table "public"."milestones" from "authenticated";

revoke select on table "public"."milestones" from "authenticated";

revoke trigger on table "public"."milestones" from "authenticated";

revoke truncate on table "public"."milestones" from "authenticated";

revoke update on table "public"."milestones" from "authenticated";

revoke delete on table "public"."milestones" from "service_role";

revoke insert on table "public"."milestones" from "service_role";

revoke references on table "public"."milestones" from "service_role";

revoke select on table "public"."milestones" from "service_role";

revoke trigger on table "public"."milestones" from "service_role";

revoke truncate on table "public"."milestones" from "service_role";

revoke update on table "public"."milestones" from "service_role";

revoke delete on table "public"."monthly_insights" from "anon";

revoke insert on table "public"."monthly_insights" from "anon";

revoke references on table "public"."monthly_insights" from "anon";

revoke select on table "public"."monthly_insights" from "anon";

revoke trigger on table "public"."monthly_insights" from "anon";

revoke truncate on table "public"."monthly_insights" from "anon";

revoke update on table "public"."monthly_insights" from "anon";

revoke delete on table "public"."monthly_insights" from "authenticated";

revoke insert on table "public"."monthly_insights" from "authenticated";

revoke references on table "public"."monthly_insights" from "authenticated";

revoke select on table "public"."monthly_insights" from "authenticated";

revoke trigger on table "public"."monthly_insights" from "authenticated";

revoke truncate on table "public"."monthly_insights" from "authenticated";

revoke update on table "public"."monthly_insights" from "authenticated";

revoke delete on table "public"."monthly_insights" from "service_role";

revoke insert on table "public"."monthly_insights" from "service_role";

revoke references on table "public"."monthly_insights" from "service_role";

revoke select on table "public"."monthly_insights" from "service_role";

revoke trigger on table "public"."monthly_insights" from "service_role";

revoke truncate on table "public"."monthly_insights" from "service_role";

revoke update on table "public"."monthly_insights" from "service_role";

revoke delete on table "public"."node_assessments" from "anon";

revoke insert on table "public"."node_assessments" from "anon";

revoke references on table "public"."node_assessments" from "anon";

revoke select on table "public"."node_assessments" from "anon";

revoke trigger on table "public"."node_assessments" from "anon";

revoke truncate on table "public"."node_assessments" from "anon";

revoke update on table "public"."node_assessments" from "anon";

revoke delete on table "public"."node_assessments" from "authenticated";

revoke insert on table "public"."node_assessments" from "authenticated";

revoke references on table "public"."node_assessments" from "authenticated";

revoke select on table "public"."node_assessments" from "authenticated";

revoke trigger on table "public"."node_assessments" from "authenticated";

revoke truncate on table "public"."node_assessments" from "authenticated";

revoke update on table "public"."node_assessments" from "authenticated";

revoke delete on table "public"."node_assessments" from "service_role";

revoke insert on table "public"."node_assessments" from "service_role";

revoke references on table "public"."node_assessments" from "service_role";

revoke select on table "public"."node_assessments" from "service_role";

revoke trigger on table "public"."node_assessments" from "service_role";

revoke truncate on table "public"."node_assessments" from "service_role";

revoke update on table "public"."node_assessments" from "service_role";

revoke delete on table "public"."node_content" from "anon";

revoke insert on table "public"."node_content" from "anon";

revoke references on table "public"."node_content" from "anon";

revoke select on table "public"."node_content" from "anon";

revoke trigger on table "public"."node_content" from "anon";

revoke truncate on table "public"."node_content" from "anon";

revoke update on table "public"."node_content" from "anon";

revoke delete on table "public"."node_content" from "authenticated";

revoke insert on table "public"."node_content" from "authenticated";

revoke references on table "public"."node_content" from "authenticated";

revoke select on table "public"."node_content" from "authenticated";

revoke trigger on table "public"."node_content" from "authenticated";

revoke truncate on table "public"."node_content" from "authenticated";

revoke update on table "public"."node_content" from "authenticated";

revoke delete on table "public"."node_content" from "service_role";

revoke insert on table "public"."node_content" from "service_role";

revoke references on table "public"."node_content" from "service_role";

revoke select on table "public"."node_content" from "service_role";

revoke trigger on table "public"."node_content" from "service_role";

revoke truncate on table "public"."node_content" from "service_role";

revoke update on table "public"."node_content" from "service_role";

revoke delete on table "public"."node_leaderboard" from "anon";

revoke insert on table "public"."node_leaderboard" from "anon";

revoke references on table "public"."node_leaderboard" from "anon";

revoke select on table "public"."node_leaderboard" from "anon";

revoke trigger on table "public"."node_leaderboard" from "anon";

revoke truncate on table "public"."node_leaderboard" from "anon";

revoke update on table "public"."node_leaderboard" from "anon";

revoke delete on table "public"."node_leaderboard" from "authenticated";

revoke insert on table "public"."node_leaderboard" from "authenticated";

revoke references on table "public"."node_leaderboard" from "authenticated";

revoke select on table "public"."node_leaderboard" from "authenticated";

revoke trigger on table "public"."node_leaderboard" from "authenticated";

revoke truncate on table "public"."node_leaderboard" from "authenticated";

revoke update on table "public"."node_leaderboard" from "authenticated";

revoke delete on table "public"."node_leaderboard" from "service_role";

revoke insert on table "public"."node_leaderboard" from "service_role";

revoke references on table "public"."node_leaderboard" from "service_role";

revoke select on table "public"."node_leaderboard" from "service_role";

revoke trigger on table "public"."node_leaderboard" from "service_role";

revoke truncate on table "public"."node_leaderboard" from "service_role";

revoke update on table "public"."node_leaderboard" from "service_role";

revoke delete on table "public"."node_paths" from "anon";

revoke insert on table "public"."node_paths" from "anon";

revoke references on table "public"."node_paths" from "anon";

revoke select on table "public"."node_paths" from "anon";

revoke trigger on table "public"."node_paths" from "anon";

revoke truncate on table "public"."node_paths" from "anon";

revoke update on table "public"."node_paths" from "anon";

revoke delete on table "public"."node_paths" from "authenticated";

revoke insert on table "public"."node_paths" from "authenticated";

revoke references on table "public"."node_paths" from "authenticated";

revoke select on table "public"."node_paths" from "authenticated";

revoke trigger on table "public"."node_paths" from "authenticated";

revoke truncate on table "public"."node_paths" from "authenticated";

revoke update on table "public"."node_paths" from "authenticated";

revoke delete on table "public"."node_paths" from "service_role";

revoke insert on table "public"."node_paths" from "service_role";

revoke references on table "public"."node_paths" from "service_role";

revoke select on table "public"."node_paths" from "service_role";

revoke trigger on table "public"."node_paths" from "service_role";

revoke truncate on table "public"."node_paths" from "service_role";

revoke update on table "public"."node_paths" from "service_role";

revoke delete on table "public"."passion_trees" from "anon";

revoke insert on table "public"."passion_trees" from "anon";

revoke references on table "public"."passion_trees" from "anon";

revoke select on table "public"."passion_trees" from "anon";

revoke trigger on table "public"."passion_trees" from "anon";

revoke truncate on table "public"."passion_trees" from "anon";

revoke update on table "public"."passion_trees" from "anon";

revoke delete on table "public"."passion_trees" from "authenticated";

revoke insert on table "public"."passion_trees" from "authenticated";

revoke references on table "public"."passion_trees" from "authenticated";

revoke select on table "public"."passion_trees" from "authenticated";

revoke trigger on table "public"."passion_trees" from "authenticated";

revoke truncate on table "public"."passion_trees" from "authenticated";

revoke update on table "public"."passion_trees" from "authenticated";

revoke delete on table "public"."passion_trees" from "service_role";

revoke insert on table "public"."passion_trees" from "service_role";

revoke references on table "public"."passion_trees" from "service_role";

revoke select on table "public"."passion_trees" from "service_role";

revoke trigger on table "public"."passion_trees" from "service_role";

revoke truncate on table "public"."passion_trees" from "service_role";

revoke update on table "public"."passion_trees" from "service_role";

revoke delete on table "public"."post_comments" from "anon";

revoke insert on table "public"."post_comments" from "anon";

revoke references on table "public"."post_comments" from "anon";

revoke select on table "public"."post_comments" from "anon";

revoke trigger on table "public"."post_comments" from "anon";

revoke truncate on table "public"."post_comments" from "anon";

revoke update on table "public"."post_comments" from "anon";

revoke delete on table "public"."post_comments" from "authenticated";

revoke insert on table "public"."post_comments" from "authenticated";

revoke references on table "public"."post_comments" from "authenticated";

revoke select on table "public"."post_comments" from "authenticated";

revoke trigger on table "public"."post_comments" from "authenticated";

revoke truncate on table "public"."post_comments" from "authenticated";

revoke update on table "public"."post_comments" from "authenticated";

revoke delete on table "public"."post_comments" from "service_role";

revoke insert on table "public"."post_comments" from "service_role";

revoke references on table "public"."post_comments" from "service_role";

revoke select on table "public"."post_comments" from "service_role";

revoke trigger on table "public"."post_comments" from "service_role";

revoke truncate on table "public"."post_comments" from "service_role";

revoke update on table "public"."post_comments" from "service_role";

revoke delete on table "public"."post_likes" from "anon";

revoke insert on table "public"."post_likes" from "anon";

revoke references on table "public"."post_likes" from "anon";

revoke select on table "public"."post_likes" from "anon";

revoke trigger on table "public"."post_likes" from "anon";

revoke truncate on table "public"."post_likes" from "anon";

revoke update on table "public"."post_likes" from "anon";

revoke delete on table "public"."post_likes" from "authenticated";

revoke insert on table "public"."post_likes" from "authenticated";

revoke references on table "public"."post_likes" from "authenticated";

revoke select on table "public"."post_likes" from "authenticated";

revoke trigger on table "public"."post_likes" from "authenticated";

revoke truncate on table "public"."post_likes" from "authenticated";

revoke update on table "public"."post_likes" from "authenticated";

revoke delete on table "public"."post_likes" from "service_role";

revoke insert on table "public"."post_likes" from "service_role";

revoke references on table "public"."post_likes" from "service_role";

revoke select on table "public"."post_likes" from "service_role";

revoke trigger on table "public"."post_likes" from "service_role";

revoke truncate on table "public"."post_likes" from "service_role";

revoke update on table "public"."post_likes" from "service_role";

revoke delete on table "public"."post_media" from "anon";

revoke insert on table "public"."post_media" from "anon";

revoke references on table "public"."post_media" from "anon";

revoke select on table "public"."post_media" from "anon";

revoke trigger on table "public"."post_media" from "anon";

revoke truncate on table "public"."post_media" from "anon";

revoke update on table "public"."post_media" from "anon";

revoke delete on table "public"."post_media" from "authenticated";

revoke insert on table "public"."post_media" from "authenticated";

revoke references on table "public"."post_media" from "authenticated";

revoke select on table "public"."post_media" from "authenticated";

revoke trigger on table "public"."post_media" from "authenticated";

revoke truncate on table "public"."post_media" from "authenticated";

revoke update on table "public"."post_media" from "authenticated";

revoke delete on table "public"."post_media" from "service_role";

revoke insert on table "public"."post_media" from "service_role";

revoke references on table "public"."post_media" from "service_role";

revoke select on table "public"."post_media" from "service_role";

revoke trigger on table "public"."post_media" from "service_role";

revoke truncate on table "public"."post_media" from "service_role";

revoke update on table "public"."post_media" from "service_role";

revoke delete on table "public"."potential_offshoots" from "anon";

revoke insert on table "public"."potential_offshoots" from "anon";

revoke references on table "public"."potential_offshoots" from "anon";

revoke select on table "public"."potential_offshoots" from "anon";

revoke trigger on table "public"."potential_offshoots" from "anon";

revoke truncate on table "public"."potential_offshoots" from "anon";

revoke update on table "public"."potential_offshoots" from "anon";

revoke delete on table "public"."potential_offshoots" from "authenticated";

revoke insert on table "public"."potential_offshoots" from "authenticated";

revoke references on table "public"."potential_offshoots" from "authenticated";

revoke select on table "public"."potential_offshoots" from "authenticated";

revoke trigger on table "public"."potential_offshoots" from "authenticated";

revoke truncate on table "public"."potential_offshoots" from "authenticated";

revoke update on table "public"."potential_offshoots" from "authenticated";

revoke delete on table "public"."potential_offshoots" from "service_role";

revoke insert on table "public"."potential_offshoots" from "service_role";

revoke references on table "public"."potential_offshoots" from "service_role";

revoke select on table "public"."potential_offshoots" from "service_role";

revoke trigger on table "public"."potential_offshoots" from "service_role";

revoke truncate on table "public"."potential_offshoots" from "service_role";

revoke update on table "public"."potential_offshoots" from "service_role";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke select on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

revoke delete on table "public"."project_members" from "anon";

revoke insert on table "public"."project_members" from "anon";

revoke references on table "public"."project_members" from "anon";

revoke select on table "public"."project_members" from "anon";

revoke trigger on table "public"."project_members" from "anon";

revoke truncate on table "public"."project_members" from "anon";

revoke update on table "public"."project_members" from "anon";

revoke delete on table "public"."project_members" from "authenticated";

revoke insert on table "public"."project_members" from "authenticated";

revoke references on table "public"."project_members" from "authenticated";

revoke select on table "public"."project_members" from "authenticated";

revoke trigger on table "public"."project_members" from "authenticated";

revoke truncate on table "public"."project_members" from "authenticated";

revoke update on table "public"."project_members" from "authenticated";

revoke delete on table "public"."project_members" from "service_role";

revoke insert on table "public"."project_members" from "service_role";

revoke references on table "public"."project_members" from "service_role";

revoke select on table "public"."project_members" from "service_role";

revoke trigger on table "public"."project_members" from "service_role";

revoke truncate on table "public"."project_members" from "service_role";

revoke update on table "public"."project_members" from "service_role";

revoke delete on table "public"."project_outcomes" from "anon";

revoke insert on table "public"."project_outcomes" from "anon";

revoke references on table "public"."project_outcomes" from "anon";

revoke select on table "public"."project_outcomes" from "anon";

revoke trigger on table "public"."project_outcomes" from "anon";

revoke truncate on table "public"."project_outcomes" from "anon";

revoke update on table "public"."project_outcomes" from "anon";

revoke delete on table "public"."project_outcomes" from "authenticated";

revoke insert on table "public"."project_outcomes" from "authenticated";

revoke references on table "public"."project_outcomes" from "authenticated";

revoke select on table "public"."project_outcomes" from "authenticated";

revoke trigger on table "public"."project_outcomes" from "authenticated";

revoke truncate on table "public"."project_outcomes" from "authenticated";

revoke update on table "public"."project_outcomes" from "authenticated";

revoke delete on table "public"."project_outcomes" from "service_role";

revoke insert on table "public"."project_outcomes" from "service_role";

revoke references on table "public"."project_outcomes" from "service_role";

revoke select on table "public"."project_outcomes" from "service_role";

revoke trigger on table "public"."project_outcomes" from "service_role";

revoke truncate on table "public"."project_outcomes" from "service_role";

revoke update on table "public"."project_outcomes" from "service_role";

revoke delete on table "public"."project_tags" from "anon";

revoke insert on table "public"."project_tags" from "anon";

revoke references on table "public"."project_tags" from "anon";

revoke select on table "public"."project_tags" from "anon";

revoke trigger on table "public"."project_tags" from "anon";

revoke truncate on table "public"."project_tags" from "anon";

revoke update on table "public"."project_tags" from "anon";

revoke delete on table "public"."project_tags" from "authenticated";

revoke insert on table "public"."project_tags" from "authenticated";

revoke references on table "public"."project_tags" from "authenticated";

revoke select on table "public"."project_tags" from "authenticated";

revoke trigger on table "public"."project_tags" from "authenticated";

revoke truncate on table "public"."project_tags" from "authenticated";

revoke update on table "public"."project_tags" from "authenticated";

revoke delete on table "public"."project_tags" from "service_role";

revoke insert on table "public"."project_tags" from "service_role";

revoke references on table "public"."project_tags" from "service_role";

revoke select on table "public"."project_tags" from "service_role";

revoke trigger on table "public"."project_tags" from "service_role";

revoke truncate on table "public"."project_tags" from "service_role";

revoke update on table "public"."project_tags" from "service_role";

revoke delete on table "public"."projects" from "anon";

revoke insert on table "public"."projects" from "anon";

revoke references on table "public"."projects" from "anon";

revoke select on table "public"."projects" from "anon";

revoke trigger on table "public"."projects" from "anon";

revoke truncate on table "public"."projects" from "anon";

revoke update on table "public"."projects" from "anon";

revoke delete on table "public"."projects" from "authenticated";

revoke insert on table "public"."projects" from "authenticated";

revoke references on table "public"."projects" from "authenticated";

revoke select on table "public"."projects" from "authenticated";

revoke trigger on table "public"."projects" from "authenticated";

revoke truncate on table "public"."projects" from "authenticated";

revoke update on table "public"."projects" from "authenticated";

revoke delete on table "public"."projects" from "service_role";

revoke insert on table "public"."projects" from "service_role";

revoke references on table "public"."projects" from "service_role";

revoke select on table "public"."projects" from "service_role";

revoke trigger on table "public"."projects" from "service_role";

revoke truncate on table "public"."projects" from "service_role";

revoke update on table "public"."projects" from "service_role";

revoke delete on table "public"."quiz_questions" from "anon";

revoke insert on table "public"."quiz_questions" from "anon";

revoke references on table "public"."quiz_questions" from "anon";

revoke select on table "public"."quiz_questions" from "anon";

revoke trigger on table "public"."quiz_questions" from "anon";

revoke truncate on table "public"."quiz_questions" from "anon";

revoke update on table "public"."quiz_questions" from "anon";

revoke delete on table "public"."quiz_questions" from "authenticated";

revoke insert on table "public"."quiz_questions" from "authenticated";

revoke references on table "public"."quiz_questions" from "authenticated";

revoke select on table "public"."quiz_questions" from "authenticated";

revoke trigger on table "public"."quiz_questions" from "authenticated";

revoke truncate on table "public"."quiz_questions" from "authenticated";

revoke update on table "public"."quiz_questions" from "authenticated";

revoke delete on table "public"."quiz_questions" from "service_role";

revoke insert on table "public"."quiz_questions" from "service_role";

revoke references on table "public"."quiz_questions" from "service_role";

revoke select on table "public"."quiz_questions" from "service_role";

revoke trigger on table "public"."quiz_questions" from "service_role";

revoke truncate on table "public"."quiz_questions" from "service_role";

revoke update on table "public"."quiz_questions" from "service_role";

revoke delete on table "public"."reflection_metrics" from "anon";

revoke insert on table "public"."reflection_metrics" from "anon";

revoke references on table "public"."reflection_metrics" from "anon";

revoke select on table "public"."reflection_metrics" from "anon";

revoke trigger on table "public"."reflection_metrics" from "anon";

revoke truncate on table "public"."reflection_metrics" from "anon";

revoke update on table "public"."reflection_metrics" from "anon";

revoke delete on table "public"."reflection_metrics" from "authenticated";

revoke insert on table "public"."reflection_metrics" from "authenticated";

revoke references on table "public"."reflection_metrics" from "authenticated";

revoke select on table "public"."reflection_metrics" from "authenticated";

revoke trigger on table "public"."reflection_metrics" from "authenticated";

revoke truncate on table "public"."reflection_metrics" from "authenticated";

revoke update on table "public"."reflection_metrics" from "authenticated";

revoke delete on table "public"."reflection_metrics" from "service_role";

revoke insert on table "public"."reflection_metrics" from "service_role";

revoke references on table "public"."reflection_metrics" from "service_role";

revoke select on table "public"."reflection_metrics" from "service_role";

revoke trigger on table "public"."reflection_metrics" from "service_role";

revoke truncate on table "public"."reflection_metrics" from "service_role";

revoke update on table "public"."reflection_metrics" from "service_role";

revoke delete on table "public"."reflections" from "anon";

revoke insert on table "public"."reflections" from "anon";

revoke references on table "public"."reflections" from "anon";

revoke select on table "public"."reflections" from "anon";

revoke trigger on table "public"."reflections" from "anon";

revoke truncate on table "public"."reflections" from "anon";

revoke update on table "public"."reflections" from "anon";

revoke delete on table "public"."reflections" from "authenticated";

revoke insert on table "public"."reflections" from "authenticated";

revoke references on table "public"."reflections" from "authenticated";

revoke select on table "public"."reflections" from "authenticated";

revoke trigger on table "public"."reflections" from "authenticated";

revoke truncate on table "public"."reflections" from "authenticated";

revoke update on table "public"."reflections" from "authenticated";

revoke delete on table "public"."reflections" from "service_role";

revoke insert on table "public"."reflections" from "service_role";

revoke references on table "public"."reflections" from "service_role";

revoke select on table "public"."reflections" from "service_role";

revoke trigger on table "public"."reflections" from "service_role";

revoke truncate on table "public"."reflections" from "service_role";

revoke update on table "public"."reflections" from "service_role";

revoke delete on table "public"."related_interests" from "anon";

revoke insert on table "public"."related_interests" from "anon";

revoke references on table "public"."related_interests" from "anon";

revoke select on table "public"."related_interests" from "anon";

revoke trigger on table "public"."related_interests" from "anon";

revoke truncate on table "public"."related_interests" from "anon";

revoke update on table "public"."related_interests" from "anon";

revoke delete on table "public"."related_interests" from "authenticated";

revoke insert on table "public"."related_interests" from "authenticated";

revoke references on table "public"."related_interests" from "authenticated";

revoke select on table "public"."related_interests" from "authenticated";

revoke trigger on table "public"."related_interests" from "authenticated";

revoke truncate on table "public"."related_interests" from "authenticated";

revoke update on table "public"."related_interests" from "authenticated";

revoke delete on table "public"."related_interests" from "service_role";

revoke insert on table "public"."related_interests" from "service_role";

revoke references on table "public"."related_interests" from "service_role";

revoke select on table "public"."related_interests" from "service_role";

revoke trigger on table "public"."related_interests" from "service_role";

revoke truncate on table "public"."related_interests" from "service_role";

revoke update on table "public"."related_interests" from "service_role";

revoke delete on table "public"."resources" from "anon";

revoke insert on table "public"."resources" from "anon";

revoke references on table "public"."resources" from "anon";

revoke select on table "public"."resources" from "anon";

revoke trigger on table "public"."resources" from "anon";

revoke truncate on table "public"."resources" from "anon";

revoke update on table "public"."resources" from "anon";

revoke delete on table "public"."resources" from "authenticated";

revoke insert on table "public"."resources" from "authenticated";

revoke references on table "public"."resources" from "authenticated";

revoke select on table "public"."resources" from "authenticated";

revoke trigger on table "public"."resources" from "authenticated";

revoke truncate on table "public"."resources" from "authenticated";

revoke update on table "public"."resources" from "authenticated";

revoke delete on table "public"."resources" from "service_role";

revoke insert on table "public"."resources" from "service_role";

revoke references on table "public"."resources" from "service_role";

revoke select on table "public"."resources" from "service_role";

revoke trigger on table "public"."resources" from "service_role";

revoke truncate on table "public"."resources" from "service_role";

revoke update on table "public"."resources" from "service_role";

revoke delete on table "public"."roots" from "anon";

revoke insert on table "public"."roots" from "anon";

revoke references on table "public"."roots" from "anon";

revoke select on table "public"."roots" from "anon";

revoke trigger on table "public"."roots" from "anon";

revoke truncate on table "public"."roots" from "anon";

revoke update on table "public"."roots" from "anon";

revoke delete on table "public"."roots" from "authenticated";

revoke insert on table "public"."roots" from "authenticated";

revoke references on table "public"."roots" from "authenticated";

revoke select on table "public"."roots" from "authenticated";

revoke trigger on table "public"."roots" from "authenticated";

revoke truncate on table "public"."roots" from "authenticated";

revoke update on table "public"."roots" from "authenticated";

revoke delete on table "public"."roots" from "service_role";

revoke insert on table "public"."roots" from "service_role";

revoke references on table "public"."roots" from "service_role";

revoke select on table "public"."roots" from "service_role";

revoke trigger on table "public"."roots" from "service_role";

revoke truncate on table "public"."roots" from "service_role";

revoke update on table "public"."roots" from "service_role";

revoke delete on table "public"."skills" from "anon";

revoke insert on table "public"."skills" from "anon";

revoke references on table "public"."skills" from "anon";

revoke select on table "public"."skills" from "anon";

revoke trigger on table "public"."skills" from "anon";

revoke truncate on table "public"."skills" from "anon";

revoke update on table "public"."skills" from "anon";

revoke delete on table "public"."skills" from "authenticated";

revoke insert on table "public"."skills" from "authenticated";

revoke references on table "public"."skills" from "authenticated";

revoke select on table "public"."skills" from "authenticated";

revoke trigger on table "public"."skills" from "authenticated";

revoke truncate on table "public"."skills" from "authenticated";

revoke update on table "public"."skills" from "authenticated";

revoke delete on table "public"."skills" from "service_role";

revoke insert on table "public"."skills" from "service_role";

revoke references on table "public"."skills" from "service_role";

revoke select on table "public"."skills" from "service_role";

revoke trigger on table "public"."skills" from "service_role";

revoke truncate on table "public"."skills" from "service_role";

revoke update on table "public"."skills" from "service_role";

revoke delete on table "public"."student_node_progress" from "anon";

revoke insert on table "public"."student_node_progress" from "anon";

revoke references on table "public"."student_node_progress" from "anon";

revoke select on table "public"."student_node_progress" from "anon";

revoke trigger on table "public"."student_node_progress" from "anon";

revoke truncate on table "public"."student_node_progress" from "anon";

revoke update on table "public"."student_node_progress" from "anon";

revoke delete on table "public"."student_node_progress" from "authenticated";

revoke insert on table "public"."student_node_progress" from "authenticated";

revoke references on table "public"."student_node_progress" from "authenticated";

revoke select on table "public"."student_node_progress" from "authenticated";

revoke trigger on table "public"."student_node_progress" from "authenticated";

revoke truncate on table "public"."student_node_progress" from "authenticated";

revoke update on table "public"."student_node_progress" from "authenticated";

revoke delete on table "public"."student_node_progress" from "service_role";

revoke insert on table "public"."student_node_progress" from "service_role";

revoke references on table "public"."student_node_progress" from "service_role";

revoke select on table "public"."student_node_progress" from "service_role";

revoke trigger on table "public"."student_node_progress" from "service_role";

revoke truncate on table "public"."student_node_progress" from "service_role";

revoke update on table "public"."student_node_progress" from "service_role";

revoke delete on table "public"."submission_grades" from "anon";

revoke insert on table "public"."submission_grades" from "anon";

revoke references on table "public"."submission_grades" from "anon";

revoke select on table "public"."submission_grades" from "anon";

revoke trigger on table "public"."submission_grades" from "anon";

revoke truncate on table "public"."submission_grades" from "anon";

revoke update on table "public"."submission_grades" from "anon";

revoke delete on table "public"."submission_grades" from "authenticated";

revoke insert on table "public"."submission_grades" from "authenticated";

revoke references on table "public"."submission_grades" from "authenticated";

revoke select on table "public"."submission_grades" from "authenticated";

revoke trigger on table "public"."submission_grades" from "authenticated";

revoke truncate on table "public"."submission_grades" from "authenticated";

revoke update on table "public"."submission_grades" from "authenticated";

revoke delete on table "public"."submission_grades" from "service_role";

revoke insert on table "public"."submission_grades" from "service_role";

revoke references on table "public"."submission_grades" from "service_role";

revoke select on table "public"."submission_grades" from "service_role";

revoke trigger on table "public"."submission_grades" from "service_role";

revoke truncate on table "public"."submission_grades" from "service_role";

revoke update on table "public"."submission_grades" from "service_role";

revoke delete on table "public"."synergies" from "anon";

revoke insert on table "public"."synergies" from "anon";

revoke references on table "public"."synergies" from "anon";

revoke select on table "public"."synergies" from "anon";

revoke trigger on table "public"."synergies" from "anon";

revoke truncate on table "public"."synergies" from "anon";

revoke update on table "public"."synergies" from "anon";

revoke delete on table "public"."synergies" from "authenticated";

revoke insert on table "public"."synergies" from "authenticated";

revoke references on table "public"."synergies" from "authenticated";

revoke select on table "public"."synergies" from "authenticated";

revoke trigger on table "public"."synergies" from "authenticated";

revoke truncate on table "public"."synergies" from "authenticated";

revoke update on table "public"."synergies" from "authenticated";

revoke delete on table "public"."synergies" from "service_role";

revoke insert on table "public"."synergies" from "service_role";

revoke references on table "public"."synergies" from "service_role";

revoke select on table "public"."synergies" from "service_role";

revoke trigger on table "public"."synergies" from "service_role";

revoke truncate on table "public"."synergies" from "service_role";

revoke update on table "public"."synergies" from "service_role";

revoke delete on table "public"."tags" from "anon";

revoke insert on table "public"."tags" from "anon";

revoke references on table "public"."tags" from "anon";

revoke select on table "public"."tags" from "anon";

revoke trigger on table "public"."tags" from "anon";

revoke truncate on table "public"."tags" from "anon";

revoke update on table "public"."tags" from "anon";

revoke delete on table "public"."tags" from "authenticated";

revoke insert on table "public"."tags" from "authenticated";

revoke references on table "public"."tags" from "authenticated";

revoke select on table "public"."tags" from "authenticated";

revoke trigger on table "public"."tags" from "authenticated";

revoke truncate on table "public"."tags" from "authenticated";

revoke update on table "public"."tags" from "authenticated";

revoke delete on table "public"."tags" from "service_role";

revoke insert on table "public"."tags" from "service_role";

revoke references on table "public"."tags" from "service_role";

revoke select on table "public"."tags" from "service_role";

revoke trigger on table "public"."tags" from "service_role";

revoke truncate on table "public"."tags" from "service_role";

revoke update on table "public"."tags" from "service_role";

revoke delete on table "public"."team_meetings" from "anon";

revoke insert on table "public"."team_meetings" from "anon";

revoke references on table "public"."team_meetings" from "anon";

revoke select on table "public"."team_meetings" from "anon";

revoke trigger on table "public"."team_meetings" from "anon";

revoke truncate on table "public"."team_meetings" from "anon";

revoke update on table "public"."team_meetings" from "anon";

revoke delete on table "public"."team_meetings" from "authenticated";

revoke insert on table "public"."team_meetings" from "authenticated";

revoke references on table "public"."team_meetings" from "authenticated";

revoke select on table "public"."team_meetings" from "authenticated";

revoke trigger on table "public"."team_meetings" from "authenticated";

revoke truncate on table "public"."team_meetings" from "authenticated";

revoke update on table "public"."team_meetings" from "authenticated";

revoke delete on table "public"."team_meetings" from "service_role";

revoke insert on table "public"."team_meetings" from "service_role";

revoke references on table "public"."team_meetings" from "service_role";

revoke select on table "public"."team_meetings" from "service_role";

revoke trigger on table "public"."team_meetings" from "service_role";

revoke truncate on table "public"."team_meetings" from "service_role";

revoke update on table "public"."team_meetings" from "service_role";

revoke delete on table "public"."team_memberships" from "anon";

revoke insert on table "public"."team_memberships" from "anon";

revoke references on table "public"."team_memberships" from "anon";

revoke select on table "public"."team_memberships" from "anon";

revoke trigger on table "public"."team_memberships" from "anon";

revoke truncate on table "public"."team_memberships" from "anon";

revoke update on table "public"."team_memberships" from "anon";

revoke delete on table "public"."team_memberships" from "authenticated";

revoke insert on table "public"."team_memberships" from "authenticated";

revoke references on table "public"."team_memberships" from "authenticated";

revoke select on table "public"."team_memberships" from "authenticated";

revoke trigger on table "public"."team_memberships" from "authenticated";

revoke truncate on table "public"."team_memberships" from "authenticated";

revoke update on table "public"."team_memberships" from "authenticated";

revoke delete on table "public"."team_memberships" from "service_role";

revoke insert on table "public"."team_memberships" from "service_role";

revoke references on table "public"."team_memberships" from "service_role";

revoke select on table "public"."team_memberships" from "service_role";

revoke trigger on table "public"."team_memberships" from "service_role";

revoke truncate on table "public"."team_memberships" from "service_role";

revoke update on table "public"."team_memberships" from "service_role";

revoke delete on table "public"."team_node_assignments" from "anon";

revoke insert on table "public"."team_node_assignments" from "anon";

revoke references on table "public"."team_node_assignments" from "anon";

revoke select on table "public"."team_node_assignments" from "anon";

revoke trigger on table "public"."team_node_assignments" from "anon";

revoke truncate on table "public"."team_node_assignments" from "anon";

revoke update on table "public"."team_node_assignments" from "anon";

revoke delete on table "public"."team_node_assignments" from "authenticated";

revoke insert on table "public"."team_node_assignments" from "authenticated";

revoke references on table "public"."team_node_assignments" from "authenticated";

revoke select on table "public"."team_node_assignments" from "authenticated";

revoke trigger on table "public"."team_node_assignments" from "authenticated";

revoke truncate on table "public"."team_node_assignments" from "authenticated";

revoke update on table "public"."team_node_assignments" from "authenticated";

revoke delete on table "public"."team_node_assignments" from "service_role";

revoke insert on table "public"."team_node_assignments" from "service_role";

revoke references on table "public"."team_node_assignments" from "service_role";

revoke select on table "public"."team_node_assignments" from "service_role";

revoke trigger on table "public"."team_node_assignments" from "service_role";

revoke truncate on table "public"."team_node_assignments" from "service_role";

revoke update on table "public"."team_node_assignments" from "service_role";

revoke delete on table "public"."team_node_progress" from "anon";

revoke insert on table "public"."team_node_progress" from "anon";

revoke references on table "public"."team_node_progress" from "anon";

revoke select on table "public"."team_node_progress" from "anon";

revoke trigger on table "public"."team_node_progress" from "anon";

revoke truncate on table "public"."team_node_progress" from "anon";

revoke update on table "public"."team_node_progress" from "anon";

revoke delete on table "public"."team_node_progress" from "authenticated";

revoke insert on table "public"."team_node_progress" from "authenticated";

revoke references on table "public"."team_node_progress" from "authenticated";

revoke select on table "public"."team_node_progress" from "authenticated";

revoke trigger on table "public"."team_node_progress" from "authenticated";

revoke truncate on table "public"."team_node_progress" from "authenticated";

revoke update on table "public"."team_node_progress" from "authenticated";

revoke delete on table "public"."team_node_progress" from "service_role";

revoke insert on table "public"."team_node_progress" from "service_role";

revoke references on table "public"."team_node_progress" from "service_role";

revoke select on table "public"."team_node_progress" from "service_role";

revoke trigger on table "public"."team_node_progress" from "service_role";

revoke truncate on table "public"."team_node_progress" from "service_role";

revoke update on table "public"."team_node_progress" from "service_role";

revoke delete on table "public"."team_progress_comments" from "anon";

revoke insert on table "public"."team_progress_comments" from "anon";

revoke references on table "public"."team_progress_comments" from "anon";

revoke select on table "public"."team_progress_comments" from "anon";

revoke trigger on table "public"."team_progress_comments" from "anon";

revoke truncate on table "public"."team_progress_comments" from "anon";

revoke update on table "public"."team_progress_comments" from "anon";

revoke delete on table "public"."team_progress_comments" from "authenticated";

revoke insert on table "public"."team_progress_comments" from "authenticated";

revoke references on table "public"."team_progress_comments" from "authenticated";

revoke select on table "public"."team_progress_comments" from "authenticated";

revoke trigger on table "public"."team_progress_comments" from "authenticated";

revoke truncate on table "public"."team_progress_comments" from "authenticated";

revoke update on table "public"."team_progress_comments" from "authenticated";

revoke delete on table "public"."team_progress_comments" from "service_role";

revoke insert on table "public"."team_progress_comments" from "service_role";

revoke references on table "public"."team_progress_comments" from "service_role";

revoke select on table "public"."team_progress_comments" from "service_role";

revoke trigger on table "public"."team_progress_comments" from "service_role";

revoke truncate on table "public"."team_progress_comments" from "service_role";

revoke update on table "public"."team_progress_comments" from "service_role";

revoke delete on table "public"."tools_acquired" from "anon";

revoke insert on table "public"."tools_acquired" from "anon";

revoke references on table "public"."tools_acquired" from "anon";

revoke select on table "public"."tools_acquired" from "anon";

revoke trigger on table "public"."tools_acquired" from "anon";

revoke truncate on table "public"."tools_acquired" from "anon";

revoke update on table "public"."tools_acquired" from "anon";

revoke delete on table "public"."tools_acquired" from "authenticated";

revoke insert on table "public"."tools_acquired" from "authenticated";

revoke references on table "public"."tools_acquired" from "authenticated";

revoke select on table "public"."tools_acquired" from "authenticated";

revoke trigger on table "public"."tools_acquired" from "authenticated";

revoke truncate on table "public"."tools_acquired" from "authenticated";

revoke update on table "public"."tools_acquired" from "authenticated";

revoke delete on table "public"."tools_acquired" from "service_role";

revoke insert on table "public"."tools_acquired" from "service_role";

revoke references on table "public"."tools_acquired" from "service_role";

revoke select on table "public"."tools_acquired" from "service_role";

revoke trigger on table "public"."tools_acquired" from "service_role";

revoke truncate on table "public"."tools_acquired" from "service_role";

revoke update on table "public"."tools_acquired" from "service_role";

revoke delete on table "public"."user_communities" from "anon";

revoke insert on table "public"."user_communities" from "anon";

revoke references on table "public"."user_communities" from "anon";

revoke select on table "public"."user_communities" from "anon";

revoke trigger on table "public"."user_communities" from "anon";

revoke truncate on table "public"."user_communities" from "anon";

revoke update on table "public"."user_communities" from "anon";

revoke delete on table "public"."user_communities" from "authenticated";

revoke insert on table "public"."user_communities" from "authenticated";

revoke references on table "public"."user_communities" from "authenticated";

revoke select on table "public"."user_communities" from "authenticated";

revoke trigger on table "public"."user_communities" from "authenticated";

revoke truncate on table "public"."user_communities" from "authenticated";

revoke update on table "public"."user_communities" from "authenticated";

revoke delete on table "public"."user_communities" from "service_role";

revoke insert on table "public"."user_communities" from "service_role";

revoke references on table "public"."user_communities" from "service_role";

revoke select on table "public"."user_communities" from "service_role";

revoke trigger on table "public"."user_communities" from "service_role";

revoke truncate on table "public"."user_communities" from "service_role";

revoke update on table "public"."user_communities" from "service_role";

revoke delete on table "public"."user_map_enrollments" from "anon";

revoke insert on table "public"."user_map_enrollments" from "anon";

revoke references on table "public"."user_map_enrollments" from "anon";

revoke select on table "public"."user_map_enrollments" from "anon";

revoke trigger on table "public"."user_map_enrollments" from "anon";

revoke truncate on table "public"."user_map_enrollments" from "anon";

revoke update on table "public"."user_map_enrollments" from "anon";

revoke delete on table "public"."user_map_enrollments" from "authenticated";

revoke insert on table "public"."user_map_enrollments" from "authenticated";

revoke references on table "public"."user_map_enrollments" from "authenticated";

revoke select on table "public"."user_map_enrollments" from "authenticated";

revoke trigger on table "public"."user_map_enrollments" from "authenticated";

revoke truncate on table "public"."user_map_enrollments" from "authenticated";

revoke update on table "public"."user_map_enrollments" from "authenticated";

revoke delete on table "public"."user_map_enrollments" from "service_role";

revoke insert on table "public"."user_map_enrollments" from "service_role";

revoke references on table "public"."user_map_enrollments" from "service_role";

revoke select on table "public"."user_map_enrollments" from "service_role";

revoke trigger on table "public"."user_map_enrollments" from "service_role";

revoke truncate on table "public"."user_map_enrollments" from "service_role";

revoke update on table "public"."user_map_enrollments" from "service_role";

revoke delete on table "public"."user_roles" from "anon";

revoke insert on table "public"."user_roles" from "anon";

revoke references on table "public"."user_roles" from "anon";

revoke select on table "public"."user_roles" from "anon";

revoke trigger on table "public"."user_roles" from "anon";

revoke truncate on table "public"."user_roles" from "anon";

revoke update on table "public"."user_roles" from "anon";

revoke delete on table "public"."user_roles" from "authenticated";

revoke insert on table "public"."user_roles" from "authenticated";

revoke references on table "public"."user_roles" from "authenticated";

revoke select on table "public"."user_roles" from "authenticated";

revoke trigger on table "public"."user_roles" from "authenticated";

revoke truncate on table "public"."user_roles" from "authenticated";

revoke update on table "public"."user_roles" from "authenticated";

revoke delete on table "public"."user_roles" from "service_role";

revoke insert on table "public"."user_roles" from "service_role";

revoke references on table "public"."user_roles" from "service_role";

revoke select on table "public"."user_roles" from "service_role";

revoke trigger on table "public"."user_roles" from "service_role";

revoke truncate on table "public"."user_roles" from "service_role";

revoke update on table "public"."user_roles" from "service_role";

revoke delete on table "public"."user_stats" from "anon";

revoke insert on table "public"."user_stats" from "anon";

revoke references on table "public"."user_stats" from "anon";

revoke select on table "public"."user_stats" from "anon";

revoke trigger on table "public"."user_stats" from "anon";

revoke truncate on table "public"."user_stats" from "anon";

revoke update on table "public"."user_stats" from "anon";

revoke delete on table "public"."user_stats" from "authenticated";

revoke insert on table "public"."user_stats" from "authenticated";

revoke references on table "public"."user_stats" from "authenticated";

revoke select on table "public"."user_stats" from "authenticated";

revoke trigger on table "public"."user_stats" from "authenticated";

revoke truncate on table "public"."user_stats" from "authenticated";

revoke update on table "public"."user_stats" from "authenticated";

revoke delete on table "public"."user_stats" from "service_role";

revoke insert on table "public"."user_stats" from "service_role";

revoke references on table "public"."user_stats" from "service_role";

revoke select on table "public"."user_stats" from "service_role";

revoke trigger on table "public"."user_stats" from "service_role";

revoke truncate on table "public"."user_stats" from "service_role";

revoke update on table "public"."user_stats" from "service_role";

revoke delete on table "public"."user_workshops" from "anon";

revoke insert on table "public"."user_workshops" from "anon";

revoke references on table "public"."user_workshops" from "anon";

revoke select on table "public"."user_workshops" from "anon";

revoke trigger on table "public"."user_workshops" from "anon";

revoke truncate on table "public"."user_workshops" from "anon";

revoke update on table "public"."user_workshops" from "anon";

revoke delete on table "public"."user_workshops" from "authenticated";

revoke insert on table "public"."user_workshops" from "authenticated";

revoke references on table "public"."user_workshops" from "authenticated";

revoke select on table "public"."user_workshops" from "authenticated";

revoke trigger on table "public"."user_workshops" from "authenticated";

revoke truncate on table "public"."user_workshops" from "authenticated";

revoke update on table "public"."user_workshops" from "authenticated";

revoke delete on table "public"."user_workshops" from "service_role";

revoke insert on table "public"."user_workshops" from "service_role";

revoke references on table "public"."user_workshops" from "service_role";

revoke select on table "public"."user_workshops" from "service_role";

revoke trigger on table "public"."user_workshops" from "service_role";

revoke truncate on table "public"."user_workshops" from "service_role";

revoke update on table "public"."user_workshops" from "service_role";

revoke delete on table "public"."workshop_comments" from "anon";

revoke insert on table "public"."workshop_comments" from "anon";

revoke references on table "public"."workshop_comments" from "anon";

revoke select on table "public"."workshop_comments" from "anon";

revoke trigger on table "public"."workshop_comments" from "anon";

revoke truncate on table "public"."workshop_comments" from "anon";

revoke update on table "public"."workshop_comments" from "anon";

revoke delete on table "public"."workshop_comments" from "authenticated";

revoke insert on table "public"."workshop_comments" from "authenticated";

revoke references on table "public"."workshop_comments" from "authenticated";

revoke select on table "public"."workshop_comments" from "authenticated";

revoke trigger on table "public"."workshop_comments" from "authenticated";

revoke truncate on table "public"."workshop_comments" from "authenticated";

revoke update on table "public"."workshop_comments" from "authenticated";

revoke delete on table "public"."workshop_comments" from "service_role";

revoke insert on table "public"."workshop_comments" from "service_role";

revoke references on table "public"."workshop_comments" from "service_role";

revoke select on table "public"."workshop_comments" from "service_role";

revoke trigger on table "public"."workshop_comments" from "service_role";

revoke truncate on table "public"."workshop_comments" from "service_role";

revoke update on table "public"."workshop_comments" from "service_role";

revoke delete on table "public"."workshop_suggestions" from "anon";

revoke insert on table "public"."workshop_suggestions" from "anon";

revoke references on table "public"."workshop_suggestions" from "anon";

revoke select on table "public"."workshop_suggestions" from "anon";

revoke trigger on table "public"."workshop_suggestions" from "anon";

revoke truncate on table "public"."workshop_suggestions" from "anon";

revoke update on table "public"."workshop_suggestions" from "anon";

revoke delete on table "public"."workshop_suggestions" from "authenticated";

revoke insert on table "public"."workshop_suggestions" from "authenticated";

revoke references on table "public"."workshop_suggestions" from "authenticated";

revoke select on table "public"."workshop_suggestions" from "authenticated";

revoke trigger on table "public"."workshop_suggestions" from "authenticated";

revoke truncate on table "public"."workshop_suggestions" from "authenticated";

revoke update on table "public"."workshop_suggestions" from "authenticated";

revoke delete on table "public"."workshop_suggestions" from "service_role";

revoke insert on table "public"."workshop_suggestions" from "service_role";

revoke references on table "public"."workshop_suggestions" from "service_role";

revoke select on table "public"."workshop_suggestions" from "service_role";

revoke trigger on table "public"."workshop_suggestions" from "service_role";

revoke truncate on table "public"."workshop_suggestions" from "service_role";

revoke update on table "public"."workshop_suggestions" from "service_role";

revoke delete on table "public"."workshop_votes" from "anon";

revoke insert on table "public"."workshop_votes" from "anon";

revoke references on table "public"."workshop_votes" from "anon";

revoke select on table "public"."workshop_votes" from "anon";

revoke trigger on table "public"."workshop_votes" from "anon";

revoke truncate on table "public"."workshop_votes" from "anon";

revoke update on table "public"."workshop_votes" from "anon";

revoke delete on table "public"."workshop_votes" from "authenticated";

revoke insert on table "public"."workshop_votes" from "authenticated";

revoke references on table "public"."workshop_votes" from "authenticated";

revoke select on table "public"."workshop_votes" from "authenticated";

revoke trigger on table "public"."workshop_votes" from "authenticated";

revoke truncate on table "public"."workshop_votes" from "authenticated";

revoke update on table "public"."workshop_votes" from "authenticated";

revoke delete on table "public"."workshop_votes" from "service_role";

revoke insert on table "public"."workshop_votes" from "service_role";

revoke references on table "public"."workshop_votes" from "service_role";

revoke select on table "public"."workshop_votes" from "service_role";

revoke trigger on table "public"."workshop_votes" from "service_role";

revoke truncate on table "public"."workshop_votes" from "service_role";

revoke update on table "public"."workshop_votes" from "service_role";

revoke delete on table "public"."workshops" from "anon";

revoke insert on table "public"."workshops" from "anon";

revoke references on table "public"."workshops" from "anon";

revoke select on table "public"."workshops" from "anon";

revoke trigger on table "public"."workshops" from "anon";

revoke truncate on table "public"."workshops" from "anon";

revoke update on table "public"."workshops" from "anon";

revoke delete on table "public"."workshops" from "authenticated";

revoke insert on table "public"."workshops" from "authenticated";

revoke references on table "public"."workshops" from "authenticated";

revoke select on table "public"."workshops" from "authenticated";

revoke trigger on table "public"."workshops" from "authenticated";

revoke truncate on table "public"."workshops" from "authenticated";

revoke update on table "public"."workshops" from "authenticated";

revoke delete on table "public"."workshops" from "service_role";

revoke insert on table "public"."workshops" from "service_role";

revoke references on table "public"."workshops" from "service_role";

revoke select on table "public"."workshops" from "service_role";

revoke trigger on table "public"."workshops" from "service_role";

revoke truncate on table "public"."workshops" from "service_role";

revoke update on table "public"."workshops" from "service_role";

alter table "public"."learning_maps" drop constraint "learning_maps_last_modified_by_fkey";

drop function if exists "public"."bulk_grade_group_submissions"(p_group_id uuid, p_map_id uuid, p_grader_id uuid, p_default_grade text, p_default_points integer, p_default_comments text);

drop function if exists "public"."get_group_map_submissions"(p_group_id uuid, p_map_id uuid);

drop function if exists "public"."get_my_classrooms"();

drop function if exists "public"."grade_individual_submission"(p_submission_id uuid, p_grade text, p_comments text, p_grader_id uuid, p_progress_id uuid, p_points_awarded integer);

drop function if exists "public"."get_admin_maps_optimized"(limit_count integer, offset_count integer);


  create table "public"."classroom_groups" (
    "id" uuid not null default gen_random_uuid(),
    "classroom_id" uuid not null,
    "name" text not null,
    "description" text,
    "color" text default '#3b82f6'::text,
    "created_by" uuid not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."group_memberships" (
    "id" uuid not null default gen_random_uuid(),
    "group_id" uuid not null,
    "user_id" uuid not null,
    "assigned_by" uuid not null,
    "assigned_at" timestamp with time zone default now()
      );


alter table "public"."assessment_submissions" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."branches" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."chat_messages" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."classroom_team_maps" disable row level security;

alter table "public"."cohort_map_enrollments" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."cohorts" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."communities" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."community_images" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."community_mentors" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."community_posts" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."community_projects" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."connections" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."emotions" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."engagement" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."impacts" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."influences" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."insights" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."interests" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."learning_maps" drop column "last_modified_by";

alter table "public"."learning_maps" drop column "version";

alter table "public"."learning_maps" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."learning_maps" disable row level security;

alter table "public"."learning_paths" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."map_nodes" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."milestones" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."monthly_insights" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."node_assessments" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."node_content" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."node_leaderboard" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."node_paths" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."passion_trees" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."post_comments" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."post_likes" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."post_media" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."potential_offshoots" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."project_members" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."project_outcomes" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."projects" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."quiz_questions" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."reflection_metrics" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."related_interests" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."resources" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."roots" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."skills" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."student_node_progress" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."submission_grades" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."synergies" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."tools_acquired" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."user_communities" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."user_map_enrollments" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."user_roles" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."user_stats" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."user_workshops" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."workshops" alter column "id" set default extensions.uuid_generate_v4();

CREATE UNIQUE INDEX classroom_groups_classroom_id_name_key ON public.classroom_groups USING btree (classroom_id, name);

CREATE UNIQUE INDEX classroom_groups_pkey ON public.classroom_groups USING btree (id);

CREATE UNIQUE INDEX group_memberships_group_id_user_id_key ON public.group_memberships USING btree (group_id, user_id);

CREATE UNIQUE INDEX group_memberships_pkey ON public.group_memberships USING btree (id);

CREATE INDEX idx_user_roles_user_id_role_grading ON public.user_roles USING btree (user_id, role) WHERE (role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]));

alter table "public"."classroom_groups" add constraint "classroom_groups_pkey" PRIMARY KEY using index "classroom_groups_pkey";

alter table "public"."group_memberships" add constraint "group_memberships_pkey" PRIMARY KEY using index "group_memberships_pkey";

alter table "public"."classroom_groups" add constraint "classroom_groups_classroom_id_name_key" UNIQUE using index "classroom_groups_classroom_id_name_key";

alter table "public"."group_memberships" add constraint "group_memberships_group_id_fkey" FOREIGN KEY (group_id) REFERENCES classroom_groups(id) ON DELETE CASCADE not valid;

alter table "public"."group_memberships" validate constraint "group_memberships_group_id_fkey";

alter table "public"."group_memberships" add constraint "group_memberships_group_id_user_id_key" UNIQUE using index "group_memberships_group_id_user_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.archive_old_assignments(days_old integer DEFAULT 365)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    archived_count INTEGER := 0;
    cutoff_date TIMESTAMPTZ;
BEGIN
    cutoff_date := now() - (days_old || ' days')::INTERVAL;
    
    -- Only allow instructors to archive their own assignments
    UPDATE public.classroom_assignments
    SET is_active = false
    WHERE created_by = auth.uid()
    AND created_at < cutoff_date
    AND is_active = true;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN json_build_object(
        'archived_assignments', archived_count,
        'cutoff_date', cutoff_date,
        'archived_at', now()
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_group_assignment_to_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- When a group assignment is created, automatically enroll all group members
    INSERT INTO public.assignment_enrollments (assignment_id, user_id, due_date, status)
    SELECT 
        NEW.assignment_id,
        agm.user_id,
        NEW.due_date,
        'assigned'
    FROM public.assignment_group_members agm
    WHERE agm.group_id = NEW.group_id
    ON CONFLICT (assignment_id, user_id) DO NOTHING; -- Avoid duplicates
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_enroll_classroom_members(assignment_uuid uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    classroom_uuid UUID;
    enrollment_count INTEGER := 0;
    member_record RECORD;
BEGIN
    -- Get the classroom ID for this assignment
    SELECT classroom_id INTO classroom_uuid
    FROM public.classroom_assignments 
    WHERE id = assignment_uuid;
    
    IF classroom_uuid IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;
    
    -- Check if user has permission to manage this assignment
    IF NOT EXISTS (
        SELECT 1 FROM public.classroom_assignments 
        WHERE id = assignment_uuid AND created_by = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: you can only auto-enroll members in your own assignments';
    END IF;
    
    -- Enroll all students in the classroom
    FOR member_record IN 
        SELECT user_id 
        FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND role = 'student'
    LOOP
        -- Insert enrollment if it doesn't already exist
        INSERT INTO public.assignment_enrollments (assignment_id, user_id)
        SELECT assignment_uuid, member_record.user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.assignment_enrollments 
            WHERE assignment_id = assignment_uuid 
            AND user_id = member_record.user_id
        );
        
        IF FOUND THEN
            enrollment_count := enrollment_count + 1;
        END IF;
    END LOOP;
    
    RETURN enrollment_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.bulk_enroll_students(classroom_uuid uuid, student_emails text[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    enrollment_results JSON;
    successful_enrollments INTEGER := 0;
    failed_enrollments INTEGER := 0;
    email_address TEXT;
    user_uuid UUID;
    error_details JSON[] := ARRAY[]::JSON[];
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can enroll students';
    END IF;
    
    -- Process each email
    FOREACH email_address IN ARRAY student_emails
    LOOP
        BEGIN
            -- Find user by email
            SELECT id INTO user_uuid
            FROM auth.users 
            WHERE email = email_address;
            
            IF user_uuid IS NULL THEN
                failed_enrollments := failed_enrollments + 1;
                error_details := error_details || json_build_object(
                    'email', email_address,
                    'error', 'User not found'
                );
                CONTINUE;
            END IF;
            
            -- Insert membership if not exists
            INSERT INTO public.classroom_memberships (classroom_id, user_id, role)
            VALUES (classroom_uuid, user_uuid, 'student')
            ON CONFLICT (classroom_id, user_id) DO NOTHING;
            
            IF FOUND THEN
                successful_enrollments := successful_enrollments + 1;
            ELSE
                failed_enrollments := failed_enrollments + 1;
                error_details := error_details || json_build_object(
                    'email', email_address,
                    'error', 'Already enrolled'
                );
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            failed_enrollments := failed_enrollments + 1;
            error_details := error_details || json_build_object(
                'email', email_address,
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    SELECT json_build_object(
        'successful_enrollments', successful_enrollments,
        'failed_enrollments', failed_enrollments,
        'total_attempted', array_length(student_emails, 1),
        'errors', error_details,
        'processed_at', now()
    ) INTO enrollment_results;
    
    RETURN enrollment_results;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_assignment_completion(enrollment_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    enrollment_record RECORD;
    total_nodes INTEGER := 0;
    completed_nodes INTEGER := 0;
    required_nodes INTEGER := 0;
    completed_required INTEGER := 0;
    total_points INTEGER := 0;
    earned_points INTEGER := 0;
    completion_percentage INTEGER := 0;
    result JSON;
BEGIN
    -- Get enrollment details
    SELECT ae.*, ca.id as assignment_id
    INTO enrollment_record
    FROM public.assignment_enrollments ae
    JOIN public.classroom_assignments ca ON ae.assignment_id = ca.id
    WHERE ae.id = enrollment_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Enrollment not found';
    END IF;
    
    -- Check access permissions
    IF NOT (
        enrollment_record.user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.classroom_assignments 
            WHERE id = enrollment_record.assignment_id 
            AND created_by = auth.uid()
        )
    ) THEN
        RAISE EXCEPTION 'Access denied to enrollment data';
    END IF;
    
    -- Calculate node completion statistics
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE an.is_required) as required_total,
        COALESCE(SUM(an.points_possible), 0) as points_possible
    INTO total_nodes, required_nodes, total_points
    FROM public.assignment_nodes an
    WHERE an.assignment_id = enrollment_record.assignment_id;
    
    -- Count completed nodes (check student_node_progress table)
    SELECT 
        COUNT(*) FILTER (WHERE snp.status IN ('passed', 'completed')) as completed_total,
        COUNT(*) FILTER (WHERE snp.status IN ('passed', 'completed') AND an.is_required) as completed_required_total,
        COALESCE(SUM(
            CASE WHEN snp.status IN ('passed', 'completed') 
            THEN an.points_possible 
            ELSE 0 END
        ), 0) as earned_points_total
    INTO completed_nodes, completed_required, earned_points
    FROM public.assignment_nodes an
    LEFT JOIN public.student_node_progress snp ON (
        an.node_id = snp.node_id 
        AND snp.user_id = enrollment_record.user_id
    )
    WHERE an.assignment_id = enrollment_record.assignment_id;
    
    -- Calculate completion percentage
    IF required_nodes > 0 THEN
        completion_percentage := ROUND((completed_required::DECIMAL / required_nodes::DECIMAL) * 100);
    ELSIF total_nodes > 0 THEN
        completion_percentage := ROUND((completed_nodes::DECIMAL / total_nodes::DECIMAL) * 100);
    END IF;
    
    -- Build result
    SELECT json_build_object(
        'enrollment_id', enrollment_uuid,
        'assignment_id', enrollment_record.assignment_id,
        'user_id', enrollment_record.user_id,
        'total_nodes', total_nodes,
        'completed_nodes', completed_nodes,
        'required_nodes', required_nodes,
        'completed_required_nodes', completed_required,
        'completion_percentage', completion_percentage,
        'total_points_possible', total_points,
        'total_points_earned', earned_points,
        'status', CASE 
            WHEN completion_percentage = 100 THEN 'completed'
            WHEN completed_nodes > 0 THEN 'in_progress'
            ELSE 'assigned'
        END,
        'last_calculated', now()
    ) INTO result;
    
    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_assignment_from_map(classroom_uuid uuid, map_uuid uuid, assignment_title text, assignment_description text DEFAULT NULL::text, selected_node_ids uuid[] DEFAULT NULL::uuid[], auto_enroll boolean DEFAULT true)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    assignment_id UUID;
    node_id UUID;
    sequence_num INTEGER := 1;
    enrolled_count INTEGER := 0;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can create assignments';
    END IF;
    
    -- Check if map is linked to classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classroom_maps 
        WHERE classroom_id = classroom_uuid 
        AND map_id = map_uuid 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Map is not linked to this classroom';
    END IF;
    
    -- Create the assignment
    INSERT INTO public.classroom_assignments (
        classroom_id,
        title,
        description,
        created_by,
        source_map_id,
        map_context
    ) VALUES (
        classroom_uuid,
        assignment_title,
        assignment_description,
        auth.uid(),
        map_uuid,
        'Created from linked map: ' || (SELECT title FROM public.learning_maps WHERE id = map_uuid)
    ) RETURNING id INTO assignment_id;
    
    -- Add nodes to assignment
    IF selected_node_ids IS NOT NULL THEN
        -- Use selected nodes
        FOREACH node_id IN ARRAY selected_node_ids
        LOOP
            -- Verify node belongs to the map
            IF EXISTS (
                SELECT 1 FROM public.map_nodes 
                WHERE id = node_id AND map_id = map_uuid
            ) THEN
                INSERT INTO public.assignment_nodes (
                    assignment_id,
                    node_id,
                    sequence_order
                ) VALUES (
                    assignment_id,
                    node_id,
                    sequence_num
                );
                sequence_num := sequence_num + 1;
            END IF;
        END LOOP;
    ELSE
        -- Use all nodes from the map
        INSERT INTO public.assignment_nodes (assignment_id, node_id, sequence_order)
        SELECT assignment_id, mn.id, ROW_NUMBER() OVER (ORDER BY mn.created_at)
        FROM public.map_nodes mn
        WHERE mn.map_id = map_uuid;
    END IF;
    
    -- Auto-enroll students if requested
    IF auto_enroll THEN
        INSERT INTO public.assignment_enrollments (assignment_id, user_id)
        SELECT assignment_id, cm.user_id
        FROM public.classroom_memberships cm
        WHERE cm.classroom_id = classroom_uuid
        AND cm.role = 'student';
        
        GET DIAGNOSTICS enrolled_count = ROW_COUNT;
    END IF;
    
    RETURN json_build_object(
        'assignment_id', assignment_id,
        'classroom_id', classroom_uuid,
        'source_map_id', map_uuid,
        'nodes_added', sequence_num - 1,
        'students_enrolled', enrolled_count,
        'created_at', now()
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.enroll_new_group_member_in_assignments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- When a new member joins a group, enroll them in all group assignments
    INSERT INTO public.assignment_enrollments (assignment_id, user_id, due_date, status)
    SELECT 
        aga.assignment_id,
        NEW.user_id,
        aga.due_date,
        'assigned'
    FROM public.assignment_group_assignments aga
    WHERE aga.group_id = NEW.group_id
    ON CONFLICT (assignment_id, user_id) DO NOTHING; -- Avoid duplicates
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_single_leader_per_team()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If this is setting someone as a leader, remove leader status from others in the team
  IF NEW.is_leader = true THEN
    UPDATE public.team_memberships 
    SET is_leader = false 
    WHERE team_id = NEW.team_id AND id != NEW.id AND is_leader = true;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_join_code()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    attempts INTEGER := 0;
BEGIN
    LOOP
        result := '';
        -- Generate 6-character code
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM public.classrooms WHERE join_code = result) THEN
            RETURN result;
        END IF;
        
        attempts := attempts + 1;
        IF attempts > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique join code after 100 attempts';
        END IF;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_admin_maps_optimized(limit_count integer DEFAULT 50, offset_count integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, description text, creator_id uuid, creator_name text, difficulty integer, category text, visibility text, node_count bigint, avg_difficulty integer, created_at timestamp with time zone, updated_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        lm.id,
        lm.title,
        lm.description,
        lm.creator_id,
        COALESCE(p.full_name, p.username, 'Unknown') as creator_name,
        lm.difficulty,
        lm.category,
        lm.visibility,
        COALESCE(mn.node_count, 0) as node_count,
        COALESCE(mn.avg_difficulty, 1) as avg_difficulty,
        lm.created_at,
        lm.updated_at,
        lm.metadata
    FROM learning_maps lm
    LEFT JOIN profiles p ON p.id = lm.creator_id
    LEFT JOIN (
        -- Efficient aggregation subquery with qualified column names
        SELECT 
            mn.map_id,
            COUNT(*) as node_count,
            ROUND(AVG(COALESCE(mn.difficulty, 1)))::INTEGER as avg_difficulty
        FROM map_nodes mn
        GROUP BY mn.map_id
    ) mn ON mn.map_id = lm.id
    ORDER BY lm.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_classroom_analytics(classroom_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
    instructor_check BOOLEAN := false;
BEGIN
    -- Check if user is instructor of this classroom
    SELECT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) INTO instructor_check;
    
    IF NOT instructor_check THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can view analytics';
    END IF;
    
    WITH classroom_stats AS (
        SELECT 
            c.name as classroom_name,
            c.description,
            c.created_at as classroom_created,
            COUNT(DISTINCT cm.user_id) FILTER (WHERE cm.role = 'student') as total_students,
            COUNT(DISTINCT ca.id) as total_assignments,
            COUNT(DISTINCT ca.id) FILTER (WHERE ca.is_published) as published_assignments,
            COUNT(DISTINCT ae.id) as total_enrollments,
            COUNT(DISTINCT ae.id) FILTER (WHERE ae.status = 'completed') as completed_enrollments,
            AVG(ae.completion_percentage) FILTER (WHERE ae.completion_percentage > 0) as avg_completion_rate
        FROM public.classrooms c
        LEFT JOIN public.classroom_memberships cm ON c.id = cm.classroom_id
        LEFT JOIN public.classroom_assignments ca ON c.id = ca.classroom_id
        LEFT JOIN public.assignment_enrollments ae ON ca.id = ae.assignment_id
        WHERE c.id = classroom_uuid
        GROUP BY c.id, c.name, c.description, c.created_at
    ),
    recent_activity AS (
        SELECT 
            COUNT(*) as recent_submissions
        FROM public.assignment_enrollments ae
        JOIN public.classroom_assignments ca ON ae.assignment_id = ca.id
        WHERE ca.classroom_id = classroom_uuid
        AND ae.completed_at > now() - INTERVAL '7 days'
    ),
    assignment_performance AS (
        SELECT 
            ca.title,
            ca.id as assignment_id,
            COUNT(ae.id) as enrolled_count,
            COUNT(ae.id) FILTER (WHERE ae.status = 'completed') as completed_count,
            AVG(ae.completion_percentage) as avg_completion,
            AVG(ae.total_points_earned::DECIMAL / NULLIF(ae.total_points_possible, 0) * 100) as avg_score
        FROM public.classroom_assignments ca
        LEFT JOIN public.assignment_enrollments ae ON ca.id = ae.assignment_id
        WHERE ca.classroom_id = classroom_uuid
        AND ca.is_published = true
        GROUP BY ca.id, ca.title
        ORDER BY ca.created_at DESC
        LIMIT 10
    )
    SELECT json_build_object(
        'classroom', (SELECT row_to_json(cs) FROM classroom_stats cs),
        'recent_activity', (SELECT row_to_json(ra) FROM recent_activity ra),
        'assignment_performance', (
            SELECT json_agg(row_to_json(ap)) 
            FROM assignment_performance ap
        ),
        'generated_at', now()
    ) INTO result;
    
    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_classroom_available_nodes(classroom_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can view available nodes';
    END IF;

    SELECT json_agg(
        json_build_object(
            'map_id', m.id,
            'map_title', m.title,
            'nodes', (
                SELECT json_agg(
                    json_build_object(
                        'node_id', mn.id,
                        'node_title', mn.title,
                        'node_description', mn.description,
                        'has_content', EXISTS (
                            SELECT 1 FROM public.node_content 
                            WHERE node_id = mn.id
                        ),
                        'has_assessment', EXISTS (
                            SELECT 1 FROM public.node_assessments 
                            WHERE node_id = mn.id
                        )
                    ) ORDER BY mn.created_at
                )
                FROM public.map_nodes mn 
                WHERE mn.map_id = m.id
            )
        ) ORDER BY cm.display_order, cm.added_at
    ) INTO result
    FROM public.classroom_maps cm
    JOIN public.learning_maps m ON cm.map_id = m.id
    WHERE cm.classroom_id = classroom_uuid
    AND cm.is_active = true;
    
    RETURN COALESCE(result, '[]'::json);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_classroom_maps(classroom_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
BEGIN
    -- Check if user has access to this classroom
    IF NOT (
        EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_uuid AND instructor_id = auth.uid()) OR
        public.is_classroom_member(classroom_uuid, auth.uid())
    ) THEN
        RAISE EXCEPTION 'Access denied to classroom maps';
    END IF;

    SELECT json_agg(
        json_build_object(
            'link_id', cm.id,
            'map_id', m.id,
            'map_title', m.title,
            'map_description', m.description,
            'node_count', (
                SELECT COUNT(*) FROM public.map_nodes 
                WHERE map_id = m.id
            ),
            'added_at', cm.added_at,
            'added_by', cm.added_by,
            'display_order', cm.display_order,
            'notes', cm.notes,
            'is_active', cm.is_active
        ) ORDER BY cm.display_order, cm.added_at
    ) INTO result
    FROM public.classroom_maps cm
    JOIN public.learning_maps m ON cm.map_id = m.id
    WHERE cm.classroom_id = classroom_uuid
    AND cm.is_active = true;
    
    RETURN COALESCE(result, '[]'::json);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_classroom_stats(classroom_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
BEGIN
    -- Check if user has access to this classroom
    IF NOT (
        EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_uuid AND instructor_id = auth.uid()) OR
        public.is_classroom_member(classroom_uuid, auth.uid())
    ) THEN
        RAISE EXCEPTION 'Access denied to classroom statistics';
    END IF;

    SELECT json_build_object(
        'total_members', (
            SELECT COUNT(*) FROM public.classroom_memberships 
            WHERE classroom_id = classroom_uuid
        ),
        'total_students', (
            SELECT COUNT(*) FROM public.classroom_memberships 
            WHERE classroom_id = classroom_uuid AND role = 'student'
        ),
        'total_assignments', (
            SELECT COUNT(*) FROM public.classroom_assignments 
            WHERE classroom_id = classroom_uuid
        ),
        'published_assignments', (
            SELECT COUNT(*) FROM public.classroom_assignments 
            WHERE classroom_id = classroom_uuid AND is_published = true
        ),
        'active_enrollments', (
            SELECT COUNT(*) FROM public.assignment_enrollments ae
            JOIN public.classroom_assignments ca ON ae.assignment_id = ca.id
            WHERE ca.classroom_id = classroom_uuid 
            AND ae.status IN ('assigned', 'in_progress', 'submitted')
        )
    ) INTO result;
    
    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_student_progress_overview(classroom_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can view student progress';
    END IF;
    
    WITH student_overview AS (
        SELECT 
            u.id as user_id,
            u.email,
            cm.joined_at,
            cm.last_active_at,
            COUNT(DISTINCT ae.id) as total_assignments,
            COUNT(DISTINCT ae.id) FILTER (WHERE ae.status = 'completed') as completed_assignments,
            COUNT(DISTINCT ae.id) FILTER (WHERE ae.status = 'in_progress') as in_progress_assignments,
            COUNT(DISTINCT ae.id) FILTER (WHERE ae.status = 'overdue') as overdue_assignments,
            AVG(ae.completion_percentage) as avg_completion_rate,
            SUM(ae.total_points_earned) as total_points_earned,
            SUM(ae.total_points_possible) as total_points_possible
        FROM public.classroom_memberships cm
        JOIN auth.users u ON cm.user_id = u.id
        LEFT JOIN public.assignment_enrollments ae ON (
            cm.user_id = ae.user_id 
            AND ae.assignment_id IN (
                SELECT id FROM public.classroom_assignments 
                WHERE classroom_id = classroom_uuid
            )
        )
        WHERE cm.classroom_id = classroom_uuid
        AND cm.role = 'student'
        GROUP BY u.id, u.email, cm.joined_at, cm.last_active_at
        ORDER BY cm.joined_at
    )
    SELECT json_build_object(
        'classroom_id', classroom_uuid,
        'students', (
            SELECT json_agg(
                json_build_object(
                    'user_id', so.user_id,
                    'email', so.email,
                    'joined_at', so.joined_at,
                    'last_active_at', so.last_active_at,
                    'assignments_summary', json_build_object(
                        'total', so.total_assignments,
                        'completed', so.completed_assignments,
                        'in_progress', so.in_progress_assignments,
                        'overdue', so.overdue_assignments
                    ),
                    'performance', json_build_object(
                        'avg_completion_rate', ROUND(so.avg_completion_rate, 2),
                        'total_points_earned', so.total_points_earned,
                        'total_points_possible', so.total_points_possible,
                        'grade_percentage', CASE 
                            WHEN so.total_points_possible > 0 
                            THEN ROUND((so.total_points_earned::DECIMAL / so.total_points_possible::DECIMAL) * 100, 2)
                            ELSE NULL
                        END
                    )
                )
            )
            FROM student_overview so
        ),
        'generated_at', now()
    ) INTO result;
    
    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_team_map_progress(map_id_param uuid)
 RETURNS SETOF team_node_progress
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_team_id uuid;
    is_instructor boolean := false;
BEGIN
    -- Check if user is instructor or TA in any classroom that has teams with this map
    SELECT EXISTS (
        SELECT 1 
        FROM classroom_team_maps ctm
        JOIN classroom_teams ct ON ctm.team_id = ct.id
        JOIN classroom_memberships cm ON ct.classroom_id = cm.classroom_id
        WHERE ctm.map_id = map_id_param 
        AND cm.user_id = auth.uid() 
        AND cm.role IN ('instructor', 'ta')
    ) INTO is_instructor;

    -- Instructors and TAs can see progress for all teams with this map
    IF is_instructor THEN
        RETURN QUERY
        SELECT tnp.*
        FROM team_node_progress tnp
        JOIN classroom_team_maps ctm ON tnp.team_id = ctm.team_id
        WHERE ctm.map_id = map_id_param;

    -- Students can see their own team's progress for this map
    ELSE
        -- Find the team_id for the current user that has this map
        SELECT ctm.team_id INTO user_team_id 
        FROM classroom_team_maps ctm
        JOIN team_memberships tm ON ctm.team_id = tm.team_id
        WHERE ctm.map_id = map_id_param 
        AND tm.user_id = auth.uid() 
        AND tm.left_at IS NULL
        LIMIT 1;

        IF user_team_id IS NOT NULL THEN
            RETURN QUERY
            SELECT tnp.*
            FROM team_node_progress tnp
            WHERE tnp.team_id = user_team_id;
        END IF;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_auto_enroll_new_student()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Only proceed if a new 'student' is being added to a classroom
  IF NEW.role = 'student' THEN
    -- Enroll the student in all active, published, auto-assign assignments for this classroom
    INSERT INTO public.assignment_enrollments (
      assignment_id,
      user_id,
      due_date,
      status
    )
    SELECT
      ca.id,
      NEW.user_id,
      ca.default_due_date,
      'assigned'
    FROM public.classroom_assignments AS ca
    WHERE ca.classroom_id = NEW.classroom_id
      AND ca.auto_assign = true
      AND ca.is_published = true
      AND ca.is_active = true
      -- Ensure we don't create a duplicate enrollment
      AND NOT EXISTS (
        SELECT 1 FROM public.assignment_enrollments AS ae
        WHERE ae.assignment_id = ca.id AND ae.user_id = NEW.user_id
      );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_uuid 
        AND role = 'admin'
    );
$function$
;

CREATE OR REPLACE FUNCTION public.is_classroom_member(classroom_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND user_id = user_uuid
    );
$function$
;

CREATE OR REPLACE FUNCTION public.is_community_admin(community_id_param uuid, user_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return exists (
    select 1 from public.user_communities
    where community_id = community_id_param
    and user_id = user_id_param
    and role in ('admin', 'owner')
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_community_member(community_id_param uuid, user_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return exists (
    select 1 from public.user_communities
    where community_id = community_id_param
    and user_id = user_id_param
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.link_map_to_classroom(classroom_uuid uuid, map_uuid uuid, notes_text text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    link_id UUID;
    max_order INTEGER := 0;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can link maps';
    END IF;
    
    -- Check if map exists
    IF NOT EXISTS (SELECT 1 FROM public.learning_maps WHERE id = map_uuid) THEN
        RAISE EXCEPTION 'Map not found';
    END IF;
    
    -- Check if link already exists
    IF EXISTS (
        SELECT 1 FROM public.classroom_maps 
        WHERE classroom_id = classroom_uuid AND map_id = map_uuid
    ) THEN
        RAISE EXCEPTION 'Map is already linked to this classroom';
    END IF;
    
    -- Get next display order
    SELECT COALESCE(MAX(display_order), 0) + 1 INTO max_order
    FROM public.classroom_maps 
    WHERE classroom_id = classroom_uuid;
    
    -- Insert the link
    INSERT INTO public.classroom_maps (
        classroom_id, 
        map_id, 
        added_by, 
        display_order, 
        notes
    ) VALUES (
        classroom_uuid, 
        map_uuid, 
        auth.uid(), 
        max_order, 
        notes_text
    ) RETURNING id INTO link_id;
    
    RETURN json_build_object(
        'link_id', link_id,
        'classroom_id', classroom_uuid,
        'map_id', map_uuid,
        'display_order', max_order,
        'added_at', now()
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reorder_classroom_maps(classroom_uuid uuid, link_orders json)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    link_item JSON;
    updated_count INTEGER := 0;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can reorder maps';
    END IF;
    
    -- Update display orders
    FOR link_item IN SELECT * FROM json_array_elements(link_orders)
    LOOP
        UPDATE public.classroom_maps 
        SET display_order = (link_item->>'order')::INTEGER
        WHERE id = (link_item->>'link_id')::UUID
        AND classroom_id = classroom_uuid;
        
        IF FOUND THEN
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'classroom_id', classroom_uuid,
        'updated_count', updated_count,
        'reordered_at', now()
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_assignment_progress()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    affected_enrollments RECORD;
    completion_data JSON;
BEGIN
    -- Find all enrollments that include this node
    FOR affected_enrollments IN
        SELECT DISTINCT ae.id as enrollment_id, ae.assignment_id, ae.user_id
        FROM public.assignment_enrollments ae
        JOIN public.assignment_nodes an ON ae.assignment_id = an.assignment_id
        WHERE an.node_id = COALESCE(NEW.node_id, OLD.node_id)
        AND ae.user_id = COALESCE(NEW.user_id, OLD.user_id)
    LOOP
        -- Calculate new completion data
        SELECT public.calculate_assignment_completion(affected_enrollments.enrollment_id) INTO completion_data;
        
        -- Update the enrollment record
        UPDATE public.assignment_enrollments
        SET 
            completion_percentage = (completion_data->>'completion_percentage')::INTEGER,
            total_points_earned = (completion_data->>'total_points_earned')::INTEGER,
            total_points_possible = (completion_data->>'total_points_possible')::INTEGER,
            status = CASE 
                WHEN (completion_data->>'completion_percentage')::INTEGER = 100 AND completed_at IS NULL THEN 'completed'
                WHEN (completion_data->>'completion_percentage')::INTEGER > 0 AND started_at IS NULL THEN 'in_progress'
                ELSE status
            END,
            started_at = CASE 
                WHEN (completion_data->>'completion_percentage')::INTEGER > 0 AND started_at IS NULL THEN now()
                ELSE started_at
            END,
            completed_at = CASE 
                WHEN (completion_data->>'completion_percentage')::INTEGER = 100 AND completed_at IS NULL THEN now()
                WHEN (completion_data->>'completion_percentage')::INTEGER < 100 THEN NULL
                ELSE completed_at
            END
        WHERE id = affected_enrollments.enrollment_id;
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.unlink_map_from_classroom(classroom_uuid uuid, map_uuid uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can unlink maps';
    END IF;
    
    -- Delete the link
    DELETE FROM public.classroom_maps 
    WHERE classroom_id = classroom_uuid 
    AND map_id = map_uuid;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count = 0 THEN
        RAISE EXCEPTION 'Map link not found or already removed';
    END IF;
    
    RETURN json_build_object(
        'classroom_id', classroom_uuid,
        'map_id', map_uuid,
        'unlinked_at', now(),
        'deleted_count', deleted_count
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_community_member_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'INSERT' then
    update public.communities
    set member_count = member_count + 1
    where id = new.community_id;
  elsif tg_op = 'DELETE' then
    update public.communities
    set member_count = member_count - 1
    where id = old.community_id;
  end if;
  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_meeting_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_membership_activity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.last_active_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_progress_on_grade()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    submission_progress_id uuid;
    new_status text;
BEGIN
    -- Get the progress_id from the submission that was just graded
    SELECT progress_id INTO submission_progress_id
    FROM public.assessment_submissions
    WHERE id = NEW.submission_id;

    -- Map grade to appropriate status
    IF NEW.grade = 'pass' THEN
        new_status := 'passed';
    ELSIF NEW.grade = 'fail' THEN
        new_status := 'failed';
    ELSE
        -- Should not happen due to grade constraints, but just in case
        RAISE EXCEPTION 'Invalid grade value: %', NEW.grade;
    END IF;

    -- Update the status in the student_node_progress table
    -- FIXED: Removed updated_at = NOW() since the column doesn't exist
    UPDATE public.student_node_progress
    SET status = new_status
    WHERE id = submission_progress_id;

    -- Log the update for debugging
    RAISE NOTICE 'Updated progress % from grade % to status % (graded_by: %)', 
        submission_progress_id, NEW.grade, new_status, 
        CASE WHEN NEW.graded_by IS NULL THEN 'SYSTEM' ELSE 'INSTRUCTOR' END;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_team_progress_from_individual()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  team_id_val UUID;
  highest_status_num INTEGER;
  highest_status_val TEXT;
  submitted_by_val UUID;
  team_node_exists BOOLEAN := FALSE;
BEGIN
  -- Get the user's team for this map node (if any)
  SELECT tm.team_id INTO team_id_val
  FROM team_memberships tm
  JOIN classroom_team_maps ctm ON ctm.team_id = tm.team_id
  JOIN map_nodes mn ON mn.map_id = ctm.map_id
  WHERE tm.user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND mn.id = COALESCE(NEW.node_id, OLD.node_id)
    AND tm.left_at IS NULL
  LIMIT 1;

  -- Exit if this user is not in a team for this map
  IF team_id_val IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check if team progress record already exists
  SELECT EXISTS(
    SELECT 1 FROM team_node_progress 
    WHERE team_id = team_id_val 
    AND node_id = COALESCE(NEW.node_id, OLD.node_id)
  ) INTO team_node_exists;

  -- Determine the highest status achieved by any team member for this node
  WITH team_member_progress AS (
    SELECT 
      snp.status,
      snp.user_id,
      snp.submitted_at,
      CASE 
        WHEN snp.status = 'passed' THEN 6
        WHEN snp.status = 'submitted' THEN 5
        WHEN snp.status = 'in_progress' THEN 4
        WHEN snp.status = 'failed' THEN 3
        WHEN snp.status = 'not_started' THEN 2
        ELSE 1
      END as status_priority
    FROM student_node_progress snp
    JOIN team_memberships tm ON tm.user_id = snp.user_id
    WHERE tm.team_id = team_id_val
      AND snp.node_id = COALESCE(NEW.node_id, OLD.node_id)
      AND tm.left_at IS NULL
  ),
  highest_progress AS (
    SELECT 
      status,
      user_id,
      submitted_at,
      ROW_NUMBER() OVER (
        ORDER BY status_priority DESC, submitted_at DESC NULLS LAST
      ) as rn
    FROM team_member_progress
  )
  SELECT status, user_id INTO highest_status_val, submitted_by_val
  FROM highest_progress 
  WHERE rn = 1;

  -- Default to not_started if no progress found
  IF highest_status_val IS NULL THEN
    highest_status_val := 'not_started';
    submitted_by_val := NULL;
  END IF;

  -- Insert or update team progress
  INSERT INTO team_node_progress (
    team_id, 
    node_id, 
    status, 
    submitted_by, 
    completed_at,
    created_at,
    updated_at
  )
  VALUES (
    team_id_val, 
    COALESCE(NEW.node_id, OLD.node_id), 
    highest_status_val,
    submitted_by_val,
    CASE WHEN highest_status_val IN ('passed', 'passed_late', 'passed_zero_grade', 'failed') THEN NOW() ELSE NULL END,
    NOW(),
    NOW()
  )
  ON CONFLICT (team_id, node_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    submitted_by = EXCLUDED.submitted_by,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;


  create policy "instructors_and_admins_view_submissions"
  on "public"."assessment_submissions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]))))));



  create policy "Group members can view group membership"
  on "public"."assignment_group_members"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM assignment_group_members agm
  WHERE ((agm.group_id = assignment_group_members.group_id) AND (agm.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (assignment_groups ag
     JOIN classroom_memberships cm ON ((ag.classroom_id = cm.classroom_id)))
  WHERE ((ag.id = assignment_group_members.group_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[])))))));



  create policy "Instructors can manage group membership"
  on "public"."assignment_group_members"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (assignment_groups ag
     JOIN classroom_memberships cm ON ((ag.classroom_id = cm.classroom_id)))
  WHERE ((ag.id = assignment_group_members.group_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))));



  create policy "Students can join assignment groups"
  on "public"."assignment_group_members"
  as permissive
  for insert
  to public
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (assignment_groups ag
     JOIN classroom_memberships cm ON ((ag.classroom_id = cm.classroom_id)))
  WHERE ((ag.id = assignment_group_members.group_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = 'student'::text) AND (ag.is_active = true) AND ((ag.max_members IS NULL) OR (( SELECT count(*) AS count
           FROM assignment_group_members assignment_group_members_1
          WHERE (assignment_group_members_1.group_id = ag.id)) < ag.max_members)))))));



  create policy "users_view_own_memberships"
  on "public"."classroom_memberships"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "instructors_and_admins_view_progress"
  on "public"."student_node_progress"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]))))));



  create policy "instructors_and_admins_create_grades"
  on "public"."submission_grades"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]))))));



  create policy "instructors_and_admins_update_grades"
  on "public"."submission_grades"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]))))));



  create policy "instructors_and_admins_view_grades"
  on "public"."submission_grades"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]))))));



