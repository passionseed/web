// app/components/NodeViewPanel/NoNodeSelectedView.tsx
import { MapPin } from "lucide-react";

export function NoNodeSelectedView() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-muted/5">
      <div className="space-y-6 max-w-sm">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
          <MapPin className="h-10 w-10 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-3">
            Explore Your Learning Journey
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Select any node on the map to view its content, track your progress,
            and complete assessments. Your adventure awaits!
          </p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 Tip: Click on any unlocked node to get started</p>
          <p>🔒 Locked nodes require completing prerequisites first</p>
        </div>
      </div>
    </div>
  );
}
