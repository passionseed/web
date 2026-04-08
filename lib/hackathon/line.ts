import * as line from "@line/bot-sdk";
import type { MentorBooking, MentorProfile } from "@/types/mentor";

function getClient(): line.messagingApi.MessagingApiClient {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  return new line.messagingApi.MessagingApiClient({ channelAccessToken: token });
}

function formatLineTextMessage(text: string): line.messagingApi.TextMessage {
  return {
    type: "text",
    text,
  };
}

export function validateLineSignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) throw new Error("LINE_CHANNEL_SECRET is not set");
  return line.validateSignature(body, secret, signature);
}

export async function sendLineConnectCode(lineUserId: string, code: string): Promise<void> {
  const client = getClient();
  const message = formatLineTextMessage(
    `สวัสดีครับ! 👋\n\nเพื่อเชื่อมต่อ Line กับระบบ PassionSeed Mentor กรุณานำโค้ดนี้ไปกรอกในหน้า Profile:\n\n🔑 ${code}\n\n(โค้ดนี้จะหมดอายุใน 10 นาที)`
  );
  await client.pushMessage({ to: lineUserId, messages: [message] });
}

export async function sendMentorBookingNotification(
  mentor: MentorProfile,
  booking: MentorBooking,
  bookerName: string
): Promise<void> {
  if (!mentor.line_user_id) {
    console.warn("[Line] Skipping mentor booking notification: mentor has no connected line_user_id", {
      mentorId: mentor.id,
      bookingId: booking.id,
    });
    return;
  }

  const client = getClient();
  const slotDate = new Date(booking.slot_datetime);
  const dateStr = slotDate.toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const timeStr = slotDate.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });

  const message = formatLineTextMessage(
    `📅 การจองใหม่!\n\nผู้จอง: ${bookerName}\nวันที่: ${dateStr}\nเวลา: ${timeStr}\nระยะเวลา: ${booking.duration_minutes} นาที${booking.notes ? `\nหมายเหตุ: ${booking.notes}` : ""}\n\nพิมพ์ confirm หรือ decline เพื่อตอบกลับได้ทันที`
  );

  await client.pushMessage({
    to: mentor.line_user_id,
    messages: [message],
  });
}

export async function sendMentorSessionConfirmedNotification(
  mentor: MentorProfile,
  booking: MentorBooking & { discord_room: number }
): Promise<void> {
  if (!mentor.line_user_id) return;

  const client = getClient();
  const slotDate = new Date(booking.slot_datetime);
  const dateStr = slotDate.toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const timeStr = slotDate.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });

  const message = formatLineTextMessage(
    `✅ ยืนยันเซสชันแล้ว!\n\nวันที่: ${dateStr}\nเวลา: ${timeStr}\nระยะเวลา: ${booking.duration_minutes} นาที\n\n🎮 Discord Room: ${booking.discord_room}\n\n🔗 https://lin.ee/N5xIRuI`
  );

  await client.pushMessage({
    to: mentor.line_user_id,
    messages: [message],
  });
}

export async function sendLineWelcomeMessage(lineUserId: string, mentorName: string): Promise<void> {
  const client = getClient();
  const message = formatLineTextMessage(
    `เชื่อมต่อสำเร็จ! 🎉\n\nสวัสดีครับ/ค่ะ คุณ${mentorName}\nคุณจะได้รับการแจ้งเตือนผ่าน Line เมื่อมีการจองเซสชันกับคุณ`
  );
  await client.pushMessage({ to: lineUserId, messages: [message] });
}

export async function replyLineTextMessage(replyToken: string, text: string): Promise<void> {
  const client = getClient();
  await client.replyMessage({
    replyToken,
    messages: [formatLineTextMessage(text)],
  });
}
