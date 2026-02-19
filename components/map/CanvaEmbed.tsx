"use client";

import { memo, useMemo } from "react";
import { ExternalLink, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvaEmbedProps {
  contentUrl: string;
}

export const CanvaEmbed = memo(({ contentUrl }: CanvaEmbedProps) => {
  const isValidCanvaUrl = useMemo(
    () => contentUrl.includes("canva.com/design/"),
    [contentUrl],
  );

  const embedUrl = useMemo(
    () => (contentUrl.includes("?") ? contentUrl : `${contentUrl}?embed`),
    [contentUrl],
  );

  if (!isValidCanvaUrl) {
    return (
      <div className="aspect-video bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg flex flex-col items-center justify-center text-center p-6">
        <ImageIcon className="h-12 w-12 text-orange-400 mb-4" />
        <h3 className="font-semibold text-orange-700 mb-2">Invalid Canva URL</h3>
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
    <div
      className="relative w-full overflow-hidden rounded-lg shadow-lg"
      style={{
        height: 0,
        paddingTop: "56.25%",
        boxShadow: "0 2px 8px 0 rgba(63,69,81,0.16)",
        marginTop: "0.5em",
        marginBottom: "0.5em",
      }}
    >
      <iframe
        loading="lazy"
        className="absolute top-0 left-0 w-full h-full border-none"
        style={{ padding: 0, margin: 0 }}
        src={embedUrl}
        allowFullScreen
        allow="fullscreen"
        title="Canva Presentation"
      />
    </div>
  );
});

CanvaEmbed.displayName = "CanvaEmbed";
