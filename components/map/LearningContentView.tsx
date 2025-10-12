// app/components/NodeViewPanel/LearningContentView.tsx
import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { NodeContent } from "@/types/map";
import { renderContent } from "./nodeViewHelpers";
import { Badge } from "@/components/ui/badge";

interface LearningContentViewProps {
  nodeContent: NodeContent[];
}

// Memoized component to prevent unnecessary re-renders
const LearningContentView = memo(({ nodeContent }: LearningContentViewProps) => {
  console.log("📚 LearningContentView rendering with", nodeContent.length, "content items");
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
});

LearningContentView.displayName = "LearningContentView";

// Custom equality check to prevent re-renders when content hasn't actually changed
const areEqual = (prevProps: LearningContentViewProps, nextProps: LearningContentViewProps) => {
  // Quick length check first
  if (prevProps.nodeContent.length !== nextProps.nodeContent.length) {
    console.log("🔄 LearningContentView: Content length changed:", prevProps.nodeContent.length, "->", nextProps.nodeContent.length);
    return false;
  }
  
  // Deep comparison of content IDs and essential fields that affect rendering
  for (let i = 0; i < prevProps.nodeContent.length; i++) {
    const prev = prevProps.nodeContent[i];
    const next = nextProps.nodeContent[i];

    if (
      prev.id !== next.id ||
      prev.content_type !== next.content_type ||
      prev.content_title !== next.content_title ||
      prev.content_url !== next.content_url ||
      prev.content_body !== next.content_body
    ) {
      console.log("🔄 LearningContentView: Content changed at index", i, ":", {
        prevId: prev.id,
        nextId: next.id,
        prevType: prev.content_type,
        nextType: next.content_type,
        prevTitle: prev.content_title,
        nextTitle: next.content_title,
        prevUrl: prev.content_url?.substring(0, 50),
        nextUrl: next.content_url?.substring(0, 50)
      });
      return false;
    }
  }
  
  console.log("✅ LearningContentView: Content unchanged, skipping re-render");
  return true;
};

// Export with custom comparison to prevent unnecessary re-renders
export { LearningContentView };
export default memo(LearningContentView, areEqual);
