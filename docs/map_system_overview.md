# Learning Map System Overview

## System Purpose and Vision

The Learning Map system is designed to create gamified learning pathways where students can progress through nodes of different types. Each map represents a learning path (e.g., AI, 3D, Unity, Hacking) with interconnected nodes that contain learning content and assessments.

Key features include:

- Gamification with sprites/bosses for nodes
- Different content types (video links, Canva slides, text/images)
- Multiple assessment types (quizzes, text answers, image/file uploads)
- Instructor/TA grading with feedback
- Progress tracking with time metrics
- Leaderboards based on speed and grades
- Role-based access control (Student, TA, Instructor)
- Cohort management for student groups

## Database Schema

The system uses a comprehensive database schema with the following key tables:

### Core Structure Tables

- `learning_maps`: Top-level learning maps (AI, 3D, Unity, etc.)
- `map_nodes`: Individual nodes within a learning map
- `node_paths`: Connections/paths between nodes defining the learning sequence

### User Management Tables

- `user_roles`: Manages different user roles (student, TA, instructor)
- `cohorts`: Groups students into batches/cohort
- `cohort_map_enrollments`: Assigns cohorts to specific learning maps

### Content Tables

- `node_content`: Content for each map node (video, slides, text)
- `node_assessments`: Defines the assessment for a node
- `quiz_questions`: For quiz-type assessments

### Progress Tracking Tables

- `student_node_progress`: Tracks a student's progress at each node
- `assessment_submissions`: Stores student submissions for assessments
- `submission_grades`: For TA/Instructor grading and feedback
- `node_leaderboard`: Leaderboard for students who have passed a node

## Data Access Layer

The system uses a dedicated Supabase client library (`lib/supabase/maps.ts`, and `lib/supabase/assessments.ts`) that provides:

### Map Operations

- `getMaps()`: Fetch all learning maps
- `getMapWithNodes()`: Get a specific map with all its nodes and related data
- `createMap()`, `updateMap()`, `deleteMap()`: CRUD operations for maps

### Node Operations

- `createNode()`, `updateNode()`, `deleteNode()`: CRUD operations for nodes
- `createPath()`, `deletePath()`: Manage connections between nodes

### Content Operations

- `createNodeContent()`, `updateNodeContent()`, `deleteNodeContent()`: Manage node content
- `createNodeAssessment()`, `deleteNodeAssessment()`: Manage node assessments

### Progress Operations

- `getStudentProgress()`: Get a student's progress for a specific node
- `startNodeProgress()`: Mark a node as started by a student
- `submitNodeProgress()`: Submit a node for grading

### Assessment Operations

- `getSubmissionsForMap()`: Get all submissions for a specific map
- `gradeSubmission()`: Grade a student's submission
- `getSubmissionGrade()`: Get the grade for a specific submission

### Quiz Question Operations

- `createQuizQuestion()`: Create a new quiz question
- `updateQuizQuestion()`: Update an existing quiz question
- `deleteQuizQuestion()`: Delete a quiz question

### Assessment Submission Operations

- `createAssessmentSubmission()`: Create a new assessment submission
- `getAssessmentSubmissions()`: Get all submissions for a specific assessment

### Batch Operations

- `batchUpdateMap()`: Perform multiple updates to a map in a single operation

## User Interface Components

### Map Editor (`components/map/MapEditor.tsx`)

A visual editor for creating and modifying learning maps using React Flow:

- Drag-and-drop node placement
- Visual path connections between nodes
- Resizable panel layout with node editing sidebar
- Real-time updates to map structure

### Node Editor Panel (`components/map/NodeEditorPanel.tsx`)

Sidebar component for editing node details:

- Node title, instructions, difficulty level
- Sprite URL for gamification
- Content management (video, slides, text)
- Assessment configuration

### Map Viewer (`components/map/MapViewer.tsx`)

Student-facing interface for navigating learning maps:

- Gamified node visualization with sprites
- Progress indicators (locked, in progress, completed)
- Visual path states based on progress
- Responsive layout with node detail panel

### Node View Panel (`components/map/NodeViewPanel.tsx`)

Student interface for interacting with individual nodes:

- Progress tracking and time metrics
- Learning content display
- Assessment submission
- Previous submission history

### Grading Interface (`app/map/[id]/grading/`)

Instructor/TA interface for reviewing and grading submissions:

- Submission list with student information
- Detailed submission viewing
- Grade assignment with feedback
- Rating system for quality assessment

## User Roles and Permissions

The system implements role-based access control:

- **Students**: Can view maps, start nodes, submit assessments
- **TAs**: Can grade submissions and provide feedback
- **Instructors**: Full access including map creation/editing and grading

## Workflow Overview

### Map Creation

1. Instructor creates a new learning map
2. Instructor adds nodes with titles, instructions, and difficulty levels
3. Instructor configures node content (videos, slides, text)
4. Instructor sets up assessments (quizzes, text answers, file uploads)
5. Instructor connects nodes with paths to define learning sequence

### Student Learning Journey

1. Student selects a learning map
2. Student views unlocked nodes (prerequisite-based unlocking)
3. Student starts a node to begin tracking progress
4. Student consumes learning content
5. Student completes and submits assessment
6. Student waits for grading or proceeds if auto-graded (quizzes)
7. Student can view feedback and resubmit if needed
8. Student progresses to unlocked nodes

### Grading Process

1. Instructor/TA accesses grading interface
2. Instructor/TA reviews student submissions
3. Instructor/TA assigns grade (pass/fail) with optional rating
4. Instructor/TA provides feedback comments
5. Grade is automatically applied to student's progress status
6. Student receives notification of grade and feedback

## Technical Implementation Details

### Frontend Framework

- Next.js with React Server Components and Client Components
- TypeScript for type safety
- Tailwind CSS for styling
- React Flow for node-based visualization

### Backend Services

- Supabase for database and authentication
- PostgreSQL with custom triggers for data consistency
- Row-level security policies for data protection

### Data Consistency

- Foreign key constraints for referential integrity
- Database triggers for automatic progress updates
- Batch operations for complex map updates
- Optimistic UI updates with server synchronization

## Future Enhancements

- Peer review functionality
- More sophisticated leaderboard algorithms
- Advanced analytics and reporting
- Mobile-responsive design improvements
- Additional assessment types
- Integration with external learning tools
