"use client";

import { memo, useMemo } from "react";
import Embed, { defaultProviders } from "react-tiny-oembed";
import { ExternalLink, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvaEmbedProps {
  contentUrl: string;
}

const LoadingFallback = memo(({ url }: { url: string }) => (
  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex flex-col items-center justify-center text-center p-6 animate-pulse">
    <div className="h-12 w-12 text-slate-400 mb-4 flex items-center justify-center">
      🎨
    </div>
    <h3 className="font-semibold text-slate-600 mb-2">Loading Canva slide...</h3>
    <p className="text-sm text-slate-500">Preparing your presentation for viewing</p>
  </div>
));

LoadingFallback.displayName = "CanvaLoadingFallback";

const ErrorFallback = memo(({ url }: { url: string }) => (
  <div className="aspect-video bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg flex flex-col items-center justify-center text-center p-6">
    <ExternalLink className="h-12 w-12 text-red-400 mb-4" />
    <h3 className="font-semibold text-red-700 mb-2">Canva content unavailable</h3>
    <p className="text-sm text-red-600 mb-4">
      Unable to embed this Canva slide directly
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
        Open in Canva
      </Button>
    </a>
  </div>
));

ErrorFallback.displayName = "CanvaErrorFallback";

const CanvaFallback = memo(({ url }: { url: string }) => (
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
));

CanvaFallback.displayName = "CanvaFallback";

const CustomImageComponent = memo(({ responce }: { responce?: any }) => {
  if (!responce?.url) return null;

  return (
    <div className="relative overflow-hidden rounded-lg shadow-lg bg-white">
      <img
        src={responce.url}
        alt={responce.title || responce.author_name || "Embedded Canva content"}
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

CustomImageComponent.displayName = "CanvaCustomImageComponent";

export const CanvaEmbed = memo(({ contentUrl }: CanvaEmbedProps) => {
  console.log("🎨 CanvaEmbed rendering for URL:", contentUrl);

  const isValidCanvaUrl = useMemo(() => {
    try {
      const url = new URL(contentUrl);
      return (
        url.protocol === "https:" &&
        (url.hostname === "canva.com" || url.hostname === "www.canva.com") &&
        url.pathname.startsWith("/design/")
      );
    } catch {
      return false;
    }
  }, [contentUrl]);

  const embedUrl = useMemo(() => {
    return contentUrl + "?embed";
  }, [contentUrl]);

  const embedKey = useMemo(() => {
    // Create a stable key based on the URL to prevent unnecessary remounts
    return `canva-${contentUrl.split('/').pop()?.split('?')[0] || 'embed'}`;
  }, [contentUrl]);

  const canvaProviders = useMemo(() => [
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
  ], []);

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

  return (
    <div className="w-full" key={embedKey}>
      <Embed
        url={embedUrl}
        options={embedOptions}
        style={embedStyle}
        providers={canvaProviders}
        LoadingFallbackElement={<LoadingFallback url={embedUrl} />}
        FallbackElement={<CanvaFallback url={embedUrl} />}
        ImgComponent={CustomImageComponent}
      />
    </div>
  );
});

CanvaEmbed.displayName = "CanvaEmbed";