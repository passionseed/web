import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { MapNode } from "@/types/map";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ nextNodes: [] });
    }

    // Get enrolled maps with nodes and paths
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from("user_map_enrollments")
      .select(
        `
        *,
        learning_maps!inner (
          id,
          title,
          category,
          map_nodes (
            id,
            title,
            difficulty,
            node_type,
            metadata,
            node_paths_source:node_paths!node_paths_source_node_id_fkey (
              destination_node_id
            )
          )
        )
      `
      )
      .eq("user_id", user.id)
      .order("enrolled_at", { ascending: false });

    if (enrollmentError || !enrollmentData || enrollmentData.length === 0) {
      return NextResponse.json({ nextNodes: [] });
    }

    // Get all node IDs from all enrolled maps
    const allNodeIds: string[] = [];
    enrollmentData.forEach((enrollment: any) => {
      const nodes = enrollment.learning_maps?.map_nodes || [];
      nodes.forEach((node: any) => {
        if (node && node.id) {
          allNodeIds.push(node.id);
        }
      });
    });

    // Get progress for all nodes
    const { data: progressData } = await supabase
      .from("student_node_progress")
      .select("node_id, status")
      .eq("user_id", user.id)
      .in("node_id", allNodeIds);

    // Create progress lookup
    const progressByNodeId: Record<string, string> = {};
    (progressData || []).forEach(
      (progress: { node_id: string; status: string }) => {
        progressByNodeId[progress.node_id] = progress.status;
      }
    );

    // Helper function to check if node is unlocked
    const isNodeUnlocked = (node: any, nodes: any[]): boolean => {
      // Text nodes are not learning nodes
      if (node.node_type === "text" || node.node_type === "comment") {
        return false;
      }

      // Get prerequisites (nodes that have paths pointing to this node)
      const prerequisites = nodes.filter((n: any) =>
        n.node_paths_source?.some(
          (path: any) => path.destination_node_id === node.id
        )
      );

      // If no prerequisites, it's a starting node (unlocked)
      if (prerequisites.length === 0) return true;

      // Check if all prerequisites are passed or submitted
      return prerequisites.every((prereq: any) => {
        const status = progressByNodeId[prereq.id];
        return status === "passed" || status === "submitted";
      });
    };

    // Collect next nodes from all maps
    const nextNodes: Array<{
      node: MapNode;
      map: { id: string; title: string; category: string };
      status: string;
    }> = [];

    enrollmentData.forEach((enrollment: any) => {
      const map = enrollment.learning_maps;
      if (!map || !map.map_nodes) return;

      const nodes = map.map_nodes;

      // Find unlocked nodes that are not completed
      nodes.forEach((node: any) => {
        const status = progressByNodeId[node.id] || "not_started";
        const isCompleted = status === "passed" || status === "submitted";

        // Skip text/comment nodes and completed nodes
        if (
          node.node_type === "text" ||
          node.node_type === "comment" ||
          isCompleted
        ) {
          return;
        }

        // Check if node is unlocked
        if (isNodeUnlocked(node, nodes)) {
          nextNodes.push({
            node: {
              id: node.id,
              map_id: map.id,
              title: node.title,
              instructions: node.instructions,
              difficulty: node.difficulty,
              sprite_url: node.sprite_url,
              metadata: node.metadata,
              node_type: node.node_type,
              created_at: node.created_at,
              updated_at: node.updated_at,
            },
            map: {
              id: map.id,
              title: map.title,
              category: map.category,
            },
            status,
          });
        }
      });
    });

    // Sort by status priority (in_progress first, then not_started)
    // and limit to 5 nodes
    nextNodes.sort((a, b) => {
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (a.status !== "in_progress" && b.status === "in_progress") return 1;
      return 0;
    });

    return NextResponse.json({ nextNodes: nextNodes.slice(0, 5) });
  } catch (error) {
    console.error("Error fetching next nodes:", error);
    return NextResponse.json(
      { error: "Failed to fetch next nodes", details: String(error) },
      { status: 500 }
    );
  }
}
