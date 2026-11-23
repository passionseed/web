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

/** RDCW's transDate + transTime ("20261123", "10:15:00", Bangkok) as epoch ms, or null. */
export function rdcwSlipTime(transDate?: string, transTime?: string): number | null {
  const d = transDate?.match(/^(\d{4})(\d{2})(\d{2})$/);
  const t = transTime?.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!d || !t) return null;
  const ms = Date.parse(`${d[1]}-${d[2]}-${d[3]}T${t[1]}:${t[2]}:${t[3] ?? "00"}+07:00`);
  return Number.isNaN(ms) ? null : ms;
}

/** Bank and server clocks drift a little; a slip this close to the sign-up still counts. */
const CLOCK_GRACE_MS = 2 * 60_000;

/**
 * Turn RDCW's reply into what we do next. Pure, so it is tested on its own.
 * `signedUpAt` is when the registration was created (ISO). RDCW, unlike SlipOK,
 * does not flag a slip it has seen before, so a slip made before the sign-up
 * (an older payment to the same PromptPay), or one with no readable time, goes
 * to a person. Reuse of a slip already seen is caught by payment_slip_refs.
 */
export function interpretRdcw(
  body: unknown,
  expectedAmount: number,
  fileType = "image/jpeg",
  signedUpAt?: string,
): SlipVerdict {
  const b = (body ?? {}) as RdcwBody;

  if (b.valid === true && b.data?.transRef) {
    const receiver = slipReceiver(b.data);
    if (receiver === "not_us") return { kind: "rejected", reason: "receiver", raw: body };
    const transRef = String(b.data.transRef);
    if (receiver === "unknown") {
      return { kind: "unverified", transRef, detail: "RDCW slip receiver could not be confirmed", raw: body };
    }
    const amount = Number(b.data.amount);
    if (!Number.isFinite(amount) || Math.abs(amount - expectedAmount) > 0.001) {
      return { kind: "rejected", reason: "amount", raw: body };
    }
    if (signedUpAt) {
      const paidAt = rdcwSlipTime(b.data.transDate, b.data.transTime);
      if (paidAt === null) {
        return { kind: "unverified", transRef, detail: "RDCW slip has no readable time", raw: body };
      }
      if (paidAt < Date.parse(signedUpAt) - CLOCK_GRACE_MS) {
        return { kind: "unverified", transRef, detail: "RDCW slip was made before the sign-up", raw: body };
      }
    }
    const transTimestamp =
      b.data.transDate && b.data.transTime ? `${b.data.transDate} ${b.data.transTime}` : undefined;
    return { kind: "paid", transRef, amount, transTimestamp, raw: body };
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
  signedUpAt?: string,
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
    return interpretRdcw(body, expectedAmount, file.type, signedUpAt);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "RDCW request failed";
    return { kind: "unverified", detail, raw: null };
  }
}
