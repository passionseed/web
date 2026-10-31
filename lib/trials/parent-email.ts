import type {
  ClaimedParentUpdate,
  ParentEmailSendResult,
} from "./parent-updates";

interface EmailContent {
  subject: string;
  html: string;
}

interface ProviderResult {
  error?: { statusCode?: number | null } | null;
}

interface ProviderSendOptions {
  idempotencyKey?: string;
}

interface ParentEmailTransportOptions {
  apiKey?: string;
  fromEmail?: string;
  providerSend?: (input: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }, options?: ProviderSendOptions) => Promise<ProviderResult>;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function link(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color:#235b84">${escapeHtml(label)}</a>`;
}

export function buildVerificationEmail(input: {
  seedTitle: string;
  verificationUrl: string;
  unsubscribeUrl: string;
}): EmailContent {
  return {
    subject: `ยืนยันอีเมลเพื่อรับอัปเดต ${input.seedTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17324d">
        <h1 style="font-size:22px">ยืนยันว่าต้องการรับอัปเดต PathLab</h1>
        <p>คุณขอรับอัปเดตแบบย่อสำหรับ <strong>${escapeHtml(input.seedTitle)}</strong></p>
        <p>${link(input.verificationUrl, "ยืนยันอีเมล (ลิงก์หมดอายุใน 30 นาที)")}</p>
        <p>อีเมลจะบอกเฉพาะการเริ่ม ความคืบหน้าสำคัญ และสถานะการชำระเงิน ไม่ส่งคำตอบหรือบันทึกส่วนตัวของนักเรียน</p>
        <p style="font-size:13px">ไม่ได้เป็นผู้ขอ? ${link(input.unsubscribeUrl, "ยกเลิกรับอัปเดต")}</p>
      </div>
    `,
  };
}

function dayLabel(payloads: Record<string, unknown>[]): string | null {
  const days = payloads
    .map((payload) => payload.currentDay)
    .filter((day): day is number => typeof day === "number" && Number.isFinite(day));
  return days.length ? `วันที่ ${Math.max(...days)}` : null;
}

export function buildParentUpdateEmail(input: {
  eventKinds: ClaimedParentUpdate["eventKind"][];
  payloads: Record<string, unknown>[];
  unsubscribeUrl: string;
}): EmailContent {
  const firstPayload = input.payloads[0] ?? {};
  const seedTitle =
    typeof firstPayload.seedTitle === "string" ? firstPayload.seedTitle : "PathLab";
  const status =
    typeof firstPayload.status === "string" ? firstPayload.status : null;
  const day = dayLabel(input.payloads);
  const completed = input.eventKinds.includes("pathlab_completed");
  const started = input.eventKinds.includes("pathlab_started");
  const payment = input.eventKinds.includes("payment_status_changed");
  const summary = payment
    ? `สถานะการชำระเงิน: ${escapeHtml(status ?? "อัปเดตแล้ว")}`
    : completed
      ? "ทำ PathLab ครบแล้ว พร้อมทบทวนหลักฐานและสัญญาณความเหมาะ"
      : started
        ? "เริ่มลงมือทำ PathLab แล้ว"
        : `ผ่านหมุดหมายสำคัญ${day ? ` · ${escapeHtml(day)}` : ""}`;

  return {
    subject: `อัปเดต ${seedTitle}: ${day ?? (completed ? "ทำครบแล้ว" : "ความคืบหน้า")}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17324d">
        <h1 style="font-size:22px">${escapeHtml(seedTitle)}</h1>
        <p>${summary}</p>
        <p>ข้อความนี้ไม่มีคำตอบ แบบสะท้อนคิด แชต หรือโน้ตส่วนตัวของนักเรียน</p>
        <p style="font-size:13px">${link(input.unsubscribeUrl, "ยกเลิกรับอัปเดต")}</p>
      </div>
    `,
  };
}

export function createParentEmailTransport(options: ParentEmailTransportOptions) {
  const providerSend = options.providerSend ?? (
    options.apiKey
      ? async (
          message: { from: string; to: string; subject: string; html: string },
          sendOptions?: ProviderSendOptions
        ) => {
          const { Resend } = await import("resend");
          const resend = new Resend(options.apiKey);
          return resend.emails.send(message, sendOptions);
        }
      : null
  );

  return {
    async send(input: {
      to: string;
      subject: string;
      html: string;
      idempotencyKey?: string;
    }): Promise<ParentEmailSendResult> {
      if (!providerSend || !options.fromEmail) {
        return { ok: false, transient: true, code: "email_unavailable" };
      }
      try {
        const { idempotencyKey, ...message } = input;
        const response = await providerSend({
          from: `PassionSeed <${options.fromEmail}>`,
          ...message,
        }, idempotencyKey ? { idempotencyKey } : undefined);
        if (!response.error) return { ok: true };
        const status = response.error.statusCode ?? 500;
        return status >= 500 || status === 429
          ? { ok: false, transient: true, code: "provider_unavailable" }
          : { ok: false, transient: false, code: "provider_rejected" };
      } catch {
        return { ok: false, transient: true, code: "provider_unavailable" };
      }
    },
  };
}

export function configuredParentEmailTransport() {
  return createParentEmailTransport({
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL,
  });
}
