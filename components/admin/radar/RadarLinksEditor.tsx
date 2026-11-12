"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { adminGuidePages, adminPageLabel } from "@/lib/radar-guide/admin-pages";
import { HUB_ONLY_LINK_CODES } from "@/lib/radar-guide/admin-social";
import { radarShortUrl } from "@/lib/radar-guide/dm-copy";
import { RADAR_SOURCES, isRadarUtmSource } from "@/lib/radar-guide/utm";
import type { RadarLinkRow } from "@/lib/radar-guide/types";
import { cn } from "@/lib/utils";
import { CopyButton, Field, NativeSelect } from "./RadarAdminFields";
import type { FieldOption } from "./RadarReelMapper";

export type LinkEditorRow = RadarLinkRow & { clicks: number; visits: number | null };

interface LinkForm {
  isNew: boolean;
  reelLinked: boolean;
  code: string;
  fieldSlug: string;
  /** Code guide page; "" for the career cover or a deck career. */
  pageKey: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  isActive: boolean;
  note: string;
}

function newForm(): LinkForm {
  return {
    isNew: true,
    reelLinked: false,
    code: "",
    fieldSlug: "",
    pageKey: "",
    utmSource: "tiktok-alias",
    utmMedium: RADAR_SOURCES["tiktok-alias"],
    utmCampaign: "radar",
    utmContent: "",
    isActive: true,
    note: "",
  };
}

function formFromLink(link: RadarLinkRow): LinkForm {
  return {
    isNew: false,
    reelLinked: Boolean(link.reel_id),
    code: link.code,
    fieldSlug: link.field_slug ?? "",
    pageKey: link.field_slug ? link.chapter_key ?? "" : "",
    utmSource: link.utm_source,
    utmMedium: link.utm_medium,
    utmCampaign: link.utm_campaign,
    utmContent: link.utm_content ?? "",
    isActive: link.is_active,
    note: link.note ?? "",
  };
}

function safeShortUrl(code: string): string | null {
  try {
    return radarShortUrl(code);
  } catch {
    return null;
  }
}

/**
 * Short links served by /r/<code> (spec 6, item 3): codes, targets (career
 * and guide page) and utm values, with clicks against tagged visits to spot
 * drop-off in the in-app browser. `ig`, `tt` and `hub-ig` stay on the hub.
 * Typed `<alias>-<page>` codes resolve without a row; add a row only to give
 * one its own utm tags.
 */
export function RadarLinksEditor({
  links,
  fields,
  windowLabel,
}: {
  links: LinkEditorRow[];
  fields: FieldOption[];
  windowLabel: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<LinkForm | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof LinkForm>(key: K, value: LinkForm[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));
  const hubOnly = form ? HUB_ONLY_LINK_CODES.has(form.code.trim().toLowerCase()) : false;
  const fieldName = new Map(fields.map((field) => [field.slug, field.name]));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/radar/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          fieldSlug: form.fieldSlug || null,
          pageKey: form.fieldSlug && form.pageKey ? form.pageKey : null,
          utmSource: form.utmSource,
          utmMedium: form.utmMedium,
          utmCampaign: form.utmCampaign || "radar",
          utmContent: form.utmContent || null,
          isActive: form.isActive,
          note: form.note.trim() || null,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        issues?: { fieldErrors?: Record<string, string[]> };
      };
      if (!response.ok) {
        const detail = Object.entries(result.issues?.fieldErrors ?? {}).map(([k, v]) => `${k}: ${v[0]}`)[0];
        toast.error(detail ?? result.error ?? "Could not save the link");
        return;
      }
      toast.success("Link saved");
      setForm(null);
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="radar-links-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="radar-links-heading" className="text-xl font-semibold">
            Short links
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            passionseed.org/r/&lt;code&gt;. Reel links are created by the mapper. Typed codes such as cyber-money or
            cyber-money-tt already work without a row; add rows here for stories, bios or custom tags.
          </p>
        </div>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => setForm(newForm())}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New link
        </Button>
      </div>

      {form ? (
        <form
          className="space-y-4 rounded-lg border p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="link-code" label="Code" hint="2-32 chars: a-z, 0-9 and dashes">
              <Input
                id="link-code"
                value={form.code}
                readOnly={!form.isNew}
                required
                placeholder="cyber-story"
                onChange={(e) => set("code", e.target.value.toLowerCase())}
              />
            </Field>
            <Field id="link-field" label="Career" hint={hubOnly ? "This code always points at the hub." : undefined}>
              <NativeSelect
                id="link-field"
                value={form.fieldSlug}
                disabled={hubOnly || form.reelLinked}
                onChange={(e) => setForm((c) => (c ? { ...c, fieldSlug: e.target.value, pageKey: "" } : c))}
              >
                <option value="">Hub</option>
                {fields.map((field) => (
                  <option key={field.slug} value={field.slug}>
                    {field.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              id="link-page"
              label="Guide page"
              hint={form.fieldSlug && !adminGuidePages(form.fieldSlug) ? "No code guide: opens the deck." : undefined}
            >
              <NativeSelect
                id="link-page"
                value={form.pageKey}
                disabled={!adminGuidePages(form.fieldSlug) || form.reelLinked}
                onChange={(e) => set("pageKey", e.target.value)}
              >
                <option value="">Guide cover (level map)</option>
                {(adminGuidePages(form.fieldSlug) ?? []).map((page) => (
                  <option key={page.key} value={page.key}>
                    {page.order}. {page.titleTh}
                  </option>
                ))}
                {form.pageKey && !adminGuidePages(form.fieldSlug)?.some((p) => p.key === form.pageKey) ? (
                  <option value={form.pageKey}>{form.pageKey} (not in the guide)</option>
                ) : null}
              </NativeSelect>
            </Field>
            <Field id="link-source" label="utm_source">
              <NativeSelect
                id="link-source"
                value={form.utmSource}
                onChange={(e) => {
                  const source = e.target.value;
                  setForm((c) =>
                    c ? { ...c, utmSource: source, utmMedium: isRadarUtmSource(source) ? RADAR_SOURCES[source] : c.utmMedium } : c
                  );
                }}
              >
                {!isRadarUtmSource(form.utmSource) ? <option value={form.utmSource}>{form.utmSource}</option> : null}
                {Object.keys(RADAR_SOURCES).map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="link-medium" label="utm_medium">
              <Input id="link-medium" value={form.utmMedium} required onChange={(e) => set("utmMedium", e.target.value)} />
            </Field>
            <Field id="link-campaign" label="utm_campaign">
              <Input id="link-campaign" value={form.utmCampaign} onChange={(e) => set("utmCampaign", e.target.value)} />
            </Field>
            <Field id="link-content" label="utm_content" hint="For example cybersecurity-founder-x">
              <Input id="link-content" value={form.utmContent} onChange={(e) => set("utmContent", e.target.value)} />
            </Field>
            <Field id="link-note" label="Note">
              <Input id="link-note" value={form.note} maxLength={200} onChange={(e) => set("note", e.target.value)} />
            </Field>
          </div>
          {form.reelLinked ? (
            <p className="text-xs text-muted-foreground">
              This link belongs to a reel and may already be in DMs. Change its target in the reel mapper.
            </p>
          ) : null}
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <Switch checked={form.isActive} onCheckedChange={(checked) => set("isActive", checked)} />
            Active (an inactive code falls back to its alias, or to the hub)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="min-h-11" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
              Save link
            </Button>
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2 font-medium">Code</th>
              <th className="p-2 font-medium">Points at</th>
              <th className="p-2 font-medium">utm</th>
              <th className="p-2 text-right font-medium">Clicks</th>
              <th className="p-2 text-right font-medium">Visits</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {links.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No links yet.
                </td>
              </tr>
            ) : (
              links.map((link) => {
                const url = safeShortUrl(link.code);
                return (
                  <tr key={link.code} className={cn(!link.is_active && "opacity-50")}>
                    <td className="p-2">
                      <span className="flex items-center gap-2">
                        <code className="text-xs">/r/{link.code}</code>
                        {url ? <CopyButton text={url} /> : null}
                      </span>
                      <span className="mt-1 flex gap-1">
                        {link.reel_id ? <Badge variant="secondary" className="text-[10px]">reel</Badge> : null}
                        {!link.is_active ? <Badge variant="outline" className="text-[10px]">inactive</Badge> : null}
                      </span>
                    </td>
                    <td className="p-2">
                      {link.field_slug ? fieldName.get(link.field_slug) ?? link.field_slug : "Hub"}
                      {link.field_slug && link.chapter_key ? (
                        <span className="text-muted-foreground"> · {adminPageLabel(link.field_slug, link.chapter_key)}</span>
                      ) : null}
                    </td>
                    <td className="p-2 font-mono text-[11px] text-muted-foreground">
                      {link.utm_source} / {link.utm_medium}
                      {link.utm_content ? ` / ${link.utm_content}` : ""}
                    </td>
                    <td className="p-2 text-right tabular-nums">{link.clicks}</td>
                    <td className="p-2 text-right tabular-nums">{link.visits ?? "-"}</td>
                    <td className="p-2 text-right">
                      <Button type="button" variant="ghost" size="sm" className="min-h-9" onClick={() => setForm(formFromLink(link))}>
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
      <p className="text-xs text-muted-foreground">Counts: {windowLabel}. Visits match on utm_source and utm_content.</p>
    </section>
  );
}
