import { IslandShell } from "@/components/shift/island/IslandShell";
import { IslandSkeleton } from "@/components/shift/island/IslandSkeleton";

/** The full-screen island's frame while the server reads the student's island. */
export default function Loading() {
  return (
    <IslandShell immersive>
      <IslandSkeleton />
    </IslandShell>
  );
}
