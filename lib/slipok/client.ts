/**
 * SlipOK: checks a Thai bank transfer slip (https://slipok.com/api-documentation/, v1.8).
 *
 * POST https://api.slipok.com/api/line/apikey/<SLIPOK_BRANCH_ID>
 *   header x-authorization: <SLIPOK_API_KEY>
 *   multipart: files (the slip image), log=true, amount
 *
 * With log=true SlipOK also rejects a slip it has seen before (1012) and a
 * slip paid to an account other than the branch's receiving account (1014).
 * The docs give no HTTP status per error, so the code is read from the body.
 *
 * More than one SlipOK account can be set (SLIPOK_API_KEY_2 + SLIPOK_BRANCH_ID_2,
 * and so on). An account that still has quota is used first, and when one
 * account can't decide (out of quota, expired, wrong key, network) the next
 * one checks the slip. Every account must have the same receiving bank
 * account, or its 1014 check would turn away good slips.
 *
 * GET https://api.slipok.com/api/line/apikey/<SLIPOK_BRANCH_ID>/quota
 *   header x-authorization: <SLIPOK_API_KEY>
 *   -> { success, data: { quota (slips left), overQuota } }
 */

const ENDPOINT = "https://api.slipok.com/api/line/apikey";
const TIMEOUT_MS = 20_000;
const QUOTA_TIMEOUT_MS = 5_000;
/** Accounts are read from SLIPOK_API_KEY, then _2 up to this number. */
const MAX_ACCOUNTS = 5;

export type SlipVerdict = (
  /** The slip is real, paid to us, for the right amount, never used before. */
  | { kind: "paid"; transRef: string; amount: number; transTimestamp?: string; raw: unknown }
  /** The person should fix something: wrong amount, wrong account, reused or unreadable slip. */
  | { kind: "rejected"; reason: SlipRejectReason; code?: number; raw: unknown }
  /** Try again in a few minutes (the bank is slow or down). */
  | { kind: "retry"; code?: number; delayMinutes?: number; raw: unknown }
  /** SlipOK can't decide (not configured, quota, network): a person checks it. */
  | { kind: "unverified"; code?: number; detail: string; raw: unknown }
) & {
  /** Which SlipOK account answered: 1 is SLIPOK_API_KEY, 2 is SLIPOK_API_KEY_2. */
  account?: number;
};

export type SlipRejectReason = "duplicate" | "amount" | "receiver" | "unreadable" | "expired";

export type SlipOkAccount = { number: number; key: string; branch: string };

/**
 * The SlipOK accounts that are set, in order. Account 1 is SLIPOK_API_KEY +
 * SLIPOK_BRANCH_ID; account 2 is SLIPOK_API_KEY_2 + SLIPOK_BRANCH_ID_2, and so
 * on. An account with only one of its two values is left out.
 */
export function slipOkAccounts(env: Record<string, string | undefined> = process.env): SlipOkAccount[] {
  const accounts: SlipOkAccount[] = [];
  for (let number = 1; number <= MAX_ACCOUNTS; number++) {
    const suffix = number === 1 ? "" : `_${number}`;
    const key = env[`SLIPOK_API_KEY${suffix}`]?.trim();
    const branch = env[`SLIPOK_BRANCH_ID${suffix}`]?.trim();
    if (key && branch) accounts.push({ number, key, branch });
  }
  return accounts;
}

export function slipOkConfigured(): boolean {
  return slipOkAccounts().length > 0;
}

type SlipOkBody = {
  success?: boolean;
  code?: number | string;
  message?: string;
  data?: {
    success?: boolean;
    transRef?: string;
    amount?: number | string;
    transTimestamp?: string;
    delay?: number | string;
    code?: number | string;
  };
};

/** Turn SlipOK's reply into what we do next. Pure, so it is tested on its own. */
export function interpretSlipOk(body: unknown, expectedAmount: number): SlipVerdict {
  const b = (body ?? {}) as SlipOkBody;
  const codeRaw = b.code ?? b.data?.code;
  const code = codeRaw === undefined || codeRaw === null ? undefined : Number(codeRaw);

  if (b.success === true && b.data?.success !== false && b.data?.transRef) {
    const amount = Number(b.data.amount);
    // SlipOK already compares the amount we send; check again in case it didn't.
    if (!Number.isFinite(amount) || Math.abs(amount - expectedAmount) > 0.001) {
      return { kind: "rejected", reason: "amount", raw: body };
    }
    return {
      kind: "paid",
      transRef: String(b.data.transRef),
      amount,
      transTimestamp: b.data.transTimestamp,
      raw: body,
    };
  }

  switch (code) {
    case 1012:
      return { kind: "rejected", reason: "duplicate", code, raw: body };
    case 1013:
      return { kind: "rejected", reason: "amount", code, raw: body };
    case 1014:
      return { kind: "rejected", reason: "receiver", code, raw: body };
    case 1005:
    case 1006:
    case 1007:
    case 1008:
      return { kind: "rejected", reason: "unreadable", code, raw: body };
    case 1011:
      return { kind: "rejected", reason: "expired", code, raw: body };
    case 1010: {
      const delay = Number(b.data?.delay);
      return { kind: "retry", code, delayMinutes: Number.isFinite(delay) ? delay : undefined, raw: body };
    }
    case 1009:
      return { kind: "retry", code, raw: body };
    default:
      return { kind: "unverified", code, detail: b.message ?? "unexpected SlipOK reply", raw: body };
  }
}

/** Slips an account has left, or null when SlipOK doesn't say. */
async function slipsLeft(account: SlipOkAccount): Promise<number | null> {
  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(account.branch)}/quota`, {
      headers: { "x-authorization": account.key },
      signal: AbortSignal.timeout(QUOTA_TIMEOUT_MS),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as { success?: boolean; data?: { quota?: unknown } } | null;
    const quota = body?.data?.quota;
    if (body?.success !== true || quota === undefined || quota === null) return null;
    const left = Number(quota);
    return Number.isFinite(left) ? left : null;
  } catch {
    return null;
  }
}

/**
 * The order to try the accounts in: those with slips left (or that don't say)
 * first, those that have run out last. An account that has run out can still
 * pass a slip, but SlipOK counts it as over quota. One account needs no lookup.
 */
async function inOrderOfQuota(accounts: SlipOkAccount[]): Promise<SlipOkAccount[]> {
  if (accounts.length < 2) return accounts;
  const left = await Promise.all(accounts.map(slipsLeft));
  const empty = (i: number) => left[i] !== null && (left[i] as number) <= 0;
  return [...accounts.filter((_, i) => !empty(i)), ...accounts.filter((_, i) => empty(i))];
}

/** Send one slip image to one SlipOK account. Never throws. */
async function verifyWith(
  account: SlipOkAccount,
  file: Blob,
  filename: string,
  expectedAmount: number,
): Promise<SlipVerdict> {
  const form = new FormData();
  form.append("files", file, filename);
  form.append("log", "true");
  form.append("amount", String(expectedAmount));

  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(account.branch)}`, {
      method: "POST",
      headers: { "x-authorization": account.key },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    if (body === null) {
      return { kind: "unverified", detail: `SlipOK HTTP ${res.status} without JSON`, raw: null };
    }
    return interpretSlipOk(body, expectedAmount);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "SlipOK request failed";
    return { kind: "unverified", detail, raw: null };
  }
}

/**
 * Check one slip image with SlipOK. Never throws: failures come back as
 * "unverified". With more than one account, the next account is asked only
 * when the one before couldn't decide; a clear answer (paid, rejected, retry)
 * is final.
 */
export async function verifySlip(file: Blob, filename: string, expectedAmount: number): Promise<SlipVerdict> {
  const accounts = slipOkAccounts();
  if (accounts.length === 0) {
    return { kind: "unverified", detail: "SlipOK is not configured", raw: null };
  }

  let last: SlipVerdict = { kind: "unverified", detail: "SlipOK is not configured", raw: null };
  for (const account of await inOrderOfQuota(accounts)) {
    last = { ...(await verifyWith(account, file, filename, expectedAmount)), account: account.number };
    if (last.kind !== "unverified") return last;
    console.warn("[slipok] account could not decide", { account: account.number, code: last.code, detail: last.detail });
  }
  return last;
}
