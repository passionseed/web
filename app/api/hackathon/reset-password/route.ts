import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/hackathon/auth";
import { getPasswordResetToken, markPasswordResetTokenAsUsed, updateParticipantPassword } from "@/lib/hackathon/db";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const resetToken = await getPasswordResetToken(token);
    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    await updateParticipantPassword(resetToken.participant_id, passwordHash);
    await markPasswordResetTokenAsUsed(token);

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
