import type { MarketingSource } from "@/lib/supabase/meta-marketing";

export function formatCount(value: number | null): string {
  return value === null ? "–" : value.toLocaleString("en-US");
}

export function formatMoney(value: number | null, currency: string | null): string {
  if (value === null) return "–";
  const amount = value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "THB" || currency === null ? `฿${amount}` : `${amount} ${currency}`;
}

export function formatPercent(value: number | null): string {
  return value === null ? "–" : `${(value * 100).toFixed(2)}%`;
}

export const SOURCE_LABELS: Record<MarketingSource, string> = {
  ig_account: "Instagram account",
  ig_media: "Instagram posts",
  meta_ads: "Meta Ads",
};

/** What to do about each run error code, in the words of the setup doc. */
export function syncErrorHint(code: string | null): string | null {
  if (!code) return null;
  if (code === "missing_env_instagram") {
    return "Set INSTAGRAM_BUSINESS_ACCOUNT_ID and an Instagram token in Vercel.";
  }
  if (code === "missing_env_meta_ads") return "Set META_ADS_ACCESS_TOKEN and META_AD_ACCOUNT_ID in Vercel.";
  if (code === "ig_insights_permission_missing") {
    return "The Instagram token lacks instagram_business_manage_insights. Re-issue it with that permission.";
  }
  if (code === "ads_read_permission_missing") {
    return "The ads token lacks ads_read, or the system user has no access to the ad account.";
  }
  if (code === "token_expired") return "The token expired or was revoked. Generate a new one.";
  if (code === "rate_limited") return "Meta rate limit. The next daily run retries.";
  if (code === "deadline") return "Ran out of time. The next run continues.";
  return null;
}
