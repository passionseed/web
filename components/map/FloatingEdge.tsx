import { useCallback } from "react";
import { useStore, getBezierPath, EdgeProps, Node } from "@xyflow/react";

import { getEdgeParams } from "./utils";

function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  edit,
}: EdgeProps & { edit?: boolean }) {
  const sourceNode = useStore(
    useCallback((store) => store.nodeLookup.get(source), [source])
  );
  const targetNode = useStore(
    useCallback((store) => store.nodeLookup.get(target), [target])
  );

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={edit ? markerEnd : undefined}
      style={{
        ...style,
        transition: edit ? "none" : "stroke-dashoffset 150ms ease-in-out",
        width: edit ? "2px" : "20px",
      }}
    />
  );
}

export default FloatingEdge;

export const FloatingEdgeEdit = (props: EdgeProps) => (
  <FloatingEdge {...props} edit={true} />
);
