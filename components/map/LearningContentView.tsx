// app/components/NodeViewPanel/LearningContentView.tsx
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { NodeContent } from "@/types/map";
import { renderContent } from "./nodeViewHelpers"; // Assuming helpers are moved
import { Badge } from "@/components/ui/badge";

interface LearningContentViewProps {
  nodeContent: NodeContent[];
}

export function LearningContentView({ nodeContent }: LearningContentViewProps) {
  return (
    <>
      {nodeContent?.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Learning Materials
            </h3>
            <Badge variant="outline" className="text-xs">
              {nodeContent.length} item{nodeContent.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          {nodeContent.map((content) => (
            <Card key={content.id} className="shadow-sm">
              <CardContent className="p-4">
                {renderContent(content)} {/* Moved to helpers */}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              No learning content available yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Content will be added soon.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
