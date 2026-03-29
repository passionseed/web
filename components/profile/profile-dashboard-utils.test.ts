import {
  buildLearningJourney,
  calculateReflectionStreak,
  getProfileViewModel,
} from "@/components/profile/profile-dashboard-utils";

describe("profile dashboard utils", () => {
  it("uses dawn for students and dusk for instructors", () => {
    expect(getProfileViewModel([])).toMatchObject({
      isInstructorView: false,
      themeClassName: "dawn-theme",
      buttonClassName: "ei-button-dawn",
    });

    expect(getProfileViewModel(["student", "instructor"])).toMatchObject({
      isInstructorView: true,
      themeClassName: "dusk-theme",
      buttonClassName: "ei-button-dusk",
    });
  });

  it("counts a consecutive reflection streak across unique days", () => {
    expect(
      calculateReflectionStreak([
        "2026-03-29T08:00:00.000Z",
        "2026-03-29T10:00:00.000Z",
        "2026-03-28T09:00:00.000Z",
        "2026-03-27T09:00:00.000Z",
        "2026-03-25T09:00:00.000Z",
      ])
    ).toBe(3);
  });

  it("builds next steps and progress summaries from live enrollment data", () => {
    const journey = buildLearningJourney(
      [
        {
          enrolled_at: "2026-03-20T00:00:00.000Z",
          completed_at: null,
          progress_percentage: 50,
          learning_maps: {
            id: "map-1",
            title: "AI Foundations",
            category: "ai",
            map_nodes: [
              {
                id: "node-1",
                title: "Start Here",
                difficulty: 1,
                node_type: "learning",
                metadata: null,
                node_paths_source: [{ destination_node_id: "node-2" }],
                node_assessments: [{ id: "assessment-1" }],
              },
              {
                id: "node-2",
                title: "Build Prompt Chains",
                difficulty: 3,
                node_type: "learning",
                metadata: null,
                node_paths_source: [],
                node_assessments: [{ id: "assessment-2" }],
              },
              {
                id: "node-3",
                title: "Notes",
                difficulty: 1,
                node_type: "text",
                metadata: null,
                node_paths_source: [],
                node_assessments: [],
              },
            ],
          },
        },
      ],
      [
        { node_id: "node-1", status: "passed" },
        { node_id: "node-2", status: "in_progress" },
      ]
    );

    expect(journey).toMatchObject({
      activeMapCount: 1,
      completedNodeCount: 1,
      inProgressNodeCount: 1,
      totalNodeCount: 2,
      averageProgressPercentage: 50,
    });

    expect(journey.mapSummaries[0]).toMatchObject({
      mapId: "map-1",
      title: "AI Foundations",
      completedNodes: 1,
      totalNodes: 2,
      nextNodeTitle: "Build Prompt Chains",
    });

    expect(journey.nextNodes[0]).toMatchObject({
      status: "in_progress",
      map: { id: "map-1", title: "AI Foundations" },
      node: { id: "node-2", title: "Build Prompt Chains" },
    });
  });
});
