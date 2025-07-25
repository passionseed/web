-- ####################################################################
-- #                                                                  #
-- #          Web Development Learning Map Seed Data                  #
-- #                                                                  #
-- ####################################################################

-- ####################################################################
-- # 1. USER AND ROLE SETUP                                           #
-- ####################################################################

-- Insert your user into the 'profiles' table.
-- This user will act as both an instructor and a student.
INSERT INTO public.profiles (id, username, avatar_url, email, full_name)
VALUES
  ('831a0850-c275-4876-94ea-b96b38ff063b', 'xb1g', 'https://cdn.discordapp.com/avatars/417624995770925077/8a5cdee178327d692f5dc8efd4fc2d15.png', 'big168bk@gmail.com', 'xb1g')
ON CONFLICT (id) DO NOTHING;

-- Assign 'instructor' and 'student' roles to your user.
-- This allows them to switch between views and manage the course.
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('831a0850-c275-4876-94ea-b96b38ff063b', 'instructor'),
  ('831a0850-c275-4876-94ea-b96b38ff063b', 'student')
ON CONFLICT (user_id, role) DO NOTHING;

-- ####################################################################
-- # 2. LEARNING MAP AND COHORT SETUP                                 #
-- ####################################################################

-- Create the main 'Web Development' learning map.
INSERT INTO public.learning_maps (id, title, description, creator_id)
VALUES
  ('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Web Development Fundamentals', 'A beginner-friendly map to learn the basics of web development, including HTML, CSS, and JavaScript.', '831a0850-c275-4876-94ea-b96b38ff063b');

-- Create a cohort for students.
INSERT INTO public.cohorts (id, name, description)
VALUES
  ('c1d2e3f4-a5b6-c7d8-e9f0-a1b2c3d4e5f6', 'Web Dev Beginners - Summer 2025', 'Cohort for students starting their web development journey in the summer of 2025.');

-- Enroll the cohort in the 'Web Development' learning map.
INSERT INTO public.cohort_map_enrollments (cohort_id, map_id)
VALUES
  ('c1d2e3f4-a5b6-c7d8-e9f0-a1b2c3d4e5f6', 'a1b2c3d4-e5f6-7890-1234-567890abcdef');


-- ####################################################################
-- # 3. MAP NODES AND PATHS                                           #
-- ####################################################################

-- Create the nodes for the 'Web Development' map.
INSERT INTO public.map_nodes (id, map_id, title, instructions, difficulty, sprite_url, metadata)
VALUES
  ('n1001', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Introduction to HTML', 'Start your journey by learning the structure of web pages with HTML.', 1, 'https://example.com/sprite/html_boss.png', '{"total_students": 50, "finished_students": 10}'),
  ('n1002', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'CSS Basics', 'Learn how to style your web pages with CSS to make them visually appealing.', 2, 'https://example.com/sprite/css_knight.png', '{"total_students": 40, "finished_students": 5}'),
  ('n1003', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'JavaScript Fundamentals', 'Add interactivity to your websites with the fundamentals of JavaScript.', 3, 'https://example.com/sprite/js_mage.png', null),
  ('n1004', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Final Project: Build a Portfolio', 'Combine your HTML, CSS, and JavaScript skills to build a personal portfolio page.', 4, 'https://example.com/sprite/final_dragon.png', null);

-- Define the paths connecting the nodes in sequence.
INSERT INTO public.node_paths (source_node_id, destination_node_id)
VALUES
  ('n1001', 'n1002'),
  ('n1002', 'n1003'),
  ('n1003', 'n1004');


-- ####################################################################
-- # 4. NODE CONTENT AND ASSESSMENTS                                  #
-- ####################################################################

-- Add content to the 'Introduction to HTML' node.
INSERT INTO public.node_content (node_id, content_type, content_url, content_body)
VALUES
  ('n1001', 'video', 'https://www.youtube.com/watch?v=example1', 'Watch this video to get an overview of HTML.'),
  ('n1001', 'text_with_images', null, '<h3>What is HTML?</h3><p>HTML stands for HyperText Markup Language. It is the standard markup language for creating Web pages.</p>');

-- Add content to the 'CSS Basics' node.
INSERT INTO public.node_content (node_id, content_type, content_url)
VALUES
  ('n1002', 'canva_slide', 'https://www.canva.com/design/example-css/view');

-- Add an assessment for the HTML node (quiz).
INSERT INTO public.node_assessments (id, node_id, assessment_type)
VALUES
  ('a2001', 'n1001', 'quiz');

-- Add questions for the HTML quiz.
INSERT INTO public.quiz_questions (assessment_id, question_text, options, correct_option)
VALUES
  ('a2001', 'What does HTML stand for?', '[{"option": "A", "text": "HyperText Markup Language"}, {"option": "B", "text": "High-Level Text Machine Language"}]', 'A'),
  ('a2001', 'Which tag is used to define a paragraph?', '[{"option": "A", "text": "<p>"}, {"option": "B", "text": "<par>"}]', 'A');

-- Add an assessment for the CSS node (text answer).
INSERT INTO public.node_assessments (id, node_id, assessment_type)
VALUES
  ('a2002', 'n1002', 'text_answer');

-- Add an assessment for the final project (file upload).
INSERT INTO public.node_assessments (id, node_id, assessment_type)
VALUES
  ('a2003', 'n1004', 'file_upload');


-- ####################################################################
-- # 5. STUDENT PROGRESS AND GRADING (DEMO)                           #
-- ####################################################################

-- Simulate student progress for your user.
-- Mark the first node as 'passed'.
INSERT INTO public.student_node_progress (id, user_id, node_id, status, arrived_at, started_at, submitted_at)
VALUES
  ('p3001', '831a0850-c275-4876-94ea-b96b38ff063b', 'n1001', 'passed', now() - interval '2 days', now() - interval '1 day', now() - interval '12 hours');

-- Show the student as 'in_progress' on the second node.
INSERT INTO public.student_node_progress (id, user_id, node_id, status, arrived_at, started_at)
VALUES
  ('p3002', '831a0850-c275-4876-94ea-b96b38ff063b', 'n1002', 'in_progress', now() - interval '10 hours', now() - interval '1 hour');

-- Add a submission for the first node's assessment.
INSERT INTO public.assessment_submissions (id, progress_id, assessment_id, quiz_answers, submitted_at)
VALUES
  ('s4001', 'p3001', 'a2001', '{"question_1": "A", "question_2": "A"}', now() - interval '12 hours');

-- Add a grade for that submission, graded by the user in their 'instructor' role.
INSERT INTO public.submission_grades (submission_id, graded_by, grade, rating, comments, graded_at)
VALUES
  ('s4001', '831a0850-c275-4876-94ea-b96b38ff063b', 'pass', 5, 'Great job on the HTML quiz! You have a solid understanding of the basics.', now() - interval '2 hours');