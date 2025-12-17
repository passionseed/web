-- To manage different user roles within the platform
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['student'::text, 'TA'::text, 'instructor'::text])),
  PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  UNIQUE (user_id, role)
);

-- To group students into batches or cohorts
CREATE TABLE public.cohorts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- The top-level learning maps (e.g., AI, 3D, Unity)
CREATE TABLE public.learning_maps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  id uuid NOT NULL DEFAULT gen_random_uuid(),
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
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_node_id uuid NOT NULL,
  destination_node_id uuid NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT node_paths_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.map_nodes(id),
  CONSTRAINT node_paths_destination_node_id_fkey FOREIGN KEY (destination_node_id) REFERENCES public.map_nodes(id)
);

-- To assign users from a cohort to a specific learning map
CREATE TABLE public.cohort_map_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL,
  map_id uuid NOT NULL,
  enrolled_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT cohort_map_enrollments_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id),
  CONSTRAINT cohort_map_enrollments_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id)
);