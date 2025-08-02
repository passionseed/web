import { FloatingEdgeEdit } from "../FloatingEdge";

export const EDGE_TYPES = {
  floating: FloatingEdgeEdit,
};

export const EDGE_STYLE = {
  stroke: "#83460d",
  strokeWidth: 2,
};

export const NODE_STYLE = {
  backgroundColor: "#ffffff00",
  border: "2px solid #cccccc00",
  flexGrow: 1,
  aspectRatio: "1 / 1",
} as const;

export const MINIMAP_CONFIG = {
  position: "bottom-right" as const,
  nodeBorderRadius: 8,
  nodeStrokeWidth: 2,
  nodeColor: (node: any) => {
    switch (node.type) {
      case "input":
        return "#4CAF50";
      case "output":
        return "#9C27B0";
      default:
        return "#FF9800";
    }
  },
  style: {
    transform: "scale(0.6)",
    transformOrigin: "bottom right",
  },
  nodeStrokeColor: "#ffffff",
  bgColor: "#1e1e1e",
  maskColor: "rgba(255, 255, 255, 0.15)",
  maskStrokeColor: "#ffffff",
  maskStrokeWidth: 1,
  pannable: true,
  zoomable: true,
  ariaLabel: "Flow overview minimap",
  offsetScale: 5,
};
