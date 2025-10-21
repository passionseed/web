-- Fix RLS policies for all map-related tables to include map_editors
-- This ensures that users granted edit access can fully edit maps

-- ========================================
-- NODE CONTENT POLICIES
-- ========================================

-- Allow editors to insert node content
DROP POLICY IF EXISTS "map_owners_can_insert_content" ON public.node_content;
DROP POLICY IF EXISTS "authenticated_users_full_access_content" ON public.node_content;

CREATE POLICY "creators_and_editors_can_insert_content" ON public.node_content
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.map_nodes
    JOIN public.learning_maps ON learning_maps.id = map_nodes.map_id
    WHERE map_nodes.id = node_content.node_id
    AND (
      learning_maps.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.map_editors
        WHERE map_editors.map_id = learning_maps.id
        AND map_editors.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'instructor'
      )
    )
  )
);

-- Allow editors to update node content
DROP POLICY IF EXISTS "map_owners_can_update_content" ON public.node_content;

CREATE POLICY "creators_and_editors_can_update_content" ON public.node_content
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes
    JOIN public.learning_maps ON learning_maps.id = map_nodes.map_id
    WHERE map_nodes.id = node_content.node_id
    AND (
      learning_maps.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.map_editors
        WHERE map_editors.map_id = learning_maps.id
        AND map_editors.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'instructor'
      )
    )
  )
);

-- Allow editors to delete node content
DROP POLICY IF EXISTS "map_owners_can_delete_content" ON public.node_content;

CREATE POLICY "creators_and_editors_can_delete_content" ON public.node_content
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes
    JOIN public.learning_maps ON learning_maps.id = map_nodes.map_id
    WHERE map_nodes.id = node_content.node_id
    AND (
      learning_maps.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.map_editors
        WHERE map_editors.map_id = learning_maps.id
        AND map_editors.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'instructor'
      )
    )
  )
);

-- ========================================
-- NODE ASSESSMENTS POLICIES
-- ========================================

-- Allow editors to insert assessments
DROP POLICY IF EXISTS "map_owners_insert_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "map_owners_can_create_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "authenticated_users_full_access_assessments" ON public.node_assessments;

CREATE POLICY "creators_and_editors_can_insert_assessments" ON public.node_assessments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.map_nodes
    JOIN public.learning_maps ON learning_maps.id = map_nodes.map_id
    WHERE map_nodes.id = node_assessments.node_id
    AND (
      learning_maps.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.map_editors
        WHERE map_editors.map_id = learning_maps.id
        AND map_editors.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'instructor'
      )
    )
  )
);

-- Allow editors to update assessments
DROP POLICY IF EXISTS "map_owners_update_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "map_owners_can_modify_assessments" ON public.node_assessments;

CREATE POLICY "creators_and_editors_can_update_assessments" ON public.node_assessments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes
    JOIN public.learning_maps ON learning_maps.id = map_nodes.map_id
    WHERE map_nodes.id = node_assessments.node_id
    AND (
      learning_maps.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.map_editors
        WHERE map_editors.map_id = learning_maps.id
        AND map_editors.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'instructor'
      )
    )
  )
);

-- Allow editors to delete assessments
DROP POLICY IF EXISTS "map_owners_delete_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "map_owners_can_delete_assessments" ON public.node_assessments;

CREATE POLICY "creators_and_editors_can_delete_assessments" ON public.node_assessments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes
    JOIN public.learning_maps ON learning_maps.id = map_nodes.map_id
    WHERE map_nodes.id = node_assessments.node_id
    AND (
      learning_maps.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.map_editors
        WHERE map_editors.map_id = learning_maps.id
        AND map_editors.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'instructor'
      )
    )
  )
);

-- ========================================
-- NODE PATHS POLICIES
-- ========================================

-- Allow editors to insert paths (connections between nodes)
DROP POLICY IF EXISTS "map_owners_can_insert_paths" ON public.node_paths;

CREATE POLICY "creators_and_editors_can_insert_paths" ON public.node_paths
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.map_nodes
    JOIN public.learning_maps ON learning_maps.id = map_nodes.map_id
    WHERE map_nodes.id = node_paths.source_node_id
    AND (
      learning_maps.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.map_editors
        WHERE map_editors.map_id = learning_maps.id
        AND map_editors.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'instructor'
      )
    )
  )
);

-- Allow editors to delete paths
DROP POLICY IF EXISTS "map_owners_can_delete_paths" ON public.node_paths;

CREATE POLICY "creators_and_editors_can_delete_paths" ON public.node_paths
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes
    JOIN public.learning_maps ON learning_maps.id = map_nodes.map_id
    WHERE map_nodes.id = node_paths.source_node_id
    AND (
      learning_maps.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.map_editors
        WHERE map_editors.map_id = learning_maps.id
        AND map_editors.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'instructor'
      )
    )
  )
);

-- ========================================
-- QUIZ QUESTIONS POLICIES
-- ========================================

-- Allow editors to insert quiz questions
DROP POLICY IF EXISTS "map_owners_can_insert_quiz_questions" ON public.quiz_questions;

CREATE POLICY "creators_and_editors_can_insert_quiz_questions" ON public.quiz_questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.node_assessments
    JOIN public.map_nodes ON map_nodes.id = node_assessments.node_id
    JOIN public.learning_maps ON learning_maps.id = map_nodes.map_id
    WHERE node_assessments.id = quiz_questions.assessment_id
    AND (
      learning_maps.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.map_editors
        WHERE map_editors.map_id = learning_maps.id
        AND map_editors.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'instructor'
      )
    )
  )
);

-- Allow editors to update quiz questions
DROP POLICY IF EXISTS "map_owners_can_update_quiz_questions" ON public.quiz_questions;

CREATE POLICY "creators_and_editors_can_update_quiz_questions" ON public.quiz_questions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.node_assessments
    JOIN public.map_nodes ON map_nodes.id = node_assessments.node_id
    JOIN public.learning_maps ON learning_maps.id = map_nodes.map_id
    WHERE node_assessments.id = quiz_questions.assessment_id
    AND (
      learning_maps.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.map_editors
        WHERE map_editors.map_id = learning_maps.id
        AND map_editors.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'instructor'
      )
    )
  )
);

-- Allow editors to delete quiz questions
DROP POLICY IF EXISTS "map_owners_can_delete_quiz_questions" ON public.quiz_questions;

CREATE POLICY "creators_and_editors_can_delete_quiz_questions" ON public.quiz_questions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.node_assessments
    JOIN public.map_nodes ON map_nodes.id = node_assessments.node_id
    JOIN public.learning_maps ON learning_maps.id = map_nodes.map_id
    WHERE node_assessments.id = quiz_questions.assessment_id
    AND (
      learning_maps.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.map_editors
        WHERE map_editors.map_id = learning_maps.id
        AND map_editors.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'instructor'
      )
    )
  )
);

-- Comment on the changes
COMMENT ON TABLE public.map_editors IS 'Grants edit access to learning maps for specific users. Editor permissions cascade to all map components: nodes, content, assessments, paths, and quiz questions.';
