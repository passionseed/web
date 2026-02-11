import type {
  PathLabGeneratorAssessmentDraft,
  PathLabGeneratorDraft,
  PathLabQualityIssue,
  PathLabQualityResult,
} from "@/types/pathlab-generator";

function pushIssue(
  issues: PathLabQualityIssue[],
  level: "error" | "warning",
  code: string,
  message: string,
  field?: string,
) {
  issues.push({ level, code, message, field });
}

function validateAssessment(
  assessment: PathLabGeneratorAssessmentDraft,
  nodeKey: string,
  issues: PathLabQualityIssue[],
) {
  const field = `nodes.${nodeKey}.assessment`;

  if (assessment.type === "none") {
    return;
  }

  if (assessment.type === "quiz") {
    const questions = assessment.quiz_questions || [];
    if (questions.length === 0) {
      pushIssue(
        issues,
        "error",
        "ASSESSMENT_QUIZ_NO_QUESTIONS",
        "Quiz assessment must include at least one question",
        field,
      );
      return;
    }

    for (const [questionIndex, question] of questions.entries()) {
      if (question.options.length < 2) {
        pushIssue(
          issues,
          "error",
          "ASSESSMENT_QUIZ_OPTIONS",
          "Quiz question must include at least two options",
          `${field}.quiz_questions.${questionIndex}`,
        );
      }

      const correctExists = question.options.some(
        (option) => option.option === question.correct_option,
      );
      if (!correctExists) {
        pushIssue(
          issues,
          "error",
          "ASSESSMENT_QUIZ_CORRECT_OPTION",
          "Quiz question correct option must match one of the provided options",
          `${field}.quiz_questions.${questionIndex}`,
        );
      }
    }
  }

  if (assessment.type === "checklist") {
    const items = assessment.checklist_items || [];
    if (items.length === 0) {
      pushIssue(
        issues,
        "error",
        "ASSESSMENT_CHECKLIST_EMPTY",
        "Checklist assessment must include at least one checklist item",
        field,
      );
    }
  }

  if (assessment.type === "text_answer" || assessment.type === "file_upload") {
    if (!assessment.prompt || !assessment.prompt.trim()) {
      pushIssue(
        issues,
        "error",
        "ASSESSMENT_PROMPT_REQUIRED",
        `${assessment.type} assessment requires a prompt`,
        field,
      );
    }
  }
}

function hasCycle(adjacency: Map<string, string[]>): boolean {
  const visited = new Set<string>();
  const inStack = new Set<string>();

  const visit = (node: string): boolean => {
    if (inStack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    inStack.add(node);

    for (const neighbor of adjacency.get(node) || []) {
      if (visit(neighbor)) return true;
    }

    inStack.delete(node);
    return false;
  };

  for (const node of adjacency.keys()) {
    if (visit(node)) return true;
  }

  return false;
}

export function validatePathLabDraft(draft: PathLabGeneratorDraft): PathLabQualityResult {
  const issues: PathLabQualityIssue[] = [];

  const expectedTotalDays = draft.path.total_days;
  const days = [...draft.days].sort((a, b) => a.day_number - b.day_number);
  const nodesByKey = new Map(draft.nodes.map((node) => [node.key, node]));

  if (days.length !== expectedTotalDays) {
    pushIssue(
      issues,
      "error",
      "DAY_COUNT_MISMATCH",
      `Expected ${expectedTotalDays} days but got ${days.length}`,
      "path.total_days",
    );
  }

  for (let i = 0; i < days.length; i += 1) {
    const expectedDayNumber = i + 1;
    if (days[i].day_number !== expectedDayNumber) {
      pushIssue(
        issues,
        "error",
        "DAY_NUMBER_SEQUENCE",
        `Day numbers must be continuous from 1..N (found ${days[i].day_number} at index ${i})`,
        `days.${i}.day_number`,
      );
    }

    if (!days[i].reflection_prompts.length) {
      pushIssue(
        issues,
        "error",
        "DAY_REFLECTION_REQUIRED",
        `Day ${days[i].day_number} must include at least one reflection prompt`,
        `days.${i}.reflection_prompts`,
      );
    }

    if (!days[i].node_keys.length) {
      pushIssue(
        issues,
        "error",
        "DAY_NODE_REQUIRED",
        `Day ${days[i].day_number} must include at least one node`,
        `days.${i}.node_keys`,
      );
    }

    if (days[i].node_keys.length > 8) {
      pushIssue(
        issues,
        "warning",
        "DAY_NODE_OVERLOAD",
        `Day ${days[i].day_number} has ${days[i].node_keys.length} nodes; pacing may be too heavy`,
        `days.${i}.node_keys`,
      );
    }
  }

  const referencedNodeKeys = new Set<string>();
  for (const [dayIndex, day] of days.entries()) {
    for (const key of day.node_keys) {
      referencedNodeKeys.add(key);
      if (!nodesByKey.has(key)) {
        pushIssue(
          issues,
          "error",
          "DAY_NODE_KEY_NOT_FOUND",
          `Day ${day.day_number} references unknown node key: ${key}`,
          `days.${dayIndex}.node_keys`,
        );
      }
    }
  }

  for (const node of draft.nodes) {
    if (!referencedNodeKeys.has(node.key)) {
      pushIssue(
        issues,
        "error",
        "NODE_ORPHAN",
        `Node ${node.key} is never assigned to a day`,
        `nodes.${node.key}`,
      );
    }

    validateAssessment(node.assessment, node.key, issues);
  }

  const adjacency = new Map<string, string[]>();
  for (const node of draft.nodes) {
    adjacency.set(node.key, []);
  }

  for (const [edgeIndex, edge] of draft.edges.entries()) {
    if (!nodesByKey.has(edge.source_key) || !nodesByKey.has(edge.destination_key)) {
      pushIssue(
        issues,
        "error",
        "EDGE_NODE_KEY_NOT_FOUND",
        `Edge ${edge.source_key} -> ${edge.destination_key} references unknown node key`,
        `edges.${edgeIndex}`,
      );
      continue;
    }

    if (edge.source_key === edge.destination_key) {
      pushIssue(
        issues,
        "error",
        "EDGE_SELF_LOOP",
        `Edge ${edge.source_key} cannot point to itself`,
        `edges.${edgeIndex}`,
      );
      continue;
    }

    adjacency.get(edge.source_key)?.push(edge.destination_key);
  }

  if (hasCycle(adjacency)) {
    pushIssue(
      issues,
      "error",
      "GRAPH_CYCLE_DETECTED",
      "Node graph must be acyclic (DAG)",
      "edges",
    );
  }

  const assessedNodes = draft.nodes.filter((node) => node.assessment.type !== "none").length;
  if (assessedNodes === 0) {
    pushIssue(
      issues,
      "warning",
      "ASSESSMENT_NONE",
      "No assessments were generated; consider adding at least a few checks for understanding",
      "nodes",
    );
  }

  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    issues,
  };
}
