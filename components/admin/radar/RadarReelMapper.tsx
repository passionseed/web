"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Pencil, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { adminGuidePages, adminPageLabel, reelPlanTakes } from "@/lib/radar-guide/admin-pages";
import { parseReelInput, type RadarMediaOption } from "@/lib/radar-guide/admin-social";
import { radarShortUrl } from "@/lib/radar-guide/dm-copy";
import type {
  RadarLinkRow,
  RadarReelAngle,
  RadarReelPlatform,
  RadarReelRow,
  RadarVideoKind,
} from "@/lib/radar-guide/types";
import { CopyButton, Field, NativeSelect } from "./RadarAdminFields";

/**
 * A page's reel plan from code (`listGuideReelPlans()` in
 * lib/radar-guides/registry.server.ts, passed in as props).
 */
export interface ReelPlanOption {
  slug: string;
  pageKey: string;
  format: RadarVideoKind;
  hookTh: string;
  variantsTh: readonly string[];
}

export interface FieldOption {
  slug: string;
  name: string;
}

interface ReelForm {
  id: string | null;
  platform: RadarReelPlatform;
  mediaId: string | null;
  shortcode: string | null;
  permalink: string | null;
  postedAt: string | null;
  fieldSlug: string;
  /** Code guide page the DM link opens; "" for the career cover or a deck career. */
  pageKey: string;
  videoKind: RadarVideoKind;
  /** Legacy; kept as loaded, no longer asked for. */
  angle: RadarReelAngle | "";
  isTrial: boolean;
  hookVariant: string;
  careerLabelTh: string;
  dmEnabled: boolean;
  note: string;
}

const HUB = "";

function emptyForm(): ReelForm {
  return {
    id: null,
    platform: "instagram",
    mediaId: null,
    shortcode: null,
    permalink: null,
    postedAt: null,
    fieldSlug: HUB,
    pageKey: "",
    videoKind: "founder",
    angle: "",
    isTrial: false,
    hookVariant: "",
    careerLabelTh: "",
    dmEnabled: true,
    note: "",
  };
}

function formFromReel(reel: RadarReelRow): ReelForm {
  return {
    id: reel.id,
    platform: reel.platform,
    mediaId: reel.media_id,
    shortcode: reel.shortcode,
    permalink: reel.permalink,
    postedAt: reel.posted_at,
    fieldSlug: reel.field_slug ?? HUB,
    pageKey: reel.field_slug ? reel.chapter_key ?? "" : "",
    videoKind: reel.video_kind,
    angle: reel.angle ?? "",
    isTrial: reel.is_trial,
    hookVariant: reel.hook_variant == null ? "" : String(reel.hook_variant),
    careerLabelTh: reel.career_label_th ?? "",
    dmEnabled: reel.dm_enabled,
    note: reel.note ?? "",
  };
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(
    new Date(value)
  );
}

function MediaPicker({
  media,
  mappedIds,
  loading,
  error,
  onReload,
  onPick,
}: {
  media: RadarMediaOption[];
  mappedIds: Set<string>;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onPick: (item: RadarMediaOption) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Recent Instagram posts</p>
        <Button type="button" variant="ghost" size="sm" className="min-h-9" onClick={onReload} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          <span className="ml-1.5">Reload</span>
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">Could not list posts: {error} You can still paste a link.</p> : null}
      <ul className="max-h-[420px] divide-y overflow-y-auto rounded-lg border">
        {media.length === 0 && !loading ? <li className="p-3 text-sm text-muted-foreground">No posts loaded.</li> : null}
        {media.map((item) => {
          const mapped = mappedIds.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-start gap-3 p-2 text-left hover:bg-muted/40 active:bg-muted/40"
                onClick={() => onPick(item)}
              >
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnailUrl} alt="" className="h-16 w-10 shrink-0 rounded object-cover" loading="lazy" />
                ) : (
                  <span className="h-16 w-10 shrink-0 rounded bg-muted" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm">{item.caption?.split("\n")[0] || "(no caption)"}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {formatDate(item.timestamp)}
                    {item.productType ? <span>{item.productType.toLowerCase()}</span> : null}
                    {mapped ? <Badge variant="secondary">mapped</Badge> : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Maps a posted reel to a career and, for a career with a code guide, the page
 * (level) its DM link opens (docs/features/radar-guides-in-code.md 4.2).
 * Saving a career reel on Instagram creates its DM short link.
 */
export function RadarReelMapper({
  reels,
  links,
  fields,
  plans,
}: {
  reels: RadarReelRow[];
  links: RadarLinkRow[];
  fields: FieldOption[];
  plans: ReelPlanOption[];
}) {
  const router = useRouter();
  const [media, setMedia] = useState<RadarMediaOption[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [paste, setPaste] = useState("");
  const [form, setForm] = useState<ReelForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const mappedIds = useMemo(() => new Set(reels.map((reel) => reel.media_id).filter(Boolean) as string[]), [reels]);
  const linkByReel = useMemo(
    () => new Map(links.filter((link) => link.reel_id).map((link) => [link.reel_id as string, link.code])),
    [links]
  );
  const fieldName = useMemo(() => new Map(fields.map((field) => [field.slug, field.name])), [fields]);
  const lastLabel = useMemo(() => {
    const out = new Map<string, string>();
    for (const reel of reels) if (reel.field_slug && reel.career_label_th && !out.has(reel.field_slug)) out.set(reel.field_slug, reel.career_label_th);
    return out;
  }, [reels]);
  const guidePages = useMemo(() => adminGuidePages(form.fieldSlug), [form.fieldSlug]);
  const plan = useMemo(
    () => plans.find((p) => p.slug === form.fieldSlug && p.pageKey === form.pageKey) ?? null,
    [plans, form.fieldSlug, form.pageKey]
  );
  const takes = reelPlanTakes(plan);

  const loadMedia = useCallback(async () => {
    setLoadingMedia(true);
    try {
      const response = await fetch("/api/admin/radar/reels?media=1");
      const result = (await response.json().catch(() => ({}))) as { media?: RadarMediaOption[]; mediaError?: string | null; error?: string };
      setMedia(result.media ?? []);
      setMediaError(response.ok ? result.mediaError ?? null : result.error ?? "Request failed.");
    } catch {
      setMediaError("Network error.");
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  const set = <K extends keyof ReelForm>(key: K, value: ReelForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const startFrom = (base: Partial<ReelForm>) => {
    const existing = reels.find(
      (reel) =>
        (base.mediaId && reel.media_id === base.mediaId) ||
        (base.shortcode && reel.platform === base.platform && reel.shortcode === base.shortcode)
    );
    setForm(existing ? formFromReel(existing) : { ...emptyForm(), ...base });
    setLastLink(existing ? linkByReel.get(existing.id) ?? null : null);
  };

  const onPaste = () => {
    const parsed = parseReelInput(paste);
    if (!parsed) {
      toast.error("Paste an Instagram, TikTok or YouTube link, or an Instagram shortcode.");
      return;
    }
    const listed = parsed.platform === "instagram" ? media.find((item) => item.shortcode === parsed.shortcode) : undefined;
    startFrom({
      platform: parsed.platform,
      shortcode: parsed.shortcode,
      permalink: listed?.permalink ?? parsed.permalink,
      mediaId: listed?.id ?? null,
      postedAt: listed?.timestamp ?? null,
    });
    setPaste("");
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/radar/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(form.id ? { id: form.id } : {}),
          platform: form.platform,
          mediaId: form.mediaId,
          shortcode: form.shortcode,
          permalink: form.permalink,
          fieldSlug: form.fieldSlug || null,
          pageKey: form.fieldSlug && form.pageKey ? form.pageKey : null,
          videoKind: form.videoKind,
          angle: form.angle || null,
          isTrial: form.isTrial,
          hookVariant: form.hookVariant === "" ? null : Number(form.hookVariant),
          careerLabelTh: form.careerLabelTh.trim() || null,
          dmEnabled: form.dmEnabled,
          postedAt: form.postedAt ? new Date(form.postedAt).toISOString() : null,
          note: form.note.trim() || null,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        reel?: { id: string };
        shortUrl?: string | null;
        error?: string;
        issues?: { fieldErrors?: Record<string, string[]> };
      };
      if (!response.ok) {
        const detail = Object.values(result.issues?.fieldErrors ?? {}).flat()[0];
        toast.error(detail ?? result.error ?? "Could not save the reel");
        return;
      }
      setLastLink(result.shortUrl ?? null);
      if (result.reel) setForm((current) => ({ ...current, id: result.reel!.id }));
      toast.success("Reel mapped");
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const needsMediaId = form.platform === "instagram" && !form.mediaId;
  const shortUrl = lastLink ? (lastLink.startsWith("http") ? lastLink : radarShortUrl(lastLink)) : null;

  return (
    <section className="space-y-4" aria-labelledby="radar-reels-heading">
      <div>
        <h2 id="radar-reels-heading" className="text-xl font-semibold">
          Reel mapper
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the post or paste its link, then choose the career and the guide page its DM link opens. TikTok and YouTube
          reels are added by link; they use the typeable alias (for example /r/cyber-money) instead of a DM.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              aria-label="Reel link or shortcode"
              placeholder="instagram.com/reel/... or tiktok.com/@.../video/..."
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onPaste();
              }}
            />
            <Button type="button" variant="outline" className="min-h-10 shrink-0" onClick={onPaste}>
              Use
            </Button>
          </div>
          <MediaPicker
            media={media}
            mappedIds={mappedIds}
            loading={loadingMedia}
            error={mediaError}
            onReload={() => void loadMedia()}
            onPick={(item) =>
              startFrom({
                platform: "instagram",
                mediaId: item.id,
                shortcode: item.shortcode,
                permalink: item.permalink,
                postedAt: item.timestamp,
              })
            }
          />
        </div>

        <form
          className="space-y-4 rounded-lg border p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{form.platform}</Badge>
            {form.permalink ? (
              <a href={form.permalink} target="_blank" rel="noreferrer" className="truncate underline underline-offset-2">
                {form.shortcode ?? form.permalink}
              </a>
            ) : (
              <span className="text-muted-foreground">Pick a post or paste a link</span>
            )}
            {form.id ? <Badge variant="secondary">editing</Badge> : null}
          </div>
          {needsMediaId && form.shortcode ? (
            <p className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
              This post is not in the recent list, so it has no media id yet. Comments on it are only matched once it is
              picked from the list.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="reel-field" label="Career">
              <NativeSelect
                id="reel-field"
                value={form.fieldSlug}
                onChange={(e) => {
                  const slug = e.target.value;
                  setForm((current) => ({
                    ...current,
                    fieldSlug: slug,
                    // Pages belong to one guide: switching careers clears the page.
                    pageKey: "",
                    careerLabelTh: current.careerLabelTh || (slug ? lastLabel.get(slug) ?? "" : ""),
                  }));
                }}
              >
                <option value={HUB}>Hub (all careers)</option>
                {fields.map((field) => (
                  <option key={field.slug} value={field.slug}>
                    {field.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              id="reel-page"
              label="Guide page"
              hint={form.fieldSlug && !guidePages ? "This career has no code guide yet: the link opens its deck." : undefined}
            >
              <NativeSelect
                id="reel-page"
                value={form.pageKey}
                disabled={!guidePages}
                onChange={(e) => {
                  const pageKey = e.target.value;
                  const next = plans.find((p) => p.slug === form.fieldSlug && p.pageKey === pageKey);
                  setForm((current) => ({
                    ...current,
                    pageKey,
                    // A new mapping starts from the page's planned format.
                    videoKind: !current.id && next ? next.format : current.videoKind,
                  }));
                }}
              >
                <option value="">Guide cover (level map)</option>
                {(guidePages ?? []).map((page) => (
                  <option key={page.key} value={page.key}>
                    {page.order}. {page.titleTh}
                  </option>
                ))}
                {form.pageKey && guidePages && !guidePages.some((p) => p.key === form.pageKey) ? (
                  <option value={form.pageKey}>{form.pageKey} (not in the guide)</option>
                ) : null}
              </NativeSelect>
            </Field>
            <Field
              id="reel-label"
              label={form.fieldSlug ? "Short career label (required)" : "Short career label"}
              hint='The DM says "สาย {label}". Keep it short.'
            >
              <Input
                id="reel-label"
                value={form.careerLabelTh}
                maxLength={40}
                placeholder="ไซเบอร์"
                required={Boolean(form.fieldSlug)}
                onChange={(e) => set("careerLabelTh", e.target.value)}
              />
            </Field>
            <Field id="reel-kind" label="Video kind">
              <NativeSelect id="reel-kind" value={form.videoKind} onChange={(e) => set("videoKind", e.target.value as RadarVideoKind)}>
                <option value="founder">founder clip</option>
                <option value="motion">motion</option>
                <option value="demo">demo (filmed from the page)</option>
              </NativeSelect>
            </Field>
            <Field id="reel-variant" label="Hook take">
              <NativeSelect id="reel-variant" value={form.hookVariant} onChange={(e) => set("hookVariant", e.target.value)}>
                <option value="">not set</option>
                {[0, 1, 2].map((i) => (
                  <option key={i} value={String(i)}>
                    {i === 0 ? "Hook" : `Variant ${i}`}
                    {takes[i] ? `: ${takes[i]}` : ""}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="reel-note" label="Note" className="sm:col-span-2">
              <Input id="reel-note" value={form.note} maxLength={200} onChange={(e) => set("note", e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <Switch checked={form.isTrial} onCheckedChange={(checked) => set("isTrial", checked)} />
              Trial Reel
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <Switch checked={form.dmEnabled} onCheckedChange={(checked) => set("dmEnabled", checked)} />
              Send the DM link to commenters
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="min-h-11" disabled={saving || (!form.mediaId && !form.shortcode)}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
              {form.id ? "Save changes" : "Map reel"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => {
                setForm(emptyForm());
                setLastLink(null);
              }}
            >
              Clear
            </Button>
          </div>
          {shortUrl ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-2">
              <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <code className="min-w-0 flex-1 break-all text-sm">{shortUrl}</code>
              <CopyButton text={shortUrl} />
            </div>
          ) : null}
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2 font-medium">Posted</th>
              <th className="p-2 font-medium">Post</th>
              <th className="p-2 font-medium">Career and page</th>
              <th className="p-2 font-medium">Kind</th>
              <th className="p-2 font-medium">DM link</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {reels.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No reels mapped yet.
                </td>
              </tr>
            ) : (
              reels.map((reel) => {
                const code = linkByReel.get(reel.id) ?? (reel.platform === "instagram" && !reel.field_slug ? "hub-ig" : null);
                return (
                  <tr key={reel.id}>
                    <td className="p-2 text-xs text-muted-foreground">{formatDate(reel.posted_at ?? reel.created_at)}</td>
                    <td className="p-2">
                      <span className="mr-1 text-xs text-muted-foreground">{reel.platform}</span>
                      {reel.permalink ? (
                        <a href={reel.permalink} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                          {reel.shortcode ?? "open"}
                        </a>
                      ) : (
                        reel.shortcode ?? reel.media_id
                      )}
                      {!reel.media_id && reel.platform === "instagram" ? (
                        <Badge variant="outline" className="ml-1 text-[10px]">no media id</Badge>
                      ) : null}
                    </td>
                    <td className="p-2">
                      {reel.field_slug ? fieldName.get(reel.field_slug) ?? reel.field_slug : "Hub"}
                      {reel.field_slug && reel.chapter_key ? (
                        <span className="text-muted-foreground"> · {adminPageLabel(reel.field_slug, reel.chapter_key)}</span>
                      ) : null}
                      {reel.career_label_th ? <span className="ml-1 text-xs text-muted-foreground">(สาย {reel.career_label_th})</span> : null}
                    </td>
                    <td className="p-2 text-xs">
                      {reel.video_kind}
                      {reel.is_trial ? <Badge variant="secondary" className="ml-1 text-[10px]">trial</Badge> : null}
                      {!reel.dm_enabled ? <Badge variant="outline" className="ml-1 text-[10px]">DM off</Badge> : null}
                    </td>
                    <td className="p-2">
                      {code && reel.platform === "instagram" ? (
                        <span className="flex items-center gap-2">
                          <code className="text-xs">/r/{code}</code>
                          <CopyButton text={radarShortUrl(code)} />
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-9"
                        onClick={() => {
                          setForm(formFromReel(reel));
                          setLastLink(code);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
