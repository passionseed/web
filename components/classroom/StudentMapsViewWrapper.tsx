"use client";

import dynamic from "next/dynamic";
import StudentMapsView from "./StudentMapsView";

// Simple wrapper that directly renders the client component. Kept as a file
// so it can be swapped to dynamic import later if needed.
export default function StudentMapsViewWrapper({
  classroomId,
}: {
  classroomId: string;
}) {
  return <StudentMapsView classroomId={classroomId} />;
}
