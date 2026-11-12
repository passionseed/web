/**
 * ffprobe parsing and ffmpeg argument builders for `radar:clip` (spec 2.5,
 * 3.6, 7.2). Pure, so the encoding settings are tested without ffmpeg.
 */
import { createHash } from "node:crypto";

export interface ProbeInfo {
  duration: number;
  width: number;
  height: number;
  /** Degrees from the display matrix or rotate tag (iPhone footage is often 90 or -90). */
  rotation: number;
  colorTransfer: string | null;
  colorPrimaries: string | null;
  hasAudio: boolean;
}

interface FfprobeStream {
  codec_type?: string;
  width?: number;
  height?: number;
  color_transfer?: string;
  color_primaries?: string;
  tags?: Record<string, string>;
  side_data_list?: Array<{ rotation?: number }>;
  duration?: string;
}

export const PROBE_ARGS = ["-v", "error", "-print_format", "json", "-show_format", "-show_streams"];

export function parseProbe(json: string): ProbeInfo {
  const data = JSON.parse(json) as { streams?: FfprobeStream[]; format?: { duration?: string } };
  const streams = data.streams ?? [];
  const video = streams.find((s) => s.codec_type === "video");
  if (!video) throw new Error("No video stream in the input.");
  const sideRotation = video.side_data_list?.find((d) => typeof d.rotation === "number")?.rotation;
  const tagRotation = video.tags?.rotate ? Number(video.tags.rotate) : undefined;
  const duration = Number(data.format?.duration ?? video.duration ?? NaN);
  return {
    duration: Number.isFinite(duration) ? duration : 0,
    width: video.width ?? 0,
    height: video.height ?? 0,
    rotation: Number(sideRotation ?? tagRotation ?? 0) || 0,
    colorTransfer: video.color_transfer ?? null,
    colorPrimaries: video.color_primaries ?? null,
    hasAudio: streams.some((s) => s.codec_type === "audio"),
  };
}

/** iPhone HDR is HLG (arib-std-b67); PQ (smpte2084) gets the same treatment. */
export function isHdr(probe: Pick<ProbeInfo, "colorTransfer">): boolean {
  return probe.colorTransfer === "arib-std-b67" || probe.colorTransfer === "smpte2084";
}

/** HDR to SDR BT.709 through zscale + tonemap (hable keeps skin tones natural). */
export const TONEMAP_FILTER =
  "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p";

/** Fills a 9:16 frame of width x height: scale to cover, centre crop. */
export function verticalFilter(width: number, height: number): string {
  return `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height},setsar=1`;
}

export function videoFilterChain(probe: ProbeInfo, width: number, height: number): string {
  return [isHdr(probe) ? TONEMAP_FILTER : null, verticalFilter(width, height), "format=yuv420p"]
    .filter(Boolean)
    .join(",");
}

/** EBU R128 for social and web: -16 LUFS, -1.5 dBTP. */
export const LOUDNORM = "loudnorm=I=-16:TP=-1.5:LRA=11";

/** The clean 1080x1920 master for the Dusk City edit. No captions are burned in. */
export function masterArgs(input: string, output: string, probe: ProbeInfo): string[] {
  return [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", input,
    "-vf", videoFilterChain(probe, 1080, 1920),
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    ...(probe.hasAudio ? ["-af", LOUDNORM, "-c:a", "aac", "-b:a", "256k", "-ar", "48000"] : ["-an"]),
    "-movflags", "+faststart",
    output,
  ];
}

/** The web clip (spec 2.5): 540x960, about 1.2 Mbps H.264, AAC, faststart. Made from the master. */
export function webClipArgs(master: string, output: string, hasAudio: boolean): string[] {
  return [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", master,
    "-vf", `${verticalFilter(540, 960)},format=yuv420p`,
    "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-level", "4.0",
    "-b:v", "1200k", "-maxrate", "1500k", "-bufsize", "2400k",
    "-g", "60", "-keyint_min", "30",
    ...(hasAudio ? ["-c:a", "aac", "-b:a", "96k", "-ac", "2", "-ar", "48000"] : ["-an"]),
    "-movflags", "+faststart",
    output,
  ];
}

export const POSTER_MAX_BYTES = 60 * 1024;
export const POSTER_QUALITIES = [80, 70, 60, 50, 40, 30];

/** One webp frame at `at` seconds, 540x960. */
export function posterArgs(master: string, output: string, at: number, quality: number): string[] {
  return [
    "-y", "-hide_banner", "-loglevel", "error",
    "-ss", at.toFixed(2), "-i", master,
    "-frames:v", "1",
    "-vf", verticalFilter(540, 960),
    "-c:v", "libwebp", "-quality", String(quality), "-compression_level", "6",
    output,
  ];
}

/** A poster frame just after the first blink (0.6s in), or the middle of a very short clip. */
export function posterTime(duration: number): number {
  return Math.min(0.6, Math.max(0, duration / 2));
}

/** 16 kHz mono WAV for whisper-cli. */
export function whisperWavArgs(input: string, output: string): string[] {
  return ["-y", "-hide_banner", "-loglevel", "error", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", output];
}

/** whisper-cli: Thai, VTT out to `<outBase>.vtt`. */
export function whisperArgs(model: string, wav: string, outBase: string): string[] {
  return ["-m", model, "-l", "th", "-ovtt", "-of", outBase, "-f", wav];
}

/** First 8 hex chars of the SHA-256: the content hash in CDN keys. */
export function sha8(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex").slice(0, 8);
}

export const CDN_ORIGIN = "https://cdn.passionseed.org";

/** `radar/guide/<slug>/<chapter_key>.<sha8>.<ext>` (spec 3.6). */
export function guideMediaKey(slug: string, chapterKey: string, hash: string, ext: "mp4" | "webp"): string {
  return `radar/guide/${slug}/${chapterKey}.${hash}.${ext}`;
}

/** `radar/art/<slug>/<scene>.<sha8>.png` (spec 3.6). */
export function artKey(slug: string, scene: string, hash: string): string {
  return `radar/art/${slug}/${scene}.${hash}.png`;
}

export function cdnUrl(key: string): string {
  return `${CDN_ORIGIN}/${key}`;
}

export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
