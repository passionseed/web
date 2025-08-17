# All Database Migrations

This file contains all SQL migration files combined for easy reference and manual execution if needed.

**Generated on:** $(date)

---


## Migration: 20250626035506_remote_schema.sql

```sql


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."emotion" AS ENUM (
    'joy',
    'curiosity',
    'fulfillment',
    'challenge',
    'sadness',
    'anxiety',
    'anticipation',
    'trust'
);


ALTER TYPE "public"."emotion" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."branches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "passion_tree_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "mastery" integer DEFAULT 1 NOT NULL,
    "importance" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."branches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chat_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."chat_messages" IS 'Stores chat history between users and the assistant, migrated from the old reflections table.';



CREATE TABLE IF NOT EXISTS "public"."communities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "member_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."connections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "passion_tree_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emotions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "passion_tree_id" "uuid" NOT NULL,
    "joy" integer DEFAULT 5 NOT NULL,
    "curiosity" integer DEFAULT 5 NOT NULL,
    "fulfillment" integer DEFAULT 5 NOT NULL,
    "challenge" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."emotions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."engagement" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "passion_tree_id" "uuid" NOT NULL,
    "current_level" integer DEFAULT 5 NOT NULL,
    "date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."engagement" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."impacts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "interest_name" character varying(255) NOT NULL,
    "impact_type" character varying(100) NOT NULL,
    "strength" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."impacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."influences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "interest_name" character varying(255) NOT NULL,
    "influence_type" character varying(100) NOT NULL,
    "strength" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."influences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."insights" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "passion_tree_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "date_discovered" timestamp with time zone DEFAULT "now"(),
    "application" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "level" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "emotion" "text" NOT NULL,
    "type" "text",
    CONSTRAINT "interests_level_check" CHECK ((("level" >= 0) AND ("level" <= 100)))
);


ALTER TABLE "public"."interests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_paths" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "passion_tree_id" "uuid" NOT NULL,
    "current_focus" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."learning_paths" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."milestones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "learning_path_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "achieved" boolean DEFAULT false NOT NULL,
    "date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."milestones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_insights" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "year" smallint NOT NULL,
    "month" smallint NOT NULL,
    "top_emotion" "public"."emotion",
    "top_emotion_count" integer DEFAULT 0,
    "most_used_tag_id" "uuid",
    "progress_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."monthly_insights" OWNER TO "postgres";


COMMENT ON TABLE "public"."monthly_insights" IS 'Stores aggregated monthly insights for each user.';



CREATE TABLE IF NOT EXISTS "public"."passion_trees" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "category" character varying(100) NOT NULL,
    "growth_stage" character varying(50) DEFAULT 'Seed'::character varying NOT NULL,
    "depth" numeric(3,1) DEFAULT 1.0 NOT NULL,
    "mastery" numeric(3,1) DEFAULT 1.0 NOT NULL,
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."passion_trees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."potential_offshoots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "insight_id" "uuid" NOT NULL,
    "interest_name" character varying(255) NOT NULL,
    "germination_stage" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."potential_offshoots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "discord_id" "text",
    "email" "text",
    "date_of_birth" "date",
    "full_name" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_outcomes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "type" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."project_outcomes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "passion_tree_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "status" character varying(50) DEFAULT 'Idea'::character varying NOT NULL,
    "start_date" timestamp with time zone,
    "completion_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reflection_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reflection_id" "uuid" NOT NULL,
    "satisfaction" smallint NOT NULL,
    "engagement" smallint NOT NULL,
    "challenge" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reflection_metrics_challenge_check" CHECK ((("challenge" >= 1) AND ("challenge" <= 10))),
    CONSTRAINT "reflection_metrics_engagement_check" CHECK ((("engagement" >= 1) AND ("engagement" <= 10))),
    CONSTRAINT "reflection_metrics_satisfaction_check" CHECK ((("satisfaction" >= 1) AND ("satisfaction" <= 10)))
);


ALTER TABLE "public"."reflection_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."reflection_metrics" IS 'Metrics associated with each reflection entry.';



CREATE TABLE IF NOT EXISTS "public"."reflection_tags" (
    "reflection_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."reflection_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."reflection_tags" IS 'Join table linking reflections to tags.';



CREATE TABLE IF NOT EXISTS "public"."reflections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "emotion" "public"."emotion" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reflections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."related_interests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "connection_type" character varying(100) NOT NULL,
    "connection_strength" integer DEFAULT 5 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."related_interests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resources" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "learning_path_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "type" character varying(100) NOT NULL,
    "status" character varying(50) DEFAULT 'Not Started'::character varying NOT NULL,
    "impact" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "passion_tree_id" "uuid" NOT NULL,
    "time_invested" integer DEFAULT 0 NOT NULL,
    "financial_investment" integer DEFAULT 0 NOT NULL,
    "root_strength" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skills" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "branch_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."synergies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "connection_id" "uuid" NOT NULL,
    "interest_name" character varying(255) NOT NULL,
    "potential_outcome" "text" NOT NULL,
    "exploration_level" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."synergies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying NOT NULL,
    "color" character varying DEFAULT '#6b7280'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."tags" IS 'User-defined tags for categorizing reflections.';



CREATE TABLE IF NOT EXISTS "public"."tools_acquired" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "root_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tools_acquired" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_communities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "community_id" "uuid",
    "role" "text" DEFAULT 'Member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_stats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "helpful_responses" integer DEFAULT 0,
    "communities_helped" integer DEFAULT 0,
    "kudos_received" integer DEFAULT 0,
    "workshops_contributed" integer DEFAULT 0,
    "average_rating" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_workshops" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "workshop_id" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_workshops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workshop_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "workshop_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."workshop_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workshop_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "suggestion" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."workshop_suggestions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workshop_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "workshop_id" "uuid",
    "path_name" "text",
    "vote_type" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "workshop_votes_vote_type_check" CHECK (("vote_type" = ANY (ARRAY['up'::"text", 'down'::"text", 'emoji'::"text"])))
);


ALTER TABLE "public"."workshop_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workshops" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "instructor" "text",
    "category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "paths_in_development" "jsonb",
    "voting_enabled" boolean,
    "start_date" "date",
    "status" "text",
    "paths" "jsonb",
    "slug" "text",
    CONSTRAINT "workshops_category_check" CHECK (("category" = ANY (ARRAY['Inspire'::"text", 'Build'::"text", 'Scale'::"text"])))
);


ALTER TABLE "public"."workshops" OWNER TO "postgres";


ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."connections"
    ADD CONSTRAINT "connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emotions"
    ADD CONSTRAINT "emotions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."engagement"
    ADD CONSTRAINT "engagement_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."impacts"
    ADD CONSTRAINT "impacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."influences"
    ADD CONSTRAINT "influences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."insights"
    ADD CONSTRAINT "insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interests"
    ADD CONSTRAINT "interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learning_paths"
    ADD CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_insights"
    ADD CONSTRAINT "monthly_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_insights"
    ADD CONSTRAINT "monthly_insights_user_year_month_uniq" UNIQUE ("user_id", "year", "month");



ALTER TABLE ONLY "public"."passion_trees"
    ADD CONSTRAINT "passion_trees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."potential_offshoots"
    ADD CONSTRAINT "potential_offshoots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."project_outcomes"
    ADD CONSTRAINT "project_outcomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reflection_metrics"
    ADD CONSTRAINT "reflection_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reflection_tags"
    ADD CONSTRAINT "reflection_tags_pkey" PRIMARY KEY ("reflection_id", "tag_id");



ALTER TABLE ONLY "public"."reflections"
    ADD CONSTRAINT "reflections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."related_interests"
    ADD CONSTRAINT "related_interests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roots"
    ADD CONSTRAINT "roots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."synergies"
    ADD CONSTRAINT "synergies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tools_acquired"
    ADD CONSTRAINT "tools_acquired_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_communities"
    ADD CONSTRAINT "user_communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_communities"
    ADD CONSTRAINT "user_communities_user_id_community_id_key" UNIQUE ("user_id", "community_id");



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_workshops"
    ADD CONSTRAINT "user_workshops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_workshops"
    ADD CONSTRAINT "user_workshops_user_id_workshop_id_key" UNIQUE ("user_id", "workshop_id");



ALTER TABLE ONLY "public"."workshop_comments"
    ADD CONSTRAINT "workshop_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workshop_suggestions"
    ADD CONSTRAINT "workshop_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workshop_votes"
    ADD CONSTRAINT "workshop_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workshops"
    ADD CONSTRAINT "workshops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workshops"
    ADD CONSTRAINT "workshops_slug_key" UNIQUE ("slug");



CREATE INDEX "reflections_user_id_created_at_idx" ON "public"."reflections" USING "btree" ("user_id", "created_at");



CREATE OR REPLACE TRIGGER "update_branches_updated_at" BEFORE UPDATE ON "public"."branches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_connections_updated_at" BEFORE UPDATE ON "public"."connections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_emotions_updated_at" BEFORE UPDATE ON "public"."emotions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_impacts_updated_at" BEFORE UPDATE ON "public"."impacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_influences_updated_at" BEFORE UPDATE ON "public"."influences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_insights_updated_at" BEFORE UPDATE ON "public"."insights" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_learning_paths_updated_at" BEFORE UPDATE ON "public"."learning_paths" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_milestones_updated_at" BEFORE UPDATE ON "public"."milestones" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_passion_trees_updated_at" BEFORE UPDATE ON "public"."passion_trees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_potential_offshoots_updated_at" BEFORE UPDATE ON "public"."potential_offshoots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_project_outcomes_updated_at" BEFORE UPDATE ON "public"."project_outcomes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_related_interests_updated_at" BEFORE UPDATE ON "public"."related_interests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_resources_updated_at" BEFORE UPDATE ON "public"."resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_roots_updated_at" BEFORE UPDATE ON "public"."roots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_skills_updated_at" BEFORE UPDATE ON "public"."skills" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_synergies_updated_at" BEFORE UPDATE ON "public"."synergies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_passion_tree_id_fkey" FOREIGN KEY ("passion_tree_id") REFERENCES "public"."passion_trees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."connections"
    ADD CONSTRAINT "connections_passion_tree_id_fkey" FOREIGN KEY ("passion_tree_id") REFERENCES "public"."passion_trees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."emotions"
    ADD CONSTRAINT "emotions_passion_tree_id_fkey" FOREIGN KEY ("passion_tree_id") REFERENCES "public"."passion_trees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."engagement"
    ADD CONSTRAINT "engagement_passion_tree_id_fkey" FOREIGN KEY ("passion_tree_id") REFERENCES "public"."passion_trees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."impacts"
    ADD CONSTRAINT "impacts_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."influences"
    ADD CONSTRAINT "influences_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."insights"
    ADD CONSTRAINT "insights_passion_tree_id_fkey" FOREIGN KEY ("passion_tree_id") REFERENCES "public"."passion_trees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interests"
    ADD CONSTRAINT "interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_paths"
    ADD CONSTRAINT "learning_paths_passion_tree_id_fkey" FOREIGN KEY ("passion_tree_id") REFERENCES "public"."passion_trees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monthly_insights"
    ADD CONSTRAINT "monthly_insights_most_used_tag_id_fkey" FOREIGN KEY ("most_used_tag_id") REFERENCES "public"."tags"("id");



ALTER TABLE ONLY "public"."monthly_insights"
    ADD CONSTRAINT "monthly_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."passion_trees"
    ADD CONSTRAINT "passion_trees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."potential_offshoots"
    ADD CONSTRAINT "potential_offshoots_insight_id_fkey" FOREIGN KEY ("insight_id") REFERENCES "public"."insights"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_outcomes"
    ADD CONSTRAINT "project_outcomes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_passion_tree_id_fkey" FOREIGN KEY ("passion_tree_id") REFERENCES "public"."passion_trees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reflection_metrics"
    ADD CONSTRAINT "reflection_metrics_reflection_id_fkey" FOREIGN KEY ("reflection_id") REFERENCES "public"."reflections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reflection_tags"
    ADD CONSTRAINT "reflection_tags_reflection_id_fkey" FOREIGN KEY ("reflection_id") REFERENCES "public"."reflections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reflection_tags"
    ADD CONSTRAINT "reflection_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reflections"
    ADD CONSTRAINT "reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."related_interests"
    ADD CONSTRAINT "related_interests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_learning_path_id_fkey" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."roots"
    ADD CONSTRAINT "roots_passion_tree_id_fkey" FOREIGN KEY ("passion_tree_id") REFERENCES "public"."passion_trees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."synergies"
    ADD CONSTRAINT "synergies_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tools_acquired"
    ADD CONSTRAINT "tools_acquired_root_id_fkey" FOREIGN KEY ("root_id") REFERENCES "public"."roots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_communities"
    ADD CONSTRAINT "user_communities_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_communities"
    ADD CONSTRAINT "user_communities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_workshops"
    ADD CONSTRAINT "user_workshops_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_workshops"
    ADD CONSTRAINT "user_workshops_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workshop_comments"
    ADD CONSTRAINT "workshop_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workshop_comments"
    ADD CONSTRAINT "workshop_comments_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workshop_suggestions"
    ADD CONSTRAINT "workshop_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workshop_votes"
    ADD CONSTRAINT "workshop_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workshop_votes"
    ADD CONSTRAINT "workshop_votes_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE CASCADE;



CREATE POLICY "Enable delete for users based on user_id" ON "public"."profiles" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can create their own passion trees" ON "public"."passion_trees" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own passion trees" ON "public"."passion_trees" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" AS RESTRICTIVE FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert their own reflections" ON "public"."reflections" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own passion trees" ON "public"."passion_trees" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own passion trees" ON "public"."passion_trees" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own reflections" ON "public"."reflections" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "anyone can view profiles" ON "public"."profiles" FOR SELECT USING (true);



ALTER TABLE "public"."branches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "can create" ON "public"."interests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emotions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."engagement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."impacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."influences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learning_paths" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."milestones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."passion_trees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."potential_offshoots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_outcomes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."related_interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."synergies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tools_acquired" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_communities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_workshops" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "view interests" ON "public"."interests" FOR SELECT USING (("auth"."uid"() = "user_id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



























GRANT ALL ON TABLE "public"."branches" TO "anon";
GRANT ALL ON TABLE "public"."branches" TO "authenticated";
GRANT ALL ON TABLE "public"."branches" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."communities" TO "anon";
GRANT ALL ON TABLE "public"."communities" TO "authenticated";
GRANT ALL ON TABLE "public"."communities" TO "service_role";



GRANT ALL ON TABLE "public"."connections" TO "anon";
GRANT ALL ON TABLE "public"."connections" TO "authenticated";
GRANT ALL ON TABLE "public"."connections" TO "service_role";



GRANT ALL ON TABLE "public"."emotions" TO "anon";
GRANT ALL ON TABLE "public"."emotions" TO "authenticated";
GRANT ALL ON TABLE "public"."emotions" TO "service_role";



GRANT ALL ON TABLE "public"."engagement" TO "anon";
GRANT ALL ON TABLE "public"."engagement" TO "authenticated";
GRANT ALL ON TABLE "public"."engagement" TO "service_role";



GRANT ALL ON TABLE "public"."impacts" TO "anon";
GRANT ALL ON TABLE "public"."impacts" TO "authenticated";
GRANT ALL ON TABLE "public"."impacts" TO "service_role";



GRANT ALL ON TABLE "public"."influences" TO "anon";
GRANT ALL ON TABLE "public"."influences" TO "authenticated";
GRANT ALL ON TABLE "public"."influences" TO "service_role";



GRANT ALL ON TABLE "public"."insights" TO "anon";
GRANT ALL ON TABLE "public"."insights" TO "authenticated";
GRANT ALL ON TABLE "public"."insights" TO "service_role";



GRANT ALL ON TABLE "public"."interests" TO "anon";
GRANT ALL ON TABLE "public"."interests" TO "authenticated";
GRANT ALL ON TABLE "public"."interests" TO "service_role";



GRANT ALL ON TABLE "public"."learning_paths" TO "anon";
GRANT ALL ON TABLE "public"."learning_paths" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_paths" TO "service_role";



GRANT ALL ON TABLE "public"."milestones" TO "anon";
GRANT ALL ON TABLE "public"."milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."milestones" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_insights" TO "anon";
GRANT ALL ON TABLE "public"."monthly_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_insights" TO "service_role";



GRANT ALL ON TABLE "public"."passion_trees" TO "anon";
GRANT ALL ON TABLE "public"."passion_trees" TO "authenticated";
GRANT ALL ON TABLE "public"."passion_trees" TO "service_role";



GRANT ALL ON TABLE "public"."potential_offshoots" TO "anon";
GRANT ALL ON TABLE "public"."potential_offshoots" TO "authenticated";
GRANT ALL ON TABLE "public"."potential_offshoots" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_outcomes" TO "anon";
GRANT ALL ON TABLE "public"."project_outcomes" TO "authenticated";
GRANT ALL ON TABLE "public"."project_outcomes" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."reflection_metrics" TO "anon";
GRANT ALL ON TABLE "public"."reflection_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."reflection_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."reflection_tags" TO "anon";
GRANT ALL ON TABLE "public"."reflection_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."reflection_tags" TO "service_role";



GRANT ALL ON TABLE "public"."reflections" TO "anon";
GRANT ALL ON TABLE "public"."reflections" TO "authenticated";
GRANT ALL ON TABLE "public"."reflections" TO "service_role";



GRANT ALL ON TABLE "public"."related_interests" TO "anon";
GRANT ALL ON TABLE "public"."related_interests" TO "authenticated";
GRANT ALL ON TABLE "public"."related_interests" TO "service_role";



GRANT ALL ON TABLE "public"."resources" TO "anon";
GRANT ALL ON TABLE "public"."resources" TO "authenticated";
GRANT ALL ON TABLE "public"."resources" TO "service_role";



GRANT ALL ON TABLE "public"."roots" TO "anon";
GRANT ALL ON TABLE "public"."roots" TO "authenticated";
GRANT ALL ON TABLE "public"."roots" TO "service_role";



GRANT ALL ON TABLE "public"."skills" TO "anon";
GRANT ALL ON TABLE "public"."skills" TO "authenticated";
GRANT ALL ON TABLE "public"."skills" TO "service_role";



GRANT ALL ON TABLE "public"."synergies" TO "anon";
GRANT ALL ON TABLE "public"."synergies" TO "authenticated";
GRANT ALL ON TABLE "public"."synergies" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."tools_acquired" TO "anon";
GRANT ALL ON TABLE "public"."tools_acquired" TO "authenticated";
GRANT ALL ON TABLE "public"."tools_acquired" TO "service_role";



GRANT ALL ON TABLE "public"."user_communities" TO "anon";
GRANT ALL ON TABLE "public"."user_communities" TO "authenticated";
GRANT ALL ON TABLE "public"."user_communities" TO "service_role";



GRANT ALL ON TABLE "public"."user_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_stats" TO "service_role";



GRANT ALL ON TABLE "public"."user_workshops" TO "anon";
GRANT ALL ON TABLE "public"."user_workshops" TO "authenticated";
GRANT ALL ON TABLE "public"."user_workshops" TO "service_role";



GRANT ALL ON TABLE "public"."workshop_comments" TO "anon";
GRANT ALL ON TABLE "public"."workshop_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."workshop_comments" TO "service_role";



GRANT ALL ON TABLE "public"."workshop_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."workshop_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."workshop_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."workshop_votes" TO "anon";
GRANT ALL ON TABLE "public"."workshop_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."workshop_votes" TO "service_role";



GRANT ALL ON TABLE "public"."workshops" TO "anon";
GRANT ALL ON TABLE "public"."workshops" TO "authenticated";
GRANT ALL ON TABLE "public"."workshops" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
```

---


## Migration: 20250626050344_update_emotion_enum.sql

```sql
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'joy';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'curiosity';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'fulfillment';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'challenge';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'anticipation';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'trust';
-- And continue with the rest:
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'happy';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'excited';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'grateful';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'content';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'hopeful';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'sad';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'anxious';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'frustrated';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'overwhelmed';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'tired';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'neutral';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'calm';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'proud';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'motivated';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'creative';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'confused';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'stuck';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'bored';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'stressed';
ALTER TYPE emotion ADD VALUE IF NOT EXISTS 'energized';
```

---


## Migration: 20250630015258_update_communities.sql

```sql
-- Enable required extensions
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- Create enum types (only if they don't exist)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'community_role') then
    create type public.community_role as enum ('member', 'moderator', 'admin', 'owner');
  end if;
  
  if not exists (select 1 from pg_type where typname = 'post_type') then
    create type public.post_type as enum ('text', 'image', 'link', 'poll');
  end if;
  
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum ('planning', 'in_progress', 'completed', 'on_hold');
  end if;
end $$;

-- Communities table (only if it doesn't exist)
create table if not exists public.communities (
  id uuid not null default extensions.uuid_generate_v4(),
  name text not null,
  slug text not null generated always as (lower(replace(replace(trim(name), ' ', '-'), '.', ''))) stored,
  description text,
  short_description text,
  is_public boolean not null default true,
  is_active boolean not null default true,
  member_count integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint communities_pkey primary key (id),
  constraint communities_slug_key unique (slug)
) tablespace pg_default;

-- Community images (for profile and cover photos)
create table if not exists public.community_images (
  id uuid not null default extensions.uuid_generate_v4(),
  community_id uuid not null,
  url text not null,
  type text not null check (type in ('profile', 'cover')),
  storage_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  constraint community_images_pkey primary key (id),
  constraint community_images_community_id_fkey foreign key (community_id) 
    references communities(id) on delete cascade
) tablespace pg_default;

-- User communities (membership)
create table if not exists public.user_communities (
  id uuid not null default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  community_id uuid not null references communities(id) on delete cascade,
  role community_role not null default 'member',
  joined_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone,
  constraint user_communities_pkey primary key (id),
  constraint user_communities_user_community_key unique (user_id, community_id)
) tablespace pg_default;

-- Community posts
create table if not exists public.community_posts (
  id uuid not null default extensions.uuid_generate_v4(),
  community_id uuid not null references communities(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references community_posts(id) on delete cascade,
  title text,
  content text,
  type post_type not null default 'text',
  metadata jsonb,
  is_pinned boolean not null default false,
  is_edited boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint community_posts_pkey primary key (id)
) tablespace pg_default;

-- Post media (for images, files, etc.)
create table if not exists public.post_media (
  id uuid not null default extensions.uuid_generate_v4(),
  post_id uuid not null references community_posts(id) on delete cascade,
  url text not null,
  type text not null,
  storage_path text not null,
  metadata jsonb,
  created_at timestamp with time zone not null default now(),
  constraint post_media_pkey primary key (id)
) tablespace pg_default;

-- Post likes
create table if not exists public.post_likes (
  id uuid not null default extensions.uuid_generate_v4(),
  post_id uuid not null references community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  constraint post_likes_pkey primary key (id),
  constraint post_likes_post_user_key unique (post_id, user_id)
) tablespace pg_default;

-- Post comments
create table if not exists public.post_comments (
  id uuid not null default extensions.uuid_generate_v4(),
  post_id uuid not null references community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references post_comments(id) on delete cascade,
  content text not null,
  is_edited boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint post_comments_pkey primary key (id)
) tablespace pg_default;

-- Community projects
create table if not exists public.community_projects (
  id uuid not null default extensions.uuid_generate_v4(),
  community_id uuid not null references communities(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete set null,
  title text not null,
  description text,
  status project_status not null default 'planning',
  start_date date,
  target_date date,
  is_featured boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint community_projects_pkey primary key (id)
) tablespace pg_default;

-- Project members
create table if not exists public.project_members (
  id uuid not null default extensions.uuid_generate_v4(),
  project_id uuid not null references community_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'contributor',
  joined_at timestamp with time zone not null default now(),
  constraint project_members_pkey primary key (id),
  constraint project_members_project_user_key unique (project_id, user_id)
) tablespace pg_default;

-- Mentors
create table if not exists public.community_mentors (
  id uuid not null default extensions.uuid_generate_v4(),
  community_id uuid not null references communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  bio text,
  expertise text[],
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint community_mentors_pkey primary key (id),
  constraint community_mentors_community_user_key unique (community_id, user_id)
) tablespace pg_default;

-- Add missing columns if they don't exist
do $$
begin
  -- Add slug column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'communities' and column_name = 'slug') then
    alter table public.communities 
    add column slug text generated always as (lower(replace(replace(trim(name), ' ', '-'), '.', ''))) stored;
  end if;
  
  -- Add other missing columns as needed
  if not exists (select 1 from information_schema.columns where table_name = 'communities' and column_name = 'short_description') then
    alter table public.communities 
    add column short_description text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'communities' and column_name = 'is_public') then
    alter table public.communities 
    add column is_public boolean not null default true;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'communities' and column_name = 'is_active') then
    alter table public.communities 
    add column is_active boolean not null default true;
  end if;
  
  -- Add unique constraint on slug if it doesn't exist
  if not exists (
    select 1 from information_schema.table_constraints 
    where table_name = 'communities' and constraint_name = 'communities_slug_key'
  ) then
    alter table public.communities 
    add constraint communities_slug_key unique (slug);
  end if;
end $$;

-- Create indexes for better query performance (only if they don't exist)
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_communities_slug') then
    create index idx_communities_slug on public.communities(slug);
  end if;
  
  if not exists (select 1 from pg_indexes where indexname = 'idx_community_posts_community') then
    create index idx_community_posts_community on public.community_posts(community_id);
  end if;
  
  if not exists (select 1 from pg_indexes where indexname = 'idx_community_posts_author') then
    create index idx_community_posts_author on public.community_posts(author_id);
  end if;
  
  if not exists (select 1 from pg_indexes where indexname = 'idx_community_projects_community') then
    create index idx_community_projects_community on public.community_projects(community_id);
  end if;
  
  if not exists (select 1 from pg_indexes where indexname = 'idx_community_mentors_community') then
    create index idx_community_mentors_community on public.community_mentors(community_id);
  end if;
end $$;

-- Set up Row Level Security (RLS)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'communities') then
    alter table public.communities enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'community_images') then
    alter table public.community_images enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'user_communities') then
    alter table public.user_communities enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'community_posts') then
    alter table public.community_posts enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'post_media') then
    alter table public.post_media enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'post_likes') then
    alter table public.post_likes enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'post_comments') then
    alter table public.post_comments enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'community_projects') then
    alter table public.community_projects enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'project_members') then
    alter table public.project_members enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'community_mentors') then
    alter table public.community_mentors enable row level security;
  end if;
end $$;

-- Create RLS policies (only if they don't exist)
do $$
begin
  -- Communities: Public read, authenticated users can create
  if not exists (select 1 from pg_policies where tablename = 'communities' and policyname = 'Communities are viewable by everyone') then
    create policy "Communities are viewable by everyone"
      on public.communities for select
      using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'communities' and policyname = 'Authenticated users can create communities') then
    create policy "Authenticated users can create communities"
      on public.communities for insert
      with check (auth.role() = 'authenticated');
  end if;
  
  -- User communities: Users can see their own memberships
  if not exists (select 1 from pg_policies where tablename = 'user_communities' and policyname = 'Users can view their own community memberships') then
    create policy "Users can view their own community memberships"
      on public.user_communities for select
      using (auth.uid() = user_id);
  end if;
  
  -- Community posts: Public read, members can create
  if not exists (select 1 from pg_policies where tablename = 'community_posts' and policyname = 'Community posts are viewable by everyone') then
    create policy "Community posts are viewable by everyone"
      on public.community_posts for select
      using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'community_posts' and policyname = 'Community members can create posts') then
    create policy "Community members can create posts"
      on public.community_posts for insert
      with check (
        exists (
          select 1 from public.user_communities uc
          where uc.community_id = community_posts.community_id
          and uc.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Create or replace the trigger function for updated_at
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create or replace triggers for updated_at columns
do $$
begin
  -- For communities table
  if not exists (select 1 from pg_trigger where tgname = 'set_communities_updated_at') then
    execute 'create trigger set_communities_updated_at
    before update on public.communities
    for each row
    execute function public.set_current_timestamp_updated_at()';
  end if;
  
  -- For community_posts table
  if not exists (select 1 from pg_trigger where tgname = 'set_community_posts_updated_at') then
    execute 'create trigger set_community_posts_updated_at
    before update on public.community_posts
    for each row
    execute function public.set_current_timestamp_updated_at()';
  end if;
  
  -- For post_comments table
  if not exists (select 1 from pg_trigger where tgname = 'set_post_comments_updated_at') then
    execute 'create trigger set_post_comments_updated_at
    before update on public.post_comments
    for each row
    execute function public.set_current_timestamp_updated_at()';
  end if;
end $$;

-- Create or replace the trigger function for updating member_count
create or replace function public.update_community_member_count()
returns trigger as $$
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
$$ language plpgsql;

-- Create the trigger for member count if it doesn't exist
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'update_member_count') then
    execute 'create trigger update_member_count
    after insert or delete on public.user_communities
    for each row
    execute function public.update_community_member_count()';
  end if;
end $$;

-- Create or replace the function to check if a user is a community member
create or replace function public.is_community_member(community_id_param uuid, user_id_param uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.user_communities
    where community_id = community_id_param
    and user_id = user_id_param
  );
end;
$$ language plpgsql security definer;

-- Create or replace the function to check if a user is a community admin
create or replace function public.is_community_admin(community_id_param uuid, user_id_param uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.user_communities
    where community_id = community_id_param
    and user_id = user_id_param
    and role in ('admin', 'owner')
  );
end;
$$ language plpgsql security definer;```

---


## Migration: 20250702010000_refactor_reflection_system_revised.sql

```sql
-- Step 1: Alter the existing 'projects' table

-- Add user_id, goal, image_url, and link columns
ALTER TABLE public.projects
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN goal TEXT,
ADD COLUMN image_url TEXT,
ADD COLUMN link TEXT;

-- Backfill user_id from the passion_trees table
UPDATE public.projects p
SET user_id = pt.user_id
FROM public.passion_trees pt
WHERE p.passion_tree_id = pt.id;

-- Now that user_id is backfilled, we can set it to NOT NULL
ALTER TABLE public.projects
ALTER COLUMN user_id SET NOT NULL;

-- Drop the now-redundant passion_tree_id column
ALTER TABLE public.projects
DROP COLUMN passion_tree_id;

-- Update RLS policies for the projects table to use the new user_id
-- Drop existing policies if they exist (or alter them)
DROP POLICY IF EXISTS "Users can view their own passion trees" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own passion trees" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own passion trees" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own passion trees" ON public.projects;

CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Step 2: Create the 'project_tags' join table
CREATE TABLE public.project_tags (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

-- Enable RLS for project_tags
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_tags
CREATE POLICY "Users can manage tags for their own projects"
  ON public.project_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.user_id = auth.uid()));

-- Step 3: Modify the 'reflections' table
ALTER TABLE public.reflections
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN reason TEXT;

-- Step 4: Modify the 'reflection_metrics' table
ALTER TABLE public.reflection_metrics
RENAME COLUMN engagement TO progress;

-- Step 5: Drop the old 'reflection_tags' table
DROP TABLE public.reflection_tags;
```

---


## Migration: 20250702020000_update_metrics_to_decimal.sql

```sql
-- Alter reflection_metrics columns to support decimal values for smoother sliders

ALTER TABLE public.reflection_metrics
ALTER COLUMN satisfaction TYPE NUMERIC(3, 1),
ALTER COLUMN progress TYPE NUMERIC(3, 1),
ALTER COLUMN challenge TYPE NUMERIC(3, 1);
```

---


## Migration: 20250725075742_add_user_roles.sql

```sql
-- To manage different user roles within the platform
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['student'::text, 'TA'::text, 'instructor'::text])),
  PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  UNIQUE (user_id, role)
);

-- To group students into batches or cohorts
CREATE TABLE public.cohorts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- The top-level learning maps (e.g., AI, 3D, Unity)
CREATE TABLE public.learning_maps (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text,
  creator_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT learning_maps_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id)
);

-- Individual nodes within a learning map
CREATE TABLE public.map_nodes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  map_id uuid NOT NULL,
  title character varying NOT NULL,
  instructions text,
  difficulty integer NOT NULL DEFAULT 1,
  sprite_url text, -- For gamification (boss/sprite image)
  metadata jsonb, -- For extra data like total students, finished students
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT map_nodes_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id)
);

-- Defines the connections and paths between nodes
CREATE TABLE public.node_paths (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  source_node_id uuid NOT NULL,
  destination_node_id uuid NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT node_paths_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.map_nodes(id),
  CONSTRAINT node_paths_destination_node_id_fkey FOREIGN KEY (destination_node_id) REFERENCES public.map_nodes(id)
);

-- To assign users from a cohort to a specific learning map
CREATE TABLE public.cohort_map_enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cohort_id uuid NOT NULL,
  map_id uuid NOT NULL,
  enrolled_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT cohort_map_enrollments_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id),
  CONSTRAINT cohort_map_enrollments_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id)
);```

---


## Migration: 20250725080607_add_map_content.sql

```sql
-- Content for each map node (video, slides, text)
CREATE TABLE public.node_content (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  node_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type = ANY (ARRAY['video'::text, 'canva_slide'::text, 'text_with_images'::text])),
  content_url text, -- For video links, canva links
  content_body text, -- For text-based content
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT node_content_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id)
);

-- Defines the assessment for a node
CREATE TABLE public.node_assessments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  node_id uuid NOT NULL,
  assessment_type text NOT NULL CHECK (assessment_type = ANY (ARRAY['quiz'::text, 'text_answer'::text, 'image_upload'::text, 'file_upload'::text])),
  PRIMARY KEY (id),
  CONSTRAINT node_assessments_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id)
);

-- For quiz-type assessments
CREATE TABLE public.quiz_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assessment_id uuid NOT NULL,
  question_text text NOT NULL,
  options jsonb, -- e.g., [{"option": "A", "text": "Answer A"}, {"option": "B", "text": "Answer B"}]
  correct_option character varying,
  PRIMARY KEY (id),
  CONSTRAINT quiz_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.node_assessments(id)
);

-- Tracks a student's progress at each node
CREATE TABLE public.student_node_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  node_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'not_started'::text CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'submitted'::text, 'passed'::text, 'failed'::text])),
  arrived_at timestamp with time zone,
  started_at timestamp with time zone,
  submitted_at timestamp with time zone,
  PRIMARY KEY (id),
  CONSTRAINT student_node_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT student_node_progress_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id),
  UNIQUE(user_id, node_id)
);

-- Stores student submissions for assessments
CREATE TABLE public.assessment_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  progress_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  -- For different submission types
  text_answer text,
  file_url text,
  image_url text,
  quiz_answers jsonb, -- e.g., {"question_id": "A", "question_id_2": "C"}
  submitted_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT assessment_submissions_progress_id_fkey FOREIGN KEY (progress_id) REFERENCES public.student_node_progress(id),
  CONSTRAINT assessment_submissions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.node_assessments(id)
);

-- For TA/Instructor grading and feedback
CREATE TABLE public.submission_grades (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_id uuid NOT NULL,
  graded_by uuid NOT NULL,
  grade text NOT NULL CHECK (grade = ANY (ARRAY['pass'::text, 'fail'::text])),
  rating integer, -- Optional numeric rating
  comments text,
  graded_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT submission_grades_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assessment_submissions(id),
  CONSTRAINT submission_grades_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.profiles(id)
);

-- Leaderboard for students who have passed a node
CREATE TABLE public.node_leaderboard (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  node_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rank integer NOT NULL,
  grade_rating integer,
  completion_speed_seconds bigint, -- Time from started_at to submitted_at
  ranked_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT node_leaderboard_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id),
  CONSTRAINT node_leaderboard_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);```

---


## Migration: 20250725162654_add_map_metadata.sql

```sql
-- Add metadata fields to learning_maps table
ALTER TABLE public.learning_maps 
ADD COLUMN difficulty integer DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 10),
ADD COLUMN category text CHECK (category = ANY (ARRAY['ai'::text, '3d'::text, 'unity'::text, 'hacking'::text, 'custom'::text])),
ADD COLUMN total_students integer DEFAULT 0,
ADD COLUMN finished_students integer DEFAULT 0,
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS learning_maps_category_idx ON public.learning_maps(category);
CREATE INDEX IF NOT EXISTS learning_maps_difficulty_idx ON public.learning_maps(difficulty);

-- Add comments for documentation
COMMENT ON COLUMN public.learning_maps.difficulty IS 'Overall difficulty of the learning map (1-10)';
COMMENT ON COLUMN public.learning_maps.category IS 'Category of the learning map (ai, 3d, unity, hacking, custom)';
COMMENT ON COLUMN public.learning_maps.total_students IS 'Cached count of total students enrolled in this map';
COMMENT ON COLUMN public.learning_maps.finished_students IS 'Cached count of students who completed this map';
COMMENT ON COLUMN public.learning_maps.metadata IS 'Additional metadata in JSON format for extensibility';```

---


## Migration: 20250726120000_add_grade_trigger.sql

```sql
-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_new_grade_update_progress ON public.submission_grades;
DROP FUNCTION IF EXISTS public.update_progress_on_grade();

-- Function to update student_node_progress status based on a new grade
CREATE OR REPLACE FUNCTION public.update_progress_on_grade() 
RETURNS TRIGGER AS $$
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
    UPDATE public.student_node_progress
    SET status = new_status,
        updated_at = NOW()
    WHERE id = submission_progress_id;

    -- Log the update for debugging
    RAISE NOTICE 'Updated progress % from grade % to status % (graded_by: %)', 
        submission_progress_id, NEW.grade, new_status, 
        CASE WHEN NEW.graded_by IS NULL THEN 'SYSTEM' ELSE 'INSTRUCTOR' END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after a new grade is inserted
CREATE TRIGGER on_new_grade_update_progress
AFTER INSERT ON public.submission_grades
FOR EACH ROW
EXECUTE FUNCTION public.update_progress_on_grade();

ALTER TABLE public.submission_grades
  DROP CONSTRAINT IF EXISTS submission_grades_rating_check;

-- FIXED: Ensure graded_by can be null for system-generated grades
ALTER TABLE public.submission_grades 
ALTER COLUMN graded_by DROP NOT NULL;

-- FIXED: Add a check to ensure rating is within valid range if provided
ALTER TABLE public.submission_grades 
ADD CONSTRAINT submission_grades_rating_check 
CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Add helpful comments
COMMENT ON FUNCTION public.update_progress_on_grade() IS 'Maps submission grades (pass/fail) to progress status (passed/failed), supports both instructor and system grading';
COMMENT ON TRIGGER on_new_grade_update_progress ON public.submission_grades IS 'Automatically updates student progress when a grade is assigned by instructor or system';
COMMENT ON COLUMN public.submission_grades.graded_by IS 'Instructor who graded the submission, NULL for system-generated grades (e.g., auto-graded quizzes)';
```

---


## Migration: 20250730114553_update_file_urls.sql

```sql
-- Update assessment_submissions table to support multiple file URLs
ALTER TABLE public.assessment_submissions 
  DROP COLUMN IF EXISTS file_url,
  ADD COLUMN file_urls text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.assessment_submissions.file_urls IS 'Array of file URLs for multiple file uploads';

-- Update any existing data if needed (this migration assumes no existing critical data)
-- If there's existing data in file_url, you might want to migrate it first before dropping
```

---


## Migration: 20250731000000_fix_submission_grades_constraints.sql

```sql
-- First, let's check and fix the submission_grades table constraints
ALTER TABLE public.submission_grades 
DROP CONSTRAINT IF EXISTS submission_grades_grade_check,
DROP CONSTRAINT IF EXISTS submission_grades_rating_check;

-- Add proper check constraints
ALTER TABLE public.submission_grades 
ADD CONSTRAINT submission_grades_grade_check 
CHECK (grade IN ('pass', 'fail'));

ALTER TABLE public.submission_grades 
ADD CONSTRAINT submission_grades_rating_check 
CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Ensure the graded_by column allows instructor/TA users
-- (This should be handled by application logic, but let's document it)
COMMENT ON COLUMN public.submission_grades.graded_by IS 'User ID of instructor or TA who graded this submission';
COMMENT ON COLUMN public.submission_grades.grade IS 'Pass or fail grade (pass, fail)';
COMMENT ON COLUMN public.submission_grades.rating IS 'Optional numeric rating from 1 to 5';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS submission_grades_submission_id_idx ON public.submission_grades(submission_id);
CREATE INDEX IF NOT EXISTS submission_grades_graded_by_idx ON public.submission_grades(graded_by);
```

---


## Migration: 20250731000001_verify_progress_constraints.sql

```sql
-- Verify and fix the student_node_progress status constraint
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'student_node_progress_status_check' 
        AND table_name = 'student_node_progress'
    ) THEN
        ALTER TABLE public.student_node_progress 
        DROP CONSTRAINT student_node_progress_status_check;
    END IF;
    
    -- Add the correct constraint
    ALTER TABLE public.student_node_progress 
    ADD CONSTRAINT student_node_progress_status_check 
    CHECK (status IN ('not_started', 'in_progress', 'submitted', 'passed', 'failed'));
    
    RAISE NOTICE 'Progress status constraint verified and updated';
END $$;

-- Verify the submission_grades constraint as well
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'submission_grades_grade_check' 
        AND table_name = 'submission_grades'
    ) THEN
        ALTER TABLE public.submission_grades 
        DROP CONSTRAINT submission_grades_grade_check;
    END IF;
    
    -- Add the correct constraint
    ALTER TABLE public.submission_grades 
    ADD CONSTRAINT submission_grades_grade_check 
    CHECK (grade IN ('pass', 'fail'));
    
    RAISE NOTICE 'Submission grades constraint verified and updated';
END $$;

-- Add helpful comments
COMMENT ON CONSTRAINT student_node_progress_status_check ON public.student_node_progress 
IS 'Valid status values: not_started, in_progress, submitted, passed, failed';

COMMENT ON CONSTRAINT submission_grades_grade_check ON public.submission_grades 
IS 'Valid grade values: pass, fail (mapped to passed/failed in progress by trigger)';
```

---


## Migration: 20250731000002_add_cascade_deletes.sql

```sql
-- Drop and recreate foreign key constraints with CASCADE delete options

-- First, let's drop existing foreign key constraints
ALTER TABLE IF EXISTS public.node_assessments 
DROP CONSTRAINT IF EXISTS node_assessments_node_id_fkey;

ALTER TABLE IF EXISTS public.node_content 
DROP CONSTRAINT IF EXISTS node_content_node_id_fkey;

ALTER TABLE IF EXISTS public.student_node_progress 
DROP CONSTRAINT IF EXISTS student_node_progress_node_id_fkey;

ALTER TABLE IF EXISTS public.quiz_questions 
DROP CONSTRAINT IF EXISTS quiz_questions_assessment_id_fkey;

ALTER TABLE IF EXISTS public.assessment_submissions 
DROP CONSTRAINT IF EXISTS assessment_submissions_assessment_id_fkey,
DROP CONSTRAINT IF EXISTS assessment_submissions_progress_id_fkey;

ALTER TABLE IF EXISTS public.submission_grades 
DROP CONSTRAINT IF EXISTS submission_grades_submission_id_fkey;

ALTER TABLE IF EXISTS public.node_leaderboard 
DROP CONSTRAINT IF EXISTS node_leaderboard_node_id_fkey;

ALTER TABLE IF EXISTS public.node_paths 
DROP CONSTRAINT IF EXISTS node_paths_source_node_id_fkey,
DROP CONSTRAINT IF EXISTS node_paths_destination_node_id_fkey;

-- Now add them back with CASCADE options where appropriate

-- Node-related cascades (when a node is deleted, delete related data)
ALTER TABLE public.node_assessments 
ADD CONSTRAINT node_assessments_node_id_fkey 
FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;

ALTER TABLE public.node_content 
ADD CONSTRAINT node_content_node_id_fkey 
FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;

ALTER TABLE public.student_node_progress 
ADD CONSTRAINT student_node_progress_node_id_fkey 
FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;

ALTER TABLE public.node_leaderboard 
ADD CONSTRAINT node_leaderboard_node_id_fkey 
FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;

ALTER TABLE public.node_paths 
ADD CONSTRAINT node_paths_source_node_id_fkey 
FOREIGN KEY (source_node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE,
ADD CONSTRAINT node_paths_destination_node_id_fkey 
FOREIGN KEY (destination_node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;

-- Assessment-related cascades (when an assessment is deleted, delete related data)
ALTER TABLE public.quiz_questions 
ADD CONSTRAINT quiz_questions_assessment_id_fkey 
FOREIGN KEY (assessment_id) REFERENCES public.node_assessments(id) ON DELETE CASCADE;

ALTER TABLE public.assessment_submissions 
ADD CONSTRAINT assessment_submissions_assessment_id_fkey 
FOREIGN KEY (assessment_id) REFERENCES public.node_assessments(id) ON DELETE CASCADE;

-- Progress-related cascades (when progress is deleted, delete submissions)
ALTER TABLE public.assessment_submissions 
ADD CONSTRAINT assessment_submissions_progress_id_fkey 
FOREIGN KEY (progress_id) REFERENCES public.student_node_progress(id) ON DELETE CASCADE;

-- Submission-related cascades (when submission is deleted, delete grades)
ALTER TABLE public.submission_grades 
ADD CONSTRAINT submission_grades_submission_id_fkey 
FOREIGN KEY (submission_id) REFERENCES public.assessment_submissions(id) ON DELETE CASCADE;

-- Add helpful comments
COMMENT ON CONSTRAINT node_assessments_node_id_fkey ON public.node_assessments 
IS 'Cascade delete assessments when node is deleted';

COMMENT ON CONSTRAINT node_content_node_id_fkey ON public.node_content 
IS 'Cascade delete content when node is deleted';

COMMENT ON CONSTRAINT student_node_progress_node_id_fkey ON public.student_node_progress 
IS 'Cascade delete progress when node is deleted';

COMMENT ON CONSTRAINT quiz_questions_assessment_id_fkey ON public.quiz_questions 
IS 'Cascade delete quiz questions when assessment is deleted';

COMMENT ON CONSTRAINT assessment_submissions_assessment_id_fkey ON public.assessment_submissions 
IS 'Cascade delete submissions when assessment is deleted';

COMMENT ON CONSTRAINT assessment_submissions_progress_id_fkey ON public.assessment_submissions 
IS 'Cascade delete submissions when progress is deleted';

COMMENT ON CONSTRAINT submission_grades_submission_id_fkey ON public.submission_grades 
IS 'Cascade delete grades when submission is deleted';
```

---


## Migration: 20250802000000_add_user_map_enrollments.sql

```sql
-- Individual user enrollments in learning maps
-- This table tracks when a user starts/joins a learning map adventure
CREATE TABLE public.user_map_enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  map_id uuid NOT NULL,
  enrolled_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone, -- When they finish the entire map
  progress_percentage integer DEFAULT 0, -- Overall progress through the map
  PRIMARY KEY (id),
  CONSTRAINT user_map_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_map_enrollments_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id) ON DELETE CASCADE,
  UNIQUE (user_id, map_id) -- Prevent duplicate enrollments
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_map_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS policies to ensure users can only see/modify their own enrollments
CREATE POLICY "Users can view their own map enrollments" ON public.user_map_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own map enrollments" ON public.user_map_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own map enrollments" ON public.user_map_enrollments
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON TABLE public.user_map_enrollments TO anon;
GRANT ALL ON TABLE public.user_map_enrollments TO authenticated;
GRANT ALL ON TABLE public.user_map_enrollments TO service_role;
```

---


## Migration: 20250802120000_add_resource_link_content_type.sql

```sql
-- Add 'resource_link' to the content_type constraint
ALTER TABLE public.node_content 
DROP CONSTRAINT IF EXISTS node_content_content_type_check;

ALTER TABLE public.node_content 
ADD CONSTRAINT node_content_content_type_check 
CHECK (content_type = ANY (ARRAY['video'::text, 'canva_slide'::text, 'text_with_images'::text, 'resource_link'::text]));
```

---


## Migration: 20250803120000_fix_grade_trigger_updated_at.sql

```sql
-- Fix the grade trigger to remove the non-existent updated_at column reference
-- The student_node_progress table doesn't have an updated_at column

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_new_grade_update_progress ON public.submission_grades;
DROP FUNCTION IF EXISTS public.update_progress_on_grade();

-- Function to update student_node_progress status based on a new grade
-- FIXED: Removed updated_at column reference since it doesn't exist in the table
CREATE OR REPLACE FUNCTION public.update_progress_on_grade() 
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after a new grade is inserted
CREATE TRIGGER on_new_grade_update_progress
AFTER INSERT ON public.submission_grades
FOR EACH ROW
EXECUTE FUNCTION public.update_progress_on_grade();

-- Add helpful comments
COMMENT ON FUNCTION public.update_progress_on_grade() IS 'Maps submission grades (pass/fail) to progress status (passed/failed), supports both instructor and system grading. Fixed to not update non-existent updated_at column.';
COMMENT ON TRIGGER on_new_grade_update_progress ON public.submission_grades IS 'Automatically updates student progress when a grade is assigned by instructor or system';
```

---


## Migration: 20250807120000_create_classroom_system_complete.sql

```sql
-- Migration: Complete Classroom System Creation
-- Created: 2025-08-07 12:00:00
-- Description: Creates a comprehensive classroom system with proper RLS policies, 
--              constraints, and helper functions. This migration consolidates all 
--              classroom functionality into a single file with fixes applied.

-- ========================================
-- EXTENSIONS AND PREREQUISITES
-- ========================================

-- Ensure we have required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify required tables exist (map_nodes should exist from map system)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_nodes') THEN
        RAISE EXCEPTION 'map_nodes table must exist before creating classroom system. Run map migrations first.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        RAISE EXCEPTION 'user_roles table must exist before creating classroom system. Run user roles migration first.';
    END IF;
END$$;

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to generate secure join codes
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql VOLATILE;

-- Grant execute permissions for generate_join_code
GRANT EXECUTE ON FUNCTION public.generate_join_code() TO authenticated;

-- ========================================
-- CORE TABLES
-- ========================================

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS public.assignment_enrollments CASCADE;
DROP TABLE IF EXISTS public.assignment_nodes CASCADE;
DROP TABLE IF EXISTS public.classroom_assignments CASCADE;
DROP TABLE IF EXISTS public.classroom_memberships CASCADE;
DROP TABLE IF EXISTS public.classrooms CASCADE;

-- 1. CLASSROOMS TABLE
CREATE TABLE public.classrooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    join_code VARCHAR(6) UNIQUE NOT NULL DEFAULT public.generate_join_code(),
    max_students INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT classrooms_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT classrooms_join_code_format CHECK (join_code ~ '^[A-Z0-9]{6}$'),
    CONSTRAINT classrooms_max_students_positive CHECK (max_students > 0 AND max_students <= 1000),
    CONSTRAINT classrooms_description_length CHECK (char_length(description) <= 2000)
);

-- 2. CLASSROOM MEMBERSHIPS TABLE
CREATE TABLE public.classroom_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    joined_at TIMESTAMPTZ DEFAULT now(),
    last_active_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT classroom_memberships_unique_membership UNIQUE(classroom_id, user_id),
    CONSTRAINT classroom_memberships_valid_role CHECK (role IN ('student', 'ta', 'instructor'))
);

-- 3. CLASSROOM ASSIGNMENTS TABLE
CREATE TABLE public.classroom_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    default_due_date TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT assignments_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 255),
    CONSTRAINT assignments_description_length CHECK (char_length(description) <= 5000),
    CONSTRAINT assignments_instructions_length CHECK (char_length(instructions) <= 10000),
    CONSTRAINT assignments_due_date_future CHECK (default_due_date IS NULL OR default_due_date > created_at)
);

-- 4. ASSIGNMENT NODES TABLE (Many-to-many: assignments ↔ map_nodes)
CREATE TABLE public.assignment_nodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES public.map_nodes(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    is_required BOOLEAN DEFAULT true,
    points_possible INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT assignment_nodes_unique_assignment_node UNIQUE(assignment_id, node_id),
    CONSTRAINT assignment_nodes_unique_sequence UNIQUE(assignment_id, sequence_order),
    CONSTRAINT assignment_nodes_sequence_positive CHECK (sequence_order > 0),
    CONSTRAINT assignment_nodes_points_non_negative CHECK (points_possible >= 0)
);

-- 5. ASSIGNMENT ENROLLMENTS TABLE (Tracks student enrollments)
CREATE TABLE public.assignment_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ, -- Individual due date (overrides default)
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'assigned' NOT NULL,
    completion_percentage INTEGER DEFAULT 0,
    total_points_earned INTEGER DEFAULT 0,
    total_points_possible INTEGER DEFAULT 0,
    notes TEXT,
    
    -- Constraints
    CONSTRAINT assignment_enrollments_unique_enrollment UNIQUE(assignment_id, user_id),
    CONSTRAINT assignment_enrollments_valid_status CHECK (status IN ('assigned', 'in_progress', 'submitted', 'completed', 'overdue')),
    CONSTRAINT assignment_enrollments_percentage_range CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    CONSTRAINT assignment_enrollments_points_non_negative CHECK (
        total_points_earned >= 0 AND total_points_possible >= 0 AND total_points_earned <= total_points_possible
    ),
    CONSTRAINT assignment_enrollments_completion_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR 
        (status != 'completed')
    ),
    CONSTRAINT assignment_enrollments_started_logic CHECK (
        (status IN ('in_progress', 'submitted', 'completed') AND started_at IS NOT NULL) OR
        (status IN ('assigned', 'overdue'))
    ),
    CONSTRAINT assignment_enrollments_notes_length CHECK (char_length(notes) <= 2000)
);

-- ========================================
-- MEMBERSHIP HELPER FUNCTION
-- ========================================

-- Create function to check classroom membership (security definer to avoid RLS recursion)
-- This function is created after tables to avoid circular dependencies
CREATE OR REPLACE FUNCTION public.is_classroom_member(classroom_uuid UUID, user_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND user_id = user_uuid
    );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_classroom_member(UUID, UUID) TO authenticated;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Classrooms indexes
CREATE INDEX idx_classrooms_instructor ON public.classrooms(instructor_id);
CREATE INDEX idx_classrooms_join_code ON public.classrooms(join_code);
CREATE INDEX idx_classrooms_active ON public.classrooms(is_active) WHERE is_active = true;
CREATE INDEX idx_classrooms_created_at ON public.classrooms(created_at);

-- Classroom memberships indexes
CREATE INDEX idx_classroom_memberships_classroom ON public.classroom_memberships(classroom_id);
CREATE INDEX idx_classroom_memberships_user ON public.classroom_memberships(user_id);
CREATE INDEX idx_classroom_memberships_role ON public.classroom_memberships(role);
CREATE INDEX idx_classroom_memberships_active ON public.classroom_memberships(last_active_at);

-- Classroom assignments indexes
CREATE INDEX idx_classroom_assignments_classroom ON public.classroom_assignments(classroom_id);
CREATE INDEX idx_classroom_assignments_creator ON public.classroom_assignments(created_by);
CREATE INDEX idx_classroom_assignments_published ON public.classroom_assignments(is_published) WHERE is_published = true;
CREATE INDEX idx_classroom_assignments_due_date ON public.classroom_assignments(default_due_date);

-- Assignment nodes indexes
CREATE INDEX idx_assignment_nodes_assignment ON public.assignment_nodes(assignment_id);
CREATE INDEX idx_assignment_nodes_node ON public.assignment_nodes(node_id);
CREATE INDEX idx_assignment_nodes_sequence ON public.assignment_nodes(assignment_id, sequence_order);
CREATE INDEX idx_assignment_nodes_required ON public.assignment_nodes(is_required) WHERE is_required = true;

-- Assignment enrollments indexes
CREATE INDEX idx_assignment_enrollments_assignment ON public.assignment_enrollments(assignment_id);
CREATE INDEX idx_assignment_enrollments_user ON public.assignment_enrollments(user_id);
CREATE INDEX idx_assignment_enrollments_status ON public.assignment_enrollments(status);
CREATE INDEX idx_assignment_enrollments_due_date ON public.assignment_enrollments(due_date);
CREATE INDEX idx_assignment_enrollments_completion ON public.assignment_enrollments(completed_at);

-- ========================================
-- TRIGGERS
-- ========================================

-- Updated_at triggers
CREATE TRIGGER update_classrooms_updated_at
    BEFORE UPDATE ON public.classrooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classroom_assignments_updated_at
    BEFORE UPDATE ON public.classroom_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update last_active_at when membership is accessed
CREATE OR REPLACE FUNCTION public.update_membership_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_membership_activity
    BEFORE UPDATE ON public.classroom_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_membership_activity();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_enrollments ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES - CLASSROOMS
-- ========================================

-- Instructors can manage their own classrooms
CREATE POLICY "instructors_manage_own_classrooms" ON public.classrooms
    FOR ALL 
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());

-- Students and members can view classrooms they belong to OR find active classrooms by join code
CREATE POLICY "users_access_classrooms" ON public.classrooms
    FOR SELECT 
    USING (
        -- Allow finding active classrooms (for joining)
        is_active = true OR
        -- Allow accessing classrooms user is a member of
        public.is_classroom_member(id, auth.uid())
    );

-- ========================================
-- RLS POLICIES - CLASSROOM MEMBERSHIPS
-- ========================================

-- Users can view their own memberships
CREATE POLICY "users_view_own_memberships" ON public.classroom_memberships
    FOR SELECT 
    USING (user_id = auth.uid());

-- Students can join classrooms (insert their own membership)
CREATE POLICY "students_join_classrooms" ON public.classroom_memberships
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid() AND 
        role = 'student' AND
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND is_active = true
        )
    );

-- Users can leave classrooms (delete their own membership)
CREATE POLICY "users_leave_classrooms" ON public.classroom_memberships
    FOR DELETE 
    USING (user_id = auth.uid());

-- Instructors can manage all memberships in their classrooms
CREATE POLICY "instructors_manage_classroom_memberships" ON public.classroom_memberships
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND instructor_id = auth.uid()
        )
    );

-- ========================================
-- RLS POLICIES - CLASSROOM ASSIGNMENTS
-- ========================================

-- Assignment creators can manage their assignments
CREATE POLICY "creators_manage_assignments" ON public.classroom_assignments
    FOR ALL 
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Students can view published assignments in classrooms they're members of
CREATE POLICY "students_view_published_assignments" ON public.classroom_assignments
    FOR SELECT 
    USING (
        is_published = true AND
        public.is_classroom_member(classroom_id, auth.uid())
    );

-- ========================================
-- RLS POLICIES - ASSIGNMENT NODES
-- ========================================

-- Assignment creators can manage nodes in their assignments
CREATE POLICY "creators_manage_assignment_nodes" ON public.assignment_nodes
    FOR ALL 
    USING (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        )
    );

-- Students can view nodes for assignments they're enrolled in
CREATE POLICY "students_view_enrolled_assignment_nodes" ON public.assignment_nodes
    FOR SELECT 
    USING (
        assignment_id IN (
            SELECT assignment_id FROM public.assignment_enrollments 
            WHERE user_id = auth.uid()
        ) OR
        assignment_id IN (
            SELECT ca.id FROM public.classroom_assignments ca
            WHERE ca.is_published = true 
            AND public.is_classroom_member(ca.classroom_id, auth.uid())
        )
    );

-- ========================================
-- RLS POLICIES - ASSIGNMENT ENROLLMENTS
-- ========================================

-- Assignment creators can manage all enrollments for their assignments
CREATE POLICY "creators_manage_enrollments" ON public.assignment_enrollments
    FOR ALL 
    USING (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        ) OR user_id = auth.uid()
    )
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        ) OR user_id = auth.uid()
    );

-- ========================================
-- UTILITY FUNCTIONS
-- ========================================

-- Function to get classroom statistics
CREATE OR REPLACE FUNCTION public.get_classroom_stats(classroom_uuid UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_classroom_stats(UUID) TO authenticated;

-- ========================================
-- GRANTS AND PERMISSIONS
-- ========================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ========================================
-- COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.classrooms IS 'Virtual classrooms for organizing students and assignments with unique join codes';
COMMENT ON COLUMN public.classrooms.join_code IS 'Unique 6-character alphanumeric code for students to join classroom';
COMMENT ON COLUMN public.classrooms.max_students IS 'Maximum number of students allowed in classroom (1-1000)';
COMMENT ON COLUMN public.classrooms.is_active IS 'Whether classroom accepts new members and assignments';

COMMENT ON TABLE public.classroom_memberships IS 'Tracks user membership in classrooms with roles (student, ta, instructor)';
COMMENT ON COLUMN public.classroom_memberships.role IS 'User role: student, ta, or instructor';
COMMENT ON COLUMN public.classroom_memberships.last_active_at IS 'Last time user was active in this classroom';

COMMENT ON TABLE public.classroom_assignments IS 'Custom assignments created by instructors containing specific learning nodes';
COMMENT ON COLUMN public.classroom_assignments.is_published IS 'Whether assignment is visible to students';
COMMENT ON COLUMN public.classroom_assignments.default_due_date IS 'Default due date (can be overridden per student)';

COMMENT ON TABLE public.assignment_nodes IS 'Links assignments to specific nodes from learning maps with sequence and requirements';
COMMENT ON COLUMN public.assignment_nodes.sequence_order IS 'Order in which nodes should be completed';
COMMENT ON COLUMN public.assignment_nodes.is_required IS 'Whether node completion is required for assignment completion';
COMMENT ON COLUMN public.assignment_nodes.points_possible IS 'Maximum points available for this node in this assignment';

COMMENT ON TABLE public.assignment_enrollments IS 'Tracks individual student progress and scores on assignments';
COMMENT ON COLUMN public.assignment_enrollments.status IS 'Current status: assigned, in_progress, submitted, completed, overdue';
COMMENT ON COLUMN public.assignment_enrollments.completion_percentage IS 'Percentage of required nodes completed (0-100)';
COMMENT ON COLUMN public.assignment_enrollments.total_points_earned IS 'Total points earned across all nodes';
COMMENT ON COLUMN public.assignment_enrollments.total_points_possible IS 'Total points possible across all nodes';

COMMENT ON FUNCTION public.is_classroom_member(UUID, UUID) IS 'Security definer function to check classroom membership without RLS recursion';
COMMENT ON FUNCTION public.generate_join_code() IS 'Generates unique 6-character alphanumeric join codes';
COMMENT ON FUNCTION public.get_classroom_stats(UUID) IS 'Returns comprehensive statistics for a classroom';

-- ========================================
-- VALIDATION AND VERIFICATION
-- ========================================

-- Verify all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('classrooms', 'classroom_memberships', 'classroom_assignments', 'assignment_nodes', 'assignment_enrollments');
    
    IF table_count != 5 THEN
        RAISE EXCEPTION 'Not all classroom tables were created successfully. Expected 5, got %', table_count;
    END IF;
    
    RAISE NOTICE 'Classroom system migration completed successfully. Created % tables with RLS policies and helper functions.', table_count;
END$$;
```

---


## Migration: 20250807120001_classroom_system_enhancements.sql

```sql
-- Migration: Classroom System Enhancements and Additional Features
-- Created: 2025-08-07 12:30:00
-- Description: Adds advanced features to the classroom system including auto-enrollment,
--              grade synchronization, notification triggers, and additional utility functions.

-- ========================================
-- ENHANCED ENROLLMENT FEATURES
-- ========================================

-- Function to auto-enroll all classroom members in a new assignment
CREATE OR REPLACE FUNCTION public.auto_enroll_classroom_members(assignment_uuid UUID)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate assignment completion status
CREATE OR REPLACE FUNCTION public.calculate_assignment_completion(enrollment_uuid UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- AUTOMATIC TRIGGERS FOR PROGRESS SYNC
-- ========================================

-- Function to automatically update enrollment progress when node progress changes
CREATE OR REPLACE FUNCTION public.sync_assignment_progress()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger on student_node_progress table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_node_progress') THEN
        DROP TRIGGER IF EXISTS sync_assignment_progress_trigger ON public.student_node_progress;
        CREATE TRIGGER sync_assignment_progress_trigger
            AFTER INSERT OR UPDATE OR DELETE ON public.student_node_progress
            FOR EACH ROW
            EXECUTE FUNCTION public.sync_assignment_progress();
        
        RAISE NOTICE 'Created trigger to sync assignment progress with node progress';
    ELSE
        RAISE NOTICE 'student_node_progress table not found, skipping trigger creation';
    END IF;
END$$;

-- ========================================
-- CLASSROOM ANALYTICS FUNCTIONS
-- ========================================

-- Get detailed classroom analytics
CREATE OR REPLACE FUNCTION public.get_classroom_analytics(classroom_uuid UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get student progress overview for instructors
CREATE OR REPLACE FUNCTION public.get_student_progress_overview(classroom_uuid UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- UTILITY FUNCTIONS FOR MANAGEMENT
-- ========================================

-- Function to bulk enroll students by email
CREATE OR REPLACE FUNCTION public.bulk_enroll_students(
    classroom_uuid UUID, 
    student_emails TEXT[]
)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old assignments
CREATE OR REPLACE FUNCTION public.archive_old_assignments(days_old INTEGER DEFAULT 365)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION public.auto_enroll_classroom_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_assignment_completion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_classroom_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_progress_overview(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_enroll_students(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_old_assignments(INTEGER) TO authenticated;

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON FUNCTION public.auto_enroll_classroom_members(UUID) IS 'Automatically enrolls all classroom students in a new assignment';
COMMENT ON FUNCTION public.calculate_assignment_completion(UUID) IS 'Calculates detailed completion statistics for an assignment enrollment';
COMMENT ON FUNCTION public.sync_assignment_progress() IS 'Trigger function to automatically sync assignment progress when node progress changes';
COMMENT ON FUNCTION public.get_classroom_analytics(UUID) IS 'Returns comprehensive analytics for classroom performance and activity';
COMMENT ON FUNCTION public.get_student_progress_overview(UUID) IS 'Returns detailed progress overview for all students in a classroom';
COMMENT ON FUNCTION public.bulk_enroll_students(UUID, TEXT[]) IS 'Bulk enrolls students in a classroom by email addresses';
COMMENT ON FUNCTION public.archive_old_assignments(INTEGER) IS 'Archives assignments older than specified days (default 365)';

-- Final verification
DO $$
BEGIN
    RAISE NOTICE 'Classroom system enhancements migration completed successfully. Added advanced enrollment, analytics, and management functions.';
END$$;
```

---


## Migration: 20250812120000_add_classroom_map_linking.sql

```sql
-- Migration: Add Classroom-Map Linking System
-- Created: 2025-08-12 12:00:00
-- Description: Creates a many-to-many relationship between classrooms and maps,
--              allowing instructors to link specific maps to classrooms and
--              create assignments based on nodes from those linked maps.

-- ========================================
-- CLASSROOM MAP LINKING TABLE
-- ========================================

-- Create table to link classrooms with maps (many-to-many relationship)
CREATE TABLE public.classroom_maps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    map_id UUID NOT NULL REFERENCES public.learning_maps(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 1,
    notes TEXT,
    
    -- Constraints
    CONSTRAINT classroom_maps_unique_link UNIQUE(classroom_id, map_id),
    CONSTRAINT classroom_maps_display_order_positive CHECK (display_order > 0),
    CONSTRAINT classroom_maps_notes_length CHECK (char_length(notes) <= 1000)
);

-- ========================================
-- ASSIGNMENT MAP CONTEXT TABLE
-- ========================================

-- Add context to assignments to track which map they're based on
ALTER TABLE public.classroom_assignments 
ADD COLUMN source_map_id UUID REFERENCES public.learning_maps(id) ON DELETE SET NULL,
ADD COLUMN map_context TEXT;

-- Add constraint for map context length
ALTER TABLE public.classroom_assignments 
ADD CONSTRAINT assignments_map_context_length CHECK (char_length(map_context) <= 2000);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Classroom maps indexes
CREATE INDEX idx_classroom_maps_classroom ON public.classroom_maps(classroom_id);
CREATE INDEX idx_classroom_maps_map ON public.classroom_maps(map_id);
CREATE INDEX idx_classroom_maps_active ON public.classroom_maps(is_active) WHERE is_active = true;
CREATE INDEX idx_classroom_maps_display_order ON public.classroom_maps(classroom_id, display_order);
CREATE INDEX idx_classroom_maps_added_by ON public.classroom_maps(added_by);

-- Assignment source map index
CREATE INDEX idx_classroom_assignments_source_map ON public.classroom_assignments(source_map_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on classroom_maps table
ALTER TABLE public.classroom_maps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classroom_maps
-- Instructors can manage map links in their classrooms
CREATE POLICY "instructors_manage_classroom_maps" ON public.classroom_maps
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND instructor_id = auth.uid()
        )
    );

-- Students can view map links for classrooms they're members of
CREATE POLICY "students_view_classroom_maps" ON public.classroom_maps
    FOR SELECT 
    USING (
        is_active = true AND
        public.is_classroom_member(classroom_id, auth.uid())
    );

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get linked maps for a classroom
CREATE OR REPLACE FUNCTION public.get_classroom_maps(classroom_uuid UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to link a map to a classroom
CREATE OR REPLACE FUNCTION public.link_map_to_classroom(
    classroom_uuid UUID,
    map_uuid UUID,
    notes_text TEXT DEFAULT NULL
)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlink a map from a classroom
CREATE OR REPLACE FUNCTION public.unlink_map_from_classroom(
    classroom_uuid UUID,
    map_uuid UUID
)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available nodes for assignment creation (from linked maps)
CREATE OR REPLACE FUNCTION public.get_classroom_available_nodes(classroom_uuid UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reorder classroom map links
CREATE OR REPLACE FUNCTION public.reorder_classroom_maps(
    classroom_uuid UUID,
    link_orders JSON
)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ENHANCED ASSIGNMENT CREATION
-- ========================================

-- Function to create assignment from map template
CREATE OR REPLACE FUNCTION public.create_assignment_from_map(
    classroom_uuid UUID,
    map_uuid UUID,
    assignment_title TEXT,
    assignment_description TEXT DEFAULT NULL,
    selected_node_ids UUID[] DEFAULT NULL,
    auto_enroll BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION public.get_classroom_maps(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_map_to_classroom(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_map_from_classroom(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_classroom_available_nodes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_classroom_maps(UUID, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_assignment_from_map(UUID, UUID, TEXT, TEXT, UUID[], BOOLEAN) TO authenticated;

-- ========================================
-- COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.classroom_maps IS 'Many-to-many relationship linking classrooms with learning maps for assignment creation';
COMMENT ON COLUMN public.classroom_maps.display_order IS 'Order in which maps appear in classroom interface';
COMMENT ON COLUMN public.classroom_maps.notes IS 'Instructor notes about why this map was linked to the classroom';

COMMENT ON COLUMN public.classroom_assignments.source_map_id IS 'Reference to the map this assignment was created from';
COMMENT ON COLUMN public.classroom_assignments.map_context IS 'Context about how this assignment relates to the source map';

COMMENT ON FUNCTION public.get_classroom_maps(UUID) IS 'Returns all maps linked to a classroom with metadata';
COMMENT ON FUNCTION public.link_map_to_classroom(UUID, UUID, TEXT) IS 'Links a map to a classroom for assignment creation';
COMMENT ON FUNCTION public.unlink_map_from_classroom(UUID, UUID) IS 'Removes a map link from a classroom';
COMMENT ON FUNCTION public.get_classroom_available_nodes(UUID) IS 'Returns all nodes from linked maps available for assignment creation';
COMMENT ON FUNCTION public.reorder_classroom_maps(UUID, JSON) IS 'Updates the display order of linked maps in a classroom';
COMMENT ON FUNCTION public.create_assignment_from_map(UUID, UUID, TEXT, TEXT, UUID[], BOOLEAN) IS 'Creates an assignment based on nodes from a linked map';

-- ========================================
-- VALIDATION AND VERIFICATION
-- ========================================

-- Verify the new table and columns were created
DO $$
BEGIN
    -- Check if classroom_maps table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'classroom_maps') THEN
        RAISE EXCEPTION 'classroom_maps table was not created successfully';
    END IF;
    
    -- Check if new columns were added to classroom_assignments
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classroom_assignments' 
        AND column_name = 'source_map_id'
    ) THEN
        RAISE EXCEPTION 'source_map_id column was not added to classroom_assignments';
    END IF;
    
    RAISE NOTICE 'Classroom-Map linking system migration completed successfully. Added classroom_maps table and enhanced assignment creation.';
END$$;
```

---


## Migration: 20250812130000_add_auto_assignment_mode.sql

```sql
-- ========================================
-- ADD AUTO ASSIGNMENT COLUMN
-- ========================================

-- Add auto_assign column to classroom_assignments
ALTER TABLE public.classroom_assignments 
ADD COLUMN auto_assign BOOLEAN DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.classroom_assignments.auto_assign IS 'When true, automatically enrolls all current and future students in this assignment';

-- ========================================
-- CREATE AUTO ENROLLMENT TRIGGER FUNCTION
-- ========================================

-- Function to auto-enroll new students in auto-assignments
CREATE OR REPLACE FUNCTION auto_enroll_student_in_assignments()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if this is a student being added to a classroom
    IF NEW.role = 'student' THEN
        -- Enroll the student in all auto-assignments for this classroom
        INSERT INTO public.assignment_enrollments (
            assignment_id,
            user_id,
            due_date,
            enrolled_at
        )
        SELECT 
            ca.id as assignment_id,
            NEW.user_id as user_id,
            ca.default_due_date as due_date,
            now() as enrolled_at
        FROM public.classroom_assignments ca
        WHERE ca.classroom_id = NEW.classroom_id
          AND ca.auto_assign = true
          AND ca.is_active = true
          AND ca.is_published = true
          -- Don't enroll if already enrolled
          AND NOT EXISTS (
              SELECT 1 FROM public.assignment_enrollments ae
              WHERE ae.assignment_id = ca.id 
                AND ae.user_id = NEW.user_id
          );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- CREATE TRIGGER FOR AUTO ENROLLMENT
-- ========================================

-- Trigger to auto-enroll students when they join a classroom
DROP TRIGGER IF EXISTS trigger_auto_enroll_student ON public.classroom_memberships;
CREATE TRIGGER trigger_auto_enroll_student
    AFTER INSERT ON public.classroom_memberships
    FOR EACH ROW
    EXECUTE FUNCTION auto_enroll_student_in_assignments();

-- ========================================
-- CREATE AUTO ASSIGNMENT MANAGEMENT FUNCTIONS
-- ========================================

-- Function to enable auto assignment for an existing assignment
CREATE OR REPLACE FUNCTION enable_auto_assignment(assignment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    classroom_id_var UUID;
    enrollment_count INTEGER;
BEGIN
    -- Get the classroom ID for this assignment
    SELECT classroom_id INTO classroom_id_var
    FROM public.classroom_assignments
    WHERE id = assignment_id;
    
    IF classroom_id_var IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;
    
    -- Enable auto assignment
    UPDATE public.classroom_assignments
    SET auto_assign = true, updated_at = now()
    WHERE id = assignment_id;
    
    -- Enroll all current students in the classroom
    INSERT INTO public.assignment_enrollments (
        assignment_id,
        user_id,
        due_date,
        enrolled_at
    )
    SELECT 
        assignment_id,
        cm.user_id,
        ca.default_due_date,
        now()
    FROM public.classroom_memberships cm
    JOIN public.classroom_assignments ca ON ca.id = assignment_id
    WHERE cm.classroom_id = classroom_id_var
      AND cm.role = 'student'
      -- Don't enroll if already enrolled
      AND NOT EXISTS (
          SELECT 1 FROM public.assignment_enrollments ae
          WHERE ae.assignment_id = assignment_id
            AND ae.user_id = cm.user_id
      );
    
    GET DIAGNOSTICS enrollment_count = ROW_COUNT;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable auto assignment
CREATE OR REPLACE FUNCTION disable_auto_assignment(assignment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Disable auto assignment
    UPDATE public.classroom_assignments
    SET auto_assign = false, updated_at = now()
    WHERE id = assignment_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ADD INDEXES FOR PERFORMANCE
-- ========================================

-- Index for auto assignment queries
CREATE INDEX idx_classroom_assignments_auto_assign 
ON public.classroom_assignments(classroom_id, auto_assign) 
WHERE auto_assign = true AND is_active = true AND is_published = true;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant access to authenticated users
GRANT SELECT ON public.classroom_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION auto_enroll_student_in_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION enable_auto_assignment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION disable_auto_assignment(UUID) TO authenticated;

-- ========================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION auto_enroll_student_in_assignments() IS 'Automatically enrolls new students in auto-assignments when they join a classroom';
COMMENT ON FUNCTION enable_auto_assignment(UUID) IS 'Enables auto assignment for an assignment and enrolls all current students';
COMMENT ON FUNCTION disable_auto_assignment(UUID) IS 'Disables auto assignment for an assignment';
COMMENT ON INDEX idx_classroom_assignments_auto_assign IS 'Optimizes queries for active auto-assignments';
```

---


## Migration: 20250812130000_add_auto_assignment_trigger.sql

```sql
-- Migration: Add Auto Assignment Trigger
-- Created: 2025-08-12 13:00:00
-- Description: Creates a trigger to automatically enroll new students 
--              into assignments that have auto_assign = true

-- ========================================
-- FUNCTION: Auto-enroll students in auto-assign assignments
-- ========================================

CREATE OR REPLACE FUNCTION auto_enroll_new_student()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Only process if this is a student joining a classroom
  IF NEW.role = 'student' THEN
    -- Enroll the student in all auto-assign assignments for this classroom
    INSERT INTO public.assignment_enrollments (
      assignment_id,
      user_id,
      enrolled_at,
      status,
      due_date
    )
    SELECT 
      ca.id,
      NEW.user_id,
      now(),
      'assigned',
      ca.default_due_date
    FROM public.classroom_assignments ca
    WHERE ca.classroom_id = NEW.classroom_id
      AND ca.auto_assign = true
      AND ca.is_active = true
      AND ca.is_published = true
      -- Avoid duplicate enrollments
      AND NOT EXISTS (
        SELECT 1 FROM public.assignment_enrollments ae
        WHERE ae.assignment_id = ca.id 
        AND ae.user_id = NEW.user_id
      );

    -- Log the auto-enrollment for debugging
    RAISE NOTICE 'Auto-enrolled student % in % auto-assign assignments for classroom %', 
      NEW.user_id, 
      (SELECT COUNT(*) FROM public.classroom_assignments ca
       WHERE ca.classroom_id = NEW.classroom_id
         AND ca.auto_assign = true
         AND ca.is_active = true
         AND ca.is_published = true),
      NEW.classroom_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ========================================
-- TRIGGER: Auto-enroll on classroom membership
-- ========================================

DROP TRIGGER IF EXISTS trigger_auto_enroll_student ON public.classroom_memberships;

CREATE TRIGGER trigger_auto_enroll_student
  AFTER INSERT ON public.classroom_memberships
  FOR EACH ROW
  EXECUTE FUNCTION auto_enroll_new_student();

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Add index for auto_assign lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_auto_assign 
ON public.classroom_assignments(classroom_id, auto_assign, is_active, is_published) 
WHERE auto_assign = true AND is_active = true AND is_published = true;

-- Add index for enrollment lookups to avoid duplicates
CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_unique_check
ON public.assignment_enrollments(assignment_id, user_id);

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON FUNCTION auto_enroll_new_student() IS 
'Automatically enrolls new students into assignments with auto_assign = true when they join a classroom';

COMMENT ON TRIGGER trigger_auto_enroll_student ON public.classroom_memberships IS 
'Triggers auto-enrollment when a student joins a classroom';
```

---


## Migration: 20250812130100_fix_auto_assignment_trigger.sql

```sql
-- Migration: Fix Auto Assignment Trigger
-- Created: 2025-08-12 13:01:00
-- Description: Creates a trigger to automatically enroll new students 
--              into assignments that have auto_assign = true (corrected column names)

-- ========================================
-- FUNCTION: Auto-enroll students in auto-assign assignments
-- ========================================

CREATE OR REPLACE FUNCTION auto_enroll_new_student()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Only process if this is a student joining a classroom
  IF NEW.role = 'student' THEN
    -- Enroll the student in all auto-assign assignments for this classroom
    INSERT INTO public.assignment_enrollments (
      assignment_id,
      user_id,
      enrolled_at,
      status,
      due_date
    )
    SELECT 
      ca.id,
      NEW.user_id,
      now(),
      'assigned',
      ca.default_due_date
    FROM public.classroom_assignments ca
    WHERE ca.classroom_id = NEW.classroom_id
      AND ca.auto_assign = true
      AND ca.is_active = true
      AND ca.is_published = true
      -- Avoid duplicate enrollments
      AND NOT EXISTS (
        SELECT 1 FROM public.assignment_enrollments ae
        WHERE ae.assignment_id = ca.id 
        AND ae.user_id = NEW.user_id
      );

    -- Log the auto-enrollment for debugging
    RAISE NOTICE 'Auto-enrolled student % in % auto-assign assignments for classroom %', 
      NEW.user_id, 
      (SELECT COUNT(*) FROM public.classroom_assignments ca
       WHERE ca.classroom_id = NEW.classroom_id
         AND ca.auto_assign = true
         AND ca.is_active = true
         AND ca.is_published = true),
      NEW.classroom_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ========================================
-- TRIGGER: Auto-enroll on classroom membership
-- ========================================

DROP TRIGGER IF EXISTS trigger_auto_enroll_student ON public.classroom_memberships;

CREATE TRIGGER trigger_auto_enroll_student
  AFTER INSERT ON public.classroom_memberships
  FOR EACH ROW
  EXECUTE FUNCTION auto_enroll_new_student();

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Add index for enrollment lookups to avoid duplicates (corrected column name)
CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_unique_check
ON public.assignment_enrollments(assignment_id, user_id);

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON FUNCTION auto_enroll_new_student() IS 
'Automatically enrolls new students into assignments with auto_assign = true when they join a classroom';

COMMENT ON TRIGGER trigger_auto_enroll_student ON public.classroom_memberships IS 
'Triggers auto-enrollment when a student joins a classroom';
```

---


## Migration: 20250812130200_finalize_auto_assignment_setup.sql

```sql
-- Migration: Finalize Auto Assignment Setup
-- Created: 2025-08-12 13:02:00
-- Description: Ensures the auto assignment trigger is properly configured
--              and adds any missing indexes

-- ========================================
-- VERIFY AND UPDATE TRIGGER FUNCTION
-- ========================================

-- Ensure the trigger function is properly created with correct column references
CREATE OR REPLACE FUNCTION auto_enroll_student_in_assignments()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if this is a student being added to a classroom
    IF NEW.role = 'student' THEN
        -- Enroll the student in all auto-assignments for this classroom
        INSERT INTO public.assignment_enrollments (
            assignment_id,
            user_id,
            due_date,
            enrolled_at,
            status
        )
        SELECT 
            ca.id as assignment_id,
            NEW.user_id as user_id,
            ca.default_due_date as due_date,
            now() as enrolled_at,
            'assigned' as status
        FROM public.classroom_assignments ca
        WHERE ca.classroom_id = NEW.classroom_id
          AND ca.auto_assign = true
          AND ca.is_active = true
          AND ca.is_published = true
          -- Don't enroll if already enrolled
          AND NOT EXISTS (
              SELECT 1 FROM public.assignment_enrollments ae
              WHERE ae.assignment_id = ca.id 
                AND ae.user_id = NEW.user_id
          );

        -- Log the auto-enrollment for debugging
        RAISE NOTICE 'Auto-enrolled student % in % auto-assign assignments for classroom %', 
          NEW.user_id, 
          (SELECT COUNT(*) FROM public.classroom_assignments ca
           WHERE ca.classroom_id = NEW.classroom_id
             AND ca.auto_assign = true
             AND ca.is_active = true
             AND ca.is_published = true),
          NEW.classroom_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ENSURE TRIGGER EXISTS
-- ========================================

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS trigger_auto_enroll_student ON public.classroom_memberships;
CREATE TRIGGER trigger_auto_enroll_student
    AFTER INSERT ON public.classroom_memberships
    FOR EACH ROW
    EXECUTE FUNCTION auto_enroll_student_in_assignments();

-- ========================================
-- ADD MISSING INDEXES
-- ========================================

-- Add index for enrollment lookups to avoid duplicates
CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_unique_check
ON public.assignment_enrollments(assignment_id, user_id);

-- ========================================
-- UPDATE COMMENTS
-- ========================================

COMMENT ON FUNCTION auto_enroll_student_in_assignments() IS 
'Automatically enrolls new students into assignments with auto_assign = true when they join a classroom';

COMMENT ON TRIGGER trigger_auto_enroll_student ON public.classroom_memberships IS 
'Triggers auto-enrollment when a student joins a classroom';
```

---


## Migration: 20250817032935_add_node_type.sql

```sql
-- Add node_type column to map_nodes table
-- This column will differentiate between learning nodes and text nodes
ALTER TABLE map_nodes 
ADD COLUMN node_type TEXT CHECK (node_type IN ('learning', 'text')) DEFAULT 'learning';

-- Add comment for documentation
COMMENT ON COLUMN map_nodes.node_type IS 'Type of node: learning (default) for interactive learning nodes, text for annotation/label nodes';

-- Update existing nodes to have the default type
UPDATE map_nodes SET node_type = 'learning' WHERE node_type IS NULL;```

---


## Migration: 20250805000000_create_classroom_system.sql

```sql
-- Migration: Create Classroom System Core Tables
-- Created: 2025-08-05
-- Description: Creates the foundational tables for the classroom system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create classrooms table
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    join_code VARCHAR(8) UNIQUE NOT NULL,
    max_students INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT classrooms_name_length CHECK (char_length(name) >= 1),
    CONSTRAINT classrooms_join_code_format CHECK (join_code ~ '^[A-Z0-9]{6,8}$'),
    CONSTRAINT classrooms_max_students_positive CHECK (max_students > 0)
);

-- Create classroom_memberships table
CREATE TABLE IF NOT EXISTS public.classroom_memberships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'student' NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT classroom_memberships_unique_membership UNIQUE(classroom_id, user_id),
    CONSTRAINT classroom_memberships_valid_role CHECK (role IN ('student', 'ta', 'instructor'))
);

-- Create classroom_assignments table
CREATE TABLE IF NOT EXISTS public.classroom_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    default_due_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT classroom_assignments_title_length CHECK (char_length(title) >= 1),
    CONSTRAINT classroom_assignments_due_date_future CHECK (default_due_date IS NULL OR default_due_date > created_at)
);

-- Create assignment_nodes table (many-to-many: assignments -> nodes)
CREATE TABLE IF NOT EXISTS public.assignment_nodes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES public.map_nodes(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT assignment_nodes_unique_assignment_node UNIQUE(assignment_id, node_id),
    CONSTRAINT assignment_nodes_unique_sequence UNIQUE(assignment_id, sequence_order),
    CONSTRAINT assignment_nodes_sequence_positive CHECK (sequence_order > 0)
);

-- Create assignment_enrollments table (many-to-many: assignments -> students)
CREATE TABLE IF NOT EXISTS public.assignment_enrollments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    due_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'assigned' NOT NULL,
    completed_at TIMESTAMPTZ,
    completion_percentage INTEGER DEFAULT 0,
    notes TEXT,
    
    -- Constraints
    CONSTRAINT assignment_enrollments_unique_enrollment UNIQUE(assignment_id, user_id),
    CONSTRAINT assignment_enrollments_valid_status CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
    CONSTRAINT assignment_enrollments_percentage_range CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    CONSTRAINT assignment_enrollments_completed_at_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR 
        (status != 'completed' AND completed_at IS NULL)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_classrooms_instructor_id ON public.classrooms(instructor_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code ON public.classrooms(join_code);
CREATE INDEX IF NOT EXISTS idx_classrooms_is_active ON public.classrooms(is_active);

CREATE INDEX IF NOT EXISTS idx_classroom_memberships_classroom_id ON public.classroom_memberships(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_memberships_user_id ON public.classroom_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_classroom_memberships_role ON public.classroom_memberships(role);

CREATE INDEX IF NOT EXISTS idx_classroom_assignments_classroom_id ON public.classroom_assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_created_by ON public.classroom_assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_is_active ON public.classroom_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_due_date ON public.classroom_assignments(default_due_date);

CREATE INDEX IF NOT EXISTS idx_assignment_nodes_assignment_id ON public.assignment_nodes(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_nodes_node_id ON public.assignment_nodes(node_id);
CREATE INDEX IF NOT EXISTS idx_assignment_nodes_sequence ON public.assignment_nodes(assignment_id, sequence_order);

CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_assignment_id ON public.assignment_enrollments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_user_id ON public.assignment_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_status ON public.assignment_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_due_date ON public.assignment_enrollments(due_date);

-- Create updated_at triggers
CREATE OR REPLACE TRIGGER update_classrooms_updated_at
    BEFORE UPDATE ON public.classrooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_classroom_assignments_updated_at
    BEFORE UPDATE ON public.classroom_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.classrooms IS 'Virtual classrooms created by instructors with unique join codes';
COMMENT ON COLUMN public.classrooms.join_code IS 'Unique 6-8 character code for students to join classroom';
COMMENT ON COLUMN public.classrooms.max_students IS 'Maximum number of students allowed in classroom';

COMMENT ON TABLE public.classroom_memberships IS 'Tracks which users belong to which classrooms and their roles';
COMMENT ON TABLE public.classroom_assignments IS 'Custom assignments created by instructors containing specific nodes';
COMMENT ON TABLE public.assignment_nodes IS 'Links assignments to specific nodes from learning maps with sequence order';
COMMENT ON TABLE public.assignment_enrollments IS 'Tracks individual student progress on assignments';

COMMENT ON COLUMN public.assignment_enrollments.completion_percentage IS 'Percentage of required nodes completed (0-100)';
COMMENT ON COLUMN public.assignment_enrollments.status IS 'Current status: assigned, in_progress, completed, overdue';
```

---


## Migration: 20250805000001_add_classroom_rls_policies.sql

```sql
-- Migration: Add RLS Policies for Classroom System
-- Created: 2025-08-05
-- Description: Creates Row Level Security policies for classroom tables

-- Enable RLS on all classroom tables
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_enrollments ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CLASSROOMS POLICIES
-- ========================================

-- Instructors can create classrooms
CREATE POLICY "Instructors can create classrooms" ON public.classrooms
    FOR INSERT 
    WITH CHECK (
        auth.uid() = instructor_id AND
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('instructor', 'TA')
        )
    );

-- Users can view classrooms they created
CREATE POLICY "Instructors can view their classrooms" ON public.classrooms
    FOR SELECT 
    USING (instructor_id = auth.uid());

-- Students can view classrooms they're members of
CREATE POLICY "Students can view joined classrooms" ON public.classrooms
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.classroom_memberships 
            WHERE classroom_id = id 
            AND user_id = auth.uid()
        )
    );

-- Instructors can update their own classrooms
CREATE POLICY "Instructors can update their classrooms" ON public.classrooms
    FOR UPDATE 
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());

-- Instructors can delete their own classrooms
CREATE POLICY "Instructors can delete their classrooms" ON public.classrooms
    FOR DELETE 
    USING (instructor_id = auth.uid());

-- ========================================
-- CLASSROOM MEMBERSHIPS POLICIES
-- ========================================

-- Students can join classrooms (insert membership)
CREATE POLICY "Students can join classrooms" ON public.classroom_memberships
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid() AND
        role = 'student' AND
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND is_active = true
        )
    );

-- Instructors can add members to their classrooms
CREATE POLICY "Instructors can manage classroom members" ON public.classroom_memberships
    FOR INSERT 
    WITH CHECK (
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

-- Users can view memberships for their classrooms
CREATE POLICY "Users can view classroom memberships" ON public.classroom_memberships
    FOR SELECT 
    USING (
        user_id = auth.uid() OR
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

-- Users can leave classrooms (delete their own membership)
CREATE POLICY "Students can leave classrooms" ON public.classroom_memberships
    FOR DELETE 
    USING (user_id = auth.uid());

-- Instructors can remove members from their classrooms
CREATE POLICY "Instructors can remove members" ON public.classroom_memberships
    FOR DELETE 
    USING (
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

-- ========================================
-- CLASSROOM ASSIGNMENTS POLICIES
-- ========================================

-- Instructors can create assignments in their classrooms
CREATE POLICY "Instructors can create assignments" ON public.classroom_assignments
    FOR INSERT 
    WITH CHECK (
        created_by = auth.uid() AND
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

-- Users can view assignments for classrooms they're in
CREATE POLICY "Users can view classroom assignments" ON public.classroom_assignments
    FOR SELECT 
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.classroom_memberships 
            WHERE classroom_id = classroom_assignments.classroom_id 
            AND user_id = auth.uid()
        )
    );

-- Instructors can update assignments they created
CREATE POLICY "Instructors can update their assignments" ON public.classroom_assignments
    FOR UPDATE 
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Instructors can delete assignments they created
CREATE POLICY "Instructors can delete their assignments" ON public.classroom_assignments
    FOR DELETE 
    USING (created_by = auth.uid());

-- ========================================
-- ASSIGNMENT NODES POLICIES
-- ========================================

-- Instructors can manage nodes in their assignments
CREATE POLICY "Instructors can manage assignment nodes" ON public.assignment_nodes
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.classroom_assignments ca
            JOIN public.classrooms c ON ca.classroom_id = c.id
            WHERE ca.id = assignment_id 
            AND c.instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classroom_assignments ca
            JOIN public.classrooms c ON ca.classroom_id = c.id
            WHERE ca.id = assignment_id 
            AND c.instructor_id = auth.uid()
        )
    );

-- Students can view nodes for assignments they're enrolled in
CREATE POLICY "Students can view assignment nodes" ON public.assignment_nodes
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.assignment_enrollments 
            WHERE assignment_id = assignment_nodes.assignment_id 
            AND user_id = auth.uid()
        )
    );

-- ========================================
-- ASSIGNMENT ENROLLMENTS POLICIES
-- ========================================

-- Instructors can enroll students in assignments
CREATE POLICY "Instructors can manage enrollments" ON public.assignment_enrollments
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classroom_assignments ca
            JOIN public.classrooms c ON ca.classroom_id = c.id
            WHERE ca.id = assignment_id 
            AND c.instructor_id = auth.uid()
        )
    );

-- Users can view their own enrollments
CREATE POLICY "Users can view their enrollments" ON public.assignment_enrollments
    FOR SELECT 
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.classroom_assignments ca
            JOIN public.classrooms c ON ca.classroom_id = c.id
            WHERE ca.id = assignment_id 
            AND c.instructor_id = auth.uid()
        )
    );

-- Instructors can update enrollments for their assignments
CREATE POLICY "Instructors can update enrollments" ON public.assignment_enrollments
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.classroom_assignments ca
            JOIN public.classrooms c ON ca.classroom_id = c.id
            WHERE ca.id = assignment_id 
            AND c.instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classroom_assignments ca
            JOIN public.classrooms c ON ca.classroom_id = c.id
            WHERE ca.id = assignment_id 
            AND c.instructor_id = auth.uid()
        )
    );

-- Students can update their own enrollment status (for self-reporting progress)
CREATE POLICY "Students can update their own enrollments" ON public.assignment_enrollments
    FOR UPDATE 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

---


## Migration: 20250805000002_fix_rls_recursion.sql

```sql
-- Migration: Fix RLS Policy Infinite Recursion
-- Created: 2025-08-05
-- Description: Fixes infinite recursion in classroom RLS policies

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Instructors can manage classroom members" ON public.classroom_memberships;
DROP POLICY IF EXISTS "Users can view classroom memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "Instructors can remove members" ON public.classroom_memberships;
DROP POLICY IF EXISTS "Instructors can create assignments" ON public.classroom_assignments;

-- Recreate policies without recursion

-- Instructors can view their own classrooms
CREATE POLICY "Instructors can view their classrooms" ON public.classrooms
    FOR SELECT 
    USING (instructor_id = auth.uid());

-- Students can view classrooms they're members of (no recursion)
CREATE POLICY "Students can view joined classrooms" ON public.classrooms
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.classroom_memberships 
            WHERE classroom_id = id 
            AND user_id = auth.uid()
        )
    );

-- Fix classroom memberships policies
CREATE POLICY "Instructors can manage classroom members" ON public.classroom_memberships
    FOR INSERT 
    WITH CHECK (
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

CREATE POLICY "Users can view classroom memberships" ON public.classroom_memberships
    FOR SELECT 
    USING (
        user_id = auth.uid() OR
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can remove members" ON public.classroom_memberships
    FOR DELETE 
    USING (
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

-- Fix classroom assignments policies
CREATE POLICY "Instructors can create assignments" ON public.classroom_assignments
    FOR INSERT 
    WITH CHECK (
        created_by = auth.uid() AND
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

-- Fix remaining assignment policies to avoid potential recursion
DROP POLICY IF EXISTS "Instructors can manage assignment nodes" ON public.assignment_nodes;
CREATE POLICY "Instructors can manage assignment nodes" ON public.assignment_nodes
    FOR ALL 
    USING (
        assignment_id IN (
            SELECT ca.id FROM public.classroom_assignments ca
            WHERE ca.created_by = auth.uid()
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT ca.id FROM public.classroom_assignments ca
            WHERE ca.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Instructors can manage enrollments" ON public.assignment_enrollments;
CREATE POLICY "Instructors can manage enrollments" ON public.assignment_enrollments
    FOR INSERT 
    WITH CHECK (
        assignment_id IN (
            SELECT ca.id FROM public.classroom_assignments ca
            WHERE ca.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Instructors can update enrollments" ON public.assignment_enrollments;
CREATE POLICY "Instructors can update enrollments" ON public.assignment_enrollments
    FOR UPDATE 
    USING (
        assignment_id IN (
            SELECT ca.id FROM public.classroom_assignments ca
            WHERE ca.created_by = auth.uid()
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT ca.id FROM public.classroom_assignments ca
            WHERE ca.created_by = auth.uid()
        )
    );
```

---


## Migration: 20250805000003_fix_assignment_policy_recursion.sql

```sql
-- Migration: Fix Assignment Policy Recursion
-- Created: 2025-08-05
-- Description: Fixes infinite recursion by splitting assignment policies for instructors vs students

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Users can view classroom assignments" ON public.classroom_assignments;

-- Create separate policies to avoid recursion

-- Policy 1: Instructors can view assignments they created (no membership check needed)
CREATE POLICY "Instructors can view their assignments" ON public.classroom_assignments
    FOR SELECT 
    USING (created_by = auth.uid());

-- Policy 2: Students can view assignments for classrooms they're members of
CREATE POLICY "Students can view classroom assignments" ON public.classroom_assignments
    FOR SELECT 
    USING (
        -- Only check memberships for non-creators to avoid recursion
        created_by != auth.uid() AND
        classroom_id IN (
            SELECT classroom_id FROM public.classroom_memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Also fix any potential recursion in classroom_memberships policies
-- Drop and recreate the problematic policies with simpler logic

DROP POLICY IF EXISTS "Students can view joined classrooms" ON public.classrooms;

-- Recreate with direct classroom_id check instead of EXISTS
CREATE POLICY "Members can view their classrooms" ON public.classrooms
    FOR SELECT 
    USING (
        instructor_id = auth.uid() OR
        id IN (
            SELECT classroom_id FROM public.classroom_memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Also ensure assignment_nodes policies don't cause recursion
DROP POLICY IF EXISTS "Instructors can manage assignment nodes" ON public.assignment_nodes;

CREATE POLICY "Instructors can manage assignment nodes" ON public.assignment_nodes
    FOR ALL 
    USING (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments
            WHERE created_by = auth.uid()
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments
            WHERE created_by = auth.uid()
        )
    );

-- Fix enrollment policies to avoid recursion
DROP POLICY IF EXISTS "Instructors can update enrollments" ON public.assignment_enrollments;

CREATE POLICY "Instructors can update their assignment enrollments" ON public.assignment_enrollments
    FOR UPDATE 
    USING (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments
            WHERE created_by = auth.uid()
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments
            WHERE created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Instructors can manage enrollments" ON public.assignment_enrollments;

CREATE POLICY "Instructors can create assignment enrollments" ON public.assignment_enrollments
    FOR INSERT 
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments
            WHERE created_by = auth.uid()
        )
    );
```

---


## Migration: 20250805000004_complete_rls_fix.sql

```sql
-- Migration: Complete RLS Policy Recursion Fix
-- Created: 2025-08-05
-- Description: Completely eliminates circular references in RLS policies

-- First, let's drop ALL policies that could cause recursion
DROP POLICY IF EXISTS "Students can view joined classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Members can view their classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Users can view classroom assignments" ON public.classroom_assignments;
DROP POLICY IF EXISTS "Instructors can view their assignments" ON public.classroom_assignments;
DROP POLICY IF EXISTS "Students can view classroom assignments" ON public.classroom_assignments;
DROP POLICY IF EXISTS "Users can view classroom memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "Instructors can manage classroom members" ON public.classroom_memberships;
DROP POLICY IF EXISTS "Instructors can remove members" ON public.classroom_memberships;

-- ========================================
-- SIMPLE POLICIES WITHOUT CROSS-REFERENCES
-- ========================================

-- 1. CLASSROOMS: Only instructor-based access (no membership checks)
CREATE POLICY "Instructors access their classrooms" ON public.classrooms
    FOR ALL 
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());

-- 2. CLASSROOM_ASSIGNMENTS: Only creator-based access (no membership checks for instructors)
CREATE POLICY "Creators access their assignments" ON public.classroom_assignments
    FOR ALL 
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- 3. CLASSROOM_MEMBERSHIPS: Simple user-based access
CREATE POLICY "Users manage their memberships" ON public.classroom_memberships
    FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can join classrooms" ON public.classroom_memberships
    FOR INSERT 
    WITH CHECK (user_id = auth.uid() AND role = 'student');

CREATE POLICY "Users can leave classrooms" ON public.classroom_memberships
    FOR DELETE 
    USING (user_id = auth.uid());

-- 4. Separate policies for instructors managing memberships (using direct classroom ownership)
CREATE POLICY "Instructors manage memberships" ON public.classroom_memberships
    FOR ALL 
    USING (
        -- Direct check: user owns the classroom (no subquery to avoid recursion)
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND instructor_id = auth.uid()
        )
    );

-- ========================================
-- STUDENT ACCESS POLICIES (SEPARATE TO AVOID RECURSION)
-- ========================================

-- Students need a separate way to access classrooms they've joined
-- We'll use a function-based approach to avoid RLS recursion

-- Create a function to check if user is member of classroom
CREATE OR REPLACE FUNCTION public.is_classroom_member(classroom_uuid UUID, user_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND user_id = user_uuid
    );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_classroom_member(UUID, UUID) TO authenticated;

-- Now create student access policies using the function
CREATE POLICY "Students access joined classrooms" ON public.classrooms
    FOR SELECT 
    USING (public.is_classroom_member(id, auth.uid()));

CREATE POLICY "Students access classroom assignments" ON public.classroom_assignments
    FOR SELECT 
    USING (public.is_classroom_member(classroom_id, auth.uid()));

-- ========================================
-- ASSIGNMENT NODES AND ENROLLMENTS (SIMPLIFIED)
-- ========================================

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Instructors can manage assignment nodes" ON public.assignment_nodes;
DROP POLICY IF EXISTS "Students can view assignment nodes" ON public.assignment_nodes;
DROP POLICY IF EXISTS "Instructors can create assignment enrollments" ON public.assignment_enrollments;
DROP POLICY IF EXISTS "Instructors can update their assignment enrollments" ON public.assignment_enrollments;
DROP POLICY IF EXISTS "Users can view their enrollments" ON public.assignment_enrollments;
DROP POLICY IF EXISTS "Students can update their own enrollments" ON public.assignment_enrollments;

-- Simple creator-based policies for assignment nodes
CREATE POLICY "Creators manage assignment nodes" ON public.assignment_nodes
    FOR ALL 
    USING (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        )
    );

-- Simple creator-based policies for assignment enrollments
CREATE POLICY "Creators manage enrollments" ON public.assignment_enrollments
    FOR ALL 
    USING (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        ) OR user_id = auth.uid()
    )
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        ) OR user_id = auth.uid()
    );

-- Students can view nodes for their enrollments
CREATE POLICY "Students view enrolled assignment nodes" ON public.assignment_nodes
    FOR SELECT 
    USING (
        assignment_id IN (
            SELECT assignment_id FROM public.assignment_enrollments 
            WHERE user_id = auth.uid()
        )
    );
```

---


## Migration: 20250806000001_fix_classroom_join_rls.sql

```sql
-- Migration: Fix Classroom Join RLS Policy
-- Created: 2025-08-06
-- Description: Allow users to find classrooms by join code to enable joining

-- The issue: Students can't join classrooms because they can't query the classrooms table
-- by join code when they're not yet members. We need a policy that allows users to
-- read classroom data when they have a valid join code.

-- Drop the existing restrictive student policy
DROP POLICY IF EXISTS "Students access joined classrooms" ON public.classrooms;

-- Create a new policy that allows:
-- 1. Instructors to access their own classrooms (unchanged)
-- 2. Users to find ANY active classroom by join code (for joining)
-- 3. Students to access classrooms they're members of (for after joining)

-- First, create a combined policy for students that allows both finding and accessing joined classrooms
CREATE POLICY "Students can find and access classrooms" ON public.classrooms
    FOR SELECT 
    USING (
        -- Allow finding active classrooms by join code (for joining)
        (is_active = true) OR
        -- Allow accessing classrooms user is already a member of
        public.is_classroom_member(id, auth.uid())
    );

-- Also ensure the classroom creation and other instructor policies remain intact
-- (they should already exist from previous migrations)

-- Add helpful comments
COMMENT ON POLICY "Students can find and access classrooms" ON public.classrooms 
IS 'Allows students to find active classrooms by join code AND access classrooms they are members of. This enables the join workflow while maintaining security.';

-- Verify we have the helper function (should exist from previous migration)
-- If not, recreate it
CREATE OR REPLACE FUNCTION public.is_classroom_member(classroom_uuid UUID, user_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND user_id = user_uuid
    );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_classroom_member(UUID, UUID) TO authenticated;
```

---


## Migration: 20250807000001_fix_uuid_generation.sql

```sql
-- Migration: Fix UUID Generation for Classroom System
-- Created: 2025-08-07
-- Description: Replace uuid_generate_v4() with gen_random_uuid() which is built into PostgreSQL 13+

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS public.assignment_enrollments CASCADE;
DROP TABLE IF EXISTS public.assignment_nodes CASCADE;
DROP TABLE IF EXISTS public.classroom_assignments CASCADE;
DROP TABLE IF EXISTS public.classroom_memberships CASCADE;
DROP TABLE IF EXISTS public.classrooms CASCADE;

-- Create classrooms table with gen_random_uuid()
CREATE TABLE public.classrooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    join_code VARCHAR(8) UNIQUE NOT NULL,
    max_students INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT classrooms_name_length CHECK (char_length(name) >= 1),
    CONSTRAINT classrooms_join_code_format CHECK (join_code ~ '^[A-Z0-9]{6}$'),
    CONSTRAINT classrooms_max_students_positive CHECK (max_students > 0)
);

-- Create classroom_memberships table
CREATE TABLE public.classroom_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('instructor', 'ta', 'student')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint to prevent duplicate memberships
    UNIQUE(classroom_id, user_id)
);

-- Create classroom_assignments table
CREATE TABLE public.classroom_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    default_due_date TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT assignments_title_length CHECK (char_length(title) >= 1)
);

-- Create assignment_nodes table (junction table for assignments and map nodes)
CREATE TABLE public.assignment_nodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES public.map_nodes(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate node assignments
    UNIQUE(assignment_id, node_id)
);

-- Create assignment_enrollments table (tracks which students are enrolled in assignments)
CREATE TABLE public.assignment_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ, -- Individual due date (overrides default)
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    
    -- Unique constraint to prevent duplicate enrollments
    UNIQUE(assignment_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_classrooms_instructor ON public.classrooms(instructor_id);
CREATE INDEX idx_classrooms_join_code ON public.classrooms(join_code);
CREATE INDEX idx_classroom_memberships_classroom ON public.classroom_memberships(classroom_id);
CREATE INDEX idx_classroom_memberships_user ON public.classroom_memberships(user_id);
CREATE INDEX idx_classroom_assignments_classroom ON public.classroom_assignments(classroom_id);
CREATE INDEX idx_classroom_assignments_creator ON public.classroom_assignments(created_by);
CREATE INDEX idx_assignment_nodes_assignment ON public.assignment_nodes(assignment_id);
CREATE INDEX idx_assignment_nodes_node ON public.assignment_nodes(node_id);
CREATE INDEX idx_assignment_enrollments_assignment ON public.assignment_enrollments(assignment_id);
CREATE INDEX idx_assignment_enrollments_user ON public.assignment_enrollments(user_id);

-- Enable RLS on all tables
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_enrollments ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is member of classroom (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_classroom_member(classroom_uuid UUID, user_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND user_id = user_uuid
    );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_classroom_member(UUID, UUID) TO authenticated;

-- RLS Policies for classrooms
CREATE POLICY "Instructors access their classrooms" ON public.classrooms
    FOR ALL 
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Students can find and access classrooms" ON public.classrooms
    FOR SELECT 
    USING (
        -- Allow finding active classrooms by join code (for joining)
        (is_active = true) OR
        -- Allow accessing classrooms user is already a member of
        public.is_classroom_member(id, auth.uid())
    );

-- RLS Policies for classroom_memberships
CREATE POLICY "Users manage their memberships" ON public.classroom_memberships
    FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can join classrooms" ON public.classroom_memberships
    FOR INSERT 
    WITH CHECK (user_id = auth.uid() AND role = 'student');

CREATE POLICY "Users can leave classrooms" ON public.classroom_memberships
    FOR DELETE 
    USING (user_id = auth.uid());

CREATE POLICY "Instructors manage memberships" ON public.classroom_memberships
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND instructor_id = auth.uid()
        )
    );

-- RLS Policies for classroom_assignments
CREATE POLICY "Creators access their assignments" ON public.classroom_assignments
    FOR ALL 
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Students access classroom assignments" ON public.classroom_assignments
    FOR SELECT 
    USING (public.is_classroom_member(classroom_id, auth.uid()));

-- RLS Policies for assignment_nodes
CREATE POLICY "Creators manage assignment nodes" ON public.assignment_nodes
    FOR ALL 
    USING (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Students view enrolled assignment nodes" ON public.assignment_nodes
    FOR SELECT 
    USING (
        assignment_id IN (
            SELECT assignment_id FROM public.assignment_enrollments 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for assignment_enrollments
CREATE POLICY "Creators manage enrollments" ON public.assignment_enrollments
    FOR ALL 
    USING (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        ) OR user_id = auth.uid()
    )
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        ) OR user_id = auth.uid()
    );

-- Add helpful comments
COMMENT ON TABLE public.classrooms IS 'Virtual classrooms for organizing students and assignments';
COMMENT ON TABLE public.classroom_memberships IS 'Tracks user membership in classrooms with roles';
COMMENT ON TABLE public.classroom_assignments IS 'Assignments created within classrooms';
COMMENT ON TABLE public.assignment_nodes IS 'Links assignments to specific learning map nodes';
COMMENT ON TABLE public.assignment_enrollments IS 'Tracks which students are enrolled in which assignments';
COMMENT ON FUNCTION public.is_classroom_member(UUID, UUID) IS 'Security definer function to check classroom membership without RLS recursion';
```

---


## Summary

- **Total migrations processed:** 31
- **Generated on:** Sun Aug 17 10:40:34 +07 2025
- **Source directory:** supabase/migrations

### Manual Execution Notes

If you need to manually run these migrations:

1. Connect to your database
2. Copy and paste each migration SQL block individually
3. Run them in chronological order (by timestamp in filename)
4. Check for any errors before proceeding to the next migration

### Important
- Always backup your database before running migrations manually
- These migrations may have already been applied to your database
- Check your `supabase_migrations.schema_migrations` table to see which migrations have been applied
