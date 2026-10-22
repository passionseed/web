import { FB_GRAPH_HOST, graphGet, graphGetAll } from "@/lib/meta/marketing/client";
import { normalizeShiftSource } from "@/lib/shift/attribution";

/**
 * Meta Ads results through the Marketing API (graph.facebook.com). Needs a
 * separate token with `ads_read` only: the Instagram-Login token cannot read
 * ad accounts.
 */

export interface GraphAction {
  action_type: string;
  value: string;
}

export interface GraphAdInsight {
  date_start: string;
  date_stop?: string;
  account_currency?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id: string;
  ad_name?: string;
  objective?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_clicks?: string;
  ctr?: string;
  cpc?: string;
  actions?: GraphAction[];
}

interface GraphCallToAction {
  value?: { link?: string };
}

export interface GraphAdCreative {
  url_tags?: string;
  object_url?: string;
  object_story_spec?: {
    link_data?: {
      link?: string;
      call_to_action?: GraphCallToAction;
      child_attachments?: { link?: string }[];
    };
    video_data?: { call_to_action?: GraphCallToAction };
  };
  asset_feed_spec?: { link_urls?: { website_url?: string }[] };
}

export interface GraphAd {
  id: string;
  name?: string;
  adset_id?: string;
  campaign_id?: string;
  effective_status?: string;
  creative?: GraphAdCreative;
}

export interface MetaAdsDailyRow {
  ad_account_id: string;
  date: string;
  ad_id: string;
  ad_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  objective: string | null;
  currency: string | null;
  spend: number;
  impressions: number;
  reach: number | null;
  clicks: number | null;
  link_clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  landing_page_views: number | null;
  leads: number | null;
  initiate_checkouts: number | null;
  messaging_conversations: number | null;
  actions: GraphAction[];
}

export interface Utm {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
}

export interface MetaAdRow extends Utm {
  ad_id: string;
  ad_account_id: string;
  ad_name: string | null;
  adset_id: string | null;
  campaign_id: string | null;
  effective_status: string | null;
  destination_urls: string[];
  url_tags: string | null;
}

const AD_INSIGHT_FIELDS = [
  "date_start",
  "date_stop",
  "account_currency",
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "ad_id",
  "ad_name",
  "objective",
  "spend",
  "impressions",
  "reach",
  "clicks",
  "inline_link_clicks",
  "ctr",
  "cpc",
  "actions",
].join(",");

const AD_FIELDS =
  "name,adset_id,campaign_id,effective_status," +
  "creative{url_tags,object_url,object_story_spec,asset_feed_spec}";

/** First action type found wins, so an aggregate and its pixel twin are never summed. */
const RESULT_ACTIONS = {
  landing_page_views: ["landing_page_view", "omni_landing_page_view"],
  leads: ["lead", "offsite_conversion.fb_pixel_lead", "onsite_web_lead"],
  initiate_checkouts: [
    "initiate_checkout",
    "omni_initiated_checkout",
    "offsite_conversion.fb_pixel_initiate_checkout",
  ],
  messaging_conversations: ["onsite_conversion.messaging_conversation_started_7d"],
} as const;

/** Batch size for `?ids=` lookups; Meta caps a single request at 50 ids. */
const IDS_PER_REQUEST = 50;

/** "act_123" or "123" -> "123". */
export function normalizeAdAccountId(value: string): string {
  return value.trim().replace(/^act_/, "");
}

function toInt(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDecimal(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function actionCount(actions: GraphAction[], types: readonly string[]): number | null {
  for (const type of types) {
    const match = actions.find((a) => a.action_type === type);
    if (match) return toInt(match.value);
  }
  return null;
}

export function parseAdDay(adAccountId: string, raw: GraphAdInsight): MetaAdsDailyRow {
  const actions = raw.actions ?? [];
  return {
    ad_account_id: adAccountId,
    date: raw.date_start,
    ad_id: raw.ad_id,
    ad_name: raw.ad_name ?? null,
    adset_id: raw.adset_id ?? null,
    adset_name: raw.adset_name ?? null,
    campaign_id: raw.campaign_id ?? null,
    campaign_name: raw.campaign_name ?? null,
    objective: raw.objective ?? null,
    currency: raw.account_currency ?? null,
    spend: toDecimal(raw.spend) ?? 0,
    impressions: toInt(raw.impressions) ?? 0,
    reach: toInt(raw.reach),
    clicks: toInt(raw.clicks),
    link_clicks: toInt(raw.inline_link_clicks),
    ctr: toDecimal(raw.ctr),
    cpc: toDecimal(raw.cpc),
    landing_page_views: actionCount(actions, RESULT_ACTIONS.landing_page_views),
    leads: actionCount(actions, RESULT_ACTIONS.leads),
    initiate_checkouts: actionCount(actions, RESULT_ACTIONS.initiate_checkouts),
    messaging_conversations: actionCount(actions, RESULT_ACTIONS.messaging_conversations),
    actions,
  };
}

/** Every landing URL an ad can send people to, carousel cards included. */
export function destinationUrls(creative: GraphAdCreative | undefined): string[] {
  const story = creative?.object_story_spec;
  const candidates = [
    story?.link_data?.link,
    story?.link_data?.call_to_action?.value?.link,
    ...(story?.link_data?.child_attachments ?? []).map((card) => card.link),
    story?.video_data?.call_to_action?.value?.link,
    ...(creative?.asset_feed_spec?.link_urls ?? []).map((l) => l.website_url),
    creative?.object_url,
  ];
  const urls = candidates.filter((u): u is string => !!u && /^https?:\/\//i.test(u));
  return [...new Set(urls)];
}

function paramsOf(url: string): URLSearchParams | null {
  try {
    const parsed = new URL(url);
    const params = new URLSearchParams(parsed.search);
    // /go/<source> is the repo's tracked short link; it sets utm_source itself.
    const goSource = parsed.pathname.match(/^\/go\/([^/]+)\/?$/)?.[1];
    if (goSource && !params.has("utm_source")) params.set("utm_source", goSource);
    return params;
  } catch {
    return null;
  }
}

/**
 * UTM tags the ad lands with. Meta appends `url_tags` to every link, so those
 * win; otherwise the first destination URL carrying the tag. utm_source is
 * normalized exactly like `shift_applications.source` so the two join.
 */
export function utmFor(urls: string[], urlTags: string | undefined): Utm {
  const sources = [
    new URLSearchParams(urlTags ?? ""),
    ...urls.map(paramsOf).filter((p): p is URLSearchParams => p !== null),
  ];
  const first = (key: string) => {
    for (const params of sources) {
      const value = params.get(key)?.trim();
      if (value) return value;
    }
    return null;
  };
  return {
    utm_source: normalizeShiftSource(first("utm_source")),
    utm_medium: first("utm_medium"),
    utm_campaign: first("utm_campaign"),
    utm_content: first("utm_content"),
  };
}

export function parseAdRow(adAccountId: string, ad: GraphAd): MetaAdRow {
  const urls = destinationUrls(ad.creative);
  return {
    ad_id: ad.id,
    ad_account_id: adAccountId,
    ad_name: ad.name ?? null,
    adset_id: ad.adset_id ?? null,
    campaign_id: ad.campaign_id ?? null,
    effective_status: ad.effective_status ?? null,
    destination_urls: urls,
    url_tags: ad.creative?.url_tags ?? null,
    ...utmFor(urls, ad.creative?.url_tags),
  };
}

/** Per-ad, per-day results for an inclusive day range. */
export async function fetchAdsDaily(
  adAccountId: string,
  since: string,
  until: string,
  accessToken: string
): Promise<MetaAdsDailyRow[]> {
  const rows = await graphGetAll<GraphAdInsight>(
    FB_GRAPH_HOST,
    `act_${adAccountId}/insights`,
    {
      level: "ad",
      time_increment: 1,
      time_range: JSON.stringify({ since, until }),
      fields: AD_INSIGHT_FIELDS,
      limit: 500,
    },
    accessToken
  );
  return rows.map((row) => parseAdDay(adAccountId, row));
}

/** Ad metadata and destination UTM for the given ads, 50 ids per request. */
export async function fetchAds(
  adAccountId: string,
  adIds: string[],
  accessToken: string
): Promise<MetaAdRow[]> {
  const ads: MetaAdRow[] = [];
  for (let i = 0; i < adIds.length; i += IDS_PER_REQUEST) {
    const batch = adIds.slice(i, i + IDS_PER_REQUEST);
    const byId = await graphGet<Record<string, GraphAd>>(
      FB_GRAPH_HOST,
      "",
      { ids: batch.join(","), fields: AD_FIELDS },
      accessToken
    );
    for (const ad of Object.values(byId)) ads.push(parseAdRow(adAccountId, ad));
  }
  return ads;
}
