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

      nodeKeys.forEach((key) => {
        const node = data.nodes[key];
        const nodeLabel = `Node '${key}'`;

        if (!node.title) errors.push(`${nodeLabel}: Missing 'title'.`);
        if (!node.instructions) errors.push(`${nodeLabel}: Missing 'instructions'.`);
        if (!node.node_content || !Array.isArray(node.node_content)) {
          errors.push(`${nodeLabel}: 'node_content' must be an array.`);
        }
        if (!node.node_assessments || !Array.isArray(node.node_assessments)) {
          errors.push(`${nodeLabel}: 'node_assessments' must be an array.`);
        }
      });
    }

    // 3. Validate 'path' object with days
    if (!data.path) {
      errors.push("PathLab Error: Missing 'path' object.");
    } else {
      if (typeof data.path.total_days !== "number") {
        errors.push("PathLab Error: path.total_days must be a number.");
      } else if (data.path.total_days < 1 || data.path.total_days > 30) {
        errors.push("PathLab Error: path.total_days must be between 1 and 30.");
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

          if (!day.context_text || typeof day.context_text !== "string") {
            errors.push(`${dayLabel}: 'context_text' is required (string).`);
          }

          if (!Array.isArray(day.reflection_prompts)) {
            errors.push(`${dayLabel}: 'reflection_prompts' must be an array.`);
          } else if (day.reflection_prompts.length === 0) {
            errors.push(`${dayLabel}: Must have at least one reflection prompt.`);
          }

          if (!Array.isArray(day.node_keys)) {
            errors.push(`${dayLabel}: 'node_keys' must be an array.`);
          } else if (day.node_keys.length === 0) {
            errors.push(`${dayLabel}: Must reference at least one node.`);
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
    "title": string,
    "description": string,
    "slogan": string
  },
  "nodes": {
    "<node_key>": MapNode,
    ...
  },
  "edges": [
    { "source_key": string, "destination_key": string }
  ],
  "path": {
    "total_days": number,
    "days": PathDay[]
  }
}

==================================================
LEARNING MAP – NODE SCHEMA (CONTENT LAYER)
==================================================

MapNode:
{
  "title": string,
  "instructions": string,        // markdown, action-focused
  "node_type": "learning" | "text" | "comment" | "end",
  "metadata": {
    "position": { "x": number, "y": number }
  },
  "node_content": [
    {
      "content_type": "text" | "video" | "canva_slide" | "image" | "pdf" | "resource_link",
      "content_body": string
    }
  ],
  "node_assessments": [
    {
      "type": "quiz" | "text_answer" | "file_upload" | "image_upload" | "checklist",
      "prompt": string,
      "isGraded": false,
      "pointsPossible": 0
    }
  ]
}

CONTENT RULES (STRICT):
- Every node MUST require an action (not just reading)
- Each node must capture at least one low-effort signal (checklist or quiz).
- Use uploads to capture proof of action when possible.
- Use text_answer sparingly (max one per node, one sentence max), mainly for synthesis or decision-making.
- Each node should be completable in 15–45 minutes
- Do not front-load explanations.
- Instructions should push the learner to act first, then reference content only as needed.

==================================================
PATHLAB MAP – DAY SCHEMA (EXPERIENCE LAYER)
==================================================

PathDay:
{
  "day_number": number,
  "title": string,
  "context_text": string,         // short framing, not instructional
  "reflection_prompts": string[], // max 2, lightweight
  "node_keys": string[]           // references keys from "nodes"
}

PATHLAB RULES (STRICT):
1. total_days must be between 5 and 7
2. Days must be sequential (1 → N)
3. Each day must reference 1–2 nodes max
4. Reflection must be low-effort:
   - 1-sentence max
5. Final day MUST include:
   - synthesis
   - an explicit decision signal:
     Continue / Pause / Quit

==================================================
DESIGN PRINCIPLES (ENFORCE IN OUTPUT)
==================================================
- Assume learners are easily fatigued
- Avoid deep journaling
- Optimize for signal, not completion
- Quitting with clarity is a success
- No collaboration or team assumptions

==================================================
EDGE RULES
==================================================
- edges define logical learning flow
- keep structure mostly linear
- light branching is allowed, chaos is not

==================================================
RESPONSE RULES (MANDATORY)
==================================================
- Output ONLY valid JSON
- No markdown
- No comments
- No explanation text
- All references must be consistent
- JSON must be parseable
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
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-green-800 font-medium mb-3">
                      ✅ Valid PathLab Structure
                    </h4>
                    <div className="text-sm text-green-700 space-y-2">
                      <div>
                        <strong>Seed:</strong> {previewData.seed?.title}
                      </div>
                      <div>
                        <strong>Total Days:</strong> {previewData.path?.total_days || 0}
                      </div>
                      <div>
                        <strong>Nodes:</strong>{" "}
                        {Object.keys(previewData.nodes || {}).length}
                      </div>
                      <div>
                        <strong>Edges:</strong> {previewData.edges?.length || 0}
                      </div>
                      <div className="pt-2 mt-2 border-t border-green-300">
                        <strong>Day Breakdown:</strong>
                        <ul className="mt-1 ml-4 space-y-1">
                          {previewData.path?.days?.slice(0, 3).map((day: any) => (
                            <li key={day.day_number}>
                              Day {day.day_number}: {day.node_keys?.length || 0} node(s)
                            </li>
                          ))}
                          {previewData.path?.days?.length > 3 && (
                            <li className="italic">
                              ...and {previewData.path.days.length - 3} more days
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {previewData && detectedFormat === "standard" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-green-800 font-medium mb-3">
                      ✅ Valid Standard Map Structure
                    </h4>
                    <div className="text-sm text-green-700 space-y-2">
                      <div>
                        <strong>Map:</strong> {previewData.map?.title}
                      </div>
                      <div>
                        <strong>Nodes:</strong> {previewData.nodes?.length || 0}
                      </div>
                      <div>
                        <strong>Connections:</strong>{" "}
                        {previewData.connections?.length || 0}
                      </div>
                      <div>
                        <strong>Assessments:</strong>{" "}
                        {previewData.nodes?.reduce(
                          (total: number, node: any) =>
                            total + (node.assessments?.length || 0),
                          0,
                        ) || 0}
                      </div>
                    </div>
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
