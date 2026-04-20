import { ExpertQueueClient } from "./ExpertQueueClient";

export const dynamic = "force-dynamic";

export default function AdminExpertsPage() {
  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-2xl font-semibold">Expert Submissions</h2>
        <p className="text-sm text-muted-foreground">
          Review and approve expert career interviews to generate PathLabs.
        </p>
      </div>
      <ExpertQueueClient />
    </div>
  );
}
