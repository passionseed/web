

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
    "username" character varying(255) NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "discord_id" "text",
    "email" "text"
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


CREATE TABLE IF NOT EXISTS "public"."reflections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
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



ALTER TABLE ONLY "public"."passion_trees"
    ADD CONSTRAINT "passion_trees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."potential_offshoots"
    ADD CONSTRAINT "potential_offshoots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_outcomes"
    ADD CONSTRAINT "project_outcomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."reflections"
    ADD CONSTRAINT "reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



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



CREATE POLICY "Users can create their own passion trees" ON "public"."passion_trees" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own passion trees" ON "public"."passion_trees" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own passion trees" ON "public"."passion_trees" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own passion trees" ON "public"."passion_trees" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."branches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emotions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."engagement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."impacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."influences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learning_paths" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."milestones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."passion_trees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."potential_offshoots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_outcomes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reflections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."related_interests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."synergies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tools_acquired" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_communities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_workshops" ENABLE ROW LEVEL SECURITY;




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
