// app/components/NodeViewPanel/NoNodeSelectedView.tsx
import { MapIcon } from "lucide-react";

export function NoNodeSelectedView() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
          <MapIcon className="h-10 w-10 text-gray-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-600">Select a Node</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Click on any node in the map to view its content, track your
            progress, and begin your learning journey.
          </p>
        </div>
      </div>
    </div>
  );
}
