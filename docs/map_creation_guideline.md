### Guideline for Creating a Learning Map

This document outlines the process of creating a complete learning map, from the top-level map to individual node content and assessments.

**Core Concepts:**

*   **Learning Map:** A collection of interconnected learning nodes, forming a curriculum or a course (e.g., "Introduction to AI").
*   **Map Node:** An individual step or topic within a learning map (e.g., "What is a Neural Network?").
*   **Node Content:** The educational material for a node (videos, slides, text).
*   **Node Assessment:** A test to evaluate a student's understanding of a node (quizzes, text submissions, etc.).
*   **Node Path:** The connection between two nodes, defining the learning sequence.

---

### Step 1: Create the Top-Level Learning Map

First, create the main container for your curriculum.

1.  **Insert into `learning_maps`:**
    *   `title`: The name of your map (e.g., "AI Fundamentals").
    *   `description`: A brief overview of what the map covers.
    *   `creator_id`: The `user_id` of the instructor creating the map.

    **Example:**
    ```sql
    INSERT INTO public.learning_maps (title, description, creator_id)
    VALUES ('AI Fundamentals', 'A beginner-friendly introduction to Artificial Intelligence.', 'uuid-of-creator');
    ```

### Step 2: Create the Individual Map Nodes

Next, break down your curriculum into individual learning nodes.

1.  **Insert into `map_nodes` for each topic:**
    *   `map_id`: The ID of the `learning_map` you created in Step 1.
    *   `title`: The title of this specific node (e.g., "History of AI").
    *   `instructions`: Guidance for the student on what to do at this node.
    *   `difficulty`: An integer representing the node's difficulty (e.g., 1 for easy, 5 for hard).
    *   `sprite_url` (Optional): URL for a gamified image (e.g., a boss sprite for a challenging node).

    **Example:**
    ```sql
    -- Node 1: History of AI
    INSERT INTO public.map_nodes (map_id, title, instructions, difficulty)
    VALUES ('map-id-from-step-1', 'History of AI', 'Watch the video and read the article.', 1);

    -- Node 2: What is Machine Learning?
    INSERT INTO public.map_nodes (map_id, title, instructions, difficulty)
    VALUES ('map-id-from-step-1', 'What is Machine Learning?', 'Review the slides and prepare for a quiz.', 2);
    ```

### Step 3: Define the Paths Between Nodes

Connect the nodes to create a logical flow for the student.

1.  **Insert into `node_paths`:**
    *   `source_node_id`: The ID of the starting node.
    *   `destination_node_id`: The ID of the node that follows.

    **Example:**
    ```sql
    -- Connects "History of AI" -> "What is Machine Learning?"
    INSERT INTO public.node_paths (source_node_id, destination_node_id)
    VALUES ('node-id-for-history', 'node-id-for-ml');
    ```

### Step 4: Add Content to Each Node

Populate each node with educational material.

1.  **Insert into `node_content`:**
    *   `node_id`: The ID of the node this content belongs to.
    *   `content_type`: Can be `video`, `canva_slide`, or `text_with_images`.
    *   `content_url` (for videos/slides): The URL to the resource.
    *   `content_body` (for text): The written content.

    **Example:**
    ```sql
    -- Add a video to the "History of AI" node
    INSERT INTO public.node_content (node_id, content_type, content_url)
    VALUES ('node-id-for-history', 'video', 'https://youtube.com/watch?v=some-video');
    ```

### Step 5: Add an Assessment to a Node

Define how a student's understanding will be evaluated for a node.

1.  **Insert into `node_assessments`:**
    *   `node_id`: The ID of the node being assessed.
    *   `assessment_type`: Can be `quiz`, `text_answer`, `image_upload`, or `file_upload`.

2.  **(If Quiz) Insert into `quiz_questions`:**
    *   `assessment_id`: The ID of the assessment created above.
    *   `question_text`: The question.
    *   `options`: A JSONB array of possible answers (e.g., `[{"option": "A", "text": "Answer A"}]`).
    *   `correct_option`: The key of the correct option (e.g., `"A"`).

    **Example:**
    ```sql
    -- 1. Create the assessment for the "What is ML?" node
    INSERT INTO public.node_assessments (node_id, assessment_type)
    VALUES ('node-id-for-ml', 'quiz')
    RETURNING id; -- Use this returned ID for the questions

    -- 2. Add a question to the quiz
    INSERT INTO public.quiz_questions (assessment_id, question_text, options, correct_option)
    VALUES ('assessment-id-from-above', 'Which is not a type of ML?', '[{"option": "A", "text": "Supervised"}, {"option": "B", "text": "Unsupervised"}, {"option": "C", "text": "Subliminal"}]', 'C');
    ```

### Step 6: Enroll a Cohort

To give students access, create a cohort and enroll them in the map.

1.  **Create a Cohort:**
    *   Insert into `cohorts` to group users.

2.  **Enroll the Cohort:**
    *   Insert into `cohort_map_enrollments` to link a `cohort_id` with a `map_id`.

This structured approach ensures all necessary components of a learning map are created and linked correctly in the database.
