import { createClient } from "@/utils/supabase/server";

export interface StudentMapProgress {
  user_id: string;
  map_id: string;
  map_title: string;
  progress_percentage: number;
  completed_nodes: number;
  total_nodes: number;
  status: "not_started" | "in_progress" | "completed";
}

export interface ClassroomMapProgressData {
  students: Array<{
    id: string;
    user_id: string;
    user?: {
      id: string;
      email: string;
      full_name?: string;
      avatar_url?: string;
    };
    joined_at: string;
    map_progress: StudentMapProgress[];
  }>;
  classroomMaps: Array<{
    id: string;
    map_id: string;
    map_title: string;
    display_order: number;
  }>;
}

/**
 * Get student progress based on classroom map completion instead of assignments
 */
export async function getClassroomMapProgress(
  classroomId: string
): Promise<ClassroomMapProgressData> {
  const supabase = await createClient();

  // Get classroom maps
  const { data: classroomMaps, error: mapsError } = await supabase
    .from("classroom_maps")
    .select(`
      id,
      map_id,
      display_order,
      learning_maps (
        title
      )
    `)
    .eq("classroom_id", classroomId)
    .eq("is_active", true)
    .order("display_order");

  if (mapsError) {
    console.error("Error fetching classroom maps:", mapsError);
    throw new Error("Failed to fetch classroom maps");
  }

  // Get students in classroom
  const { data: students, error: studentsError } = await supabase
    .from("classroom_memberships")
    .select(`
      id,
      user_id,
      joined_at,
      user:profiles (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq("classroom_id", classroomId)
    .eq("role", "student");

  if (studentsError) {
    console.error("Error fetching students:", studentsError);
    throw new Error("Failed to fetch students");
  }

  // For each student, calculate their progress on each map
  const studentMapProgress: ClassroomMapProgressData["students"] = [];

  for (const student of students) {
    const mapProgressList: StudentMapProgress[] = [];

    for (const classroomMap of classroomMaps) {
      const mapId = classroomMap.map_id;
      
      // Get all nodes in this map
      const { data: mapNodes, error: nodesError } = await supabase
        .from("map_nodes")
        .select("id")
        .eq("map_id", mapId);

      if (nodesError) {
        console.error(`Error fetching nodes for map ${mapId}:`, nodesError);
        continue;
      }

      const totalNodes = mapNodes.length;
      
      if (totalNodes === 0) {
        // Map has no nodes
        mapProgressList.push({
          user_id: student.user_id,
          map_id: mapId,
          map_title: (classroomMap.learning_maps as any)?.title || "Untitled Map",
          progress_percentage: 0,
          completed_nodes: 0,
          total_nodes: 0,
          status: "not_started",
        });
        continue;
      }

      // Get student's progress on nodes in this map
      const { data: nodeProgress, error: progressError } = await supabase
        .from("student_node_progress")
        .select("node_id, status")
        .eq("user_id", student.user_id)
        .in("node_id", mapNodes.map(n => n.id));

      if (progressError) {
        console.error(`Error fetching progress for user ${student.user_id} on map ${mapId}:`, progressError);
        continue;
      }

      // Calculate progress metrics
      const completedNodes = nodeProgress.filter(p => p.status === "passed").length;
      const inProgressNodes = nodeProgress.filter(p => 
        p.status === "in_progress" || p.status === "submitted"
      ).length;
      const progressPercentage = Math.round((completedNodes / totalNodes) * 100);

      let status: "not_started" | "in_progress" | "completed";
      if (completedNodes === totalNodes && totalNodes > 0) {
        status = "completed";
      } else if (completedNodes > 0 || inProgressNodes > 0) {
        status = "in_progress";
      } else {
        status = "not_started";
      }

      mapProgressList.push({
        user_id: student.user_id,
        map_id: mapId,
        map_title: (classroomMap.learning_maps as any)?.title || "Untitled Map",
        progress_percentage: progressPercentage,
        completed_nodes: completedNodes,
        total_nodes: totalNodes,
        status,
      });
    }

    studentMapProgress.push({
      id: student.id,
      user_id: student.user_id,
      user: student.user,
      joined_at: student.joined_at,
      map_progress: mapProgressList,
    });
  }

  return {
    students: studentMapProgress,
    classroomMaps: classroomMaps.map(cm => ({
      id: cm.id,
      map_id: cm.map_id,
      map_title: (cm.learning_maps as any)?.title || "Untitled Map",
      display_order: cm.display_order,
    })),
  };
}