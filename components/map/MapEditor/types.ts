import { MapNode } from "@/types/map";
import { Node, Edge } from "@xyflow/react";

// Extended MapNode with node_type for text nodes
export interface ExtendedMapNode extends MapNode {
  node_type?: "learning" | "text";
  [key: string]: any; // Add index signature for React Flow compatibility
}

export type AppNode = Node<ExtendedMapNode, "default" | "text">;
export type AppEdge = Edge;
