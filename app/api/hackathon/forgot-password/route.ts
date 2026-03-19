import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { generateSessionToken } from "@/lib/hackathon/auth";
import {
  findParticipantByEmail,
  createPasswordResetToken,
} from "@/lib/hackathon/db";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const resendFromEmail =
  process.env.RESEND_FROM_EMAIL || "hi@noreply.passionseed.org";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const participant = await findParticipantByEmail(email);

    // Always return success to prevent email enumeration
    if (!participant) {
      return NextResponse.json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const token = generateSessionToken();
    await createPasswordResetToken(participant.id, token);

    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://passionseed.org";
    const resetUrl = `${appUrl}/hackathon/reset-password?token=${token}`;

    // Send email if Resend is configured
    if (resend) {
      try {
        await resend.emails.send({
          from: `The Next Decade Hackathon 2026 <${resendFromEmail}>`,
          to: email,
          subject: "Reset Your Password - The Next Decade Hackathon 2026",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #91C4E3;">Reset Your Password</h1>
              <p>Hi ${participant.name},</p>
              <p>We received a request to reset your password for The Next Decade Hackathon 2026.</p>
              <p>Click the button below to reset your password:</p>
              <div style="margin: 30px 0;">
                <a href="${resetUrl}"
                   style="background-color: #9D81AC; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                Or copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #91C4E3;">${resetUrl}</a>
              </p>
              <p style="color: #666; font-size: 14px;">
                This link will expire in 1 hour.
              </p>
              <p style="color: #666; font-size: 14px;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          `,
        });
        console.log(`Password reset email sent to ${email}`);
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // Continue even if email fails - show link in development
      }
    }

    return NextResponse.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
      // Only show reset URL in development mode when Resend is not configured
      resetUrl:
        !resend && process.env.NODE_ENV === "development"
          ? resetUrl
          : undefined,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
