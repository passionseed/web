import { NextRequest, NextResponse } from "next/server";
import {
  replyLineTextMessage,
  sendLineConnectCode,
  validateLineSignature,
} from "@/lib/hackathon/line";
import {
  getMentorByLineUserId,
  storeLineConnectCode,
} from "@/lib/hackathon/mentor-db";
import {
  getNextPendingBookingForMentor,
  updateMentorBookingStatus,
} from "@/lib/hackathon/mentor-booking-actions";
import { parseMentorBookingCommand } from "@/lib/hackathon/line-command";
import crypto from "crypto";

function generateConnectCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

function formatBangkokDateTime(slotDatetime: string): { date: string; time: string } {
  const slotDate = new Date(slotDatetime);
  return {
    date: slotDate.toLocaleDateString("th-TH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Bangkok",
    }),
    time: slotDate.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    }),
  };
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-line-signature");
  console.log("[line-webhook] received, signature:", signature ? "present" : "missing");

  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  console.log("[line-webhook] body:", body.slice(0, 200));

  let signatureValid = false;
  try {
    signatureValid = validateLineSignature(body, signature);
  } catch (err) {
    console.error("[line-webhook] signature validation threw:", err);
    return NextResponse.json({ error: "Signature validation error" }, { status: 500 });
  }

  if (!signatureValid) {
    console.error("[line-webhook] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  console.log("[line-webhook] events:", payload.events?.map((e: { type: string }) => e.type));

  for (const event of payload.events ?? []) {
    if (event.type === "follow" && event.source?.userId) {
      const lineUserId: string = event.source.userId;
      const code = generateConnectCode();
      console.log("[line-webhook] follow event, userId:", lineUserId, "code:", code);

      try {
        await storeLineConnectCode(lineUserId, code);
        await sendLineConnectCode(lineUserId, code);
        console.log("[line-webhook] code sent successfully");
      } catch (err) {
        console.error("[line-webhook] connect code error:", err);
      }
    }

    if (
      event.type === "message" &&
      event.message?.type === "text" &&
      event.source?.userId &&
      event.replyToken
    ) {
      const action = parseMentorBookingCommand(event.message.text);
      if (!action) continue;

      const mentor = await getMentorByLineUserId(event.source.userId);
      if (!mentor) {
        await replyLineTextMessage(
          event.replyToken,
          "ยังไม่พบบัญชีเมนเทอร์ที่เชื่อมกับ Line นี้ กรุณาเชื่อมต่อในหน้า Mentor Profile ก่อนนะครับ"
        );
        continue;
      }

      const booking = await getNextPendingBookingForMentor(mentor.id);
      if (!booking) {
        await replyLineTextMessage(
          event.replyToken,
          "ตอนนี้ไม่มีคำขอจองที่รอการยืนยันอยู่ครับ"
        );
        continue;
      }

      const result = await updateMentorBookingStatus(mentor, booking.id, action);
      if (!result.booking) {
        await replyLineTextMessage(
          event.replyToken,
          result.error ?? "ขออภัย เกิดข้อผิดพลาดในการอัปเดตสถานะการจอง"
        );
        continue;
      }

      const { date, time } = formatBangkokDateTime(result.booking.slot_datetime);
      const responseText =
        action === "confirmed"
          ? `ยืนยันการจองเรียบร้อยแล้ว\n\nวันที่: ${date}\nเวลา: ${time}${
              result.booking.discord_room !== null
                ? `\nDiscord Room: ${result.booking.discord_room}`
                : ""
            }`
          : `ปฏิเสธการจองเรียบร้อยแล้ว\n\nวันที่: ${date}\nเวลา: ${time}`;

      await replyLineTextMessage(event.replyToken, responseText);
    }
  }

  return NextResponse.json({ ok: true });
}
