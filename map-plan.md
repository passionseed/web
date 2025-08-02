# Learning Map Feature Plan

This document outlines the plan for implementing the learning map feature, including database schema, functionality, and future enhancements.

---

## **1. Overview**

The learning map feature is designed to provide a gamified learning experience for students. It consists of nodes connected by paths, where each node represents a stage in the learning journey. Students can interact with content, complete assessments, and progress through the map. Teachers and TAs can manage maps, grade submissions, and provide feedback.

---

## **2. Core Features**

### **2.1 Map Structure**

- **Nodes**: Represent stages in the learning journey.
  - Each node can have:
    - **Content**: Videos, Canva slides, or text with images.
    - **Assessments**: Quizzes, text-based answers, image uploads, or file uploads.
    - **Sprite/Boss**: Gamified visual representation.
    - **Difficulty**: A numeric value (1-10).
    - **Metadata**: Additional extensible data.
  - Nodes can have "before" and "after" states (e.g., locked/unlocked).
- **Paths**: Define connections between nodes.
  - Paths can be dynamic based on student performance or choices.

### **2.2 User Roles**

- **Student**: Interacts with the map, completes content, and submits assessments.
- **TA/Instructor**: Manages maps, grades submissions, and provides feedback.
- **Cohorts**: Groups of students assigned to specific maps.

### **2.3 Assessments**

- **Types**:
  - Quiz (multiple-choice).
  - Text-based answers.
  - Image uploads.
  - File uploads (supporting multiple files).
- **Grading**:
  - Customizable grading schemes (e.g., points, pass/fail).
  - Feedback and comments from TAs/Instructors.
  - Peer review (future feature).

### **2.4 Progress Tracking**

- Tracks:
  - Time arrived at a node.
  - Time started.
  - Time submitted.
- Students can:
  - View their progress.
  - Revisit completed nodes and see feedback.

### **2.5 Leaderboard**

- Students are ranked based on:
  - Completion speed.
  - Grades or points awarded by instructors.
- Leaderboard is displayed for each node.

---

## **3. Database Schema**

### **3.1 Tables**

#### **Users and Roles**

- `user_roles`: Assigns roles (student, TA, instructor) to users.
- `cohorts`: Groups students into batches.

#### **Maps and Nodes**

- `learning_maps`: Top-level maps (e.g., AI, 3D, Unity).
- `map_nodes`: Individual nodes within a map.
- `node_paths`: Connections between nodes.

#### **Content and Assessments**

- `node_content`: Stores content for each node (video, slides, text).
- `node_assessments`: Defines assessments for nodes.
- `quiz_questions`: Stores questions for quiz-type assessments.

#### **Progress and Submissions**

- `student_node_progress`: Tracks student progress at each node.
- `assessment_submissions`: Stores student submissions for assessments.
- `submission_grades`: Stores grades and feedback for submissions.

#### **Gamification**

- `node_leaderboard`: Tracks rankings for students who pass a node.

---

## **4. Planned Features**

### **4.1 Teacher Features**

- **Upload Node Sprite**: Allow teachers to upload custom images for node sprites.
- **Pick Map Sprite**: Provide a gallery of pre-uploaded sprites for teachers to choose from.
- **Before/After Sprite States**: Add support for "before" and "after" states for node sprites.
- **Node Animation**: Add animations for node sprites (e.g., pulsing, glowing).
- **Selected Node Indicator**: Improve the selected node indicator with shadow effects and animations.

### **4.2 Peer Interaction**

- **Leaderboard**: Add a leaderboard for each node to rank students based on:
  - Completion speed.
  - Grades or points awarded by teachers.
- **Peer Grading**: Allow students to review and grade each other's submissions (future feature).
- **Peer Comments**: Enable students to leave comments on each other's submissions.

### **4.3 Grading Enhancements**

- **Customizable Grading**: Allow teachers to define custom grading schemes (e.g., points, percentages).
- **Grade Data Visualizer**: Add a dashboard for teachers to analyze grades:
  - Average grades per node.
  - Grade distribution.
  - Completion rates.

### **4.4 Map Enhancements**

- **Background Decorations**: Add decorative elements to the map background (e.g., stars, clouds).
- **Special Nodes**: Introduce special node types with unique behaviors:
  - Bonus nodes (e.g., extra points or rewards).
  - Locked nodes requiring specific achievements to unlock.
  - Challenge nodes with higher difficulty.
- **Map Animations**: Add animations for transitions between nodes.

### **4.5 Reflection Integration**

- **Link with Reflection Feature**: Allow students to reflect on their progress at each node.
- **Reflection Heatmap**: Integrate the reflection heatmap with the map to show reflection activity per node.

### **4.6 User Experience Improvements**

- **Node Start Instructions**: Improve the "Start" button experience with animations and smooth transitions.
- **Progress Indicators**: Add visual indicators for node progress (e.g., percentage completed).
- **Node Tooltips**: Show tooltips with additional information when hovering over nodes.

### **4.7 Future Features**

- **Collaborative Maps**: Allow multiple teachers to collaborate on the same map.
- **Dynamic Paths**: Add support for paths that change based on student performance.
- **Custom Themes**: Allow teachers to customize the map theme (e.g., colors, fonts).
- **Gamification Rewards**: Add rewards for students (e.g., badges, achievements).
- **Node Challenges**: Introduce timed challenges or mini-games within nodes.

---

## **5. Technical Considerations**

### **5.1 Performance**

- Optimize rendering for maps with a large number of nodes.
- Use lazy loading for content and assessments.

### **5.2 Real-Time Updates**

- Enable real-time updates for maps when teachers or students make changes.

### **5.3 Accessibility**

- Ensure the map feature is fully accessible (e.g., keyboard navigation, screen reader support).

---

## **6. Implementation Roadmap**

### **Phase 1: Core Features**

- Implement map structure (nodes, paths).
- Add content and assessment support.
- Track student progress and submissions.
- Enable grading and feedback.

### **Phase 2: Gamification**

- Add sprites, animations, and leaderboard.
- Support before/after states for nodes.

### **Phase 3: Enhancements**

- Add customizable grading schemes.
- Implement grade data visualizer.
- Add background decorations and special nodes.

### **Phase 4: Peer Interaction**

- Enable peer grading and comments.
- Add reflection integration.

### **Phase 5: Future Features**

- Implement collaborative maps.
- Add dynamic paths and custom themes.
- Introduce gamification rewards and challenges.

---

## **7. Open Questions**

- Should the leaderboard be global or per cohort?
- How should dynamic paths be defined (e.g., based on grades, time)?
- What types of special nodes should be prioritized (e.g., bonus, locked)?
- How should peer review be implemented (e.g., anonymous, rubric-based)?

---

This document serves as a comprehensive guide for the development of the learning map feature, ensuring alignment with the project's goals and future scalability.
