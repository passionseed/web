"use client";

import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DebugButtonProps {
  data: any;
}

export function DebugButton({ data }: DebugButtonProps) {
  const handleDebugClick = () => {
    console.log("=== PathLab Builder Debug Info ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Data:", JSON.stringify(data, null, 2));
    console.log("==================================");

    // Also show in alert for immediate user feedback
    alert(
      "Debug info logged to console!\n\n" +
      `Seed ID: ${data.seedId}\n` +
      `Path ID: ${data.pathId}\n` +
      `Pages: ${data.pagesCount}\n` +
      `Feature Flag: ${data.featureFlag ? "NEW" : "LEGACY"}`
    );
  };

  return (
    <Button
      onClick={handleDebugClick}
      variant="outline"
      size="sm"
      className="border-blue-700 text-blue-300 hover:bg-blue-950/50"
    >
      <Bug className="h-4 w-4 mr-2" />
      Debug
    </Button>
  );
}
