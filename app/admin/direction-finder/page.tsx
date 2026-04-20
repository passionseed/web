import { AdminDirectionFinder } from "@/components/admin/AdminDirectionFinder";

export const dynamic = "force-dynamic";

export default function AdminDirectionFinderPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold">Direction Finder</h2>
      <p className="text-sm text-muted-foreground">
        Review AI guidance sessions and generated results.
      </p>
      <AdminDirectionFinder />
    </div>
  );
}
