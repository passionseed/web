alter table "public"."reflections" drop constraint "reflections_user_id_fkey";

create table "public"."branches" (
    "id" uuid not null default uuid_generate_v4(),
    "passion_tree_id" uuid not null,
    "name" character varying(255) not null,
    "description" text,
    "mastery" integer not null default 1,
    "importance" integer not null default 5,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."branches" enable row level security;

create table "public"."communities" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "description" text,
    "member_count" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."connections" (
    "id" uuid not null default uuid_generate_v4(),
    "passion_tree_id" uuid not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."connections" enable row level security;

create table "public"."emotions" (
    "id" uuid not null default uuid_generate_v4(),
    "passion_tree_id" uuid not null,
    "joy" integer not null default 5,
    "curiosity" integer not null default 5,
    "fulfillment" integer not null default 5,
    "challenge" integer not null default 5,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."emotions" enable row level security;

create table "public"."engagement" (
    "id" uuid not null default uuid_generate_v4(),
    "passion_tree_id" uuid not null,
    "current_level" integer not null default 5,
    "date" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now()
);


alter table "public"."engagement" enable row level security;

create table "public"."impacts" (
    "id" uuid not null default uuid_generate_v4(),
    "connection_id" uuid not null,
    "interest_name" character varying(255) not null,
    "impact_type" character varying(100) not null,
    "strength" integer not null default 5,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."impacts" enable row level security;

create table "public"."influences" (
    "id" uuid not null default uuid_generate_v4(),
    "connection_id" uuid not null,
    "interest_name" character varying(255) not null,
    "influence_type" character varying(100) not null,
    "strength" integer not null default 5,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."influences" enable row level security;

create table "public"."insights" (
    "id" uuid not null default uuid_generate_v4(),
    "passion_tree_id" uuid not null,
    "description" text not null,
    "date_discovered" timestamp with time zone default now(),
    "application" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."insights" enable row level security;

create table "public"."interests" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid,
    "name" text not null,
    "level" integer not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."interests" enable row level security;

create table "public"."learning_paths" (
    "id" uuid not null default uuid_generate_v4(),
    "passion_tree_id" uuid not null,
    "current_focus" character varying(255),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."learning_paths" enable row level security;

create table "public"."milestones" (
    "id" uuid not null default uuid_generate_v4(),
    "learning_path_id" uuid not null,
    "description" text not null,
    "achieved" boolean not null default false,
    "date" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."milestones" enable row level security;

create table "public"."passion_trees" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "name" character varying(255) not null,
    "category" character varying(100) not null,
    "growth_stage" character varying(50) not null default 'Seed'::character varying,
    "depth" numeric(3,1) not null default 1.0,
    "mastery" numeric(3,1) not null default 1.0,
    "last_updated" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."passion_trees" enable row level security;

create table "public"."potential_offshoots" (
    "id" uuid not null default uuid_generate_v4(),
    "insight_id" uuid not null,
    "interest_name" character varying(255) not null,
    "germination_stage" integer not null default 1,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."potential_offshoots" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "username" character varying(255) not null,
    "avatar_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "discord_id" text,
    "email" text
);


alter table "public"."profiles" enable row level security;

create table "public"."project_outcomes" (
    "id" uuid not null default uuid_generate_v4(),
    "project_id" uuid not null,
    "description" text not null,
    "type" character varying(100) not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."project_outcomes" enable row level security;

create table "public"."projects" (
    "id" uuid not null default uuid_generate_v4(),
    "passion_tree_id" uuid not null,
    "name" character varying(255) not null,
    "description" text,
    "status" character varying(50) not null default 'Idea'::character varying,
    "start_date" timestamp with time zone,
    "completion_date" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."projects" enable row level security;

create table "public"."related_interests" (
    "id" uuid not null default uuid_generate_v4(),
    "project_id" uuid not null,
    "name" character varying(255) not null,
    "connection_type" character varying(100) not null,
    "connection_strength" integer not null default 5,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."related_interests" enable row level security;

create table "public"."resources" (
    "id" uuid not null default uuid_generate_v4(),
    "learning_path_id" uuid not null,
    "name" character varying(255) not null,
    "type" character varying(100) not null,
    "status" character varying(50) not null default 'Not Started'::character varying,
    "impact" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."resources" enable row level security;

create table "public"."roots" (
    "id" uuid not null default uuid_generate_v4(),
    "passion_tree_id" uuid not null,
    "time_invested" integer not null default 0,
    "financial_investment" integer not null default 0,
    "root_strength" integer not null default 1,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."roots" enable row level security;

create table "public"."skills" (
    "id" uuid not null default uuid_generate_v4(),
    "branch_id" uuid not null,
    "name" character varying(255) not null,
    "level" integer not null default 1,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."skills" enable row level security;

create table "public"."synergies" (
    "id" uuid not null default uuid_generate_v4(),
    "connection_id" uuid not null,
    "interest_name" character varying(255) not null,
    "potential_outcome" text not null,
    "exploration_level" integer not null default 1,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."synergies" enable row level security;

create table "public"."tools_acquired" (
    "id" uuid not null default uuid_generate_v4(),
    "root_id" uuid not null,
    "name" character varying(255) not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."tools_acquired" enable row level security;

create table "public"."user_communities" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid,
    "community_id" uuid,
    "role" text not null default 'Member'::text,
    "joined_at" timestamp with time zone default now()
);


alter table "public"."user_communities" enable row level security;

create table "public"."user_stats" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid,
    "helpful_responses" integer default 0,
    "communities_helped" integer default 0,
    "kudos_received" integer default 0,
    "workshops_contributed" integer default 0,
    "average_rating" numeric default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_stats" enable row level security;

create table "public"."user_workshops" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid,
    "workshop_id" uuid,
    "joined_at" timestamp with time zone default now()
);


alter table "public"."user_workshops" enable row level security;

create table "public"."workshop_comments" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "workshop_id" uuid,
    "content" text not null,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
);


create table "public"."workshop_suggestions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "suggestion" text not null,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
);


create table "public"."workshop_votes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "workshop_id" uuid,
    "path_name" text,
    "vote_type" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now())
);


create table "public"."workshops" (
    "id" uuid not null default uuid_generate_v4(),
    "title" text not null,
    "description" text,
    "instructor" text,
    "category" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "paths_in_development" jsonb,
    "voting_enabled" boolean,
    "start_date" date,
    "status" text,
    "paths" jsonb,
    "slug" text
);


alter table "public"."reflections" alter column "created_at" set default now();

alter table "public"."reflections" alter column "created_at" drop not null;

alter table "public"."reflections" alter column "id" set default uuid_generate_v4();

CREATE UNIQUE INDEX branches_pkey ON public.branches USING btree (id);

CREATE UNIQUE INDEX communities_pkey ON public.communities USING btree (id);

CREATE UNIQUE INDEX connections_pkey ON public.connections USING btree (id);

CREATE UNIQUE INDEX emotions_pkey ON public.emotions USING btree (id);

CREATE UNIQUE INDEX engagement_pkey ON public.engagement USING btree (id);

CREATE UNIQUE INDEX impacts_pkey ON public.impacts USING btree (id);

CREATE UNIQUE INDEX influences_pkey ON public.influences USING btree (id);

CREATE UNIQUE INDEX insights_pkey ON public.insights USING btree (id);

CREATE UNIQUE INDEX interests_pkey ON public.interests USING btree (id);

CREATE UNIQUE INDEX learning_paths_pkey ON public.learning_paths USING btree (id);

CREATE UNIQUE INDEX milestones_pkey ON public.milestones USING btree (id);

CREATE UNIQUE INDEX passion_trees_pkey ON public.passion_trees USING btree (id);

CREATE UNIQUE INDEX potential_offshoots_pkey ON public.potential_offshoots USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX project_outcomes_pkey ON public.project_outcomes USING btree (id);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX related_interests_pkey ON public.related_interests USING btree (id);

CREATE UNIQUE INDEX resources_pkey ON public.resources USING btree (id);

CREATE UNIQUE INDEX roots_pkey ON public.roots USING btree (id);

CREATE UNIQUE INDEX skills_pkey ON public.skills USING btree (id);

CREATE UNIQUE INDEX synergies_pkey ON public.synergies USING btree (id);

CREATE UNIQUE INDEX tools_acquired_pkey ON public.tools_acquired USING btree (id);

CREATE UNIQUE INDEX user_communities_pkey ON public.user_communities USING btree (id);

CREATE UNIQUE INDEX user_communities_user_id_community_id_key ON public.user_communities USING btree (user_id, community_id);

CREATE UNIQUE INDEX user_stats_pkey ON public.user_stats USING btree (id);

CREATE UNIQUE INDEX user_stats_user_id_key ON public.user_stats USING btree (user_id);

CREATE UNIQUE INDEX user_workshops_pkey ON public.user_workshops USING btree (id);

CREATE UNIQUE INDEX user_workshops_user_id_workshop_id_key ON public.user_workshops USING btree (user_id, workshop_id);

CREATE UNIQUE INDEX workshop_comments_pkey ON public.workshop_comments USING btree (id);

CREATE UNIQUE INDEX workshop_suggestions_pkey ON public.workshop_suggestions USING btree (id);

CREATE UNIQUE INDEX workshop_votes_pkey ON public.workshop_votes USING btree (id);

CREATE UNIQUE INDEX workshops_pkey ON public.workshops USING btree (id);

CREATE UNIQUE INDEX workshops_slug_key ON public.workshops USING btree (slug);

alter table "public"."branches" add constraint "branches_pkey" PRIMARY KEY using index "branches_pkey";

alter table "public"."communities" add constraint "communities_pkey" PRIMARY KEY using index "communities_pkey";

alter table "public"."connections" add constraint "connections_pkey" PRIMARY KEY using index "connections_pkey";

alter table "public"."emotions" add constraint "emotions_pkey" PRIMARY KEY using index "emotions_pkey";

alter table "public"."engagement" add constraint "engagement_pkey" PRIMARY KEY using index "engagement_pkey";

alter table "public"."impacts" add constraint "impacts_pkey" PRIMARY KEY using index "impacts_pkey";

alter table "public"."influences" add constraint "influences_pkey" PRIMARY KEY using index "influences_pkey";

alter table "public"."insights" add constraint "insights_pkey" PRIMARY KEY using index "insights_pkey";

alter table "public"."interests" add constraint "interests_pkey" PRIMARY KEY using index "interests_pkey";

alter table "public"."learning_paths" add constraint "learning_paths_pkey" PRIMARY KEY using index "learning_paths_pkey";

alter table "public"."milestones" add constraint "milestones_pkey" PRIMARY KEY using index "milestones_pkey";

alter table "public"."passion_trees" add constraint "passion_trees_pkey" PRIMARY KEY using index "passion_trees_pkey";

alter table "public"."potential_offshoots" add constraint "potential_offshoots_pkey" PRIMARY KEY using index "potential_offshoots_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."project_outcomes" add constraint "project_outcomes_pkey" PRIMARY KEY using index "project_outcomes_pkey";

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."related_interests" add constraint "related_interests_pkey" PRIMARY KEY using index "related_interests_pkey";

alter table "public"."resources" add constraint "resources_pkey" PRIMARY KEY using index "resources_pkey";

alter table "public"."roots" add constraint "roots_pkey" PRIMARY KEY using index "roots_pkey";

alter table "public"."skills" add constraint "skills_pkey" PRIMARY KEY using index "skills_pkey";

alter table "public"."synergies" add constraint "synergies_pkey" PRIMARY KEY using index "synergies_pkey";

alter table "public"."tools_acquired" add constraint "tools_acquired_pkey" PRIMARY KEY using index "tools_acquired_pkey";

alter table "public"."user_communities" add constraint "user_communities_pkey" PRIMARY KEY using index "user_communities_pkey";

alter table "public"."user_stats" add constraint "user_stats_pkey" PRIMARY KEY using index "user_stats_pkey";

alter table "public"."user_workshops" add constraint "user_workshops_pkey" PRIMARY KEY using index "user_workshops_pkey";

alter table "public"."workshop_comments" add constraint "workshop_comments_pkey" PRIMARY KEY using index "workshop_comments_pkey";

alter table "public"."workshop_suggestions" add constraint "workshop_suggestions_pkey" PRIMARY KEY using index "workshop_suggestions_pkey";

alter table "public"."workshop_votes" add constraint "workshop_votes_pkey" PRIMARY KEY using index "workshop_votes_pkey";

alter table "public"."workshops" add constraint "workshops_pkey" PRIMARY KEY using index "workshops_pkey";

alter table "public"."branches" add constraint "branches_passion_tree_id_fkey" FOREIGN KEY (passion_tree_id) REFERENCES passion_trees(id) ON DELETE CASCADE not valid;

alter table "public"."branches" validate constraint "branches_passion_tree_id_fkey";

alter table "public"."connections" add constraint "connections_passion_tree_id_fkey" FOREIGN KEY (passion_tree_id) REFERENCES passion_trees(id) ON DELETE CASCADE not valid;

alter table "public"."connections" validate constraint "connections_passion_tree_id_fkey";

alter table "public"."emotions" add constraint "emotions_passion_tree_id_fkey" FOREIGN KEY (passion_tree_id) REFERENCES passion_trees(id) ON DELETE CASCADE not valid;

alter table "public"."emotions" validate constraint "emotions_passion_tree_id_fkey";

alter table "public"."engagement" add constraint "engagement_passion_tree_id_fkey" FOREIGN KEY (passion_tree_id) REFERENCES passion_trees(id) ON DELETE CASCADE not valid;

alter table "public"."engagement" validate constraint "engagement_passion_tree_id_fkey";

alter table "public"."impacts" add constraint "impacts_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE not valid;

alter table "public"."impacts" validate constraint "impacts_connection_id_fkey";

alter table "public"."influences" add constraint "influences_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE not valid;

alter table "public"."influences" validate constraint "influences_connection_id_fkey";

alter table "public"."insights" add constraint "insights_passion_tree_id_fkey" FOREIGN KEY (passion_tree_id) REFERENCES passion_trees(id) ON DELETE CASCADE not valid;

alter table "public"."insights" validate constraint "insights_passion_tree_id_fkey";

alter table "public"."interests" add constraint "interests_level_check" CHECK (((level >= 0) AND (level <= 100))) not valid;

alter table "public"."interests" validate constraint "interests_level_check";

alter table "public"."interests" add constraint "interests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."interests" validate constraint "interests_user_id_fkey";

alter table "public"."learning_paths" add constraint "learning_paths_passion_tree_id_fkey" FOREIGN KEY (passion_tree_id) REFERENCES passion_trees(id) ON DELETE CASCADE not valid;

alter table "public"."learning_paths" validate constraint "learning_paths_passion_tree_id_fkey";

alter table "public"."milestones" add constraint "milestones_learning_path_id_fkey" FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE CASCADE not valid;

alter table "public"."milestones" validate constraint "milestones_learning_path_id_fkey";

alter table "public"."passion_trees" add constraint "passion_trees_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."passion_trees" validate constraint "passion_trees_user_id_fkey";

alter table "public"."potential_offshoots" add constraint "potential_offshoots_insight_id_fkey" FOREIGN KEY (insight_id) REFERENCES insights(id) ON DELETE CASCADE not valid;

alter table "public"."potential_offshoots" validate constraint "potential_offshoots_insight_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."project_outcomes" add constraint "project_outcomes_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."project_outcomes" validate constraint "project_outcomes_project_id_fkey";

alter table "public"."projects" add constraint "projects_passion_tree_id_fkey" FOREIGN KEY (passion_tree_id) REFERENCES passion_trees(id) ON DELETE CASCADE not valid;

alter table "public"."projects" validate constraint "projects_passion_tree_id_fkey";

alter table "public"."related_interests" add constraint "related_interests_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."related_interests" validate constraint "related_interests_project_id_fkey";

alter table "public"."resources" add constraint "resources_learning_path_id_fkey" FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE CASCADE not valid;

alter table "public"."resources" validate constraint "resources_learning_path_id_fkey";

alter table "public"."roots" add constraint "roots_passion_tree_id_fkey" FOREIGN KEY (passion_tree_id) REFERENCES passion_trees(id) ON DELETE CASCADE not valid;

alter table "public"."roots" validate constraint "roots_passion_tree_id_fkey";

alter table "public"."skills" add constraint "skills_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE not valid;

alter table "public"."skills" validate constraint "skills_branch_id_fkey";

alter table "public"."synergies" add constraint "synergies_connection_id_fkey" FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE not valid;

alter table "public"."synergies" validate constraint "synergies_connection_id_fkey";

alter table "public"."tools_acquired" add constraint "tools_acquired_root_id_fkey" FOREIGN KEY (root_id) REFERENCES roots(id) ON DELETE CASCADE not valid;

alter table "public"."tools_acquired" validate constraint "tools_acquired_root_id_fkey";

alter table "public"."user_communities" add constraint "user_communities_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE not valid;

alter table "public"."user_communities" validate constraint "user_communities_community_id_fkey";

alter table "public"."user_communities" add constraint "user_communities_user_id_community_id_key" UNIQUE using index "user_communities_user_id_community_id_key";

alter table "public"."user_communities" add constraint "user_communities_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_communities" validate constraint "user_communities_user_id_fkey";

alter table "public"."user_stats" add constraint "user_stats_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_stats" validate constraint "user_stats_user_id_fkey";

alter table "public"."user_stats" add constraint "user_stats_user_id_key" UNIQUE using index "user_stats_user_id_key";

alter table "public"."user_workshops" add constraint "user_workshops_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_workshops" validate constraint "user_workshops_user_id_fkey";

alter table "public"."user_workshops" add constraint "user_workshops_user_id_workshop_id_key" UNIQUE using index "user_workshops_user_id_workshop_id_key";

alter table "public"."user_workshops" add constraint "user_workshops_workshop_id_fkey" FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE not valid;

alter table "public"."user_workshops" validate constraint "user_workshops_workshop_id_fkey";

alter table "public"."workshop_comments" add constraint "workshop_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."workshop_comments" validate constraint "workshop_comments_user_id_fkey";

alter table "public"."workshop_comments" add constraint "workshop_comments_workshop_id_fkey" FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE not valid;

alter table "public"."workshop_comments" validate constraint "workshop_comments_workshop_id_fkey";

alter table "public"."workshop_suggestions" add constraint "workshop_suggestions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."workshop_suggestions" validate constraint "workshop_suggestions_user_id_fkey";

alter table "public"."workshop_votes" add constraint "workshop_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."workshop_votes" validate constraint "workshop_votes_user_id_fkey";

alter table "public"."workshop_votes" add constraint "workshop_votes_vote_type_check" CHECK ((vote_type = ANY (ARRAY['up'::text, 'down'::text, 'emoji'::text]))) not valid;

alter table "public"."workshop_votes" validate constraint "workshop_votes_vote_type_check";

alter table "public"."workshop_votes" add constraint "workshop_votes_workshop_id_fkey" FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE not valid;

alter table "public"."workshop_votes" validate constraint "workshop_votes_workshop_id_fkey";

alter table "public"."workshops" add constraint "workshops_category_check" CHECK ((category = ANY (ARRAY['Inspire'::text, 'Build'::text, 'Scale'::text]))) not valid;

alter table "public"."workshops" validate constraint "workshops_category_check";

alter table "public"."workshops" add constraint "workshops_slug_key" UNIQUE using index "workshops_slug_key";

alter table "public"."reflections" add constraint "reflections_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."reflections" validate constraint "reflections_user_id_fkey";

set check_function_bodies = off;

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

grant select on table "public"."branches" to "authenticated";

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

grant select on table "public"."communities" to "authenticated";

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

grant select on table "public"."connections" to "authenticated";

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

grant select on table "public"."emotions" to "authenticated";

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

grant select on table "public"."engagement" to "authenticated";

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

grant select on table "public"."impacts" to "authenticated";

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

grant select on table "public"."influences" to "authenticated";

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

grant select on table "public"."insights" to "authenticated";

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

grant delete on table "public"."interests" to "anon";

grant insert on table "public"."interests" to "anon";

grant references on table "public"."interests" to "anon";

grant select on table "public"."interests" to "anon";

grant trigger on table "public"."interests" to "anon";

grant truncate on table "public"."interests" to "anon";

grant update on table "public"."interests" to "anon";

grant delete on table "public"."interests" to "authenticated";

grant insert on table "public"."interests" to "authenticated";

grant references on table "public"."interests" to "authenticated";

grant select on table "public"."interests" to "authenticated";

grant trigger on table "public"."interests" to "authenticated";

grant truncate on table "public"."interests" to "authenticated";

grant update on table "public"."interests" to "authenticated";

grant delete on table "public"."interests" to "service_role";

grant insert on table "public"."interests" to "service_role";

grant references on table "public"."interests" to "service_role";

grant select on table "public"."interests" to "service_role";

grant trigger on table "public"."interests" to "service_role";

grant truncate on table "public"."interests" to "service_role";

grant update on table "public"."interests" to "service_role";

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

grant select on table "public"."learning_paths" to "authenticated";

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

grant select on table "public"."milestones" to "authenticated";

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

grant select on table "public"."passion_trees" to "authenticated";

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

grant select on table "public"."potential_offshoots" to "authenticated";

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

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

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

grant select on table "public"."project_outcomes" to "authenticated";

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

grant delete on table "public"."projects" to "anon";

grant insert on table "public"."projects" to "anon";

grant references on table "public"."projects" to "anon";

grant select on table "public"."projects" to "anon";

grant trigger on table "public"."projects" to "anon";

grant truncate on table "public"."projects" to "anon";

grant update on table "public"."projects" to "anon";

grant delete on table "public"."projects" to "authenticated";

grant insert on table "public"."projects" to "authenticated";

grant references on table "public"."projects" to "authenticated";

grant select on table "public"."projects" to "authenticated";

grant trigger on table "public"."projects" to "authenticated";

grant truncate on table "public"."projects" to "authenticated";

grant update on table "public"."projects" to "authenticated";

grant delete on table "public"."projects" to "service_role";

grant insert on table "public"."projects" to "service_role";

grant references on table "public"."projects" to "service_role";

grant select on table "public"."projects" to "service_role";

grant trigger on table "public"."projects" to "service_role";

grant truncate on table "public"."projects" to "service_role";

grant update on table "public"."projects" to "service_role";

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

grant select on table "public"."related_interests" to "authenticated";

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

grant select on table "public"."resources" to "authenticated";

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

grant select on table "public"."roots" to "authenticated";

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

grant select on table "public"."skills" to "authenticated";

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

grant select on table "public"."synergies" to "authenticated";

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

grant select on table "public"."tools_acquired" to "authenticated";

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

grant select on table "public"."user_communities" to "authenticated";

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

grant select on table "public"."user_stats" to "authenticated";

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

grant delete on table "public"."user_workshops" to "authenticated";

grant insert on table "public"."user_workshops" to "authenticated";

grant references on table "public"."user_workshops" to "authenticated";

grant select on table "public"."user_workshops" to "authenticated";

grant trigger on table "public"."user_workshops" to "authenticated";

grant truncate on table "public"."user_workshops" to "authenticated";

grant update on table "public"."user_workshops" to "authenticated";

grant delete on table "public"."user_workshops" to "service_role";

grant insert on table "public"."user_workshops" to "service_role";

grant references on table "public"."user_workshops" to "service_role";

grant select on table "public"."user_workshops" to "service_role";

grant trigger on table "public"."user_workshops" to "service_role";

grant truncate on table "public"."user_workshops" to "service_role";

grant update on table "public"."user_workshops" to "service_role";

grant delete on table "public"."workshop_comments" to "anon";

grant insert on table "public"."workshop_comments" to "anon";

grant references on table "public"."workshop_comments" to "anon";

grant select on table "public"."workshop_comments" to "anon";

grant trigger on table "public"."workshop_comments" to "anon";

grant truncate on table "public"."workshop_comments" to "anon";

grant update on table "public"."workshop_comments" to "anon";

grant delete on table "public"."workshop_comments" to "authenticated";

grant insert on table "public"."workshop_comments" to "authenticated";

grant references on table "public"."workshop_comments" to "authenticated";

grant select on table "public"."workshop_comments" to "authenticated";

grant trigger on table "public"."workshop_comments" to "authenticated";

grant truncate on table "public"."workshop_comments" to "authenticated";

grant update on table "public"."workshop_comments" to "authenticated";

grant delete on table "public"."workshop_comments" to "service_role";

grant insert on table "public"."workshop_comments" to "service_role";

grant references on table "public"."workshop_comments" to "service_role";

grant select on table "public"."workshop_comments" to "service_role";

grant trigger on table "public"."workshop_comments" to "service_role";

grant truncate on table "public"."workshop_comments" to "service_role";

grant update on table "public"."workshop_comments" to "service_role";

grant delete on table "public"."workshop_suggestions" to "anon";

grant insert on table "public"."workshop_suggestions" to "anon";

grant references on table "public"."workshop_suggestions" to "anon";

grant select on table "public"."workshop_suggestions" to "anon";

grant trigger on table "public"."workshop_suggestions" to "anon";

grant truncate on table "public"."workshop_suggestions" to "anon";

grant update on table "public"."workshop_suggestions" to "anon";

grant delete on table "public"."workshop_suggestions" to "authenticated";

grant insert on table "public"."workshop_suggestions" to "authenticated";

grant references on table "public"."workshop_suggestions" to "authenticated";

grant select on table "public"."workshop_suggestions" to "authenticated";

grant trigger on table "public"."workshop_suggestions" to "authenticated";

grant truncate on table "public"."workshop_suggestions" to "authenticated";

grant update on table "public"."workshop_suggestions" to "authenticated";

grant delete on table "public"."workshop_suggestions" to "service_role";

grant insert on table "public"."workshop_suggestions" to "service_role";

grant references on table "public"."workshop_suggestions" to "service_role";

grant select on table "public"."workshop_suggestions" to "service_role";

grant trigger on table "public"."workshop_suggestions" to "service_role";

grant truncate on table "public"."workshop_suggestions" to "service_role";

grant update on table "public"."workshop_suggestions" to "service_role";

grant delete on table "public"."workshop_votes" to "anon";

grant insert on table "public"."workshop_votes" to "anon";

grant references on table "public"."workshop_votes" to "anon";

grant select on table "public"."workshop_votes" to "anon";

grant trigger on table "public"."workshop_votes" to "anon";

grant truncate on table "public"."workshop_votes" to "anon";

grant update on table "public"."workshop_votes" to "anon";

grant delete on table "public"."workshop_votes" to "authenticated";

grant insert on table "public"."workshop_votes" to "authenticated";

grant references on table "public"."workshop_votes" to "authenticated";

grant select on table "public"."workshop_votes" to "authenticated";

grant trigger on table "public"."workshop_votes" to "authenticated";

grant truncate on table "public"."workshop_votes" to "authenticated";

grant update on table "public"."workshop_votes" to "authenticated";

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

grant select on table "public"."workshops" to "authenticated";

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

create policy "Users can create their own passion trees"
on "public"."passion_trees"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can delete their own passion trees"
on "public"."passion_trees"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can update their own passion trees"
on "public"."passion_trees"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own passion trees"
on "public"."passion_trees"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Users can view their own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));


CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emotions_updated_at BEFORE UPDATE ON public.emotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_impacts_updated_at BEFORE UPDATE ON public.impacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_influences_updated_at BEFORE UPDATE ON public.influences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON public.insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON public.learning_paths FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_passion_trees_updated_at BEFORE UPDATE ON public.passion_trees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_potential_offshoots_updated_at BEFORE UPDATE ON public.potential_offshoots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_outcomes_updated_at BEFORE UPDATE ON public.project_outcomes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_related_interests_updated_at BEFORE UPDATE ON public.related_interests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roots_updated_at BEFORE UPDATE ON public.roots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_synergies_updated_at BEFORE UPDATE ON public.synergies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


