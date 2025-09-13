// app/components/NodeViewPanel/nodeViewHelpers.ts
import { memo, useMemo } from "react";
import { NodeContent } from "@/types/map";
import { ImageIcon, PlayCircle, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import Embed, { defaultProviders } from "react-tiny-oembed";
import { CanvaEmbed } from "./CanvaEmbed";

// Custom fallback components for better UX - memoized to prevent unnecessary re-renders
const LoadingFallback = memo(({ url }: { url: string }) => (
  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex flex-col items-center justify-center text-center p-6 animate-pulse">
    <PlayCircle className="h-12 w-12 text-slate-400 mb-4" />
    <h3 className="font-semibold text-slate-600 mb-2">Loading content...</h3>
    <p className="text-sm text-slate-500">Preparing your media for viewing</p>
  </div>
));
LoadingFallback.displayName = "LoadingFallback";

const ErrorFallback = memo(({ url }: { url: string }) => (
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
));
ErrorFallback.displayName = "ErrorFallback";

// Custom image component for better styling - memoized
const CustomImageComponent = memo(({ responce }: { responce?: any }) => {
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
});
CustomImageComponent.displayName = "CustomImageComponent";

// Video Embed Component - memoized to prevent re-renders
const VideoEmbed = memo(({ contentUrl }: { contentUrl: string }) => {
  console.log("🎥 VideoEmbed rendering for URL:", contentUrl);
  
  const embedOptions = useMemo(() => ({
    maxwidth: 800,
    maxheight: 450,
    align: "center" as const,
  }), []);

  const embedStyle = useMemo(() => ({
    width: "100%",
    maxWidth: "100%",
    borderRadius: "8px",
    overflow: "hidden",
  }), []);

  const embedKey = useMemo(() => {
    return `video-${contentUrl.split('/').pop()?.split('?')[0] || 'embed'}`;
  }, [contentUrl]);

  return (
    <div className="w-full" key={embedKey}>
      <Embed
        url={contentUrl}
        options={embedOptions}
        style={embedStyle}
        LoadingFallbackElement={<LoadingFallback url={contentUrl} />}
        FallbackElement={<ErrorFallback url={contentUrl} />}
        ImgComponent={CustomImageComponent}
      />
    </div>
  );
});
VideoEmbed.displayName = "VideoEmbed";

// Image Component - memoized
const ImageContent = memo(({ contentUrl }: { contentUrl: string }) => {
  console.log("🖼️ ImageContent rendering for URL:", contentUrl);
  
  return (
    <div className="w-full">
      <div className="relative rounded-lg shadow-lg bg-white overflow-hidden">
        <img
          src={contentUrl}
          alt="Uploaded image content"
          className="w-full h-auto object-contain"
          style={{ maxWidth: "100%" }}
        />
      </div>
    </div>
  );
});
ImageContent.displayName = "ImageContent";

// Text Content Component - memoized
const TextContent = memo(({ contentBody }: { contentBody: string }) => {
  console.log("📝 TextContent rendering, content length:", contentBody?.length || 0);
  
  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: contentBody || "" }}
    />
  );
});
TextContent.displayName = "TextContent";

// Move renderContent here and optimize it
export const renderContent = (content: NodeContent) => {
  const contentUrl = content.content_url;
  const contentType = content.content_type;
  
  // Create a stable key based on content ID to prevent unnecessary remounts
  const contentKey = `content-${content.id}-${contentType}`;

  // Handle backward compatibility for old content type
  if (contentType === "text_with_images" as any) {
    return (
      <div key={contentKey}>
        <TextContent contentBody={content.content_body || ""} />
      </div>
    );
  }

  switch (contentType) {
    case "video":
      if (!contentUrl) {
        return <ErrorFallback url="#" key={contentKey} />;
      }
      return <VideoEmbed contentUrl={contentUrl} key={contentKey} />;

    case "text":
      return (
        <div key={contentKey}>
          <TextContent contentBody={content.content_body || ""} />
        </div>
      );

    case "image":
      if (!contentUrl) {
        return <ErrorFallback url="#" key={contentKey} />;
      }
      return <ImageContent contentUrl={contentUrl} key={contentKey} />;

    case "pdf":
      if (!contentUrl) {
        return <ErrorFallback url="#" />;
      }

      const fileName = contentUrl.split('/').pop() || 'document.pdf';

      return (
        <div className="w-full space-y-4">
          {/* PDF Viewer with better options */}
          <div className="relative w-full bg-white rounded-lg shadow-lg border border-gray-200">
            {/* Header with controls */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">PDF</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900 block">
                    {fileName}
                  </span>
                  <span className="text-xs text-gray-500">
                    PDF Document
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 border-blue-300 hover:bg-blue-50"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Full Screen
                  </Button>
                </a>
              </div>
            </div>

            {/* Multiple PDF viewing options for better compatibility */}
            <div className="relative w-full">
              {/* Primary PDF viewer using Google Docs viewer */}
              <div className="bg-gray-100 p-2 rounded">
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(contentUrl)}&embedded=true`}
                  className="w-full border-0 rounded"
                  style={{ height: "70vh", minHeight: "500px" }}
                  title={`PDF Viewer - ${fileName}`}
                  allow="fullscreen"
                />
              </div>
              
              {/* Alternative viewing options */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border-t border-gray-200">
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-gray-600 text-center">
                    Choose your preferred viewing method:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Direct browser viewer */}
                    <a
                      href={contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-blue-600 hover:text-blue-700 border-blue-300 hover:bg-blue-50"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Browser Viewer
                      </Button>
                    </a>
                    
                    {/* Direct PDF link with viewer params */}
                    <a
                      href={`${contentUrl}#view=FitH&toolbar=1&navpanes=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-green-600 hover:text-green-700 border-green-300 hover:bg-green-50"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Full Screen
                      </Button>
                    </a>
                    
                    {/* Download option */}
                    <a
                      href={contentUrl}
                      download
                      className="inline-flex items-center justify-center"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-purple-600 hover:text-purple-700 border-purple-300 hover:bg-purple-50"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case "canva_slide":
      if (!contentUrl) {
        return <ErrorFallback url="#" key={contentKey} />;
      }
      return <CanvaEmbed contentUrl={contentUrl} key={contentKey} />;

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
