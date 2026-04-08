drop trigger if exists "ai_chat_usage_updated_at" on "public"."ai_chat_usage";

drop trigger if exists "trg_replies_updated_at" on "public"."hackathon_activity_comment_replies";

drop trigger if exists "trg_update_engagement_on_delete" on "public"."hackathon_activity_comment_replies";

drop trigger if exists "trg_update_engagement_on_insert" on "public"."hackathon_activity_comment_replies";

drop trigger if exists "trg_update_engagement_on_update" on "public"."hackathon_activity_comment_replies";

drop trigger if exists "trg_comments_updated_at" on "public"."hackathon_activity_comments";

drop trigger if exists "trg_push_tokens_updated_at" on "public"."hackathon_participant_push_tokens";

drop policy "Service role can manage AI chat usage" on "public"."ai_chat_usage";

drop policy "Users can view their own AI chat usage" on "public"."ai_chat_usage";

drop policy "Admins and mentors can delete any reply" on "public"."hackathon_activity_comment_replies";

drop policy "Authors can delete own replies" on "public"."hackathon_activity_comment_replies";

drop policy "Authors can update own replies" on "public"."hackathon_activity_comment_replies";

drop policy "Participants can insert own replies" on "public"."hackathon_activity_comment_replies";

drop policy "Participants can view replies" on "public"."hackathon_activity_comment_replies";

drop policy "Admins and mentors can delete any comment" on "public"."hackathon_activity_comments";

drop policy "Authors can delete own comments" on "public"."hackathon_activity_comments";

drop policy "Authors can update own comments" on "public"."hackathon_activity_comments";

drop policy "Participants can insert own comments" on "public"."hackathon_activity_comments";

drop policy "Participants can view comments" on "public"."hackathon_activity_comments";

drop policy "Participants can delete own push tokens" on "public"."hackathon_participant_push_tokens";

drop policy "Participants can insert own push tokens" on "public"."hackathon_participant_push_tokens";

drop policy "Participants can update own push tokens" on "public"."hackathon_participant_push_tokens";

drop policy "Participants can view own push tokens" on "public"."hackathon_participant_push_tokens";

drop policy "Users can delete own score events" on "public"."score_events";

drop policy "Users can insert own score events" on "public"."score_events";

drop policy "Users can read own score events" on "public"."score_events";

drop policy "Users can update own score events" on "public"."score_events";

drop policy "Group members can view group membership" on "public"."assignment_group_members";

drop policy "Instructors can manage group membership" on "public"."assignment_group_members";

revoke delete on table "public"."ai_chat_usage" from "anon";

revoke insert on table "public"."ai_chat_usage" from "anon";

revoke references on table "public"."ai_chat_usage" from "anon";

revoke select on table "public"."ai_chat_usage" from "anon";

revoke trigger on table "public"."ai_chat_usage" from "anon";

revoke truncate on table "public"."ai_chat_usage" from "anon";

revoke update on table "public"."ai_chat_usage" from "anon";

revoke delete on table "public"."ai_chat_usage" from "authenticated";

revoke insert on table "public"."ai_chat_usage" from "authenticated";

revoke references on table "public"."ai_chat_usage" from "authenticated";

revoke select on table "public"."ai_chat_usage" from "authenticated";

revoke trigger on table "public"."ai_chat_usage" from "authenticated";

revoke truncate on table "public"."ai_chat_usage" from "authenticated";

revoke update on table "public"."ai_chat_usage" from "authenticated";

revoke delete on table "public"."ai_chat_usage" from "service_role";

revoke insert on table "public"."ai_chat_usage" from "service_role";

revoke references on table "public"."ai_chat_usage" from "service_role";

revoke select on table "public"."ai_chat_usage" from "service_role";

revoke trigger on table "public"."ai_chat_usage" from "service_role";

revoke truncate on table "public"."ai_chat_usage" from "service_role";

revoke update on table "public"."ai_chat_usage" from "service_role";

revoke delete on table "public"."hackathon_activity_comment_replies" from "anon";

revoke insert on table "public"."hackathon_activity_comment_replies" from "anon";

revoke references on table "public"."hackathon_activity_comment_replies" from "anon";

revoke select on table "public"."hackathon_activity_comment_replies" from "anon";

revoke trigger on table "public"."hackathon_activity_comment_replies" from "anon";

revoke truncate on table "public"."hackathon_activity_comment_replies" from "anon";

revoke update on table "public"."hackathon_activity_comment_replies" from "anon";

revoke delete on table "public"."hackathon_activity_comment_replies" from "authenticated";

revoke insert on table "public"."hackathon_activity_comment_replies" from "authenticated";

revoke references on table "public"."hackathon_activity_comment_replies" from "authenticated";

revoke select on table "public"."hackathon_activity_comment_replies" from "authenticated";

revoke trigger on table "public"."hackathon_activity_comment_replies" from "authenticated";

revoke truncate on table "public"."hackathon_activity_comment_replies" from "authenticated";

revoke update on table "public"."hackathon_activity_comment_replies" from "authenticated";

revoke delete on table "public"."hackathon_activity_comment_replies" from "service_role";

revoke insert on table "public"."hackathon_activity_comment_replies" from "service_role";

revoke references on table "public"."hackathon_activity_comment_replies" from "service_role";

revoke select on table "public"."hackathon_activity_comment_replies" from "service_role";

revoke trigger on table "public"."hackathon_activity_comment_replies" from "service_role";

revoke truncate on table "public"."hackathon_activity_comment_replies" from "service_role";

revoke update on table "public"."hackathon_activity_comment_replies" from "service_role";

revoke delete on table "public"."hackathon_activity_comments" from "anon";

revoke insert on table "public"."hackathon_activity_comments" from "anon";

revoke references on table "public"."hackathon_activity_comments" from "anon";

revoke select on table "public"."hackathon_activity_comments" from "anon";

revoke trigger on table "public"."hackathon_activity_comments" from "anon";

revoke truncate on table "public"."hackathon_activity_comments" from "anon";

revoke update on table "public"."hackathon_activity_comments" from "anon";

revoke delete on table "public"."hackathon_activity_comments" from "authenticated";

revoke insert on table "public"."hackathon_activity_comments" from "authenticated";

revoke references on table "public"."hackathon_activity_comments" from "authenticated";

revoke select on table "public"."hackathon_activity_comments" from "authenticated";

revoke trigger on table "public"."hackathon_activity_comments" from "authenticated";

revoke truncate on table "public"."hackathon_activity_comments" from "authenticated";

revoke update on table "public"."hackathon_activity_comments" from "authenticated";

revoke delete on table "public"."hackathon_activity_comments" from "service_role";

revoke insert on table "public"."hackathon_activity_comments" from "service_role";

revoke references on table "public"."hackathon_activity_comments" from "service_role";

revoke select on table "public"."hackathon_activity_comments" from "service_role";

revoke trigger on table "public"."hackathon_activity_comments" from "service_role";

revoke truncate on table "public"."hackathon_activity_comments" from "service_role";

revoke update on table "public"."hackathon_activity_comments" from "service_role";

revoke delete on table "public"."hackathon_participant_push_tokens" from "anon";

revoke insert on table "public"."hackathon_participant_push_tokens" from "anon";

revoke references on table "public"."hackathon_participant_push_tokens" from "anon";

revoke select on table "public"."hackathon_participant_push_tokens" from "anon";

revoke trigger on table "public"."hackathon_participant_push_tokens" from "anon";

revoke truncate on table "public"."hackathon_participant_push_tokens" from "anon";

revoke update on table "public"."hackathon_participant_push_tokens" from "anon";

revoke delete on table "public"."hackathon_participant_push_tokens" from "authenticated";

revoke insert on table "public"."hackathon_participant_push_tokens" from "authenticated";

revoke references on table "public"."hackathon_participant_push_tokens" from "authenticated";

revoke select on table "public"."hackathon_participant_push_tokens" from "authenticated";

revoke trigger on table "public"."hackathon_participant_push_tokens" from "authenticated";

revoke truncate on table "public"."hackathon_participant_push_tokens" from "authenticated";

revoke update on table "public"."hackathon_participant_push_tokens" from "authenticated";

revoke delete on table "public"."hackathon_participant_push_tokens" from "service_role";

revoke insert on table "public"."hackathon_participant_push_tokens" from "service_role";

revoke references on table "public"."hackathon_participant_push_tokens" from "service_role";

revoke select on table "public"."hackathon_participant_push_tokens" from "service_role";

revoke trigger on table "public"."hackathon_participant_push_tokens" from "service_role";

revoke truncate on table "public"."hackathon_participant_push_tokens" from "service_role";

revoke update on table "public"."hackathon_participant_push_tokens" from "service_role";

alter table "public"."ai_chat_usage" drop constraint if exists "ai_chat_usage_activity_id_fkey";

alter table "public"."ai_chat_usage" drop constraint if exists "ai_chat_usage_enrollment_id_fkey";

alter table "public"."ai_chat_usage" drop constraint if exists "ai_chat_usage_session_id_fkey";

alter table "public"."ai_chat_usage" drop constraint if exists "ai_chat_usage_user_id_fkey";

alter table "public"."ai_chat_usage" drop constraint if exists "ai_chat_usage_user_id_window_start_key";

alter table "public"."hackathon_activity_comment_replies" drop constraint if exists "hackathon_activity_comment_replies_comment_id_fkey";

alter table "public"."hackathon_activity_comment_replies" drop constraint if exists "hackathon_activity_comment_replies_content_check";

alter table "public"."hackathon_activity_comment_replies" drop constraint if exists "hackathon_activity_comment_replies_participant_id_fkey";

alter table "public"."hackathon_activity_comments" drop constraint if exists "hackathon_activity_comments_activity_id_fkey";

alter table "public"."hackathon_activity_comments" drop constraint if exists "hackathon_activity_comments_content_check";

alter table "public"."hackathon_activity_comments" drop constraint if exists "hackathon_activity_comments_participant_id_fkey";

alter table "public"."hackathon_participant_push_tokens" drop constraint if exists "hackathon_participant_push_tokens_participant_id_fkey";

alter table "public"."hackathon_participant_push_tokens" drop constraint if exists "hackathon_participant_push_tokens_platform_check";

alter table "public"."hackathon_participant_push_tokens" drop constraint if exists "hackathon_participant_push_tokens_push_token_key";

alter table "public"."hackathon_phase_activity_assessments" drop constraint if exists "hackathon_phase_activity_assessments_activity_id_key";

DO $$ BEGIN
  alter table "public"."hackathon_phase_activity_submissions" drop constraint if exists "hackathon_phase_activity_submiss_participant_id_activity_id_key";
EXCEPTION WHEN undefined_table THEN NULL; END $$;

alter table "public"."jobs" drop constraint if exists "jobs_automation_risk_check";

alter table "public"."jobs" drop constraint if exists "jobs_demand_trend_check";

alter table "public"."jobs" drop constraint if exists "jobs_viability_score_check";

alter table "public"."mindmap_topics" drop constraint if exists "mindmap_topics_challenge_rating_check";

alter table "public"."mindmap_topics" drop constraint if exists "mindmap_topics_progress_rating_check";

alter table "public"."mindmap_topics" drop constraint if exists "mindmap_topics_satisfaction_rating_check";

alter table "public"."score_events" drop constraint if exists "score_events_journey_id_fkey";

alter table "public"."score_events" drop constraint if exists "score_events_journey_or_reflection_check";

alter table "public"."score_events" drop constraint if exists "score_events_reflection_id_fkey";

alter table "public"."score_events" drop constraint if exists "score_events_score_type_check";

alter table "public"."score_events" drop constraint if exists "score_events_score_value_check";

alter table "public"."direction_finder_results" drop constraint if exists "direction_finder_results_original_result_id_fkey";

alter table "public"."hackathon_phase_activity_content" drop constraint if exists "hackathon_phase_activity_content_content_type_check";

alter table "public"."path_assessments" drop constraint if exists "path_assessments_assessment_type_check";

alter table "public"."path_content" drop constraint if exists "path_content_content_type_check";

alter table "public"."score_events" drop constraint if exists "score_events_user_id_fkey";

alter table "public"."student_node_progress" drop constraint if exists "student_node_progress_user_id_fkey";

drop function if exists "public"."increment_ai_chat_usage"(p_user_id uuid, p_activity_id uuid, p_enrollment_id uuid, p_session_id uuid);

drop function if exists "public"."update_ai_chat_usage_timestamp"();

drop function if exists "public"."update_comment_engagement_score"();

drop view if exists "public"."cache_effectiveness_stats";

drop view if exists "public"."program_career_mapping_details";

drop view if exists "public"."students_without_teams";

drop view if exists "public"."team_members_with_profiles";

alter table "public"."ai_chat_usage" drop constraint if exists "ai_chat_usage_pkey";

alter table "public"."hackathon_activity_comment_replies" drop constraint if exists "hackathon_activity_comment_replies_pkey";

alter table "public"."hackathon_activity_comments" drop constraint if exists "hackathon_activity_comments_pkey";

alter table "public"."hackathon_participant_push_tokens" drop constraint if exists "hackathon_participant_push_tokens_pkey";

drop index if exists "public"."ai_chat_usage_pkey";

drop index if exists "public"."ai_chat_usage_user_id_window_start_key";

drop index if exists "public"."hackathon_activity_comment_replies_pkey";

drop index if exists "public"."hackathon_activity_comments_pkey";

drop index if exists "public"."hackathon_participant_push_tokens_pkey";

drop index if exists "public"."hackathon_participant_push_tokens_push_token_key";

drop index if exists "public"."hackathon_phase_activity_assessments_activity_id_key";

drop index if exists "public"."hackathon_phase_activity_submiss_participant_id_activity_id_key";

drop index if exists "public"."idx_ai_chat_usage_activity";

drop index if exists "public"."idx_ai_chat_usage_user_created";

drop index if exists "public"."idx_ai_chat_usage_user_window";

drop index if exists "public"."idx_comments_activity";

drop index if exists "public"."idx_comments_engagement";

drop index if exists "public"."idx_push_tokens_participant";

drop index if exists "public"."idx_replies_comment";

drop index if exists "public"."idx_score_events_journey_id";

drop index if exists "public"."idx_score_events_reflection_id";

drop index if exists "public"."idx_score_events_type";

drop index if exists "public"."idx_score_events_user_created";

drop table "public"."ai_chat_usage";

drop table "public"."hackathon_activity_comment_replies";

drop table "public"."hackathon_activity_comments";

drop table "public"."hackathon_participant_push_tokens";


  create table "public"."angpao_countdown" (
    "id" integer not null default 1,
    "remaining_seconds" bigint not null default 0,
    "is_running" boolean not null default false,
    "last_daily_increment_date" date,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."angpao_countdown" enable row level security;


  create table "public"."journey_simulations" (
    "id" uuid not null default gen_random_uuid(),
    "student_id" uuid not null,
    "label" text,
    "pathlab_ids" uuid[] default '{}'::uuid[],
    "university_ids" uuid[] default '{}'::uuid[],
    "job_id" uuid,
    "passion_score" integer,
    "aptitude_score" integer,
    "journey_score" integer,
    "passion_confidence" text,
    "aptitude_confidence" text,
    "pivot_triggered" boolean default false,
    "pivot_snoozed_until" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."journey_simulations" enable row level security;


  create table "public"."viability_cache" (
    "job_id" uuid not null,
    "raw_data" jsonb,
    "score" integer,
    "fetched_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone
      );


alter table "public"."viability_cache" enable row level security;

alter table "public"."hackathon_phase_activity_assessments" add column if not exists "display_order" integer not null default 0;

alter table "public"."jobs" drop column "company";

alter table "public"."jobs" add column if not exists "description" text;

alter table "public"."jobs" add column if not exists "industry" text;

alter table "public"."jobs" add column if not exists "median_salary" integer;

alter table "public"."jobs" add column if not exists "required_degrees" text[] default '{}'::text[];

alter table "public"."jobs" add column if not exists "top_hiring_regions" text[] default '{}'::text[];

alter table "public"."jobs" add column if not exists "updated_at" timestamp with time zone default now();

alter table "public"."jobs" add column if not exists "viability_updated_at" timestamp with time zone;

alter table "public"."jobs" alter column "automation_risk" set data type double precision using "automation_risk"::double precision;

alter table "public"."jobs" alter column "title" set not null;

alter table "public"."mindmap_topics" drop column "challenge_rating";

alter table "public"."mindmap_topics" drop column "progress_rating";

alter table "public"."mindmap_topics" drop column "reflection_why";

alter table "public"."mindmap_topics" drop column "satisfaction_rating";

alter table "public"."profiles" add column if not exists "expo_push_token" text;

alter table "public"."score_events" drop column "journey_id";

alter table "public"."score_events" drop column "metadata";

alter table "public"."score_events" drop column "reflection_id";

alter table "public"."score_events" drop column "score_type";

alter table "public"."score_events" drop column "score_value";

alter table "public"."score_events" add column if not exists "delta" integer;

alter table "public"."score_events" add column if not exists "event_type" text;

alter table "public"."score_events" add column if not exists "factor" text;

alter table "public"."score_events" add column if not exists "new_value" integer;

alter table "public"."score_events" add column if not exists "reason_string" text;

alter table "public"."score_events" add column if not exists "simulation_id" uuid;

alter table "public"."score_events" add column if not exists "source_id" uuid;

alter table "public"."score_events" add column if not exists "student_id" uuid not null;

alter table "public"."score_events" alter column "created_at" drop not null;

alter table "public"."score_events" alter column "user_id" drop not null;

alter table "public"."seeds" add column if not exists "tags" text[] not null default '{}'::text[];

alter table "public"."universities" add column if not exists "country" text;

alter table "public"."universities" add column if not exists "linked_job_ids" uuid[] default '{}'::uuid[];

alter table "public"."universities" add column if not exists "programs" jsonb[] default '{}'::jsonb[];

CREATE UNIQUE INDEX IF NOT EXISTS angpao_countdown_pkey ON public.angpao_countdown USING btree (id);

CREATE INDEX IF NOT EXISTS direction_finder_results_cache_key_idx ON public.direction_finder_results USING btree (cache_key);

CREATE UNIQUE INDEX IF NOT EXISTS hackathon_phase_activity_assessments_activity_id_display_order_ ON public.hackathon_phase_activity_assessments USING btree (activity_id, display_order);

CREATE UNIQUE INDEX IF NOT EXISTS journey_simulations_pkey ON public.journey_simulations USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS viability_cache_pkey ON public.viability_cache USING btree (job_id);

alter table "public"."angpao_countdown" add constraint "angpao_countdown_pkey" PRIMARY KEY using index "angpao_countdown_pkey";

alter table "public"."journey_simulations" add constraint "journey_simulations_pkey" PRIMARY KEY using index "journey_simulations_pkey";

alter table "public"."viability_cache" add constraint "viability_cache_pkey" PRIMARY KEY using index "viability_cache_pkey";

alter table "public"."angpao_countdown" add constraint "angpao_countdown_id_check" CHECK ((id = 1)) not valid;

alter table "public"."angpao_countdown" validate constraint "angpao_countdown_id_check";

DO $$ BEGIN
  alter table "public"."hackathon_phase_activity_assessments" add constraint "hackathon_phase_activity_assessments_activity_id_display_order_" UNIQUE using index "hackathon_phase_activity_assessments_activity_id_display_order_";
EXCEPTION WHEN SQLSTATE '55000' OR SQLSTATE '42710' THEN NULL; END $$;

alter table "public"."journey_simulations" add constraint "journey_simulations_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL not valid;

alter table "public"."journey_simulations" validate constraint "journey_simulations_job_id_fkey";

alter table "public"."score_events" add constraint "score_events_simulation_id_fkey" FOREIGN KEY (simulation_id) REFERENCES public.journey_simulations(id) ON DELETE CASCADE not valid;

alter table "public"."score_events" validate constraint "score_events_simulation_id_fkey";

alter table "public"."viability_cache" add constraint "viability_cache_job_id_fkey" FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE not valid;

alter table "public"."viability_cache" validate constraint "viability_cache_job_id_fkey";

alter table "public"."direction_finder_results" add constraint "direction_finder_results_original_result_id_fkey" FOREIGN KEY (original_result_id) REFERENCES public.direction_finder_results(id) not valid;

alter table "public"."direction_finder_results" validate constraint "direction_finder_results_original_result_id_fkey";

alter table "public"."hackathon_phase_activity_content" add constraint "hackathon_phase_activity_content_content_type_check" CHECK ((content_type = ANY (ARRAY['video'::text, 'short_video'::text, 'canva_slide'::text, 'text'::text, 'image'::text, 'pdf'::text, 'ai_chat'::text, 'npc_chat'::text, 'infographic_comic'::text, 'webtoon'::text]))) not valid;

alter table "public"."hackathon_phase_activity_content" validate constraint "hackathon_phase_activity_content_content_type_check";

alter table "public"."path_assessments" add constraint "path_assessments_assessment_type_check" CHECK ((assessment_type = ANY (ARRAY['quiz'::text, 'text_answer'::text, 'file_upload'::text, 'image_upload'::text, 'checklist'::text, 'daily_reflection'::text, 'interest_rating'::text, 'energy_check'::text]))) not valid;

alter table "public"."path_assessments" validate constraint "path_assessments_assessment_type_check";

alter table "public"."path_content" add constraint "path_content_content_type_check" CHECK ((content_type = ANY (ARRAY['video'::text, 'short_video'::text, 'canva_slide'::text, 'text'::text, 'image'::text, 'pdf'::text, 'resource_link'::text, 'order_code'::text, 'daily_prompt'::text, 'reflection_card'::text, 'emotion_check'::text, 'progress_snapshot'::text, 'ai_chat'::text, 'npc_chat'::text]))) not valid;

alter table "public"."path_content" validate constraint "path_content_content_type_check";

alter table "public"."score_events" add constraint "score_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."score_events" validate constraint "score_events_user_id_fkey";

alter table "public"."student_node_progress" add constraint "student_node_progress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."student_node_progress" validate constraint "student_node_progress_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_max_simulations()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (SELECT count(*) FROM public.journey_simulations WHERE student_id = NEW.student_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum of 3 simulations allowed per student.';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_angpao_countdown_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

create or replace view "public"."cache_effectiveness_stats" as  SELECT dfr.answers_hash,
    dfr.model_name,
    count(*) AS usage_count,
    max(dfr.cache_hit_count) AS max_cache_hits,
    avg(dfm.total_generation_time_ms) AS avg_fresh_generation_time_ms,
    min(dfr.created_at) AS first_seen,
    max(dfr.created_at) AS last_seen,
    ("left"((dfr.answers)::text, 100) || '...'::text) AS sample_answers
   FROM (public.direction_finder_results dfr
     LEFT JOIN public.direction_finder_metrics dfm ON ((dfr.id = dfm.result_id)))
  WHERE ((dfr.cache_key IS NOT NULL) AND (dfr.created_at > (now() - '7 days'::interval)))
  GROUP BY dfr.answers_hash, dfr.model_name, dfr.answers
 HAVING (count(*) > 1)
  ORDER BY (count(*)) DESC, (max(dfr.cache_hit_count)) DESC
 LIMIT 50;


CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  temp_username text;
  counter int := 0;
  temp_full_name text;
BEGIN
  -- Extract full name from metadata
  temp_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'display_name'
  );
  
  -- Generate a temporary unique username based on email or user ID
  temp_username := COALESCE(
    new.raw_user_meta_data->>'preferred_username',
    split_part(new.email, '@', 1),
    'user_' || substring(new.id::text, 1, 8)
  );
  
  -- Make sure username is unique by adding a counter if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = temp_username) LOOP
    counter := counter + 1;
    temp_username := COALESCE(
      split_part(new.email, '@', 1),
      'user_' || substring(new.id::text, 1, 8)
    ) || '_' || counter;
  END LOOP;
  
  -- Insert with all required fields including date_of_birth
  INSERT INTO public.profiles (
    id, 
    username, 
    email, 
    full_name,
    avatar_url,
    date_of_birth,
    created_at, 
    updated_at
  )
  VALUES (
    new.id,
    temp_username,
    new.email,
    temp_full_name,
    new.raw_user_meta_data->>'avatar_url',
    NULL, -- date_of_birth will be filled later in onboarding
    now(),
    now()
  );
  
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, that's fine
    RAISE NOTICE 'Profile already exists for user %', new.id;
    RETURN new;
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$function$
;

create or replace view "public"."program_career_mapping_details" as  SELECT pcm.id AS mapping_id,
    pcm.program_id,
    tp.program_name,
    tp.program_name_en,
    tp.faculty_name,
    tu.university_name,
    pcm.career_id,
    j.title AS career_title,
    j.category AS career_category,
    pcm.confidence,
    pcm.mapping_reason,
    pcm.created_at,
    pcm.updated_at
   FROM (((public.program_career_mappings pcm
     JOIN public.tcas_programs tp ON ((pcm.program_id = tp.id)))
     JOIN public.tcas_universities tu ON ((tp.university_id = tu.university_id)))
     JOIN public.jobs j ON ((pcm.career_id = j.id)));


create or replace view "public"."students_without_teams" as  SELECT cm.classroom_id,
    cm.user_id,
    p.username,
    p.full_name,
    p.avatar_url
   FROM (public.classroom_memberships cm
     JOIN public.profiles p ON ((p.id = cm.user_id)))
  WHERE (((cm.role)::text = 'student'::text) AND (NOT (EXISTS ( SELECT 1
           FROM (public.team_memberships tm
             JOIN public.classroom_teams ct ON ((ct.id = tm.team_id)))
          WHERE ((tm.user_id = cm.user_id) AND (ct.classroom_id = cm.classroom_id) AND (ct.is_active = true) AND (tm.left_at IS NULL))))));


create or replace view "public"."team_members_with_profiles" as  SELECT tm.id,
    tm.team_id,
    tm.user_id,
    tm.role,
    tm.joined_at,
    tm.left_at,
    tm.is_leader,
    tm.member_metadata,
    p.username,
    p.full_name,
    p.avatar_url,
    ct.classroom_id
   FROM ((public.team_memberships tm
     JOIN public.profiles p ON ((p.id = tm.user_id)))
     JOIN public.classroom_teams ct ON ((ct.id = tm.team_id)))
  WHERE (ct.is_active = true);


CREATE OR REPLACE FUNCTION public.update_classroom_map_features_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."admin_activity_log" to "anon";

grant insert on table "public"."admin_activity_log" to "anon";

grant references on table "public"."admin_activity_log" to "anon";

grant select on table "public"."admin_activity_log" to "anon";

grant trigger on table "public"."admin_activity_log" to "anon";

grant truncate on table "public"."admin_activity_log" to "anon";

grant update on table "public"."admin_activity_log" to "anon";

grant delete on table "public"."admin_activity_log" to "authenticated";

grant insert on table "public"."admin_activity_log" to "authenticated";

grant references on table "public"."admin_activity_log" to "authenticated";

grant select on table "public"."admin_activity_log" to "authenticated";

grant trigger on table "public"."admin_activity_log" to "authenticated";

grant truncate on table "public"."admin_activity_log" to "authenticated";

grant update on table "public"."admin_activity_log" to "authenticated";

grant delete on table "public"."admin_activity_log" to "service_role";

grant insert on table "public"."admin_activity_log" to "service_role";

grant references on table "public"."admin_activity_log" to "service_role";

grant select on table "public"."admin_activity_log" to "service_role";

grant trigger on table "public"."admin_activity_log" to "service_role";

grant truncate on table "public"."admin_activity_log" to "service_role";

grant update on table "public"."admin_activity_log" to "service_role";

grant delete on table "public"."angpao_countdown" to "anon";

grant insert on table "public"."angpao_countdown" to "anon";

grant references on table "public"."angpao_countdown" to "anon";

grant select on table "public"."angpao_countdown" to "anon";

grant trigger on table "public"."angpao_countdown" to "anon";

grant truncate on table "public"."angpao_countdown" to "anon";

grant update on table "public"."angpao_countdown" to "anon";

grant delete on table "public"."angpao_countdown" to "authenticated";

grant insert on table "public"."angpao_countdown" to "authenticated";

grant references on table "public"."angpao_countdown" to "authenticated";

grant select on table "public"."angpao_countdown" to "authenticated";

grant trigger on table "public"."angpao_countdown" to "authenticated";

grant truncate on table "public"."angpao_countdown" to "authenticated";

grant update on table "public"."angpao_countdown" to "authenticated";

grant delete on table "public"."angpao_countdown" to "service_role";

grant insert on table "public"."angpao_countdown" to "service_role";

grant references on table "public"."angpao_countdown" to "service_role";

grant select on table "public"."angpao_countdown" to "service_role";

grant trigger on table "public"."angpao_countdown" to "service_role";

grant truncate on table "public"."angpao_countdown" to "service_role";

grant update on table "public"."angpao_countdown" to "service_role";

grant delete on table "public"."assessment_submissions" to "anon";

grant insert on table "public"."assessment_submissions" to "anon";

grant references on table "public"."assessment_submissions" to "anon";

grant select on table "public"."assessment_submissions" to "anon";

grant trigger on table "public"."assessment_submissions" to "anon";

grant truncate on table "public"."assessment_submissions" to "anon";

grant update on table "public"."assessment_submissions" to "anon";

grant delete on table "public"."assignment_enrollments" to "service_role";

grant insert on table "public"."assignment_enrollments" to "service_role";

grant references on table "public"."assignment_enrollments" to "service_role";

grant select on table "public"."assignment_enrollments" to "service_role";

grant trigger on table "public"."assignment_enrollments" to "service_role";

grant truncate on table "public"."assignment_enrollments" to "service_role";

grant update on table "public"."assignment_enrollments" to "service_role";

grant delete on table "public"."assignment_group_assignments" to "service_role";

grant insert on table "public"."assignment_group_assignments" to "service_role";

grant references on table "public"."assignment_group_assignments" to "service_role";

grant select on table "public"."assignment_group_assignments" to "service_role";

grant trigger on table "public"."assignment_group_assignments" to "service_role";

grant truncate on table "public"."assignment_group_assignments" to "service_role";

grant update on table "public"."assignment_group_assignments" to "service_role";

grant delete on table "public"."assignment_group_members" to "service_role";

grant insert on table "public"."assignment_group_members" to "service_role";

grant references on table "public"."assignment_group_members" to "service_role";

grant select on table "public"."assignment_group_members" to "service_role";

grant trigger on table "public"."assignment_group_members" to "service_role";

grant truncate on table "public"."assignment_group_members" to "service_role";

grant update on table "public"."assignment_group_members" to "service_role";

grant delete on table "public"."assignment_groups" to "service_role";

grant insert on table "public"."assignment_groups" to "service_role";

grant references on table "public"."assignment_groups" to "service_role";

grant select on table "public"."assignment_groups" to "service_role";

grant trigger on table "public"."assignment_groups" to "service_role";

grant truncate on table "public"."assignment_groups" to "service_role";

grant update on table "public"."assignment_groups" to "service_role";

grant delete on table "public"."assignment_nodes" to "anon";

grant insert on table "public"."assignment_nodes" to "anon";

grant references on table "public"."assignment_nodes" to "anon";

grant select on table "public"."assignment_nodes" to "anon";

grant trigger on table "public"."assignment_nodes" to "anon";

grant truncate on table "public"."assignment_nodes" to "anon";

grant update on table "public"."assignment_nodes" to "anon";

grant delete on table "public"."assignment_nodes" to "authenticated";

grant insert on table "public"."assignment_nodes" to "authenticated";

grant references on table "public"."assignment_nodes" to "authenticated";

grant trigger on table "public"."assignment_nodes" to "authenticated";

grant truncate on table "public"."assignment_nodes" to "authenticated";

grant update on table "public"."assignment_nodes" to "authenticated";

grant delete on table "public"."assignment_nodes" to "service_role";

grant insert on table "public"."assignment_nodes" to "service_role";

grant references on table "public"."assignment_nodes" to "service_role";

grant select on table "public"."assignment_nodes" to "service_role";

grant trigger on table "public"."assignment_nodes" to "service_role";

grant truncate on table "public"."assignment_nodes" to "service_role";

grant update on table "public"."assignment_nodes" to "service_role";

grant delete on table "public"."branches" to "anon";

grant insert on table "public"."branches" to "anon";

grant references on table "public"."branches" to "anon";

grant select on table "public"."branches" to "anon";

grant trigger on table "public"."branches" to "anon";

grant truncate on table "public"."branches" to "anon";

grant update on table "public"."branches" to "anon";

grant delete on table "public"."branches" to "authenticated";

grant insert on table "public"."branches" to "authenticated";

grant references on table "public"."branches" to "authenticated";

grant trigger on table "public"."branches" to "authenticated";

grant truncate on table "public"."branches" to "authenticated";

grant update on table "public"."branches" to "authenticated";

grant delete on table "public"."branches" to "service_role";

grant insert on table "public"."branches" to "service_role";

grant references on table "public"."branches" to "service_role";

grant select on table "public"."branches" to "service_role";

grant trigger on table "public"."branches" to "service_role";

grant truncate on table "public"."branches" to "service_role";

grant update on table "public"."branches" to "service_role";

grant delete on table "public"."chat_messages" to "service_role";

grant insert on table "public"."chat_messages" to "service_role";

grant references on table "public"."chat_messages" to "service_role";

grant select on table "public"."chat_messages" to "service_role";

grant trigger on table "public"."chat_messages" to "service_role";

grant truncate on table "public"."chat_messages" to "service_role";

grant update on table "public"."chat_messages" to "service_role";

grant delete on table "public"."classroom_assignments" to "service_role";

grant insert on table "public"."classroom_assignments" to "service_role";

grant references on table "public"."classroom_assignments" to "service_role";

grant select on table "public"."classroom_assignments" to "service_role";

grant trigger on table "public"."classroom_assignments" to "service_role";

grant truncate on table "public"."classroom_assignments" to "service_role";

grant update on table "public"."classroom_assignments" to "service_role";

grant delete on table "public"."classroom_maps" to "service_role";

grant insert on table "public"."classroom_maps" to "service_role";

grant references on table "public"."classroom_maps" to "service_role";

grant select on table "public"."classroom_maps" to "service_role";

grant trigger on table "public"."classroom_maps" to "service_role";

grant truncate on table "public"."classroom_maps" to "service_role";

grant update on table "public"."classroom_maps" to "service_role";

grant delete on table "public"."classroom_memberships" to "anon";

grant insert on table "public"."classroom_memberships" to "anon";

grant references on table "public"."classroom_memberships" to "anon";

grant select on table "public"."classroom_memberships" to "anon";

grant trigger on table "public"."classroom_memberships" to "anon";

grant truncate on table "public"."classroom_memberships" to "anon";

grant update on table "public"."classroom_memberships" to "anon";

grant delete on table "public"."classroom_team_maps" to "anon";

grant insert on table "public"."classroom_team_maps" to "anon";

grant references on table "public"."classroom_team_maps" to "anon";

grant select on table "public"."classroom_team_maps" to "anon";

grant trigger on table "public"."classroom_team_maps" to "anon";

grant truncate on table "public"."classroom_team_maps" to "anon";

grant update on table "public"."classroom_team_maps" to "anon";

grant delete on table "public"."classroom_team_maps" to "authenticated";

grant insert on table "public"."classroom_team_maps" to "authenticated";

grant references on table "public"."classroom_team_maps" to "authenticated";

grant trigger on table "public"."classroom_team_maps" to "authenticated";

grant truncate on table "public"."classroom_team_maps" to "authenticated";

grant update on table "public"."classroom_team_maps" to "authenticated";

grant delete on table "public"."classroom_team_maps" to "service_role";

grant insert on table "public"."classroom_team_maps" to "service_role";

grant references on table "public"."classroom_team_maps" to "service_role";

grant select on table "public"."classroom_team_maps" to "service_role";

grant trigger on table "public"."classroom_team_maps" to "service_role";

grant truncate on table "public"."classroom_team_maps" to "service_role";

grant update on table "public"."classroom_team_maps" to "service_role";

grant delete on table "public"."classroom_teams" to "service_role";

grant insert on table "public"."classroom_teams" to "service_role";

grant references on table "public"."classroom_teams" to "service_role";

grant select on table "public"."classroom_teams" to "service_role";

grant trigger on table "public"."classroom_teams" to "service_role";

grant truncate on table "public"."classroom_teams" to "service_role";

grant update on table "public"."classroom_teams" to "service_role";

grant delete on table "public"."classrooms" to "service_role";

grant insert on table "public"."classrooms" to "service_role";

grant references on table "public"."classrooms" to "service_role";

grant select on table "public"."classrooms" to "service_role";

grant trigger on table "public"."classrooms" to "service_role";

grant truncate on table "public"."classrooms" to "service_role";

grant update on table "public"."classrooms" to "service_role";

grant delete on table "public"."cohort_map_enrollments" to "service_role";

grant insert on table "public"."cohort_map_enrollments" to "service_role";

grant references on table "public"."cohort_map_enrollments" to "service_role";

grant select on table "public"."cohort_map_enrollments" to "service_role";

grant trigger on table "public"."cohort_map_enrollments" to "service_role";

grant truncate on table "public"."cohort_map_enrollments" to "service_role";

grant update on table "public"."cohort_map_enrollments" to "service_role";

grant delete on table "public"."cohorts" to "service_role";

grant insert on table "public"."cohorts" to "service_role";

grant references on table "public"."cohorts" to "service_role";

grant select on table "public"."cohorts" to "service_role";

grant trigger on table "public"."cohorts" to "service_role";

grant truncate on table "public"."cohorts" to "service_role";

grant update on table "public"."cohorts" to "service_role";

grant delete on table "public"."communities" to "anon";

grant insert on table "public"."communities" to "anon";

grant references on table "public"."communities" to "anon";

grant select on table "public"."communities" to "anon";

grant trigger on table "public"."communities" to "anon";

grant truncate on table "public"."communities" to "anon";

grant update on table "public"."communities" to "anon";

grant delete on table "public"."communities" to "authenticated";

grant insert on table "public"."communities" to "authenticated";

grant references on table "public"."communities" to "authenticated";

grant trigger on table "public"."communities" to "authenticated";

grant truncate on table "public"."communities" to "authenticated";

grant update on table "public"."communities" to "authenticated";

grant delete on table "public"."communities" to "service_role";

grant insert on table "public"."communities" to "service_role";

grant references on table "public"."communities" to "service_role";

grant select on table "public"."communities" to "service_role";

grant trigger on table "public"."communities" to "service_role";

grant truncate on table "public"."communities" to "service_role";

grant update on table "public"."communities" to "service_role";

grant delete on table "public"."community_images" to "anon";

grant insert on table "public"."community_images" to "anon";

grant references on table "public"."community_images" to "anon";

grant select on table "public"."community_images" to "anon";

grant trigger on table "public"."community_images" to "anon";

grant truncate on table "public"."community_images" to "anon";

grant update on table "public"."community_images" to "anon";

grant delete on table "public"."community_images" to "authenticated";

grant insert on table "public"."community_images" to "authenticated";

grant references on table "public"."community_images" to "authenticated";

grant trigger on table "public"."community_images" to "authenticated";

grant truncate on table "public"."community_images" to "authenticated";

grant update on table "public"."community_images" to "authenticated";

grant delete on table "public"."community_images" to "service_role";

grant insert on table "public"."community_images" to "service_role";

grant references on table "public"."community_images" to "service_role";

grant select on table "public"."community_images" to "service_role";

grant trigger on table "public"."community_images" to "service_role";

grant truncate on table "public"."community_images" to "service_role";

grant update on table "public"."community_images" to "service_role";

grant delete on table "public"."community_mentors" to "anon";

grant insert on table "public"."community_mentors" to "anon";

grant references on table "public"."community_mentors" to "anon";

grant select on table "public"."community_mentors" to "anon";

grant trigger on table "public"."community_mentors" to "anon";

grant truncate on table "public"."community_mentors" to "anon";

grant update on table "public"."community_mentors" to "anon";

grant delete on table "public"."community_mentors" to "authenticated";

grant insert on table "public"."community_mentors" to "authenticated";

grant references on table "public"."community_mentors" to "authenticated";

grant trigger on table "public"."community_mentors" to "authenticated";

grant truncate on table "public"."community_mentors" to "authenticated";

grant update on table "public"."community_mentors" to "authenticated";

grant delete on table "public"."community_mentors" to "service_role";

grant insert on table "public"."community_mentors" to "service_role";

grant references on table "public"."community_mentors" to "service_role";

grant select on table "public"."community_mentors" to "service_role";

grant trigger on table "public"."community_mentors" to "service_role";

grant truncate on table "public"."community_mentors" to "service_role";

grant update on table "public"."community_mentors" to "service_role";

grant delete on table "public"."community_posts" to "anon";

grant insert on table "public"."community_posts" to "anon";

grant references on table "public"."community_posts" to "anon";

grant select on table "public"."community_posts" to "anon";

grant trigger on table "public"."community_posts" to "anon";

grant truncate on table "public"."community_posts" to "anon";

grant update on table "public"."community_posts" to "anon";

grant delete on table "public"."community_posts" to "authenticated";

grant insert on table "public"."community_posts" to "authenticated";

grant references on table "public"."community_posts" to "authenticated";

grant trigger on table "public"."community_posts" to "authenticated";

grant truncate on table "public"."community_posts" to "authenticated";

grant update on table "public"."community_posts" to "authenticated";

grant delete on table "public"."community_posts" to "service_role";

grant insert on table "public"."community_posts" to "service_role";

grant references on table "public"."community_posts" to "service_role";

grant select on table "public"."community_posts" to "service_role";

grant trigger on table "public"."community_posts" to "service_role";

grant truncate on table "public"."community_posts" to "service_role";

grant update on table "public"."community_posts" to "service_role";

grant delete on table "public"."community_projects" to "anon";

grant insert on table "public"."community_projects" to "anon";

grant references on table "public"."community_projects" to "anon";

grant select on table "public"."community_projects" to "anon";

grant trigger on table "public"."community_projects" to "anon";

grant truncate on table "public"."community_projects" to "anon";

grant update on table "public"."community_projects" to "anon";

grant references on table "public"."community_projects" to "authenticated";

grant trigger on table "public"."community_projects" to "authenticated";

grant truncate on table "public"."community_projects" to "authenticated";

grant delete on table "public"."community_projects" to "service_role";

grant insert on table "public"."community_projects" to "service_role";

grant references on table "public"."community_projects" to "service_role";

grant select on table "public"."community_projects" to "service_role";

grant trigger on table "public"."community_projects" to "service_role";

grant truncate on table "public"."community_projects" to "service_role";

grant update on table "public"."community_projects" to "service_role";

grant delete on table "public"."connections" to "anon";

grant insert on table "public"."connections" to "anon";

grant references on table "public"."connections" to "anon";

grant select on table "public"."connections" to "anon";

grant trigger on table "public"."connections" to "anon";

grant truncate on table "public"."connections" to "anon";

grant update on table "public"."connections" to "anon";

grant delete on table "public"."connections" to "authenticated";

grant insert on table "public"."connections" to "authenticated";

grant references on table "public"."connections" to "authenticated";

grant trigger on table "public"."connections" to "authenticated";

grant truncate on table "public"."connections" to "authenticated";

grant update on table "public"."connections" to "authenticated";

grant delete on table "public"."connections" to "service_role";

grant insert on table "public"."connections" to "service_role";

grant references on table "public"."connections" to "service_role";

grant select on table "public"."connections" to "service_role";

grant trigger on table "public"."connections" to "service_role";

grant truncate on table "public"."connections" to "service_role";

grant update on table "public"."connections" to "service_role";

grant delete on table "public"."emotions" to "anon";

grant insert on table "public"."emotions" to "anon";

grant references on table "public"."emotions" to "anon";

grant select on table "public"."emotions" to "anon";

grant trigger on table "public"."emotions" to "anon";

grant truncate on table "public"."emotions" to "anon";

grant update on table "public"."emotions" to "anon";

grant delete on table "public"."emotions" to "authenticated";

grant insert on table "public"."emotions" to "authenticated";

grant references on table "public"."emotions" to "authenticated";

grant trigger on table "public"."emotions" to "authenticated";

grant truncate on table "public"."emotions" to "authenticated";

grant update on table "public"."emotions" to "authenticated";

grant delete on table "public"."emotions" to "service_role";

grant insert on table "public"."emotions" to "service_role";

grant references on table "public"."emotions" to "service_role";

grant select on table "public"."emotions" to "service_role";

grant trigger on table "public"."emotions" to "service_role";

grant truncate on table "public"."emotions" to "service_role";

grant update on table "public"."emotions" to "service_role";

grant delete on table "public"."engagement" to "anon";

grant insert on table "public"."engagement" to "anon";

grant references on table "public"."engagement" to "anon";

grant select on table "public"."engagement" to "anon";

grant trigger on table "public"."engagement" to "anon";

grant truncate on table "public"."engagement" to "anon";

grant update on table "public"."engagement" to "anon";

grant delete on table "public"."engagement" to "authenticated";

grant insert on table "public"."engagement" to "authenticated";

grant references on table "public"."engagement" to "authenticated";

grant trigger on table "public"."engagement" to "authenticated";

grant truncate on table "public"."engagement" to "authenticated";

grant update on table "public"."engagement" to "authenticated";

grant delete on table "public"."engagement" to "service_role";

grant insert on table "public"."engagement" to "service_role";

grant references on table "public"."engagement" to "service_role";

grant select on table "public"."engagement" to "service_role";

grant trigger on table "public"."engagement" to "service_role";

grant truncate on table "public"."engagement" to "service_role";

grant update on table "public"."engagement" to "service_role";

grant delete on table "public"."impacts" to "anon";

grant insert on table "public"."impacts" to "anon";

grant references on table "public"."impacts" to "anon";

grant select on table "public"."impacts" to "anon";

grant trigger on table "public"."impacts" to "anon";

grant truncate on table "public"."impacts" to "anon";

grant update on table "public"."impacts" to "anon";

grant delete on table "public"."impacts" to "authenticated";

grant insert on table "public"."impacts" to "authenticated";

grant references on table "public"."impacts" to "authenticated";

grant trigger on table "public"."impacts" to "authenticated";

grant truncate on table "public"."impacts" to "authenticated";

grant update on table "public"."impacts" to "authenticated";

grant delete on table "public"."impacts" to "service_role";

grant insert on table "public"."impacts" to "service_role";

grant references on table "public"."impacts" to "service_role";

grant select on table "public"."impacts" to "service_role";

grant trigger on table "public"."impacts" to "service_role";

grant truncate on table "public"."impacts" to "service_role";

grant update on table "public"."impacts" to "service_role";

grant delete on table "public"."influences" to "anon";

grant insert on table "public"."influences" to "anon";

grant references on table "public"."influences" to "anon";

grant select on table "public"."influences" to "anon";

grant trigger on table "public"."influences" to "anon";

grant truncate on table "public"."influences" to "anon";

grant update on table "public"."influences" to "anon";

grant delete on table "public"."influences" to "authenticated";

grant insert on table "public"."influences" to "authenticated";

grant references on table "public"."influences" to "authenticated";

grant trigger on table "public"."influences" to "authenticated";

grant truncate on table "public"."influences" to "authenticated";

grant update on table "public"."influences" to "authenticated";

grant delete on table "public"."influences" to "service_role";

grant insert on table "public"."influences" to "service_role";

grant references on table "public"."influences" to "service_role";

grant select on table "public"."influences" to "service_role";

grant trigger on table "public"."influences" to "service_role";

grant truncate on table "public"."influences" to "service_role";

grant update on table "public"."influences" to "service_role";

grant delete on table "public"."insights" to "anon";

grant insert on table "public"."insights" to "anon";

grant references on table "public"."insights" to "anon";

grant select on table "public"."insights" to "anon";

grant trigger on table "public"."insights" to "anon";

grant truncate on table "public"."insights" to "anon";

grant update on table "public"."insights" to "anon";

grant delete on table "public"."insights" to "authenticated";

grant insert on table "public"."insights" to "authenticated";

grant references on table "public"."insights" to "authenticated";

grant trigger on table "public"."insights" to "authenticated";

grant truncate on table "public"."insights" to "authenticated";

grant update on table "public"."insights" to "authenticated";

grant delete on table "public"."insights" to "service_role";

grant insert on table "public"."insights" to "service_role";

grant references on table "public"."insights" to "service_role";

grant select on table "public"."insights" to "service_role";

grant trigger on table "public"."insights" to "service_role";

grant truncate on table "public"."insights" to "service_role";

grant update on table "public"."insights" to "service_role";

grant delete on table "public"."interests" to "service_role";

grant insert on table "public"."interests" to "service_role";

grant references on table "public"."interests" to "service_role";

grant select on table "public"."interests" to "service_role";

grant trigger on table "public"."interests" to "service_role";

grant truncate on table "public"."interests" to "service_role";

grant update on table "public"."interests" to "service_role";

grant delete on table "public"."journey_simulations" to "anon";

grant insert on table "public"."journey_simulations" to "anon";

grant references on table "public"."journey_simulations" to "anon";

grant select on table "public"."journey_simulations" to "anon";

grant trigger on table "public"."journey_simulations" to "anon";

grant truncate on table "public"."journey_simulations" to "anon";

grant update on table "public"."journey_simulations" to "anon";

grant delete on table "public"."journey_simulations" to "authenticated";

grant insert on table "public"."journey_simulations" to "authenticated";

grant references on table "public"."journey_simulations" to "authenticated";

grant select on table "public"."journey_simulations" to "authenticated";

grant trigger on table "public"."journey_simulations" to "authenticated";

grant truncate on table "public"."journey_simulations" to "authenticated";

grant update on table "public"."journey_simulations" to "authenticated";

grant delete on table "public"."journey_simulations" to "service_role";

grant insert on table "public"."journey_simulations" to "service_role";

grant references on table "public"."journey_simulations" to "service_role";

grant select on table "public"."journey_simulations" to "service_role";

grant trigger on table "public"."journey_simulations" to "service_role";

grant truncate on table "public"."journey_simulations" to "service_role";

grant update on table "public"."journey_simulations" to "service_role";

grant delete on table "public"."learning_maps" to "service_role";

grant insert on table "public"."learning_maps" to "service_role";

grant references on table "public"."learning_maps" to "service_role";

grant select on table "public"."learning_maps" to "service_role";

grant trigger on table "public"."learning_maps" to "service_role";

grant truncate on table "public"."learning_maps" to "service_role";

grant update on table "public"."learning_maps" to "service_role";

grant delete on table "public"."learning_paths" to "anon";

grant insert on table "public"."learning_paths" to "anon";

grant references on table "public"."learning_paths" to "anon";

grant select on table "public"."learning_paths" to "anon";

grant trigger on table "public"."learning_paths" to "anon";

grant truncate on table "public"."learning_paths" to "anon";

grant update on table "public"."learning_paths" to "anon";

grant delete on table "public"."learning_paths" to "authenticated";

grant insert on table "public"."learning_paths" to "authenticated";

grant references on table "public"."learning_paths" to "authenticated";

grant trigger on table "public"."learning_paths" to "authenticated";

grant truncate on table "public"."learning_paths" to "authenticated";

grant update on table "public"."learning_paths" to "authenticated";

grant delete on table "public"."learning_paths" to "service_role";

grant insert on table "public"."learning_paths" to "service_role";

grant references on table "public"."learning_paths" to "service_role";

grant select on table "public"."learning_paths" to "service_role";

grant trigger on table "public"."learning_paths" to "service_role";

grant truncate on table "public"."learning_paths" to "service_role";

grant update on table "public"."learning_paths" to "service_role";

grant delete on table "public"."milestones" to "anon";

grant insert on table "public"."milestones" to "anon";

grant references on table "public"."milestones" to "anon";

grant select on table "public"."milestones" to "anon";

grant trigger on table "public"."milestones" to "anon";

grant truncate on table "public"."milestones" to "anon";

grant update on table "public"."milestones" to "anon";

grant delete on table "public"."milestones" to "authenticated";

grant insert on table "public"."milestones" to "authenticated";

grant references on table "public"."milestones" to "authenticated";

grant trigger on table "public"."milestones" to "authenticated";

grant truncate on table "public"."milestones" to "authenticated";

grant update on table "public"."milestones" to "authenticated";

grant delete on table "public"."milestones" to "service_role";

grant insert on table "public"."milestones" to "service_role";

grant references on table "public"."milestones" to "service_role";

grant select on table "public"."milestones" to "service_role";

grant trigger on table "public"."milestones" to "service_role";

grant truncate on table "public"."milestones" to "service_role";

grant update on table "public"."milestones" to "service_role";

grant delete on table "public"."monthly_insights" to "anon";

grant insert on table "public"."monthly_insights" to "anon";

grant references on table "public"."monthly_insights" to "anon";

grant select on table "public"."monthly_insights" to "anon";

grant trigger on table "public"."monthly_insights" to "anon";

grant truncate on table "public"."monthly_insights" to "anon";

grant update on table "public"."monthly_insights" to "anon";

grant delete on table "public"."monthly_insights" to "authenticated";

grant insert on table "public"."monthly_insights" to "authenticated";

grant references on table "public"."monthly_insights" to "authenticated";

grant trigger on table "public"."monthly_insights" to "authenticated";

grant truncate on table "public"."monthly_insights" to "authenticated";

grant update on table "public"."monthly_insights" to "authenticated";

grant delete on table "public"."monthly_insights" to "service_role";

grant insert on table "public"."monthly_insights" to "service_role";

grant references on table "public"."monthly_insights" to "service_role";

grant select on table "public"."monthly_insights" to "service_role";

grant trigger on table "public"."monthly_insights" to "service_role";

grant truncate on table "public"."monthly_insights" to "service_role";

grant update on table "public"."monthly_insights" to "service_role";

grant delete on table "public"."node_assessments" to "anon";

grant insert on table "public"."node_assessments" to "anon";

grant references on table "public"."node_assessments" to "anon";

grant select on table "public"."node_assessments" to "anon";

grant trigger on table "public"."node_assessments" to "anon";

grant truncate on table "public"."node_assessments" to "anon";

grant update on table "public"."node_assessments" to "anon";

grant references on table "public"."node_assessments" to "authenticated";

grant trigger on table "public"."node_assessments" to "authenticated";

grant truncate on table "public"."node_assessments" to "authenticated";

grant delete on table "public"."node_assessments" to "service_role";

grant insert on table "public"."node_assessments" to "service_role";

grant references on table "public"."node_assessments" to "service_role";

grant select on table "public"."node_assessments" to "service_role";

grant trigger on table "public"."node_assessments" to "service_role";

grant truncate on table "public"."node_assessments" to "service_role";

grant update on table "public"."node_assessments" to "service_role";

grant delete on table "public"."node_content" to "service_role";

grant insert on table "public"."node_content" to "service_role";

grant references on table "public"."node_content" to "service_role";

grant select on table "public"."node_content" to "service_role";

grant trigger on table "public"."node_content" to "service_role";

grant truncate on table "public"."node_content" to "service_role";

grant update on table "public"."node_content" to "service_role";

grant delete on table "public"."node_leaderboard" to "service_role";

grant insert on table "public"."node_leaderboard" to "service_role";

grant references on table "public"."node_leaderboard" to "service_role";

grant select on table "public"."node_leaderboard" to "service_role";

grant trigger on table "public"."node_leaderboard" to "service_role";

grant truncate on table "public"."node_leaderboard" to "service_role";

grant update on table "public"."node_leaderboard" to "service_role";

grant delete on table "public"."node_paths" to "service_role";

grant insert on table "public"."node_paths" to "service_role";

grant references on table "public"."node_paths" to "service_role";

grant select on table "public"."node_paths" to "service_role";

grant trigger on table "public"."node_paths" to "service_role";

grant truncate on table "public"."node_paths" to "service_role";

grant update on table "public"."node_paths" to "service_role";

grant delete on table "public"."passion_trees" to "anon";

grant insert on table "public"."passion_trees" to "anon";

grant references on table "public"."passion_trees" to "anon";

grant select on table "public"."passion_trees" to "anon";

grant trigger on table "public"."passion_trees" to "anon";

grant truncate on table "public"."passion_trees" to "anon";

grant update on table "public"."passion_trees" to "anon";

grant delete on table "public"."passion_trees" to "authenticated";

grant insert on table "public"."passion_trees" to "authenticated";

grant references on table "public"."passion_trees" to "authenticated";

grant trigger on table "public"."passion_trees" to "authenticated";

grant truncate on table "public"."passion_trees" to "authenticated";

grant update on table "public"."passion_trees" to "authenticated";

grant delete on table "public"."passion_trees" to "service_role";

grant insert on table "public"."passion_trees" to "service_role";

grant references on table "public"."passion_trees" to "service_role";

grant select on table "public"."passion_trees" to "service_role";

grant trigger on table "public"."passion_trees" to "service_role";

grant truncate on table "public"."passion_trees" to "service_role";

grant update on table "public"."passion_trees" to "service_role";

grant delete on table "public"."post_comments" to "anon";

grant insert on table "public"."post_comments" to "anon";

grant references on table "public"."post_comments" to "anon";

grant select on table "public"."post_comments" to "anon";

grant trigger on table "public"."post_comments" to "anon";

grant truncate on table "public"."post_comments" to "anon";

grant update on table "public"."post_comments" to "anon";

grant delete on table "public"."post_comments" to "authenticated";

grant insert on table "public"."post_comments" to "authenticated";

grant references on table "public"."post_comments" to "authenticated";

grant trigger on table "public"."post_comments" to "authenticated";

grant truncate on table "public"."post_comments" to "authenticated";

grant update on table "public"."post_comments" to "authenticated";

grant delete on table "public"."post_comments" to "service_role";

grant insert on table "public"."post_comments" to "service_role";

grant references on table "public"."post_comments" to "service_role";

grant select on table "public"."post_comments" to "service_role";

grant trigger on table "public"."post_comments" to "service_role";

grant truncate on table "public"."post_comments" to "service_role";

grant update on table "public"."post_comments" to "service_role";

grant delete on table "public"."post_likes" to "anon";

grant insert on table "public"."post_likes" to "anon";

grant references on table "public"."post_likes" to "anon";

grant select on table "public"."post_likes" to "anon";

grant trigger on table "public"."post_likes" to "anon";

grant truncate on table "public"."post_likes" to "anon";

grant update on table "public"."post_likes" to "anon";

grant delete on table "public"."post_likes" to "authenticated";

grant insert on table "public"."post_likes" to "authenticated";

grant references on table "public"."post_likes" to "authenticated";

grant trigger on table "public"."post_likes" to "authenticated";

grant truncate on table "public"."post_likes" to "authenticated";

grant update on table "public"."post_likes" to "authenticated";

grant delete on table "public"."post_likes" to "service_role";

grant insert on table "public"."post_likes" to "service_role";

grant references on table "public"."post_likes" to "service_role";

grant select on table "public"."post_likes" to "service_role";

grant trigger on table "public"."post_likes" to "service_role";

grant truncate on table "public"."post_likes" to "service_role";

grant update on table "public"."post_likes" to "service_role";

grant delete on table "public"."post_media" to "anon";

grant insert on table "public"."post_media" to "anon";

grant references on table "public"."post_media" to "anon";

grant select on table "public"."post_media" to "anon";

grant trigger on table "public"."post_media" to "anon";

grant truncate on table "public"."post_media" to "anon";

grant update on table "public"."post_media" to "anon";

grant delete on table "public"."post_media" to "authenticated";

grant insert on table "public"."post_media" to "authenticated";

grant references on table "public"."post_media" to "authenticated";

grant trigger on table "public"."post_media" to "authenticated";

grant truncate on table "public"."post_media" to "authenticated";

grant update on table "public"."post_media" to "authenticated";

grant delete on table "public"."post_media" to "service_role";

grant insert on table "public"."post_media" to "service_role";

grant references on table "public"."post_media" to "service_role";

grant select on table "public"."post_media" to "service_role";

grant trigger on table "public"."post_media" to "service_role";

grant truncate on table "public"."post_media" to "service_role";

grant update on table "public"."post_media" to "service_role";

grant delete on table "public"."potential_offshoots" to "anon";

grant insert on table "public"."potential_offshoots" to "anon";

grant references on table "public"."potential_offshoots" to "anon";

grant select on table "public"."potential_offshoots" to "anon";

grant trigger on table "public"."potential_offshoots" to "anon";

grant truncate on table "public"."potential_offshoots" to "anon";

grant update on table "public"."potential_offshoots" to "anon";

grant delete on table "public"."potential_offshoots" to "authenticated";

grant insert on table "public"."potential_offshoots" to "authenticated";

grant references on table "public"."potential_offshoots" to "authenticated";

grant trigger on table "public"."potential_offshoots" to "authenticated";

grant truncate on table "public"."potential_offshoots" to "authenticated";

grant update on table "public"."potential_offshoots" to "authenticated";

grant delete on table "public"."potential_offshoots" to "service_role";

grant insert on table "public"."potential_offshoots" to "service_role";

grant references on table "public"."potential_offshoots" to "service_role";

grant select on table "public"."potential_offshoots" to "service_role";

grant trigger on table "public"."potential_offshoots" to "service_role";

grant truncate on table "public"."potential_offshoots" to "service_role";

grant update on table "public"."potential_offshoots" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."project_members" to "anon";

grant insert on table "public"."project_members" to "anon";

grant references on table "public"."project_members" to "anon";

grant select on table "public"."project_members" to "anon";

grant trigger on table "public"."project_members" to "anon";

grant truncate on table "public"."project_members" to "anon";

grant update on table "public"."project_members" to "anon";

grant delete on table "public"."project_members" to "authenticated";

grant insert on table "public"."project_members" to "authenticated";

grant references on table "public"."project_members" to "authenticated";

grant trigger on table "public"."project_members" to "authenticated";

grant truncate on table "public"."project_members" to "authenticated";

grant update on table "public"."project_members" to "authenticated";

grant delete on table "public"."project_members" to "service_role";

grant insert on table "public"."project_members" to "service_role";

grant references on table "public"."project_members" to "service_role";

grant select on table "public"."project_members" to "service_role";

grant trigger on table "public"."project_members" to "service_role";

grant truncate on table "public"."project_members" to "service_role";

grant update on table "public"."project_members" to "service_role";

grant delete on table "public"."project_outcomes" to "anon";

grant insert on table "public"."project_outcomes" to "anon";

grant references on table "public"."project_outcomes" to "anon";

grant select on table "public"."project_outcomes" to "anon";

grant trigger on table "public"."project_outcomes" to "anon";

grant truncate on table "public"."project_outcomes" to "anon";

grant update on table "public"."project_outcomes" to "anon";

grant delete on table "public"."project_outcomes" to "authenticated";

grant insert on table "public"."project_outcomes" to "authenticated";

grant references on table "public"."project_outcomes" to "authenticated";

grant trigger on table "public"."project_outcomes" to "authenticated";

grant truncate on table "public"."project_outcomes" to "authenticated";

grant update on table "public"."project_outcomes" to "authenticated";

grant delete on table "public"."project_outcomes" to "service_role";

grant insert on table "public"."project_outcomes" to "service_role";

grant references on table "public"."project_outcomes" to "service_role";

grant select on table "public"."project_outcomes" to "service_role";

grant trigger on table "public"."project_outcomes" to "service_role";

grant truncate on table "public"."project_outcomes" to "service_role";

grant update on table "public"."project_outcomes" to "service_role";

grant delete on table "public"."project_tags" to "anon";

grant insert on table "public"."project_tags" to "anon";

grant references on table "public"."project_tags" to "anon";

grant select on table "public"."project_tags" to "anon";

grant trigger on table "public"."project_tags" to "anon";

grant truncate on table "public"."project_tags" to "anon";

grant update on table "public"."project_tags" to "anon";

grant references on table "public"."project_tags" to "authenticated";

grant trigger on table "public"."project_tags" to "authenticated";

grant truncate on table "public"."project_tags" to "authenticated";

grant delete on table "public"."project_tags" to "service_role";

grant insert on table "public"."project_tags" to "service_role";

grant references on table "public"."project_tags" to "service_role";

grant select on table "public"."project_tags" to "service_role";

grant trigger on table "public"."project_tags" to "service_role";

grant truncate on table "public"."project_tags" to "service_role";

grant update on table "public"."project_tags" to "service_role";

grant delete on table "public"."projects" to "anon";

grant insert on table "public"."projects" to "anon";

grant references on table "public"."projects" to "anon";

grant select on table "public"."projects" to "anon";

grant trigger on table "public"."projects" to "anon";

grant truncate on table "public"."projects" to "anon";

grant update on table "public"."projects" to "anon";

grant references on table "public"."projects" to "authenticated";

grant trigger on table "public"."projects" to "authenticated";

grant truncate on table "public"."projects" to "authenticated";

grant delete on table "public"."projects" to "service_role";

grant insert on table "public"."projects" to "service_role";

grant references on table "public"."projects" to "service_role";

grant select on table "public"."projects" to "service_role";

grant trigger on table "public"."projects" to "service_role";

grant truncate on table "public"."projects" to "service_role";

grant update on table "public"."projects" to "service_role";

grant delete on table "public"."quiz_questions" to "service_role";

grant insert on table "public"."quiz_questions" to "service_role";

grant references on table "public"."quiz_questions" to "service_role";

grant select on table "public"."quiz_questions" to "service_role";

grant trigger on table "public"."quiz_questions" to "service_role";

grant truncate on table "public"."quiz_questions" to "service_role";

grant update on table "public"."quiz_questions" to "service_role";

grant delete on table "public"."reflection_metrics" to "anon";

grant insert on table "public"."reflection_metrics" to "anon";

grant references on table "public"."reflection_metrics" to "anon";

grant select on table "public"."reflection_metrics" to "anon";

grant trigger on table "public"."reflection_metrics" to "anon";

grant truncate on table "public"."reflection_metrics" to "anon";

grant update on table "public"."reflection_metrics" to "anon";

grant references on table "public"."reflection_metrics" to "authenticated";

grant trigger on table "public"."reflection_metrics" to "authenticated";

grant truncate on table "public"."reflection_metrics" to "authenticated";

grant delete on table "public"."reflection_metrics" to "service_role";

grant insert on table "public"."reflection_metrics" to "service_role";

grant references on table "public"."reflection_metrics" to "service_role";

grant select on table "public"."reflection_metrics" to "service_role";

grant trigger on table "public"."reflection_metrics" to "service_role";

grant truncate on table "public"."reflection_metrics" to "service_role";

grant update on table "public"."reflection_metrics" to "service_role";

grant delete on table "public"."reflections" to "anon";

grant insert on table "public"."reflections" to "anon";

grant references on table "public"."reflections" to "anon";

grant select on table "public"."reflections" to "anon";

grant trigger on table "public"."reflections" to "anon";

grant truncate on table "public"."reflections" to "anon";

grant update on table "public"."reflections" to "anon";

grant references on table "public"."reflections" to "authenticated";

grant trigger on table "public"."reflections" to "authenticated";

grant truncate on table "public"."reflections" to "authenticated";

grant delete on table "public"."reflections" to "service_role";

grant insert on table "public"."reflections" to "service_role";

grant references on table "public"."reflections" to "service_role";

grant select on table "public"."reflections" to "service_role";

grant trigger on table "public"."reflections" to "service_role";

grant truncate on table "public"."reflections" to "service_role";

grant update on table "public"."reflections" to "service_role";

grant delete on table "public"."related_interests" to "anon";

grant insert on table "public"."related_interests" to "anon";

grant references on table "public"."related_interests" to "anon";

grant select on table "public"."related_interests" to "anon";

grant trigger on table "public"."related_interests" to "anon";

grant truncate on table "public"."related_interests" to "anon";

grant update on table "public"."related_interests" to "anon";

grant delete on table "public"."related_interests" to "authenticated";

grant insert on table "public"."related_interests" to "authenticated";

grant references on table "public"."related_interests" to "authenticated";

grant trigger on table "public"."related_interests" to "authenticated";

grant truncate on table "public"."related_interests" to "authenticated";

grant update on table "public"."related_interests" to "authenticated";

grant delete on table "public"."related_interests" to "service_role";

grant insert on table "public"."related_interests" to "service_role";

grant references on table "public"."related_interests" to "service_role";

grant select on table "public"."related_interests" to "service_role";

grant trigger on table "public"."related_interests" to "service_role";

grant truncate on table "public"."related_interests" to "service_role";

grant update on table "public"."related_interests" to "service_role";

grant delete on table "public"."resources" to "anon";

grant insert on table "public"."resources" to "anon";

grant references on table "public"."resources" to "anon";

grant select on table "public"."resources" to "anon";

grant trigger on table "public"."resources" to "anon";

grant truncate on table "public"."resources" to "anon";

grant update on table "public"."resources" to "anon";

grant delete on table "public"."resources" to "authenticated";

grant insert on table "public"."resources" to "authenticated";

grant references on table "public"."resources" to "authenticated";

grant trigger on table "public"."resources" to "authenticated";

grant truncate on table "public"."resources" to "authenticated";

grant update on table "public"."resources" to "authenticated";

grant delete on table "public"."resources" to "service_role";

grant insert on table "public"."resources" to "service_role";

grant references on table "public"."resources" to "service_role";

grant select on table "public"."resources" to "service_role";

grant trigger on table "public"."resources" to "service_role";

grant truncate on table "public"."resources" to "service_role";

grant update on table "public"."resources" to "service_role";

grant delete on table "public"."roots" to "anon";

grant insert on table "public"."roots" to "anon";

grant references on table "public"."roots" to "anon";

grant select on table "public"."roots" to "anon";

grant trigger on table "public"."roots" to "anon";

grant truncate on table "public"."roots" to "anon";

grant update on table "public"."roots" to "anon";

grant delete on table "public"."roots" to "authenticated";

grant insert on table "public"."roots" to "authenticated";

grant references on table "public"."roots" to "authenticated";

grant trigger on table "public"."roots" to "authenticated";

grant truncate on table "public"."roots" to "authenticated";

grant update on table "public"."roots" to "authenticated";

grant delete on table "public"."roots" to "service_role";

grant insert on table "public"."roots" to "service_role";

grant references on table "public"."roots" to "service_role";

grant select on table "public"."roots" to "service_role";

grant trigger on table "public"."roots" to "service_role";

grant truncate on table "public"."roots" to "service_role";

grant update on table "public"."roots" to "service_role";

grant delete on table "public"."skills" to "anon";

grant insert on table "public"."skills" to "anon";

grant references on table "public"."skills" to "anon";

grant select on table "public"."skills" to "anon";

grant trigger on table "public"."skills" to "anon";

grant truncate on table "public"."skills" to "anon";

grant update on table "public"."skills" to "anon";

grant delete on table "public"."skills" to "authenticated";

grant insert on table "public"."skills" to "authenticated";

grant references on table "public"."skills" to "authenticated";

grant trigger on table "public"."skills" to "authenticated";

grant truncate on table "public"."skills" to "authenticated";

grant update on table "public"."skills" to "authenticated";

grant delete on table "public"."skills" to "service_role";

grant insert on table "public"."skills" to "service_role";

grant references on table "public"."skills" to "service_role";

grant select on table "public"."skills" to "service_role";

grant trigger on table "public"."skills" to "service_role";

grant truncate on table "public"."skills" to "service_role";

grant update on table "public"."skills" to "service_role";

grant delete on table "public"."submission_grades" to "service_role";

grant insert on table "public"."submission_grades" to "service_role";

grant references on table "public"."submission_grades" to "service_role";

grant select on table "public"."submission_grades" to "service_role";

grant trigger on table "public"."submission_grades" to "service_role";

grant truncate on table "public"."submission_grades" to "service_role";

grant update on table "public"."submission_grades" to "service_role";

grant delete on table "public"."synergies" to "anon";

grant insert on table "public"."synergies" to "anon";

grant references on table "public"."synergies" to "anon";

grant select on table "public"."synergies" to "anon";

grant trigger on table "public"."synergies" to "anon";

grant truncate on table "public"."synergies" to "anon";

grant update on table "public"."synergies" to "anon";

grant delete on table "public"."synergies" to "authenticated";

grant insert on table "public"."synergies" to "authenticated";

grant references on table "public"."synergies" to "authenticated";

grant trigger on table "public"."synergies" to "authenticated";

grant truncate on table "public"."synergies" to "authenticated";

grant update on table "public"."synergies" to "authenticated";

grant delete on table "public"."synergies" to "service_role";

grant insert on table "public"."synergies" to "service_role";

grant references on table "public"."synergies" to "service_role";

grant select on table "public"."synergies" to "service_role";

grant trigger on table "public"."synergies" to "service_role";

grant truncate on table "public"."synergies" to "service_role";

grant update on table "public"."synergies" to "service_role";

grant delete on table "public"."tags" to "anon";

grant insert on table "public"."tags" to "anon";

grant references on table "public"."tags" to "anon";

grant select on table "public"."tags" to "anon";

grant trigger on table "public"."tags" to "anon";

grant truncate on table "public"."tags" to "anon";

grant update on table "public"."tags" to "anon";

grant references on table "public"."tags" to "authenticated";

grant trigger on table "public"."tags" to "authenticated";

grant truncate on table "public"."tags" to "authenticated";

grant delete on table "public"."tags" to "service_role";

grant insert on table "public"."tags" to "service_role";

grant references on table "public"."tags" to "service_role";

grant select on table "public"."tags" to "service_role";

grant trigger on table "public"."tags" to "service_role";

grant truncate on table "public"."tags" to "service_role";

grant update on table "public"."tags" to "service_role";

grant delete on table "public"."team_meetings" to "anon";

grant insert on table "public"."team_meetings" to "anon";

grant references on table "public"."team_meetings" to "anon";

grant select on table "public"."team_meetings" to "anon";

grant trigger on table "public"."team_meetings" to "anon";

grant truncate on table "public"."team_meetings" to "anon";

grant update on table "public"."team_meetings" to "anon";

grant delete on table "public"."team_meetings" to "authenticated";

grant insert on table "public"."team_meetings" to "authenticated";

grant references on table "public"."team_meetings" to "authenticated";

grant trigger on table "public"."team_meetings" to "authenticated";

grant truncate on table "public"."team_meetings" to "authenticated";

grant update on table "public"."team_meetings" to "authenticated";

grant delete on table "public"."team_meetings" to "service_role";

grant insert on table "public"."team_meetings" to "service_role";

grant references on table "public"."team_meetings" to "service_role";

grant select on table "public"."team_meetings" to "service_role";

grant trigger on table "public"."team_meetings" to "service_role";

grant truncate on table "public"."team_meetings" to "service_role";

grant update on table "public"."team_meetings" to "service_role";

grant delete on table "public"."team_memberships" to "service_role";

grant insert on table "public"."team_memberships" to "service_role";

grant references on table "public"."team_memberships" to "service_role";

grant select on table "public"."team_memberships" to "service_role";

grant trigger on table "public"."team_memberships" to "service_role";

grant truncate on table "public"."team_memberships" to "service_role";

grant update on table "public"."team_memberships" to "service_role";

grant delete on table "public"."team_node_assignments" to "anon";

grant insert on table "public"."team_node_assignments" to "anon";

grant references on table "public"."team_node_assignments" to "anon";

grant select on table "public"."team_node_assignments" to "anon";

grant trigger on table "public"."team_node_assignments" to "anon";

grant truncate on table "public"."team_node_assignments" to "anon";

grant update on table "public"."team_node_assignments" to "anon";

grant delete on table "public"."team_node_assignments" to "authenticated";

grant insert on table "public"."team_node_assignments" to "authenticated";

grant references on table "public"."team_node_assignments" to "authenticated";

grant trigger on table "public"."team_node_assignments" to "authenticated";

grant truncate on table "public"."team_node_assignments" to "authenticated";

grant update on table "public"."team_node_assignments" to "authenticated";

grant delete on table "public"."team_node_assignments" to "service_role";

grant insert on table "public"."team_node_assignments" to "service_role";

grant references on table "public"."team_node_assignments" to "service_role";

grant select on table "public"."team_node_assignments" to "service_role";

grant trigger on table "public"."team_node_assignments" to "service_role";

grant truncate on table "public"."team_node_assignments" to "service_role";

grant update on table "public"."team_node_assignments" to "service_role";

grant delete on table "public"."team_node_progress" to "anon";

grant insert on table "public"."team_node_progress" to "anon";

grant references on table "public"."team_node_progress" to "anon";

grant select on table "public"."team_node_progress" to "anon";

grant trigger on table "public"."team_node_progress" to "anon";

grant truncate on table "public"."team_node_progress" to "anon";

grant update on table "public"."team_node_progress" to "anon";

grant delete on table "public"."team_node_progress" to "authenticated";

grant insert on table "public"."team_node_progress" to "authenticated";

grant references on table "public"."team_node_progress" to "authenticated";

grant trigger on table "public"."team_node_progress" to "authenticated";

grant truncate on table "public"."team_node_progress" to "authenticated";

grant update on table "public"."team_node_progress" to "authenticated";

grant delete on table "public"."team_node_progress" to "service_role";

grant insert on table "public"."team_node_progress" to "service_role";

grant references on table "public"."team_node_progress" to "service_role";

grant select on table "public"."team_node_progress" to "service_role";

grant trigger on table "public"."team_node_progress" to "service_role";

grant truncate on table "public"."team_node_progress" to "service_role";

grant update on table "public"."team_node_progress" to "service_role";

grant delete on table "public"."team_progress_comments" to "anon";

grant insert on table "public"."team_progress_comments" to "anon";

grant references on table "public"."team_progress_comments" to "anon";

grant select on table "public"."team_progress_comments" to "anon";

grant trigger on table "public"."team_progress_comments" to "anon";

grant truncate on table "public"."team_progress_comments" to "anon";

grant update on table "public"."team_progress_comments" to "anon";

grant delete on table "public"."team_progress_comments" to "authenticated";

grant insert on table "public"."team_progress_comments" to "authenticated";

grant references on table "public"."team_progress_comments" to "authenticated";

grant trigger on table "public"."team_progress_comments" to "authenticated";

grant truncate on table "public"."team_progress_comments" to "authenticated";

grant update on table "public"."team_progress_comments" to "authenticated";

grant delete on table "public"."team_progress_comments" to "service_role";

grant insert on table "public"."team_progress_comments" to "service_role";

grant references on table "public"."team_progress_comments" to "service_role";

grant select on table "public"."team_progress_comments" to "service_role";

grant trigger on table "public"."team_progress_comments" to "service_role";

grant truncate on table "public"."team_progress_comments" to "service_role";

grant update on table "public"."team_progress_comments" to "service_role";

grant delete on table "public"."tools_acquired" to "anon";

grant insert on table "public"."tools_acquired" to "anon";

grant references on table "public"."tools_acquired" to "anon";

grant select on table "public"."tools_acquired" to "anon";

grant trigger on table "public"."tools_acquired" to "anon";

grant truncate on table "public"."tools_acquired" to "anon";

grant update on table "public"."tools_acquired" to "anon";

grant delete on table "public"."tools_acquired" to "authenticated";

grant insert on table "public"."tools_acquired" to "authenticated";

grant references on table "public"."tools_acquired" to "authenticated";

grant trigger on table "public"."tools_acquired" to "authenticated";

grant truncate on table "public"."tools_acquired" to "authenticated";

grant update on table "public"."tools_acquired" to "authenticated";

grant delete on table "public"."tools_acquired" to "service_role";

grant insert on table "public"."tools_acquired" to "service_role";

grant references on table "public"."tools_acquired" to "service_role";

grant select on table "public"."tools_acquired" to "service_role";

grant trigger on table "public"."tools_acquired" to "service_role";

grant truncate on table "public"."tools_acquired" to "service_role";

grant update on table "public"."tools_acquired" to "service_role";

grant delete on table "public"."user_communities" to "anon";

grant insert on table "public"."user_communities" to "anon";

grant references on table "public"."user_communities" to "anon";

grant select on table "public"."user_communities" to "anon";

grant trigger on table "public"."user_communities" to "anon";

grant truncate on table "public"."user_communities" to "anon";

grant update on table "public"."user_communities" to "anon";

grant delete on table "public"."user_communities" to "authenticated";

grant insert on table "public"."user_communities" to "authenticated";

grant references on table "public"."user_communities" to "authenticated";

grant trigger on table "public"."user_communities" to "authenticated";

grant truncate on table "public"."user_communities" to "authenticated";

grant update on table "public"."user_communities" to "authenticated";

grant delete on table "public"."user_communities" to "service_role";

grant insert on table "public"."user_communities" to "service_role";

grant references on table "public"."user_communities" to "service_role";

grant select on table "public"."user_communities" to "service_role";

grant trigger on table "public"."user_communities" to "service_role";

grant truncate on table "public"."user_communities" to "service_role";

grant update on table "public"."user_communities" to "service_role";

grant delete on table "public"."user_map_enrollments" to "service_role";

grant insert on table "public"."user_map_enrollments" to "service_role";

grant references on table "public"."user_map_enrollments" to "service_role";

grant select on table "public"."user_map_enrollments" to "service_role";

grant trigger on table "public"."user_map_enrollments" to "service_role";

grant truncate on table "public"."user_map_enrollments" to "service_role";

grant update on table "public"."user_map_enrollments" to "service_role";

grant delete on table "public"."user_roles" to "service_role";

grant insert on table "public"."user_roles" to "service_role";

grant references on table "public"."user_roles" to "service_role";

grant select on table "public"."user_roles" to "service_role";

grant trigger on table "public"."user_roles" to "service_role";

grant truncate on table "public"."user_roles" to "service_role";

grant update on table "public"."user_roles" to "service_role";

grant delete on table "public"."user_stats" to "anon";

grant insert on table "public"."user_stats" to "anon";

grant references on table "public"."user_stats" to "anon";

grant select on table "public"."user_stats" to "anon";

grant trigger on table "public"."user_stats" to "anon";

grant truncate on table "public"."user_stats" to "anon";

grant update on table "public"."user_stats" to "anon";

grant delete on table "public"."user_stats" to "authenticated";

grant insert on table "public"."user_stats" to "authenticated";

grant references on table "public"."user_stats" to "authenticated";

grant trigger on table "public"."user_stats" to "authenticated";

grant truncate on table "public"."user_stats" to "authenticated";

grant update on table "public"."user_stats" to "authenticated";

grant delete on table "public"."user_stats" to "service_role";

grant insert on table "public"."user_stats" to "service_role";

grant references on table "public"."user_stats" to "service_role";

grant select on table "public"."user_stats" to "service_role";

grant trigger on table "public"."user_stats" to "service_role";

grant truncate on table "public"."user_stats" to "service_role";

grant update on table "public"."user_stats" to "service_role";

grant delete on table "public"."user_workshops" to "anon";

grant insert on table "public"."user_workshops" to "anon";

grant references on table "public"."user_workshops" to "anon";

grant select on table "public"."user_workshops" to "anon";

grant trigger on table "public"."user_workshops" to "anon";

grant truncate on table "public"."user_workshops" to "anon";

grant update on table "public"."user_workshops" to "anon";

grant references on table "public"."user_workshops" to "authenticated";

grant trigger on table "public"."user_workshops" to "authenticated";

grant truncate on table "public"."user_workshops" to "authenticated";

grant delete on table "public"."user_workshops" to "service_role";

grant insert on table "public"."user_workshops" to "service_role";

grant references on table "public"."user_workshops" to "service_role";

grant select on table "public"."user_workshops" to "service_role";

grant trigger on table "public"."user_workshops" to "service_role";

grant truncate on table "public"."user_workshops" to "service_role";

grant update on table "public"."user_workshops" to "service_role";

grant delete on table "public"."viability_cache" to "anon";

grant insert on table "public"."viability_cache" to "anon";

grant references on table "public"."viability_cache" to "anon";

grant select on table "public"."viability_cache" to "anon";

grant trigger on table "public"."viability_cache" to "anon";

grant truncate on table "public"."viability_cache" to "anon";

grant update on table "public"."viability_cache" to "anon";

grant delete on table "public"."viability_cache" to "authenticated";

grant insert on table "public"."viability_cache" to "authenticated";

grant references on table "public"."viability_cache" to "authenticated";

grant select on table "public"."viability_cache" to "authenticated";

grant trigger on table "public"."viability_cache" to "authenticated";

grant truncate on table "public"."viability_cache" to "authenticated";

grant update on table "public"."viability_cache" to "authenticated";

grant delete on table "public"."viability_cache" to "service_role";

grant insert on table "public"."viability_cache" to "service_role";

grant references on table "public"."viability_cache" to "service_role";

grant select on table "public"."viability_cache" to "service_role";

grant trigger on table "public"."viability_cache" to "service_role";

grant truncate on table "public"."viability_cache" to "service_role";

grant update on table "public"."viability_cache" to "service_role";

grant delete on table "public"."workshop_comments" to "service_role";

grant insert on table "public"."workshop_comments" to "service_role";

grant references on table "public"."workshop_comments" to "service_role";

grant select on table "public"."workshop_comments" to "service_role";

grant trigger on table "public"."workshop_comments" to "service_role";

grant truncate on table "public"."workshop_comments" to "service_role";

grant update on table "public"."workshop_comments" to "service_role";

grant delete on table "public"."workshop_suggestions" to "service_role";

grant insert on table "public"."workshop_suggestions" to "service_role";

grant references on table "public"."workshop_suggestions" to "service_role";

grant select on table "public"."workshop_suggestions" to "service_role";

grant trigger on table "public"."workshop_suggestions" to "service_role";

grant truncate on table "public"."workshop_suggestions" to "service_role";

grant update on table "public"."workshop_suggestions" to "service_role";

grant delete on table "public"."workshop_votes" to "service_role";

grant insert on table "public"."workshop_votes" to "service_role";

grant references on table "public"."workshop_votes" to "service_role";

grant select on table "public"."workshop_votes" to "service_role";

grant trigger on table "public"."workshop_votes" to "service_role";

grant truncate on table "public"."workshop_votes" to "service_role";

grant update on table "public"."workshop_votes" to "service_role";

grant delete on table "public"."workshops" to "anon";

grant insert on table "public"."workshops" to "anon";

grant references on table "public"."workshops" to "anon";

grant select on table "public"."workshops" to "anon";

grant trigger on table "public"."workshops" to "anon";

grant truncate on table "public"."workshops" to "anon";

grant update on table "public"."workshops" to "anon";

grant delete on table "public"."workshops" to "authenticated";

grant insert on table "public"."workshops" to "authenticated";

grant references on table "public"."workshops" to "authenticated";

grant trigger on table "public"."workshops" to "authenticated";

grant truncate on table "public"."workshops" to "authenticated";

grant update on table "public"."workshops" to "authenticated";

grant delete on table "public"."workshops" to "service_role";

grant insert on table "public"."workshops" to "service_role";

grant references on table "public"."workshops" to "service_role";

grant select on table "public"."workshops" to "service_role";

grant trigger on table "public"."workshops" to "service_role";

grant truncate on table "public"."workshops" to "service_role";

grant update on table "public"."workshops" to "service_role";


  create policy "Allow public read access"
  on "public"."angpao_countdown"
  as permissive
  for select
  to public
using (true);



  create policy "Allow public update access"
  on "public"."angpao_countdown"
  as permissive
  for update
  to public
using (true);



  create policy "Jobs are viewable by everyone"
  on "public"."jobs"
  as permissive
  for select
  to public
using (true);



  create policy "Students can delete own simulations"
  on "public"."journey_simulations"
  as permissive
  for delete
  to public
using ((auth.uid() = student_id));



  create policy "Students can insert own simulations"
  on "public"."journey_simulations"
  as permissive
  for insert
  to public
with check ((auth.uid() = student_id));



  create policy "Students can update own simulations"
  on "public"."journey_simulations"
  as permissive
  for update
  to public
using ((auth.uid() = student_id));



  create policy "Students can view own simulations"
  on "public"."journey_simulations"
  as permissive
  for select
  to public
using ((auth.uid() = student_id));



  create policy "Students can view own score events"
  on "public"."score_events"
  as permissive
  for select
  to public
using ((auth.uid() = student_id));



  create policy "Universities are viewable by everyone"
  on "public"."universities"
  as permissive
  for select
  to public
using (true);



  create policy "users_read_own_events"
  on "public"."user_events"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Viability cache viewable by everyone"
  on "public"."viability_cache"
  as permissive
  for select
  to public
using (true);



  create policy "Group members can view group membership"
  on "public"."assignment_group_members"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM public.assignment_group_members agm
  WHERE ((agm.group_id = assignment_group_members.group_id) AND (agm.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.assignment_groups ag
     JOIN public.classroom_memberships cm ON ((ag.classroom_id = cm.classroom_id)))
  WHERE ((ag.id = assignment_group_members.group_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[])))))));



  create policy "Instructors can manage group membership"
  on "public"."assignment_group_members"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.assignment_groups ag
     JOIN public.classroom_memberships cm ON ((ag.classroom_id = cm.classroom_id)))
  WHERE ((ag.id = assignment_group_members.group_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))));


CREATE TRIGGER update_angpao_countdown_timestamp BEFORE UPDATE ON public.angpao_countdown FOR EACH ROW EXECUTE FUNCTION public.update_angpao_countdown_updated_at();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER enforce_max_simulations BEFORE INSERT ON public.journey_simulations FOR EACH ROW EXECUTE FUNCTION public.check_max_simulations();

CREATE TRIGGER update_journey_simulations_updated_at BEFORE UPDATE ON public.journey_simulations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


