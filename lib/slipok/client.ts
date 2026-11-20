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
 */

const ENDPOINT = "https://api.slipok.com/api/line/apikey";
const TIMEOUT_MS = 20_000;

export type SlipVerdict =
  /** The slip is real, paid to us, for the right amount, never used before. */
  | { kind: "paid"; transRef: string; amount: number; transTimestamp?: string; raw: unknown }
  /** The person should fix something: wrong amount, wrong account, reused or unreadable slip. */
  | { kind: "rejected"; reason: SlipRejectReason; code?: number; raw: unknown }
  /** Try again in a few minutes (the bank is slow or down). */
  | { kind: "retry"; code?: number; delayMinutes?: number; raw: unknown }
  /** SlipOK can't decide (not configured, quota, network): a person checks it. */
  | { kind: "unverified"; code?: number; detail: string; raw: unknown };

export type SlipRejectReason = "duplicate" | "amount" | "receiver" | "unreadable" | "expired";

export function slipOkConfigured(): boolean {
  return Boolean(process.env.SLIPOK_API_KEY && process.env.SLIPOK_BRANCH_ID);
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

/** Send one slip image to SlipOK. Never throws: failures come back as "unverified". */
export async function verifySlip(file: Blob, filename: string, expectedAmount: number): Promise<SlipVerdict> {
  const key = process.env.SLIPOK_API_KEY;
  const branch = process.env.SLIPOK_BRANCH_ID;
  if (!key || !branch) {
    return { kind: "unverified", detail: "SlipOK is not configured", raw: null };
  }

  const form = new FormData();
  form.append("files", file, filename);
  form.append("log", "true");
  form.append("amount", String(expectedAmount));

  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(branch)}`, {
      method: "POST",
      headers: { "x-authorization": key },
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
