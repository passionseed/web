"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  FileJson,
  Rocket,
  CheckCircle,
  AlertCircle,
  Copy,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

const exampleJson = {
  map: {
    title: "Learn React Basics",
    description: "Master React fundamentals step by step",
    difficulty: 2,
    estimatedHours: 8,
    visibility: "public",
    metadata: {
      tags: ["react", "javascript", "frontend"],
      category: "web-development",
    },
  },
  nodes: [
    {
      id: "node_1",
      title: "React Introduction",
      description: "What is React and why use it?",
      position: { x: 100, y: 100 },
      difficulty: 1,
      estimatedMinutes: 60,
      content: {
        type: "lesson",
        text: "React is a JavaScript library for building user interfaces. It makes building interactive UIs painless by creating simple views for each state in your application.",
        codeBlocks: [
          {
            language: "jsx",
            code: "function App() {\n  return <h1>Hello, React!</h1>;\n}",
          },
        ],
        resources: [
          {
            title: "React Official Docs",
            url: "https://react.dev",
            type: "documentation",
          },
        ],
      },
      assessments: [
        {
          type: "quiz",
          isGraded: true,
          pointsPossible: 10,
          questions: [
            {
              type: "multiple_choice",
              question: "What is React?",
              options: [
                "A database",
                "A JavaScript library",
                "A CSS framework",
              ],
              correctAnswer: 1,
              points: 5,
            },
          ],
        },
      ],
    },
    {
      id: "node_2",
      title: "Components & JSX",
      description: "Learn about React components and JSX syntax",
      position: { x: 300, y: 100 },
      difficulty: 2,
      estimatedMinutes: 90,
      prerequisites: ["node_1"],
      content: {
        type: "lesson",
        text: "Components are the building blocks of React applications. JSX is a syntax extension that lets you write HTML-like code in JavaScript.",
        codeBlocks: [
          {
            language: "jsx",
            code: "function Welcome(props) {\n  return <h1>Hello, {props.name}!</h1>;\n}",
          },
        ],
      },
      assessments: [
        {
          type: "project",
          isGraded: true,
          pointsPossible: 20,
          prompt:
            "Create a React component that displays a greeting with your name",
          requirements: [
            "Use JSX syntax",
            "Accept props",
            "Return a valid element",
          ],
        },
      ],
    },
  ],
  connections: [
    {
      from: "node_1",
      to: "node_2",
      type: "prerequisite",
    },
  ],
}; // Define types for clarity and type safety
type ContentType =
  | "text"
  | "video"
  | "canva_slide"
  | "image"
  | "pdf"
  | "resource_link";
type AssessmentType =
  | "quiz"
  | "text_answer"
  | "image_upload"
  | "file_upload"
  | "checklist";

interface ContentItem {
  content_type: ContentType;
  content_body: string;
  content_url?: string;
}

interface AssessmentItem {
  type: AssessmentType;
  prompt?: string;
  questions?: any[];
}

interface Node {
  id: string;
  title: string;
  position: { x: number; y: number };
  content: ContentItem[];
  assessments: AssessmentItem[];
}

interface Connection {
  from: string;
  to: string;
}

interface RoadmapData {
  map: {
    title: string;
    description: string;
  };
  nodes: Node[];
  connections?: Connection[];
}

/**
 * Validates PathLab seed format with PathDay structure
 */
const validatePathLabJson = (jsonString: string): string[] => {
  const errors: string[] = [];

  try {
    const data: any = JSON.parse(jsonString);

    // 1. Validate 'seed' object
    if (!data.seed) {
      errors.push("PathLab Error: Missing 'seed' object.");
    } else {
      if (!data.seed.title || typeof data.seed.title !== "string")
        errors.push("PathLab Error: seed.title is required (string).");
      if (!data.seed.description || typeof data.seed.description !== "string")
        errors.push("PathLab Error: seed.description is required (string).");
      if (!data.seed.slogan || typeof data.seed.slogan !== "string")
        errors.push("PathLab Error: seed.slogan is required (string).");
    }

    // 2. Validate 'nodes' object (keyed by node_key)
    if (!data.nodes || typeof data.nodes !== "object") {
      errors.push("PathLab Error: 'nodes' must be an object with node keys.");
    } else {
      const nodeKeys = Object.keys(data.nodes);
      if (nodeKeys.length === 0) {
        errors.push("PathLab Error: 'nodes' must contain at least one node.");
      }

      const validNodeTypes = ["learning", "text", "comment", "end"];
      const validContentTypes = ["text", "video", "canva_slide", "image", "pdf", "resource_link"];
      const validAssessmentTypes = ["quiz", "text_answer", "file_upload", "image_upload", "checklist"];

      nodeKeys.forEach((key) => {
        const node = data.nodes[key];
        const nodeLabel = `Node '${key}'`;

        // Required fields
        if (!node.title || typeof node.title !== "string")
          errors.push(`${nodeLabel}: 'title' is required (string).`);
        if (!node.instructions || typeof node.instructions !== "string")
          errors.push(`${nodeLabel}: 'instructions' is required (string).`);

        // Validate node_type
        if (!node.node_type || !validNodeTypes.includes(node.node_type)) {
          errors.push(`${nodeLabel}: 'node_type' must be one of: ${validNodeTypes.join(", ")}.`);
        }

        // Validate position (can be at root or in metadata)
        const position = node.position || node.metadata?.position;
        if (!position || typeof position !== "object") {
          errors.push(`${nodeLabel}: 'position' object is required (either at root or in metadata).`);
        } else {
          if (typeof position.x !== "number") {
            errors.push(`${nodeLabel}: 'position.x' must be a number.`);
          }
          if (typeof position.y !== "number") {
            errors.push(`${nodeLabel}: 'position.y' must be a number.`);
          }
        }

        // Validate content
        if (!node.content || !Array.isArray(node.content)) {
          errors.push(`${nodeLabel}: 'content' must be an array.`);
        } else if (node.content.length === 0) {
          errors.push(`${nodeLabel}: 'content' must not be empty.`);
        } else {
          node.content.forEach((content: any, idx: number) => {
            if (!content.content_type || !validContentTypes.includes(content.content_type)) {
              errors.push(`${nodeLabel}: content[${idx}].content_type must be one of: ${validContentTypes.join(", ")}.`);
            }
            if (!content.content_body || typeof content.content_body !== "string") {
              errors.push(`${nodeLabel}: content[${idx}].content_body is required (string).`);
            }
          });
        }

        // Validate assessments
        if (!node.assessments || !Array.isArray(node.assessments)) {
          errors.push(`${nodeLabel}: 'assessments' must be an array.`);
        } else if (node.assessments.length === 0) {
          errors.push(`${nodeLabel}: 'assessments' must not be empty.`);
        } else {
          node.assessments.forEach((assessment: any, idx: number) => {
            if (!assessment.type || !validAssessmentTypes.includes(assessment.type)) {
              errors.push(`${nodeLabel}: assessment[${idx}].type must be one of: ${validAssessmentTypes.join(", ")}.`);
            }
            if (!assessment.prompt || typeof assessment.prompt !== "string") {
              errors.push(`${nodeLabel}: assessment[${idx}].prompt is required (string).`);
            }
            if (typeof assessment.isGraded !== "boolean") {
              errors.push(`${nodeLabel}: assessment[${idx}].isGraded must be a boolean.`);
            }
            if (typeof assessment.pointsPossible !== "number") {
              errors.push(`${nodeLabel}: assessment[${idx}].pointsPossible must be a number.`);
            }
          });
        }
      });
    }

    // 3. Validate 'path' object with days
    if (!data.path) {
      errors.push("PathLab Error: Missing 'path' object.");
    } else {
      if (typeof data.path.total_days !== "number") {
        errors.push("PathLab Error: path.total_days must be a number.");
      } else if (data.path.total_days < 5 || data.path.total_days > 7) {
        errors.push("PathLab Error: path.total_days must be between 5 and 7.");
      }

      if (!Array.isArray(data.path.days)) {
        errors.push("PathLab Error: path.days must be an array.");
      } else {
        if (data.path.days.length !== data.path.total_days) {
          errors.push(
            `PathLab Error: path.days length (${data.path.days.length}) must match total_days (${data.path.total_days}).`
          );
        }

        data.path.days.forEach((day: any, i: number) => {
          const dayLabel = `Day ${i + 1}`;

          if (typeof day.day_number !== "number") {
            errors.push(`${dayLabel}: 'day_number' must be a number.`);
          } else if (day.day_number !== i + 1) {
            errors.push(`${dayLabel}: 'day_number' must be ${i + 1} (sequential).`);
          }

          if (!day.title || typeof day.title !== "string") {
            errors.push(`${dayLabel}: 'title' is required (string).`);
          }

          if (!day.context_text || typeof day.context_text !== "string") {
            errors.push(`${dayLabel}: 'context_text' is required (string).`);
          }

          if (!Array.isArray(day.reflection_prompts)) {
            errors.push(`${dayLabel}: 'reflection_prompts' must be an array.`);
          } else if (day.reflection_prompts.length === 0) {
            errors.push(`${dayLabel}: Must have at least one reflection prompt.`);
          } else if (day.reflection_prompts.length > 2) {
            errors.push(`${dayLabel}: Maximum 2 reflection prompts allowed.`);
          }

          if (!Array.isArray(day.node_keys)) {
            errors.push(`${dayLabel}: 'node_keys' must be an array.`);
          } else if (day.node_keys.length === 0) {
            errors.push(`${dayLabel}: Must reference at least one node.`);
          } else if (day.node_keys.length > 2) {
            errors.push(`${dayLabel}: Maximum 2 nodes per day allowed.`);
          } else {
            // Validate node_keys reference existing nodes
            const nodeKeys = new Set(Object.keys(data.nodes || {}));
            day.node_keys.forEach((key: string) => {
              if (!nodeKeys.has(key)) {
                errors.push(`${dayLabel}: References non-existent node key '${key}'.`);
              }
            });
          }
        });
      }
    }

    // 4. Validate 'edges' array (optional but if present must be valid)
    if (data.edges && Array.isArray(data.edges)) {
      const nodeKeys = new Set(Object.keys(data.nodes || {}));
      data.edges.forEach((edge: any, i: number) => {
        if (!nodeKeys.has(edge.source_key)) {
          errors.push(`Edge ${i + 1}: source_key '${edge.source_key}' does not exist.`);
        }
        if (!nodeKeys.has(edge.destination_key)) {
          errors.push(`Edge ${i + 1}: destination_key '${edge.destination_key}' does not exist.`);
        }
      });
    }
  } catch (e) {
    errors.push(
      "Fatal Error: Invalid JSON format. The string could not be parsed.",
    );
  }

  return errors;
};

/**
 * Validates the structure and educational completeness of a learning roadmap JSON.
 * @param jsonString The JSON string to validate.
 * @returns An array of error messages. An empty array means the JSON is valid.
 */
const validateRoadmapJson = (jsonString: string): string[] => {
  const errors: string[] = [];

  try {
    const data: RoadmapData = JSON.parse(jsonString);

    // 1. Validate top-level 'map' object
    if (!data.map) {
      errors.push("Validation Error: Missing root 'map' object.");
    } else {
      if (!data.map.title)
        errors.push("Validation Error: Map 'title' is required.");
      if (!data.map.description)
        errors.push("Validation Error: Map 'description' is required.");
    }

    // 2. Validate 'nodes' array
    if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
      errors.push(
        "Validation Error: 'nodes' must be an array with at least one node.",
      );
    } else {
      data.nodes.forEach((node, i) => {
        const nodeLabel = `Node ${i + 1} (ID: ${node.id || "N/A"})`;

        // Check for required node properties
        if (!node.id) errors.push(`${nodeLabel}: Missing 'id'.`);
        if (!node.title) errors.push(`${nodeLabel}: Missing 'title'.`);
        if (
          !node.position ||
          typeof node.position.x !== "number" ||
          typeof node.position.y !== "number"
        ) {
          errors.push(
            `${nodeLabel}: Invalid 'position' (must have numeric x and y coordinates).`,
          );
        }

        // **NEW**: Ensure each node is educationally complete
        if (!node.content || node.content.length === 0) {
          errors.push(`${nodeLabel}: Must have a non-empty 'content' array.`);
        }

        if (!node.assessments || node.assessments.length === 0) {
          errors.push(
            `${nodeLabel}: Must have a non-empty 'assessments' array.`,
          );
        }
      });
    }

    // 3. Validate 'connections' array
    if (data.connections && Array.isArray(data.connections)) {
      const nodeIds = new Set((data.nodes || []).map((n) => n.id));
      data.connections.forEach((conn, i) => {
        if (!nodeIds.has(conn.from)) {
          errors.push(
            `Connection ${i + 1}: 'from' ID "${conn.from}" does not exist.`,
          );
        }
        if (!nodeIds.has(conn.to)) {
          errors.push(
            `Connection ${i + 1}: 'to' ID "${conn.to}" does not exist.`,
          );
        }
      });
    }
  } catch (e) {
    errors.push(
      "Fatal Error: Invalid JSON format. The string could not be parsed.",
    );
  }

  return errors;
};

type PromptMode = "standard" | "pathlab";

const PROMPT_TEMPLATES: Record<PromptMode, string> = {
  standard: `Final Prompt: Adaptive Learning Roadmap Generator (v2.0)

You are an expert educational content creator specializing in building step-by-step learning roadmaps. When a user describes a project they want to build, you will assess their skill level and generate a detailed, adaptive roadmap in JSON format that supports flexible, non-linear learning paths.

Your Role:
- Audience Adaptability: Cater to all skill levels, from complete beginners to experienced professionals
- Skill Assessment: Actively probe the user's background and experience
- Goal Scoping: For large goals, create a high-level roadmap that charts critical initial stages
- Path Flexibility: Recognize that learning is not always linear. Structure roadmaps with parallel tracks where appropriate

Available Content & Assessment Types:
Content Types: "text", "video", "canva_slide", "image", "pdf", "resource_link"
Assessment Types: "quiz", "text_answer", "image_upload", "file_upload", "checklist"

JSON Structure Required:
{
  "map": {
    "title": "Project Title",
    "description": "Clear description of what students will build",
    "difficulty": 1,
    "estimatedHours": 20,
    "visibility": "public",
    "metadata": {
      "tags": ["web-development", "javascript", "react"],
      "category": "web-development"
    }
  },
  "nodes": [
    {
      "id": "node_1",
      "title": "Clear, actionable step title",
      "description": "Brief description of what this step accomplishes",
      "position": { "x": 100, "y": 100 },
      "difficulty": 1,
      "estimatedMinutes": 60,
      "prerequisites": [],
      "content": [
        {
          "content_type": "text",
          "content_body": "### Instructions\\n1. First, do this specific action.\\n2. Next, run the following command.\\n\\n### Code Block\\n\`\`\`bash\\nnpm install\\n\`\`\`\\n\\n### Completion Criteria\\nSuccess is when you see the confirmation message."
        },
        {
          "content_type": "resource_link",
          "content_url": "https://example.com",
          "content_body": "Official Documentation"
        }
      ],
      "assessments": [
        {
          "type": "checklist",
          "isGraded": false,
          "pointsPossible": 0,
          "metadata": {
            "items": [
              "Required setup is complete",
              "I can run the basic command successfully"
            ]
          }
        }
      ]
    }
  ],
  "connections": [
    { "from": "node_1", "to": "node_2", "type": "prerequisite" }
  ]
}

Core Requirements:
- Each node MUST have unique id, content array (not empty), and assessments array (not empty)
- Use prerequisites array to define node dependencies (empty [] for starting nodes)
- Position coordinates: increment x by 200 for sequential steps; use different y values (e.g., y: 100 for frontend, y: 300 for backend) for parallel tracks

Best Practices:
1. "Inspiration & Case Study" Node: Provide real-world examples and architectural patterns
2. "Explore & Connect" Node: Guide users toward self-directed learning for advanced topics

Clarification Protocol (IMPORTANT):
Phase 1 - Assess Skill Level:
- "Could you tell me about your experience with [key technology]?"
- "What's the most complex project you've built?"
- "On a scale of 1-5, how would you rate your skill level?"

Phase 2 - Define Project Scope:
- "What are the 2-3 essential features this project must have?"
- "Is this a short-term learning project or long-term expansion?"
- "Do you prefer linear or parallel learning tracks?"

Response Format:
First Response: Ask 2-3 clarifying questions about skill level and scope
Second Response: Generate the complete JSON roadmap based on their answers`,
  pathlab: `You are an expert PathLab curriculum architect.

Your task is to generate a VALID JSON DRAFT BLUEPRINT that can be imported into the system to create:
1) A Learning Map (content layer)
2) A PathLab Map (experience layer)

This is a SOLO, SELF-PACED, DAY-BASED exploration designed to help learners TEST a path and decide whether to CONTINUE, PAUSE, or QUIT.

You must strictly follow the schemas and rules below. Do NOT invent fields. Do NOT add explanations.

==================================================
OUTPUT FORMAT (TOP LEVEL – REQUIRED)
==================================================
{
  "seed": {
    "title": string,           // Required: Map title
    "description": string,     // Required: Map description
    "slogan": string          // Required: Short tagline
  },
  "nodes": {
    "<node_key>": MapNode,   // Required: At least one node, keys are strings
    ...
  },
  "edges": [                 // Optional: Define learning flow
    { "source_key": string, "destination_key": string }
  ],
  "path": {
    "total_days": number,    // Required: 5-7 days only
    "days": PathDay[]        // Required: Array matching total_days
  }
}

==================================================
LEARNING MAP – NODE SCHEMA (CONTENT LAYER)
==================================================

MapNode (ALL FIELDS REQUIRED):
{
  "title": string,                                    // Required: Node title
  "instructions": string,                             // Required: Markdown, action-focused
  "node_type": "learning" | "text" | "comment" | "end", // Required: Node type
  "position": { "x": number, "y": number },          // Required: Canvas position (e.g., x: 100, y: 100)
  "content": [                                        // Required: At least one content item
    {
      "content_type": "text" | "video" | "canva_slide" | "image" | "pdf" | "resource_link",
      "content_body": string                          // Required: Content text or description
    }
  ],
  "assessments": [                                    // Required: At least one assessment
    {
      "type": "quiz" | "text_answer" | "file_upload" | "image_upload" | "checklist",
      "prompt": string,                               // Required: Assessment question/prompt
      "isGraded": boolean,                           // Required: Usually false for PathLab
      "pointsPossible": number                       // Required: Usually 0 for PathLab
    }
  ]
}

CONTENT RULES (STRICT):
- Every node MUST require an action (not just reading)
- Every node MUST have at least one non-empty content item in content array
- Every node MUST have at least one assessment in assessments array
- Each node must capture at least one low-effort signal (checklist or quiz)
- Use uploads (file_upload, image_upload) to capture proof of action when possible
- Use text_answer sparingly (max one per node, one sentence max), mainly for synthesis or decision-making
- Each node should be completable in 15–45 minutes
- Do not front-load explanations
- Instructions should push the learner to act first, then reference content only as needed
- Use node_type "learning" for most nodes, "end" for final day nodes

==================================================
PATHLAB MAP – DAY SCHEMA (EXPERIENCE LAYER)
==================================================

PathDay (ALL FIELDS REQUIRED):
{
  "day_number": number,           // Required: Sequential (1, 2, 3...)
  "title": string,                // Required: Day title
  "context_text": string,         // Required: Short framing, not instructional
  "reflection_prompts": string[], // Required: 1-2 prompts max, lightweight
  "node_keys": string[]           // Required: 1-2 node references max
}

PATHLAB RULES (STRICT):
1. total_days must be exactly 5, 6, or 7 (no more, no less)
2. Days must be sequential starting from 1 (day_number: 1, 2, 3...)
3. path.days array length MUST equal total_days
4. Each day must reference 1–2 nodes maximum in node_keys array
5. Each day must have 1-2 reflection_prompts maximum (keep them short)
6. Every node_key referenced must exist in the nodes object
7. Reflection prompts must be low-effort: 1-sentence max per prompt
8. Final day (last day) MUST include:
   - Synthesis reflection
   - An explicit decision signal prompt like:
     "Based on this week, what's your next step? Continue / Pause / Quit"

==================================================
DESIGN PRINCIPLES (ENFORCE IN OUTPUT)
==================================================
- Assume learners are easily fatigued
- Avoid deep journaling or long reflections
- Optimize for signal, not completion
- Quitting with clarity is a success
- No collaboration or team assumptions
- PathLab is SOLO and SELF-PACED

==================================================
EDGE RULES
==================================================
- edges array is optional but recommended
- Each edge must reference existing node keys: { "source_key": "node_1", "destination_key": "node_2" }
- Keep structure mostly linear (day 1 → day 2 → day 3...)
- Light branching is allowed for optional paths
- Avoid creating complex dependency graphs

==================================================
POSITION GUIDELINES
==================================================
- Start positions at x: 100, y: 100
- Increment x by 200-250 for sequential days (x: 100, 300, 500...)
- Keep y consistent for linear paths (all y: 100)
- Use different y values for parallel/branching paths (y: 100 vs y: 300)

==================================================
RESPONSE RULES (MANDATORY)
==================================================
- Output ONLY valid JSON
- No markdown code blocks (no \`\`\`json)
- No comments inside JSON
- No explanation text before or after JSON
- All node_keys must be consistent across nodes, edges, and path.days
- All required fields must be present
- JSON must be parseable by JSON.parse()

==================================================
EXAMPLE STRUCTURE (Minimal Valid Format)
==================================================
{
  "seed": {
    "title": "Web Design Fundamentals",
    "description": "Test your interest in web design over 5 days",
    "slogan": "Design your first webpage"
  },
  "nodes": {
    "day1_intro": {
      "title": "HTML Basics",
      "instructions": "Create a simple HTML page with a heading and paragraph. Test it in your browser.",
      "node_type": "learning",
      "position": { "x": 100, "y": 100 },
      "content": [
        {
          "content_type": "text",
          "content_body": "HTML structures web content using tags. Start with <!DOCTYPE html>, then add <html>, <head>, and <body> tags."
        }
      ],
      "assessments": [
        {
          "type": "file_upload",
          "prompt": "Upload your HTML file",
          "isGraded": false,
          "pointsPossible": 0
        },
        {
          "type": "checklist",
          "prompt": "Completion checklist",
          "isGraded": false,
          "pointsPossible": 0
        }
      ]
    },
    "day2_css": {
      "title": "CSS Styling",
      "instructions": "Add colors and fonts to your HTML page using CSS.",
      "node_type": "learning",
      "position": { "x": 300, "y": 100 },
      "content": [
        {
          "content_type": "text",
          "content_body": "CSS controls visual styling. Use <style> tags or external .css files."
        }
      ],
      "assessments": [
        {
          "type": "image_upload",
          "prompt": "Upload a screenshot of your styled page",
          "isGraded": false,
          "pointsPossible": 0
        }
      ]
    }
  },
  "edges": [
    { "source_key": "day1_intro", "destination_key": "day2_css" }
  ],
  "path": {
    "total_days": 5,
    "days": [
      {
        "day_number": 1,
        "title": "Getting Started",
        "context_text": "Today you'll write your first HTML.",
        "reflection_prompts": ["What surprised you about HTML?"],
        "node_keys": ["day1_intro"]
      },
      {
        "day_number": 2,
        "title": "Adding Style",
        "context_text": "Now make it look good with CSS.",
        "reflection_prompts": ["How does CSS change the user experience?"],
        "node_keys": ["day2_css"]
      }
    ]
  }
}
`,
};

export default function ProjectPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [promptMode, setPromptMode] = useState<PromptMode>("standard");
  const [detectedFormat, setDetectedFormat] = useState<"standard" | "pathlab" | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Auto-detect format and use appropriate validator
  const validateJson = (jsonString: string): string[] => {
    if (!jsonString.trim()) return [];

    try {
      const parsed = JSON.parse(jsonString);

      // Detect format based on structure
      const isPathLab = parsed.seed && parsed.path && parsed.path.days;
      const isStandard = parsed.map && Array.isArray(parsed.nodes);

      if (isPathLab) {
        setDetectedFormat("pathlab");
        return validatePathLabJson(jsonString);
      } else if (isStandard) {
        setDetectedFormat("standard");
        return validateRoadmapJson(jsonString);
      } else {
        setDetectedFormat(null);
        return ["Unrecognized format. Must be either Standard (with 'map' object) or PathLab (with 'seed' and 'path' objects)."];
      }
    } catch (e) {
      setDetectedFormat(null);
      return ["Fatal Error: Invalid JSON format. The string could not be parsed."];
    }
  };

  const handleInputChange = (value: string) => {
    setJsonInput(value);
    if (value.trim()) {
      const errors = validateJson(value);
      setValidationErrors(errors);

      // If valid, set preview data
      if (errors.length === 0) {
        try {
          const parsed = JSON.parse(value);
          setPreviewData(parsed);
        } catch {
          setPreviewData(null);
        }
      } else {
        setPreviewData(null);
      }
    } else {
      setValidationErrors([]);
      setPreviewData(null);
    }
  };

  const createMapFromJson = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create maps",
        variant: "destructive",
      });
      return;
    }

    const errors = validateJson(jsonInput);
    if (errors.length > 0) {
      toast({
        title: "Validation Failed",
        description: "Please fix the JSON errors before creating the map",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/maps/create-from-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonInput,
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "🚀 Map Created Successfully!",
          description: `Created map with ${result.nodesCreated} nodes and ${result.assessmentsCreated} assessments in ${result.timeElapsed}ms`,
        });

        // Navigate to the created map
        router.push(`/map/${result.mapId}`);
      } else {
        throw new Error(result.error || "Failed to create map");
      }
    } catch (error) {
      toast({
        title: "Creation Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyExample = () => {
    setJsonInput(JSON.stringify(exampleJson, null, 2));
    handleInputChange(JSON.stringify(exampleJson, null, 2));
    toast({
      title: "Example Copied",
      description: "You can now modify and create this example map",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to create maps from JSON
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <FileJson className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Create Map from JSON</h1>
            <p className="text-muted-foreground">
              Build complete learning maps instantly using JSON structure
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Badge variant="secondary">
            <Rocket className="w-3 h-3 mr-1" />
            Instant Creation
          </Badge>
          <Badge variant="secondary">
            <CheckCircle className="w-3 h-3 mr-1" />
            Full Features
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create Map</TabsTrigger>
          <TabsTrigger value="example">View Example</TabsTrigger>
          <TabsTrigger value="prompt">AI Prompt</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* JSON Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  JSON Input
                </CardTitle>
                <CardDescription>
                  Paste your map JSON structure here
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste your JSON here..."
                  value={jsonInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                />

                <div className="flex gap-2">
                  <Button
                    onClick={copyExample}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Use Example
                  </Button>
                  <Button
                    onClick={createMapFromJson}
                    disabled={
                      isCreating ||
                      validationErrors.length > 0 ||
                      !jsonInput.trim()
                    }
                    className="flex-1"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Create Map
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Validation & Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {validationErrors.length === 0 && jsonInput.trim() ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : validationErrors.length > 0 ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                    Validation & Preview
                  </div>
                  {detectedFormat && (
                    <Badge variant={detectedFormat === "pathlab" ? "default" : "secondary"}>
                      {detectedFormat === "pathlab" ? "PathLab Format" : "Standard Format"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <h4 className="text-red-800 font-medium mb-2">
                      Validation Errors:
                    </h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      {validationErrors.map((error, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {previewData && detectedFormat === "pathlab" && (
                  <div className="space-y-3">
                    {/* Summary */}
                    <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                      <h4 className="text-green-900 font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        PathLab Structure Valid
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-green-800 font-medium">Nodes:</span>{" "}
                          <span className="font-semibold text-green-950">{Object.keys(previewData.nodes || {}).length}</span>
                        </div>
                        <div>
                          <span className="text-green-800 font-medium">Days:</span>{" "}
                          <span className="font-semibold text-green-950">{previewData.path?.total_days || 0}</span>
                        </div>
                        <div>
                          <span className="text-green-800 font-medium">Edges:</span>{" "}
                          <span className="font-semibold text-green-950">{previewData.edges?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-green-800 font-medium">Content Items:</span>{" "}
                          <span className="font-semibold text-green-950">
                            {Object.values(previewData.nodes || {}).reduce(
                              (sum: number, node: any) => sum + (node.content?.length || 0),
                              0
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Browsable Details */}
                    <Tabs defaultValue="seed" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="seed">Seed</TabsTrigger>
                        <TabsTrigger value="nodes">Nodes</TabsTrigger>
                        <TabsTrigger value="days">Days</TabsTrigger>
                        <TabsTrigger value="edges">Edges</TabsTrigger>
                      </TabsList>

                      <TabsContent value="seed" className="mt-2">
                        <div className="border rounded-lg p-3 bg-muted/30 space-y-2 text-sm max-h-64 overflow-y-auto">
                          <div>
                            <span className="font-semibold text-foreground">Title:</span>{" "}
                            <span className="text-foreground/80">{previewData.seed?.title || "❌ Missing"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">Description:</span>{" "}
                            <span className="text-foreground/80">{previewData.seed?.description || "❌ Missing"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">Slogan:</span>{" "}
                            <span className="text-foreground/80">{previewData.seed?.slogan || "❌ Missing"}</span>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="nodes" className="mt-2">
                        <div className="border rounded-lg p-3 bg-muted/30 space-y-2 text-sm max-h-64 overflow-y-auto">
                          {Object.entries(previewData.nodes || {}).map(([key, node]: [string, any]) => (
                            <details key={key} className="border-b border-border/50 pb-2 last:border-b-0">
                              <summary className="cursor-pointer font-semibold text-foreground hover:text-blue-600">
                                {key}: {node.title || "Untitled"}
                                <span className="ml-2 text-xs text-foreground/60">
                                  ({node.content?.length || 0} content, {node.assessments?.length || 0} assessments)
                                </span>
                              </summary>
                              <div className="mt-2 ml-4 space-y-1 text-xs text-foreground/80">
                                <div>
                                  <span className="font-medium text-foreground">Type:</span> {node.node_type || "❌ Missing"}
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">Position:</span>{" "}
                                  {node.position ? `(${node.position.x}, ${node.position.y})` : "❌ Missing"}
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">Content Types:</span>{" "}
                                  {node.content?.map((c: any) => c.content_type).join(", ") || "None"}
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">Assessment Types:</span>{" "}
                                  {node.assessments?.map((a: any) => a.type).join(", ") || "None"}
                                </div>
                              </div>
                            </details>
                          ))}
                          {Object.keys(previewData.nodes || {}).length === 0 && (
                            <p className="text-red-600">❌ No nodes found</p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="days" className="mt-2">
                        <div className="border rounded-lg p-3 bg-muted/30 space-y-2 text-sm max-h-64 overflow-y-auto">
                          {previewData.path?.days?.map((day: any) => (
                            <details key={day.day_number} className="border-b border-border/50 pb-2 last:border-b-0">
                              <summary className="cursor-pointer font-semibold text-foreground hover:text-blue-600">
                                Day {day.day_number}: {day.title || "Untitled"}
                                <span className="ml-2 text-xs text-foreground/60">
                                  ({day.node_keys?.length || 0} nodes)
                                </span>
                              </summary>
                              <div className="mt-2 ml-4 space-y-1 text-xs text-foreground/80">
                                <div>
                                  <span className="font-medium text-foreground">Context:</span>{" "}
                                  <span>
                                    {day.context_text?.substring(0, 80) || "❌ Missing"}
                                    {day.context_text?.length > 80 && "..."}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">Reflection Prompts:</span>{" "}
                                  {day.reflection_prompts?.length || 0}
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">Node Keys:</span>{" "}
                                  {day.node_keys?.join(", ") || "❌ None"}
                                </div>
                              </div>
                            </details>
                          ))}
                          {!previewData.path?.days?.length && (
                            <p className="text-red-600">❌ No days found</p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="edges" className="mt-2">
                        <div className="border rounded-lg p-3 bg-muted/30 space-y-2 text-sm max-h-64 overflow-y-auto">
                          {previewData.edges?.map((edge: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs border-b border-border/50 pb-2 last:border-b-0">
                              <span className="font-mono bg-blue-100 text-blue-900 px-2 py-1 rounded">{edge.source_key}</span>
                              <span className="text-foreground">→</span>
                              <span className="font-mono bg-green-100 text-green-900 px-2 py-1 rounded">{edge.destination_key}</span>
                            </div>
                          ))}
                          {!previewData.edges?.length && (
                            <p className="text-foreground/60">No edges defined (optional)</p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {previewData && detectedFormat === "standard" && (
                  <div className="space-y-3">
                    {/* Summary */}
                    <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                      <h4 className="text-green-900 font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Standard Map Valid
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-green-800 font-medium">Nodes:</span>{" "}
                          <span className="font-semibold text-green-950">{previewData.nodes?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-green-800 font-medium">Connections:</span>{" "}
                          <span className="font-semibold text-green-950">{previewData.connections?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-green-800 font-medium">Content Items:</span>{" "}
                          <span className="font-semibold text-green-950">
                            {previewData.nodes?.reduce(
                              (sum: number, node: any) => sum + (node.content?.length || 0),
                              0
                            ) || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-green-800 font-medium">Assessments:</span>{" "}
                          <span className="font-semibold text-green-950">
                            {previewData.nodes?.reduce(
                              (sum: number, node: any) => sum + (node.assessments?.length || 0),
                              0
                            ) || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Browsable Details */}
                    <Tabs defaultValue="map" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="map">Map Info</TabsTrigger>
                        <TabsTrigger value="nodes">Nodes</TabsTrigger>
                        <TabsTrigger value="connections">Connections</TabsTrigger>
                      </TabsList>

                      <TabsContent value="map" className="mt-2">
                        <div className="border rounded-lg p-3 bg-muted/30 space-y-2 text-sm max-h-64 overflow-y-auto">
                          <div>
                            <span className="font-semibold text-foreground">Title:</span>{" "}
                            <span className="text-foreground/80">{previewData.map?.title || "❌ Missing"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">Description:</span>{" "}
                            <span className="text-foreground/80">{previewData.map?.description || "None"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">Difficulty:</span>{" "}
                            <span className="text-foreground/80">{previewData.map?.difficulty || "Not set"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">Visibility:</span>{" "}
                            <span className="text-foreground/80">{previewData.map?.visibility || "public"}</span>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="nodes" className="mt-2">
                        <div className="border rounded-lg p-3 bg-muted/30 space-y-2 text-sm max-h-64 overflow-y-auto">
                          {previewData.nodes?.map((node: any, i: number) => (
                            <details key={i} className="border-b border-border/50 pb-2 last:border-b-0">
                              <summary className="cursor-pointer font-semibold text-foreground hover:text-blue-600">
                                {node.id}: {node.title || "Untitled"}
                                <span className="ml-2 text-xs text-foreground/60">
                                  ({node.content?.length || 0} content, {node.assessments?.length || 0} assessments)
                                </span>
                              </summary>
                              <div className="mt-2 ml-4 space-y-1 text-xs text-foreground/80">
                                <div>
                                  <span className="font-medium text-foreground">Position:</span>{" "}
                                  {node.position ? `(${node.position.x}, ${node.position.y})` : "❌ Missing"}
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">Description:</span>{" "}
                                  {node.description || "None"}
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">Content Types:</span>{" "}
                                  {Array.isArray(node.content)
                                    ? node.content.map((c: any) => c.content_type).join(", ")
                                    : node.content?.type || "None"}
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">Assessment Types:</span>{" "}
                                  {node.assessments?.map((a: any) => a.type).join(", ") || "None"}
                                </div>
                              </div>
                            </details>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="connections" className="mt-2">
                        <div className="border rounded-lg p-3 bg-muted/30 space-y-2 text-sm max-h-64 overflow-y-auto">
                          {previewData.connections?.map((conn: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs border-b border-border/50 pb-2 last:border-b-0">
                              <span className="font-mono bg-blue-100 text-blue-900 px-2 py-1 rounded">{conn.from}</span>
                              <span className="text-foreground">→</span>
                              <span className="font-mono bg-green-100 text-green-900 px-2 py-1 rounded">{conn.to}</span>
                              {conn.type && (
                                <span className="text-xs text-foreground/60">({conn.type})</span>
                              )}
                            </div>
                          ))}
                          {!previewData.connections?.length && (
                            <p className="text-foreground/60">No connections defined (optional)</p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {!jsonInput.trim() && (
                  <div className="text-center text-muted-foreground py-8">
                    <FileJson className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Enter JSON to see validation results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="example">
          <Card>
            <CardHeader>
              <CardTitle>Example JSON Structure</CardTitle>
              <CardDescription>
                Copy this example and modify it to create your own map
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 rounded-lg p-4 overflow-auto text-sm">
                <code>{JSON.stringify(exampleJson, null, 2)}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt">
          <Card>
            <CardHeader>
              <CardTitle>AI Prompt for Generating Maps</CardTitle>
              <CardDescription>
                Use these prompts with AI tools like ChatGPT or Claude to
                generate learning map JSON
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={promptMode}
                onValueChange={(value) => setPromptMode(value as PromptMode)}
                className="space-y-4"
              >
                <TabsList>
                  <TabsTrigger value="standard">
                    Standard Learning Map
                  </TabsTrigger>
                  <TabsTrigger value="pathlab">
                    PathLab Learning Map
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Prompt Template</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        PROMPT_TEMPLATES[promptMode],
                      );
                      toast({
                        title: "Prompt Copied",
                        description:
                          promptMode === "pathlab"
                            ? "Paste this into your AI tool to generate a PathLab-focused learning map"
                            : "Paste this into your AI tool to generate a learning map",
                      });
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Prompt
                  </Button>
                </div>
                <pre
                  id="ai-prompt-text"
                  className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto text-sm whitespace-pre-wrap"
                >
                  {PROMPT_TEMPLATES[promptMode]}
                </pre>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Usage Tips:
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • Select Standard or PathLab prompt above, then copy it into
                    ChatGPT or Claude
                  </li>
                  <li>
                    • Describe your project or PathLab topic (e.g., "Help me
                    build a UX design PathLab for beginners")
                  </li>
                  <li>
                    • Answer the AI's clarifying questions about your skill
                    level
                  </li>
                  <li>
                    • The AI will generate a complete JSON roadmap tailored to
                    you
                  </li>
                  <li>
                    • Review and validate the generated JSON before pasting into
                    the Create tab
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>JSON Structure Documentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Required Fields:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                    <li>
                      • <code>map.title</code> - Map title
                    </li>
                    <li>
                      • <code>map.description</code> - Map description
                    </li>
                    <li>
                      • <code>nodes</code> - Array of learning nodes
                    </li>
                    <li>
                      • <code>nodes[].id</code> - Unique node identifier
                    </li>
                    <li>
                      • <code>nodes[].title</code> - Node title
                    </li>
                    <li>
                      • <code>nodes[].position</code> - Node position{" "}
                      {"{x: number, y: number}"}
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Optional Fields:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                    <li>
                      • <code>map.difficulty</code> - Difficulty level (1-5)
                    </li>
                    <li>
                      • <code>map.visibility</code> - "public" or "private"
                    </li>
                    <li>
                      • <code>nodes[].content</code> - Rich content with text,
                      code, resources
                    </li>
                    <li>
                      • <code>nodes[].assessments</code> - Quizzes, projects,
                      reflections
                    </li>
                    <li>
                      • <code>connections</code> - Node prerequisite
                      relationships
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
