// app/components/NodeViewPanel/NoNodeSelectedView.tsx
import { Trophy } from "lucide-react";

export function NoNodeSelectedView() {
  return (
    <div className="p-6 h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground space-y-4">
        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
          <Trophy className="h-8 w-8" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-2">Select a Node</h3>
          <p className="text-sm">
            Click on any node in the map to view its content and start learning.
          </p>
        </div>
      </div>
    </div>
  );
}
