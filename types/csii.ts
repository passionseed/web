// CSII Curriculum Graph Types

export interface CSIICourse {
  id: string;
  filename: string;
  category: string;
  courseNumber: string;
  courseTitle: string;
  credits: string;
  facultyDepartment: string;
  semester: string;
  academicYear: string;
  instructor: string;
  instructorEmail: string;
  instructorRoom: string;
  condition: string;
  status: string;
  curriculum: string;
  degree: string;
  hoursPerWeek: string;
  courseDescription: string;
  learningObjectives: string;
  readingList: string;
  evaluationMethods: string;
  totalSessions: number;
  remainingTables: number;
}

export interface CurriculumNode {
  id: string;
  name: string;
  val: number; // Node size (based on credits)
  course: CSIICourse;
  group: string; // Category for coloring
  color?: string;
}

export interface CurriculumLink {
  source: string;
  target: string;
  value: number; // Similarity strength
}

export interface CurriculumGraphData {
  nodes: CurriculumNode[];
  links: CurriculumLink[];
}

export interface CategoryColor {
  category: string;
  color: string;
  count: number;
}

// Category groupings for related fields
export const CATEGORY_GROUPS: Record<string, string[]> = {
  "Technology": ["Core Technology", "Applied Digital Intelligence"],
  "Health": ["Health and Wellbeing"],
  "Sustainability": ["Smart City and Sustainable Development"],
  "General Education": ["Gen-Language", "Gen-Ed CSII", "Gen Ed Chula"],
  "Business": ["Core Business", "input"],
  "Interdisciplinary": ["Trandisciplinary"],
};

// Color palette for categories
export const CATEGORY_COLORS: Record<string, string> = {
  "Core Technology": "#3b82f6", // blue
  "Applied Digital Intelligence": "#6366f1", // indigo
  "Health and Wellbeing": "#10b981", // emerald
  "Smart City and Sustainable Development": "#22c55e", // green
  "Gen-Language": "#f59e0b", // amber
  "Gen-Ed CSII": "#f97316", // orange
  "Gen Ed Chula": "#ef4444", // red
  "Core Business": "#8b5cf6", // violet
  "Trandisciplinary": "#ec4899", // pink
  "input": "#6b7280", // gray (for uncategorized)
};

export type FilterState = {
  categories: string[];
  semesters: string[];
  searchQuery: string;
};
