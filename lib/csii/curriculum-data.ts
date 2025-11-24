import {
  CSIICourse,
  CurriculumNode,
  CurriculumLink,
  CurriculumGraphData,
  CATEGORY_COLORS,
  CATEGORY_GROUPS,
  CategoryColor,
} from "@/types/csii";

// Raw CSV data - parsed from syllabi_export_courses.csv
const COURSES_RAW = [
  {
    filename: "Entrepreneurial Science and Behaviour_Syllabus(1).docx",
    category: "input",
    course_number: "5601104",
    course_title: "Entrepreneurial Science and Behaviour",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Dr Jose Christian",
    instructor_email: "Jose.c@chula.ac.th",
    instructor_room: "415/2",
    condition: "Core",
    status: "Required",
    total_sessions: 14,
  },
  {
    filename: "Course 5600122 syllabus - Sci of Life S1-AY2025.docx",
    category: "Trandisciplinary",
    course_number: "5600122",
    course_title: "The Science of Life: Physics, Chemistry, Biology and Medical Tech",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Dr Sebastien Bertin-Maghit, Dr Maxime Herve, Dr Warinya Chemnasiri, Dr Ning Li, Dr Chris Dixon",
    instructor_email: "sebastien.b@chula.ac.th",
    total_sessions: 14,
  },
  {
    filename: "5600123-Economic Concepts for Innovator-S1,2024.docx",
    category: "Trandisciplinary",
    course_number: "5600123",
    course_title: "Economic Concepts for Innovator",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "Second Semester",
    academic_year: "2024",
    instructor: "Dr. Francis D. Kim",
    total_sessions: 15,
  },
  {
    filename: "Course-syllabus-5600124-Worldview lens.docx",
    category: "Trandisciplinary",
    course_number: "5600124",
    course_title: "THE WORLDVIEW LENS: IDEAS, HISTORY & GEOPOLITICS",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Wimonmat Srichamroen, PhD. Asst. Prof. Pongphisoot Busbarat, PhD.",
    instructor_email: "wimonmat.s@chula.ac.th",
    total_sessions: 14,
  },
  {
    filename: "2225101 Korean Language.docx",
    category: "Gen-Language",
    course_number: "2225101",
    course_title: "Korean Language 1",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2024",
    instructor_email: "Aquariussixth@gmail.com",
    total_sessions: 15,
  },
  {
    filename: "2223001 Japanese I.docx",
    category: "Gen-Language",
    course_number: "2223001",
    course_title: "Japanese I",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2024",
    instructor: "Asst. Prof. Salilrat Kaweejarumongkol & Asst. Prof. Asadayuth Chusri",
    total_sessions: 15,
  },
  {
    filename: "5602104-Entrepreneurial Maths-From Business to AI-S1,2024.docx",
    category: "Core Technology",
    course_number: "5602101",
    course_title: "Mathematics for Applied Digital Intelligence",
    course_credit: "3 Credits",
    faculty_department: "School of Integrated Innovation, Chulalongkorn University",
    semester: "First semester",
    academic_year: "2024-2025",
    instructor: "Christopher Dixon",
    total_sessions: 8,
  },
  {
    filename: "[Autumn 2025]5602203 Gen AI Syllabus.docx",
    category: "Core Technology",
    course_number: "5602203",
    course_title: "Generative AI - Literacy & Applications",
    course_credit: "3 Credits",
    semester: "First Semester",
    academic_year: "2025",
    instructor_email: "Poomjai.N@chula.ac.th",
    instructor_room: "415/3",
    total_sessions: 15,
  },
  {
    filename: "5602301 - Applied Artificial Intelligence (Fall 2025) 2 sections.docx",
    category: "Core Technology",
    course_number: "5602301",
    course_title: "Applied Artificial Intelligence",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Dr. Marko Niinimaki",
    total_sessions: 15,
  },
  {
    filename: "5602106 - Coding for Entrepreneurs-A Starter Guide.docx",
    category: "Core Technology",
    course_number: "5602106",
    course_title: "Coding for Entrepreneurs: A Starter Guide",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Narongthat Thanyawet, Ph.D.",
    instructor_email: "Narongthat.t@chula.ac.th",
    instructor_room: "415/1",
    total_sessions: 13,
  },
  {
    filename: "[Autumn 2025][5698101] Syllabus.docx",
    category: "Gen-Ed CSII",
    course_number: "5698101",
    course_title: "Emerging Technologies for Lifelong Learning",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Poomjai Nacaskul",
    total_sessions: 7,
  },
  {
    filename: "5600160- IP Data Security.docx",
    category: "Gen-Ed CSII",
    course_number: "5600160",
    course_title: "Intellectual Property and Data Security Management",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "Semester",
    academic_year: "2025-2026",
    instructor: "Yon Jung Choi",
    instructor_email: "Yonjung.c@chula.ac.th",
    total_sessions: 15,
  },
  {
    filename: "5600187-Cross Culture Communication Skills for Organizational Excellence-S1,2024.docx",
    category: "Gen-Ed CSII",
    course_number: "5600187",
    course_title: "Cross-Cultural Communication Skills for Organizational Excellence",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2024",
    instructor: "Aj. Suttirat Hongtong",
    total_sessions: 0,
  },
  {
    filename: "2800221 Inter Com Ettique-S1,AY25.docx",
    category: "Gen Ed Chula",
    course_number: "2800221",
    course_title: "International Communication Etiquette and Protocol",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Assoc. Prof. Pavel Slutskiy",
    instructor_email: "pavel.a@chula.ac.th",
    instructor_room: "MKSW 607",
    total_sessions: 14,
  },
  {
    filename: "Syllabus QWM 1-2025 (1).docx",
    category: "Gen Ed Chula",
    course_number: "0201127",
    course_title: "Quality work management",
    course_credit: "3 Credits",
    faculty_department: "General Education",
    semester: "1st. semester",
    academic_year: "2568/2025",
    instructor: "Asst. Prof. Manida Swangnetr Neubert, Ph.D.",
    total_sessions: 15,
  },
  {
    filename: "Entrepreneurial Science and Behaviour_Syllabus(1).docx",
    category: "Core Business",
    course_number: "5601104",
    course_title: "Entrepreneurial Science and Behaviour",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Dr Jose Christian",
    instructor_email: "Jose.c@chula.ac.th",
    instructor_room: "415/2",
    total_sessions: 14,
  },
  {
    filename: "Course 563407 syllabus S1AY2025.docx",
    category: "Health and Wellbeing",
    course_number: "5604307",
    course_title: "Innovation in Health & Wellbeing",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Dr Sebastien Bertin-Maghit",
    instructor_email: "sebastien.b@chula.ac.th",
    instructor_room: "317-2",
    total_sessions: 3,
  },
  {
    filename: "5604208 Innovative Public Health Approaches to Managing Chronic Diseases _term 2 2024-2025.docx",
    category: "Health and Wellbeing",
    course_number: "5604208",
    course_title: "Innovative Public Health Approaches to Managing Chronic Diseases and aging",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First",
    academic_year: "2024-2025",
    instructor: "Ning Li",
    instructor_email: "Ning.l@chula.ac.th",
    total_sessions: 15,
  },
  {
    filename: "5604202 Adaptation of Health Solutions in Response to Climate Change.docx",
    category: "Health and Wellbeing",
    course_number: "5604202",
    course_title: "Adaptation of Health Solutions in Response to Climate Change",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation",
    semester: "Second Semester",
    academic_year: "2025",
    instructor: "Dr Maxime HERVE",
    total_sessions: 14,
  },
  {
    filename: "5604312 Commercial Pathways in Healthcare and Pharmaceuticals.docx",
    category: "Health and Wellbeing",
    course_number: "5604312",
    course_title: "Commercial Pathways in Healthcare and Pharmaceuticals",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First",
    academic_year: "2025",
    instructor: "Ning Li",
    instructor_email: "Ning.l@chula.ac.th",
    total_sessions: 16,
  },
  {
    filename: "5604210-The Consumer Healthcare revolution.docx",
    category: "Health and Wellbeing",
    course_number: "5604210",
    course_title: "The Consumer Healthcare revolution",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Dr Maxime HERVE",
    total_sessions: 8,
  },
  {
    filename: "5604311 Current Health Challenges and Innovative Solutions.docx",
    category: "Health and Wellbeing",
    course_number: "5604311",
    course_title: "Current Health Challenges and Innovative Solutions",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation",
    semester: "Second Semester",
    academic_year: "2023",
    instructor: "Dr Sebastien BERTIN-MAGHIT",
    total_sessions: 15,
  },
  {
    filename: "5604207 Pharmaceuticals - Basic Principles and Application to Pharmacy Practice.docx",
    category: "Health and Wellbeing",
    course_number: "5604207",
    course_title: "Pharmaceuticals: Basic Principles and Application to Pharmacy Practice",
    course_credit: "3 Credits",
    faculty_department: "School of Integrated Innovation, Chulalongkorn University",
    semester: "Second Semester",
    academic_year: "2024-2025",
    instructor: "Ning Li",
    total_sessions: 13,
  },
  {
    filename: "5604307 Innovation in Health and Well-being .docx",
    category: "Health and Wellbeing",
    course_number: "5604307",
    course_title: "Innovation in Health & Wellbeing",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2024",
    instructor: "Dr Sebastien Bertin-Maghit",
    instructor_email: "sebastien.b@chula.ac.th",
    instructor_room: "317-2",
    total_sessions: 5,
  },
  {
    filename: "5604306 Public Health -  Heath security and Health Promotion - Course-syllabus-format - Copy.docx",
    category: "Health and Wellbeing",
    course_number: "5604306",
    course_title: "Public Health: Health Promotion and Health Security",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First",
    academic_year: "2024",
    instructor: "Ning Li",
    instructor_email: "Ning.l@chula.ac.th",
    total_sessions: 16,
  },
  {
    filename: "5604311 Current Health Challenges and Innovative Solutions-S1,AY2025.docx",
    category: "Health and Wellbeing",
    course_number: "5604311",
    course_title: "Current Health Challenges & Innovative Solutions",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Dr Sebastien Bertin-Maghit",
    instructor_email: "sebastien.b@chula.ac.th",
    instructor_room: "317-2",
    total_sessions: 15,
  },
  {
    filename: "Health and Well being_The Consumer Healthcare revolution.docx",
    category: "Health and Wellbeing",
    course_number: "5604210",
    course_title: "Health and Well being_The Consumer Healthcare revolution",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Dr Maxime HERVE",
    total_sessions: 8,
  },
  {
    filename: "5605403 Smart City and Urban Development.docx",
    category: "Smart City and Sustainable Development",
    course_number: "5605403",
    course_title: "Smart City and Urban Development",
    course_credit: "3 Credits",
    instructor: "Prof. Agachai Sumalee, Thomas Lozada",
    total_sessions: 15,
  },
  {
    filename: "Course-syllabus-Sustainable-Design-for-the-Future-S1,AY2025.docx",
    category: "Smart City and Sustainable Development",
    course_number: "5605209",
    course_title: "Sustainable Design for the Future",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Thomas Lozada, Sawaros Thanapornsangsuth, Agachai Sumalee",
    instructor_email: "thomas.j@chula.ac.th",
    total_sessions: 15,
  },
  {
    filename: "5605208 Business and Organizational Models for Smart Cities.docx",
    category: "Smart City and Sustainable Development",
    course_number: "5605208",
    course_title: "Business and Organizational Models for Smart Cities",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2024",
    total_sessions: 12,
  },
  {
    filename: "5606301 Building a Better Tomorrow.docx",
    category: "Smart City and Sustainable Development",
    course_number: "5606301",
    course_title: "Building a Better Tomorrow",
    course_credit: "3 Credits",
    total_sessions: 0,
  },
  {
    filename: "Sustainable Development Goals Course Syllabus (1).docx",
    category: "Smart City and Sustainable Development",
    course_number: "5606308",
    course_title: "Innovations for Sustainable Development Goals",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Sawaros Thanapornsangsuth",
    total_sessions: 9,
  },
  {
    filename: "5606308 Innovation for Sustainable Development Goals.docx",
    category: "Smart City and Sustainable Development",
    course_number: "5606308",
    course_title: "Innovation for Sustainable Development Goals",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation (BAScII International Program)",
    total_sessions: 1,
  },
  {
    filename: "5606203 Taylor Swift and Social Change.docx",
    category: "Smart City and Sustainable Development",
    course_number: "606204",
    course_title: "Taylor Swift and Social Change",
    course_credit: "3 Credits",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "Second Semester",
    academic_year: "2024",
    instructor: "Sawaros Thanapornsangsuth, EdD",
    instructor_email: "Sawaros.t@chula.ac.th",
    instructor_room: "316/2",
    total_sessions: 15,
  },
  {
    filename: "5607207-Game Design and Development.docx",
    category: "Applied Digital Intelligence",
    course_number: "5607207",
    course_title: "Game Design & Development",
    course_credit: "3 Credit",
    faculty_department: "Chulalongkorn School of Integrated Innovation, Chulalongkorn University",
    semester: "First Semester",
    academic_year: "2025",
    instructor: "Ajarn Richmond Lee",
    instructor_email: "Aekkathip.C@chula.ac.th",
    total_sessions: 15,
  },
];

// Parse raw data into CSIICourse objects
function parseRawCourses(): CSIICourse[] {
  return COURSES_RAW.map((raw, index) => ({
    id: `course-${index}-${raw.course_number}`,
    filename: raw.filename || "",
    category: raw.category || "Unknown",
    courseNumber: raw.course_number || "",
    courseTitle: raw.course_title || "",
    credits: raw.course_credit || "",
    facultyDepartment: raw.faculty_department || "",
    semester: raw.semester || "",
    academicYear: raw.academic_year || "",
    instructor: raw.instructor || "",
    instructorEmail: raw.instructor_email || "",
    instructorRoom: raw.instructor_room || "",
    condition: raw.condition || "",
    status: raw.status || "",
    curriculum: "Bachelor of Arts and Science in Integrated Innovation (International Program)",
    degree: "Bachelor's degree",
    hoursPerWeek: "3 Hours/week",
    courseDescription: "",
    learningObjectives: "",
    readingList: "",
    evaluationMethods: "",
    totalSessions: raw.total_sessions || 0,
    remainingTables: 0,
  }));
}

// Get category group for a category
function getCategoryGroup(category: string): string | null {
  for (const [group, categories] of Object.entries(CATEGORY_GROUPS)) {
    if (categories.includes(category)) {
      return group;
    }
  }
  return null;
}

// Check if two categories are related
function areCategoriesRelated(cat1: string, cat2: string): boolean {
  const group1 = getCategoryGroup(cat1);
  const group2 = getCategoryGroup(cat2);
  return group1 !== null && group1 === group2;
}

// Extract instructor names for comparison
function extractInstructorNames(instructor: string): string[] {
  if (!instructor) return [];
  // Split by common delimiters and clean up
  return instructor
    .split(/[,;&]/)
    .map(name => name.trim().toLowerCase())
    .filter(name => name.length > 0);
}

// Check if two courses share an instructor
function shareInstructor(course1: CSIICourse, course2: CSIICourse): boolean {
  const names1 = extractInstructorNames(course1.instructor);
  const names2 = extractInstructorNames(course2.instructor);

  for (const name1 of names1) {
    for (const name2 of names2) {
      // Check for partial matches (last names)
      const parts1 = name1.split(/\s+/);
      const parts2 = name2.split(/\s+/);
      for (const p1 of parts1) {
        for (const p2 of parts2) {
          if (p1.length > 3 && p2.length > 3 && p1 === p2) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// Calculate similarity between two courses
function calculateSimilarity(course1: CSIICourse, course2: CSIICourse): number {
  let score = 0;

  // Same category - strongest connection
  if (course1.category === course2.category) {
    score += 5;
  }
  // Related category
  else if (areCategoriesRelated(course1.category, course2.category)) {
    score += 3;
  }

  // Shared instructor
  if (shareInstructor(course1, course2)) {
    score += 2;
  }

  // Same semester
  if (course1.semester && course2.semester &&
      course1.semester.toLowerCase() === course2.semester.toLowerCase()) {
    score += 1;
  }

  return score;
}

// Get credits as number for node sizing
function getCreditsValue(credits: string): number {
  const match = credits.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 3;
}

// Build graph data from courses
export function buildCurriculumGraph(): CurriculumGraphData {
  const courses = parseRawCourses();

  // Create nodes - deduplicate by course number
  const seenCourseNumbers = new Set<string>();
  const nodes: CurriculumNode[] = [];

  for (const course of courses) {
    // Skip duplicates
    if (seenCourseNumbers.has(course.courseNumber)) {
      continue;
    }
    seenCourseNumbers.add(course.courseNumber);

    nodes.push({
      id: course.id,
      name: course.courseTitle,
      val: getCreditsValue(course.credits) * 2, // Scale for visibility
      course,
      group: course.category,
      color: CATEGORY_COLORS[course.category] || "#6b7280",
    });
  }

  // Create links based on similarity
  const links: CurriculumLink[] = [];
  const minSimilarity = 3; // Threshold for creating a link

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const similarity = calculateSimilarity(nodes[i].course, nodes[j].course);
      if (similarity >= minSimilarity) {
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          value: similarity,
        });
      }
    }
  }

  return { nodes, links };
}

// Get all unique categories with colors and counts
export function getCategoryColors(): CategoryColor[] {
  const courses = parseRawCourses();
  const categoryCounts = new Map<string, number>();

  for (const course of courses) {
    const count = categoryCounts.get(course.category) || 0;
    categoryCounts.set(course.category, count + 1);
  }

  return Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category,
      color: CATEGORY_COLORS[category] || "#6b7280",
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

// Get all unique semesters
export function getAllSemesters(): string[] {
  const courses = parseRawCourses();
  const semesters = new Set<string>();

  for (const course of courses) {
    if (course.semester) {
      semesters.add(course.semester);
    }
  }

  return Array.from(semesters).sort();
}

// Filter graph data based on criteria
export function filterGraphData(
  data: CurriculumGraphData,
  categories: string[],
  searchQuery: string
): CurriculumGraphData {
  let filteredNodes = data.nodes;

  // Filter by categories
  if (categories.length > 0) {
    filteredNodes = filteredNodes.filter(node =>
      categories.includes(node.course.category)
    );
  }

  // Filter by search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredNodes = filteredNodes.filter(node =>
      node.course.courseTitle.toLowerCase().includes(query) ||
      node.course.courseNumber.toLowerCase().includes(query) ||
      node.course.instructor.toLowerCase().includes(query)
    );
  }

  // Filter links to only include those between filtered nodes
  const nodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredLinks = data.links.filter(link =>
    nodeIds.has(link.source as string) && nodeIds.has(link.target as string)
  );

  return {
    nodes: filteredNodes,
    links: filteredLinks,
  };
}
