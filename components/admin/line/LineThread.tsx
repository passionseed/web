import { AlertCircle, FileText, MapPin, Music, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LineMessage } from "@/lib/supabase/line-oa";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function contentUrl(message: LineMessage): string | null {
  const provider = message.payload.contentProvider as Record<string, unknown> | undefined;
  if (provider?.type === "external") {
    return str(provider.originalContentUrl) ?? str(provider.previewImageUrl);
  }
  return message.line_message_id ? `/api/admin/line/content/${message.line_message_id}` : null;
}

function MediaLink({ href, icon: Icon, label }: { href: string | null; icon: typeof FileText; label: string }) {
  if (!href) return <span className="italic opacity-70">{label}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline">
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}

function MessageBody({ message }: { message: LineMessage }) {
  switch (message.message_type) {
    case "text":
      return <p className="whitespace-pre-wrap break-words">{message.text}</p>;
    case "sticker": {
      const stickerId = str(message.payload.stickerId);
      if (!stickerId) return <span className="italic opacity-70">Sticker</span>;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png`}
          alt={str(message.payload.text) ?? "Sticker"}
          className="h-24 w-24 object-contain"
        />
      );
    }
    case "image": {
      const url = contentUrl(message);
      if (!url) return <span className="italic opacity-70">Photo</span>;
      return (
        <a href={url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Photo from LINE" className="max-h-64 rounded-md" />
        </a>
      );
    }
    case "video":
      return <MediaLink href={contentUrl(message)} icon={Film} label="Video" />;
    case "audio":
      return <MediaLink href={contentUrl(message)} icon={Music} label="Voice message" />;
    case "file":
      return <MediaLink href={contentUrl(message)} icon={FileText} label={message.text ?? "File"} />;
    case "location": {
      const lat = message.payload.latitude;
      const lng = message.payload.longitude;
      const href =
        typeof lat === "number" && typeof lng === "number"
          ? `https://www.google.com/maps?q=${lat},${lng}`
          : null;
      return <MediaLink href={href} icon={MapPin} label={message.text ?? "Location"} />;
    }
    default:
      return <span className="italic opacity-70">{message.message_type} message</span>;
  }
}

function SystemLine({ message }: { message: LineMessage }) {
  return (
    <p className="py-1 text-center text-[11px] text-muted-foreground">
      {message.message_type === "follow" ? "Added PassionSeed as a friend" : "Blocked or unfollowed"}
      {" · "}
      {formatTime(message.sent_at)}
    </p>
  );
}

function bubbleClass(message: LineMessage): string {
  const base = "inline-block rounded-2xl px-3 py-2 text-left text-sm";
  if (message.send_status === "failed") {
    return cn(base, "bg-destructive/10 text-foreground ring-1 ring-destructive");
  }
  if (message.message_type === "sticker") return cn(base, "bg-transparent p-0");
  if (message.direction === "outbound") return cn(base, "bg-emerald-600 text-white");
  return cn(base, "bg-muted");
}

export function LineThread({ messages }: { messages: LineMessage[] }) {
  if (messages.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground">No messages yet.</p>;
  }

  return (
    // column-reverse keeps the newest message in view without client-side scrolling.
    <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto px-4 py-3">
      <div className="space-y-2">
        {messages.map((message) => {
          if (message.message_type === "follow" || message.message_type === "unfollow") {
            return <SystemLine key={message.id} message={message} />;
          }
          const outbound = message.direction === "outbound";
          const failed = message.send_status === "failed";
          return (
            <div key={message.id} className={cn("flex", outbound ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] space-y-1", outbound && "text-right")}>
                <div className={bubbleClass(message)}>
                  <MessageBody message={message} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {formatTime(message.sent_at)}
                  {outbound && message.send_method === "push" && " · push"}
                </p>
                {failed && (
                  <p className="inline-flex items-center gap-1 text-[11px] text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    Not delivered: {message.error ?? "unknown error"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
