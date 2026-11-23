/**
 * RDCW Slip Verify: checks a Thai bank transfer slip (https://slip.rdcw.co.th/docs).
 *
 * POST https://suba.rdcw.co.th/v2/inquiry
 *   Basic auth: RDCW_CLIENT_ID:RDCW_CLIENT_SECRET
 *   multipart: file (the slip image, JPEG or PNG)
 *
 * Every error is HTTP 400 with { code, message }. Unlike SlipOK, RDCW does not
 * reject a reused slip or a slip paid to someone else: reuse is caught by the
 * unique index on slip_trans_ref, and the receiver is checked here.
 */

import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import type { SlipVerdict } from "@/lib/slipok/client";

const ENDPOINT = "https://suba.rdcw.co.th/v2/inquiry";
const TIMEOUT_MS = 20_000;

export function rdcwConfigured(): boolean {
  return Boolean(process.env.RDCW_CLIENT_ID && process.env.RDCW_CLIENT_SECRET);
}

type Party = {
  proxy?: { type?: string; value?: string } | null;
  account?: { type?: string; value?: string } | null;
};

type RdcwBody = {
  code?: number | string;
  message?: string;
  valid?: boolean;
  data?: {
    transRef?: string;
    transDate?: string;
    transTime?: string;
    amount?: number | string;
    receivingBank?: string;
    receiver?: Party;
  };
};

/**
 * Who the slip paid. Fails closed: "us" only when the bank is ours AND the
 * PromptPay ID's visible last 4 digits are ours. Anything masked, missing or
 * in an unfamiliar shape is "unknown", and a person checks it.
 */
export function slipReceiver(data: RdcwBody["data"]): "us" | "not_us" | "unknown" {
  const bank = data?.receivingBank;
  const proxy = data?.receiver?.proxy?.value?.replace(/[^0-9a-z]/gi, "");
  const last4 = proxy?.slice(-4);
  const last4Visible = Boolean(last4 && /^\d{4}$/.test(last4));

  if (bank && /^\d{3}$/.test(bank) && bank !== SHIFT_PAYMENT.receiverBankCode) return "not_us";
  if (last4Visible && last4 !== SHIFT_PAYMENT.promptPayLast4) return "not_us";
  if (bank === SHIFT_PAYMENT.receiverBankCode && last4Visible) return "us";
  return "unknown";
}

/** A timestamp's calendar day in Bangkok, as RDCW writes transDate: "YYYYMMDD". */
export function bangkokDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Turn RDCW's reply into what we do next. Pure, so it is tested on its own.
 * `notBefore` is the sign-up day (YYYYMMDD, Bangkok). RDCW, unlike SlipOK, does
 * not flag a slip it has seen before, so a slip dated before the sign-up (one
 * paid to the same PromptPay for something else) goes to a person instead.
 */
export function interpretRdcw(
  body: unknown,
  expectedAmount: number,
  fileType = "image/jpeg",
  notBefore?: string,
): SlipVerdict {
  const b = (body ?? {}) as RdcwBody;

  if (b.valid === true && b.data?.transRef) {
    const receiver = slipReceiver(b.data);
    if (receiver === "not_us") return { kind: "rejected", reason: "receiver", raw: body };
    if (receiver === "unknown") {
      return { kind: "unverified", detail: "RDCW slip receiver could not be confirmed", raw: body };
    }
    const amount = Number(b.data.amount);
    if (!Number.isFinite(amount) || Math.abs(amount - expectedAmount) > 0.001) {
      return { kind: "rejected", reason: "amount", raw: body };
    }
    const transDate = b.data.transDate;
    if (notBefore && transDate && /^\d{8}$/.test(transDate) && transDate < notBefore) {
      return { kind: "unverified", detail: "RDCW slip is dated before the sign-up", raw: body };
    }
    const transTimestamp =
      b.data.transDate && b.data.transTime ? `${b.data.transDate} ${b.data.transTime}` : undefined;
    return { kind: "paid", transRef: String(b.data.transRef), amount, transTimestamp, raw: body };
  }

  const code = b.code === undefined || b.code === null ? undefined : Number(b.code);
  switch (code) {
    case 1004:
    case 1005:
    case 1006:
      // The docs list JPEG and PNG only: a WebP RDCW can't read goes to a person, not back to the student.
      if (fileType === "image/webp") {
        return { kind: "unverified", code, detail: "RDCW could not read a WebP slip", raw: body };
      }
      return { kind: "rejected", reason: "unreadable", code, raw: body };
    case 2002:
    case 2003:
    case 2004:
    case 2006:
      // Bank API error or no data yet (a slip from seconds ago): try again shortly.
      return { kind: "retry", code, raw: body };
    default:
      // 1000-1003 (auth, IP), 1007 (quota), 1008 (expired plan), 2001/2005 (RDCW internal).
      return { kind: "unverified", code, detail: b.message ?? "unexpected RDCW reply", raw: body };
  }
}

/** Send one slip image to RDCW. Never throws: failures come back as "unverified". */
export async function verifySlipRdcw(
  file: Blob,
  filename: string,
  expectedAmount: number,
  notBefore?: string,
): Promise<SlipVerdict> {
  const id = process.env.RDCW_CLIENT_ID;
  const secret = process.env.RDCW_CLIENT_SECRET;
  if (!id || !secret) {
    return { kind: "unverified", detail: "RDCW is not configured", raw: null };
  }

  const form = new FormData();
  form.append("file", file, filename);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}` },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    if (body === null) {
      return { kind: "unverified", detail: `RDCW HTTP ${res.status} without JSON`, raw: null };
    }
    return interpretRdcw(body, expectedAmount, file.type, notBefore);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "RDCW request failed";
    return { kind: "unverified", detail, raw: null };
  }
}
