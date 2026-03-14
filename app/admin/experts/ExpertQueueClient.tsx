"use client";

import { useState } from "react";
import { ExpertQueue } from "@/components/admin/ExpertQueue";
import { ExpertDetail } from "@/components/admin/ExpertDetail";

export function ExpertQueueClient() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (selectedId) {
    return (
      <ExpertDetail
        expertId={selectedId}
        onBack={() => setSelectedId(null)}
        onActionComplete={() => {
          setRefreshKey((k) => k + 1);
          setSelectedId(null);
        }}
      />
    );
  }

  return <ExpertQueue key={refreshKey} onSelectExpert={setSelectedId} />;
}
