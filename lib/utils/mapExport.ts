import { FullLearningMap } from "@/lib/supabase/maps";

/**
 * Transform a FullLearningMap from Supabase into the JSON format
 * expected by the project creation page (/app/project/page.tsx)
 */
export function exportMapAsJson(map: FullLearningMap) {
  if (!map) {
    throw new Error("Map data is required for export");
  }

  // Transform map metadata
  const exportMap = {
    title: map.title,
    description: map.description || "",
    difficulty: map.difficulty || 1,
    estimatedHours: calculateEstimatedHours(map),
    visibility: map.visibility || "public",
    metadata: {
      tags: extractTags(map.metadata),
      category: map.category || "custom",
      ...map.metadata
    }
  };

  // Transform nodes
  const exportNodes = map.map_nodes.map((node, index) => {
    // Calculate position based on metadata or use default grid layout
    const position = node.metadata?.position || {
      x: 100 + (index % 3) * 200,
      y: 100 + Math.floor(index / 3) * 150
    };

    const exportNode = {
      id: node.id,
      title: node.title,
      description: node.instructions || "",
      position,
      difficulty: node.difficulty || 1,
      estimatedMinutes: calculateNodeEstimatedMinutes(node),
      prerequisites: getNodePrerequisites(node, map),
      content: transformNodeContent(node),
      assessments: transformNodeAssessments(node)
    };

    return exportNode;
  });

  // Transform connections from node paths
  const exportConnections = map.map_nodes
    .flatMap(node => node.node_paths_source || [])
    .map(path => ({
      from: path.source_node_id,
      to: path.destination_node_id,
      type: "prerequisite"
    }));

  return {
    map: exportMap,
    nodes: exportNodes,
    connections: exportConnections
  };
}

/**
 * Calculate estimated hours for the entire map
 */
function calculateEstimatedHours(map: FullLearningMap): number {
  const totalMinutes = map.map_nodes.reduce((total, node) => {
    return total + calculateNodeEstimatedMinutes(node);
  }, 0);
  
  return Math.max(1, Math.round(totalMinutes / 60));
}

/**
 * Calculate estimated minutes for a single node
 */
function calculateNodeEstimatedMinutes(node: any): number {
  // Use metadata if available
  if (node.metadata?.estimatedMinutes) {
    return node.metadata.estimatedMinutes;
  }

  // Estimate based on content and assessments
  let estimatedMinutes = 30; // base time

  // Add time for content
  const contentCount = node.node_content?.length || 0;
  estimatedMinutes += contentCount * 10;

  // Add time for assessments
  const assessmentCount = node.node_assessments?.length || 0;
  estimatedMinutes += assessmentCount * 15;

  // Add time for quiz questions
  const quizQuestionCount = node.node_assessments?.reduce((total: number, assessment: any) => {
    return total + (assessment.quiz_questions?.length || 0);
  }, 0) || 0;
  estimatedMinutes += quizQuestionCount * 5;

  return Math.min(estimatedMinutes, 180); // Cap at 3 hours per node
}

/**
 * Extract tags from map metadata
 */
function extractTags(metadata: any): string[] {
  if (!metadata) return [];
  
  // Check various possible tag formats
  if (Array.isArray(metadata.tags)) return metadata.tags;
  if (Array.isArray(metadata.keywords)) return metadata.keywords;
  if (typeof metadata.category === "string") return [metadata.category];
  
  return [];
}

/**
 * Get prerequisites for a node based on incoming paths
 */
function getNodePrerequisites(node: any, map: FullLearningMap): string[] {
  const prerequisites: string[] = [];
  
  // Find all paths that point to this node
  map.map_nodes.forEach(otherNode => {
    const pathsToThisNode = otherNode.node_paths_source?.filter(
      path => path.destination_node_id === node.id
    ) || [];
    
    pathsToThisNode.forEach(path => {
      if (!prerequisites.includes(path.source_node_id)) {
        prerequisites.push(path.source_node_id);
      }
    });
  });

  return prerequisites;
}

/**
 * Transform node content into the expected format
 */
function transformNodeContent(node: any) {
  const content = node.node_content || [];
  
  if (content.length === 0) {
    return {
      type: "lesson",
      text: node.instructions || "No content available.",
      codeBlocks: [],
      resources: []
    };
  }

  // Combine all content into a structured format
  const textContent = content
    .filter((c: any) => c.content_type === "text")
    .map((c: any) => c.content_body)
    .join("\n\n");

  const resources = content
    .filter((c: any) => ["resource_link", "pdf", "video"].includes(c.content_type))
    .map((c: any) => ({
      title: extractTitleFromUrl(c.content_url),
      url: c.content_url,
      type: mapContentTypeToResourceType(c.content_type)
    }))
    .filter(Boolean);

  // Extract code blocks from text content (simple detection)
  const codeBlocks = extractCodeBlocks(textContent);

  return {
    type: "lesson",
    text: textContent || node.instructions || "No content available.",
    codeBlocks,
    resources
  };
}

/**
 * Transform node assessments into the expected format
 */
function transformNodeAssessments(node: any) {
  const assessments = node.node_assessments || [];
  
  return assessments.map((assessment: any) => {
    const baseAssessment = {
      type: assessment.assessment_type,
      isGraded: assessment.is_graded || false,
      pointsPossible: assessment.points_possible || 10
    };

    switch (assessment.assessment_type) {
      case "quiz":
        return {
          ...baseAssessment,
          questions: (assessment.quiz_questions || []).map((q: any) => ({
            type: "multiple_choice",
            question: q.question_text,
            options: q.options?.map((opt: any) => opt.text) || [],
            correctAnswer: getCorrectAnswerIndex(q),
            points: Math.round(baseAssessment.pointsPossible / (assessment.quiz_questions?.length || 1))
          }))
        };

      case "checklist":
        return {
          ...baseAssessment,
          requirements: assessment.metadata?.items || ["Complete the task"]
        };

      case "text_answer":
        return {
          ...baseAssessment,
          prompt: "Provide a text response to complete this assessment."
        };

      case "file_upload":
        return {
          ...baseAssessment,
          prompt: "Upload a file to complete this assessment.",
          acceptedFileTypes: ["*"]
        };

      case "image_upload":
        return {
          ...baseAssessment,
          prompt: "Upload an image to complete this assessment.",
          acceptedFileTypes: ["image/*"]
        };

      default:
        return {
          ...baseAssessment,
          prompt: "Complete this assessment."
        };
    }
  });
}

/**
 * Helper function to extract title from URL
 */
function extractTitleFromUrl(url: string | null): string {
  if (!url) return "Resource";
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop() || "Resource";
    return filename.replace(/\.[^/.]+$/, ""); // Remove extension
  } catch {
    return "Resource";
  }
}

/**
 * Map database content types to resource types
 */
function mapContentTypeToResourceType(contentType: string): string {
  switch (contentType) {
    case "resource_link": return "link";
    case "pdf": return "documentation";
    case "video": return "video";
    case "image": return "image";
    default: return "documentation";
  }
}

/**
 * Extract code blocks from text content (simple regex-based detection)
 */
function extractCodeBlocks(text: string): Array<{ language: string; code: string }> {
  const codeBlocks: Array<{ language: string; code: string }> = [];
  
  // Match code blocks with language specification (```language)
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1] || "text";
    const code = match[2].trim();
    
    if (code) {
      codeBlocks.push({ language, code });
    }
  }
  
  return codeBlocks;
}

/**
 * Get the correct answer index for a quiz question
 */
function getCorrectAnswerIndex(question: any): number {
  if (!question.options || !question.correct_option) return 0;
  
  const correctIndex = question.options.findIndex(
    (opt: any) => opt.option === question.correct_option
  );
  
  return Math.max(0, correctIndex);
}

/**
 * Download the exported JSON as a file
 */
export function downloadMapAsJson(map: FullLearningMap, filename?: string) {
  const exportData = exportMapAsJson(map);
  const jsonString = JSON.stringify(exportData, null, 2);
  
  // Create blob and download
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `${map.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_export.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(url);
}