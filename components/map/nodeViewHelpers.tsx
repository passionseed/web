// app/components/NodeViewPanel/nodeViewHelpers.ts
import { NodeContent } from "@/types/map";
import { ImageIcon, PlayCircle, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import Embed, { defaultProviders } from "react-tiny-oembed";

// Custom fallback components for better UX
const LoadingFallback = ({ url }: { url: string }) => (
  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex flex-col items-center justify-center text-center p-6 animate-pulse">
    <PlayCircle className="h-12 w-12 text-slate-400 mb-4" />
    <h3 className="font-semibold text-slate-600 mb-2">Loading content...</h3>
    <p className="text-sm text-slate-500">Preparing your media for viewing</p>
  </div>
);

const ErrorFallback = ({ url }: { url: string }) => (
  <div className="aspect-video bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg flex flex-col items-center justify-center text-center p-6">
    <ExternalLink className="h-12 w-12 text-red-400 mb-4" />
    <h3 className="font-semibold text-red-700 mb-2">Content unavailable</h3>
    <p className="text-sm text-red-600 mb-4">
      Unable to embed this content directly
    </p>
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center"
    >
      <Button
        variant="outline"
        size="sm"
        className="border-red-300 hover:bg-red-50"
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        Open in new tab
      </Button>
    </a>
  </div>
);

// Custom image component for better styling
const CustomImageComponent = ({ responce }: { responce?: any }) => {
  if (!responce?.url) return null;

  return (
    <div className="relative overflow-hidden rounded-lg shadow-lg bg-white">
      <img
        src={responce.url}
        alt={responce.title || responce.author_name || "Embedded content"}
        className="w-full h-auto object-cover"
        style={{ maxHeight: "400px" }}
      />
      {responce.provider_name && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <p className="text-white text-sm font-medium">
            From {responce.provider_name}
          </p>
          {responce.title && (
            <p className="text-white/90 text-xs mt-1">{responce.title}</p>
          )}
        </div>
      )}
    </div>
  );
};

// Move renderContent here if it's not made a component
export const renderContent = (content: NodeContent) => {
  const contentUrl = content.content_url;

  switch (content.content_type) {
    case "video":
      // Use React Tiny Oembed for video content - supports YouTube, Vimeo, etc.
      if (!contentUrl) {
        return <ErrorFallback url="#" />;
      }

      return (
        <div className="w-full">
          <Embed
            url={contentUrl}
            options={{
              maxwidth: 800,
              maxheight: 450,
              align: "center",
            }}
            style={{
              width: "100%",
              maxWidth: "100%",
              borderRadius: "8px",
              overflow: "hidden",
            }}
            LoadingFallbackElement={<LoadingFallback url={contentUrl} />}
            FallbackElement={<ErrorFallback url={contentUrl} />}
            ImgComponent={CustomImageComponent}
          />
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
      if (!contentUrl) {
        return <ErrorFallback url="#" />;
      }

      const isValidCanvaUrl = contentUrl.includes("canva.com/design/");

      if (!isValidCanvaUrl) {
        return (
          <div className="aspect-video bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg flex flex-col items-center justify-center text-center p-6">
            <ImageIcon className="h-12 w-12 text-orange-400 mb-4" />
            <h3 className="font-semibold text-orange-700 mb-2">
              Invalid Canva URL
            </h3>
            <p className="text-sm text-orange-600 mb-4">
              Please provide a valid Canva design URL
            </p>
            <a href={contentUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="sm"
                className="border-orange-300 hover:bg-orange-50"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Check Link
              </Button>
            </a>
          </div>
        );
      }

      // Custom fallback for Canva that uses iframe embedding
      const CanvaFallback = ({ url }: { url: string }) => (
        <div
          className="relative w-full overflow-hidden rounded-lg shadow-lg"
          style={{
            height: 0,
            paddingTop: "56.25%", // 16:9 aspect ratio
            boxShadow: "0 2px 8px 0 rgba(63,69,81,0.16)",
            marginTop: "0.5em",
            marginBottom: "0.5em",
          }}
        >
          <iframe
            loading="lazy"
            className="absolute top-0 left-0 w-full h-full border-none"
            style={{ padding: 0, margin: 0 }}
            src={url}
            allowFullScreen
            allow="fullscreen"
            title="Canva Presentation"
          />
        </div>
      );

      // Try oembed first, fallback to direct iframe
      return (
        <div className="w-full">
          <Embed
            url={contentUrl + "?embed"}
            options={{
              maxwidth: 800,
              maxheight: 450,
              align: "center",
            }}
            style={{
              width: "100%",
              maxWidth: "100%",
              borderRadius: "8px",
              overflow: "hidden",
            }}
            providers={[
              {
                provider_name: "Canva",
                provider_url: "https://www.canva.com",
                endpoints: [
                  {
                    schemes: [
                      ...defaultProviders,
                      "https://www.canva.com/design/*/view",
                    ],
                    url: "https://www.canva.com/_oembed",
                    discovery: true,
                  },
                ],
              },
            ]}
            LoadingFallbackElement={
              <LoadingFallback url={contentUrl + "?embed"} />
            }
            FallbackElement={<CanvaFallback url={contentUrl + "?embed"} />}
            ImgComponent={CustomImageComponent}
          />
        </div>
      );

    case "resource_link":
      if (!contentUrl) {
        return <ErrorFallback url="#" />;
      }

      return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
              <ExternalLink className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                📚 Resource Link
              </h3>
              {content.content_body && (
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-4 leading-relaxed">
                  {content.content_body}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center"
                >
                  <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Resource
                  </Button>
                </a>
                <div className="text-xs text-blue-600 dark:text-blue-300 font-mono bg-blue-100 dark:bg-blue-900/50 px-3 py-2 rounded border border-blue-200 dark:border-blue-700 truncate">
                  {contentUrl}
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex flex-col items-center justify-center text-center p-6">
          <ImageIcon className="h-12 w-12 text-slate-400 mb-4" />
          <p className="text-slate-600 font-medium">Unsupported content type</p>
          <p className="text-sm text-slate-500 mt-2">
            Content type: {content.content_type}
          </p>
        </div>
      );
  }
};

// renderQuizQuestion could also be moved here if preferred, or kept in AssessmentSection
