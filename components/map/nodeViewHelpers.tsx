// app/components/NodeViewPanel/nodeViewHelpers.ts
import { NodeContent } from "@/types/map";
import { ImageIcon } from "lucide-react";
import { Button } from "../ui/button";

// Move renderContent here if it's not made a component
export const renderContent = (content: NodeContent) => {
  switch (content.content_type) {
    case "video":
      const videoUrl = content.content_url?.includes("embed")
        ? content.content_url
        : content.content_url?.replace("watch?v=", "embed/");
      return (
        <div className="aspect-video">
          <iframe
            className="w-full h-full rounded-lg"
            src={videoUrl}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      );
    case "text_with_images":
      return (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: content.content_body || "" }}
        />
      );
    case "canva_slide":
      return (
        <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center text-center p-4">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Canva Presentation</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This content is best viewed in Canva.
          </p>
          <a
            href={content.content_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button>View Canva Slide</Button>
          </a>
        </div>
      );
    default:
      return <p className="text-muted-foreground">Unsupported content type.</p>;
  }
};

// renderQuizQuestion could also be moved here if preferred, or kept in AssessmentSection
