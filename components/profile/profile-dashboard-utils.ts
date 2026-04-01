import type { MapCategory, ProgressStatus } from "@/types/map";

type DashboardRole = string;

type DashboardPath = {
  destination_node_id: string;
};

type DashboardAssessment = {
  id: string;
};

export type DashboardNode = {
  id: string;
  title: string;
  difficulty: number;
  node_type?: string | null;
  metadata?: Record<string, unknown> | null;
  node_paths_source?: DashboardPath[] | null;
  node_assessments?: DashboardAssessment[] | null;
};

export type DashboardMap = {
  id: string;
  title: string;
  category?: MapCategory | string | null;
  map_nodes?: DashboardNode[] | null;
};

export type DashboardEnrollment = {
  enrolled_at: string;
  completed_at?: string | null;
  progress_percentage?: number | null;
  learning_maps?: DashboardMap | null;
};

export type DashboardProgress = {
  node_id: string;
  status: ProgressStatus | string;
};

export type DashboardNextNode = {
  node: Pick<DashboardNode, "id" | "title" | "difficulty" | "node_type" | "metadata">;
  map: {
    id: string;
    title: string;
    category: string | null;
  };
  status: string;
};

export type DashboardMapSummary = {
  mapId: string;
  title: string;
  category: string | null;
  enrolledAt: string;
  progressPercentage: number;
  totalNodes: number;
  completedNodes: number;
  inProgressNodes: number;
  totalAssessments: number;
  nextNodeTitle: string | null;
};

export type LearningJourneySummary = {
  activeMapCount: number;
  completedMapCount: number;
  totalNodeCount: number;
  completedNodeCount: number;
  inProgressNodeCount: number;
  averageProgressPercentage: number;
  nextNodes: DashboardNextNode[];
  mapSummaries: DashboardMapSummary[];
};

const COMPLETED_STATUSES = new Set(["passed", "submitted"]);
const NON_LEARNING_NODE_TYPES = new Set(["text", "comment"]);
const INSTRUCTOR_ROLES = new Set(["instructor", "admin"]);

export function getProfileViewModel(roles: DashboardRole[]) {
  const isInstructorView = roles.some((role) => INSTRUCTOR_ROLES.has(role));

  return {
    isInstructorView,
    themeClassName: isInstructorView ? "dusk-theme" : "dawn-theme",
    buttonClassName: isInstructorView ? "ei-button-dusk" : "ei-button-dawn",
    accentTextClassName: isInstructorView
      ? "text-orange-200"
      : "text-blue-200",
    surfaceBorderClassName: isInstructorView
      ? "border-orange-400/20"
      : "border-blue-400/20",
  };
}

export function calculateReflectionStreak(
  timestamps: string[],
  referenceDate: Date = new Date()
) {
  if (timestamps.length === 0) {
    return 0;
  }

  const uniqueDays = new Set(
    timestamps.map((timestamp) => new Date(timestamp).toDateString())
  );

  const today = new Date(referenceDate);
  let streak = 0;

  while (uniqueDays.has(today.toDateString())) {
    streak += 1;
    today.setDate(today.getDate() - 1);
  }

  return streak;
}

function isLearningNode(node: DashboardNode) {
  return !NON_LEARNING_NODE_TYPES.has(node.node_type ?? "learning");
}

function isNodeUnlocked(node: DashboardNode, nodes: DashboardNode[], progressByNodeId: Map<string, string>) {
  if (!isLearningNode(node)) {
    return false;
  }

  const prerequisites = nodes.filter((candidate) =>
    candidate.node_paths_source?.some(
      (path) => path.destination_node_id === node.id
    )
  );

  if (prerequisites.length === 0) {
    return true;
  }

  return prerequisites.every((prerequisite) =>
    COMPLETED_STATUSES.has(progressByNodeId.get(prerequisite.id) ?? "")
  );
}

function sortNextNodes(a: DashboardNextNode, b: DashboardNextNode) {
  if (a.status === "in_progress" && b.status !== "in_progress") {
    return -1;
  }

  if (a.status !== "in_progress" && b.status === "in_progress") {
    return 1;
  }

  return a.node.title.localeCompare(b.node.title);
}

export function buildLearningJourney(
  enrollments: DashboardEnrollment[],
  progressEntries: DashboardProgress[]
): LearningJourneySummary {
  const progressByNodeId = new Map(
    progressEntries.map((entry) => [entry.node_id, entry.status])
  );

  const nextNodes: DashboardNextNode[] = [];
  const mapSummaries: DashboardMapSummary[] = [];

  let totalNodeCount = 0;
  let completedNodeCount = 0;
  let inProgressNodeCount = 0;

  for (const enrollment of enrollments) {
    const map = enrollment.learning_maps;
    if (!map) {
      continue;
    }

    const learningNodes = (map.map_nodes ?? []).filter(isLearningNode);

    if (learningNodes.length === 0) {
      continue;
    }

    let mapCompletedNodes = 0;
    let mapInProgressNodes = 0;

    for (const node of learningNodes) {
      const status = progressByNodeId.get(node.id) ?? "not_started";

      if (COMPLETED_STATUSES.has(status)) {
        mapCompletedNodes += 1;
      }

      if (status === "in_progress") {
        mapInProgressNodes += 1;
      }

      if (!COMPLETED_STATUSES.has(status) && isNodeUnlocked(node, learningNodes, progressByNodeId)) {
        nextNodes.push({
          node: {
            id: node.id,
            title: node.title,
            difficulty: node.difficulty,
            node_type: node.node_type ?? "learning",
            metadata: node.metadata ?? null,
          },
          map: {
            id: map.id,
            title: map.title,
            category: map.category ?? null,
          },
          status,
        });
      }
    }

    totalNodeCount += learningNodes.length;
    completedNodeCount += mapCompletedNodes;
    inProgressNodeCount += mapInProgressNodes;

    mapSummaries.push({
      mapId: map.id,
      title: map.title,
      category: map.category ?? null,
      enrolledAt: enrollment.enrolled_at,
      progressPercentage: Math.round(enrollment.progress_percentage ?? 0),
      totalNodes: learningNodes.length,
      completedNodes: mapCompletedNodes,
      inProgressNodes: mapInProgressNodes,
      totalAssessments: learningNodes.reduce(
        (sum, node) => sum + (node.node_assessments?.length ?? 0),
        0
      ),
      nextNodeTitle:
        nextNodes.find((item) => item.map.id === map.id)?.node.title ?? null,
    });
  }

  const activeMapCount = mapSummaries.length;
  const completedMapCount = enrollments.filter((enrollment) => Boolean(enrollment.completed_at)).length;
  const averageProgressPercentage =
    activeMapCount === 0
      ? 0
      : Math.round(
          mapSummaries.reduce((sum, summary) => sum + summary.progressPercentage, 0) /
            activeMapCount
        );

  mapSummaries.sort((a, b) => {
    if (b.progressPercentage !== a.progressPercentage) {
      return b.progressPercentage - a.progressPercentage;
    }

    return new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime();
  });

  nextNodes.sort(sortNextNodes);

  return {
    activeMapCount,
    completedMapCount,
    totalNodeCount,
    completedNodeCount,
    inProgressNodeCount,
    averageProgressPercentage,
    nextNodes: nextNodes.slice(0, 5),
    mapSummaries,
  };
}
