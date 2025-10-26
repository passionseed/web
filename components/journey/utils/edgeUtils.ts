/**
 * Edge utility functions for calculating dynamic floating edge positions
 * Based on ReactFlow floating edges example
 */

import { Position, Node } from "@xyflow/react";

/**
 * Returns the intersection point of the line between the center of the
 * intersectionNode and the target node
 */
function getNodeIntersection(intersectionNode: Node, targetNode: Node) {
  // https://math.stackexchange.com/questions/1724792/an-algorithm-for-finding-the-intersection-point-between-a-center-of-vision-and-a
  const { width: intersectionNodeWidth, height: intersectionNodeHeight } =
    intersectionNode.measured!;
  const intersectionNodePosition = intersectionNode.position;
  const targetPosition = targetNode.position;

  // ensure all necessary properties are present
  if (
    !intersectionNodeWidth ||
    !intersectionNodeHeight ||
    !intersectionNodePosition ||
    !targetPosition
  ) {
    return { x: 0, y: 0 };
  }

  const w = intersectionNodeWidth / 2;
  const h = intersectionNodeHeight / 2;

  const x2 = intersectionNodePosition.x + w;
  const y2 = intersectionNodePosition.y + h;
  const x1 = targetPosition.x + targetNode.measured!.width! / 2;
  const y1 = targetPosition.y + targetNode.measured!.height! / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

/**
 * Returns the position (top, right, bottom or left) of the passed node
 * compared to the intersection point
 */
function getEdgePosition(
  node: Node,
  intersectionPoint: { x: number; y: number }
) {
  if (!node.position || !node.measured) {
    return Position.Top;
  }

  const n = { ...node.position, ...node.measured };
  const nx = Math.round(n.x);
  const ny = Math.round(n.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (!n.width || !n.height) {
    return Position.Top;
  }

  if (px <= nx + 1) {
    return Position.Left;
  }
  if (px >= nx + n.width - 1) {
    return Position.Right;
  }
  if (py <= ny + 1) {
    return Position.Top;
  }
  if (py >= ny + n.height - 1) {
    return Position.Bottom;
  }

  return Position.Top;
}

/**
 * Returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) you need to create an edge
 */
export function getEdgeParams(source: Node, target: Node) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}
