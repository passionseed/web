import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Test endpoint to verify Discord bot configuration
 * GET /api/test-discord?discord_uid=YOUR_DISCORD_UID
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const testDiscordUid = searchParams.get("discord_uid");

    // Check if user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 }
        );
    }

    // Check bot token configuration
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const checks = {
        botTokenExists: !!botToken,
        botTokenLength: botToken ? botToken.length : 0,
        botTokenPrefix: botToken ? botToken.substring(0, 10) + "..." : "NOT SET",
        testDiscordUidProvided: !!testDiscordUid,
        authenticatedUser: user.email,
    };

    console.log("[Discord Test] Configuration check:", checks);

    // If discord_uid provided, try to send a test DM
    if (testDiscordUid && botToken) {
        try {
            console.log("[Discord Test] Attempting to send test DM to:", testDiscordUid);

            // Step 1: Create DM channel
            const dmChannelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
                method: 'POST',
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipient_id: testDiscordUid,
                }),
            });

            if (!dmChannelResponse.ok) {
                const error = await dmChannelResponse.text();
                console.error("[Discord Test] Failed to create DM channel:", error);
                return NextResponse.json({
                    ...checks,
                    dmTest: {
                        success: false,
                        step: "create_dm_channel",
                        status: dmChannelResponse.status,
                        error: error,
                    }
                });
            }

            const dmChannel = await dmChannelResponse.json();
            console.log("[Discord Test] DM channel created:", dmChannel.id);

            // Step 2: Send test message
            const testMessage = `🧪 **Discord Bot Test**\n\n` +
                `This is a test message from your PassionSeed application.\n` +
                `If you received this, the Discord bot is configured correctly!\n\n` +
                `Tested by: ${user.email}\n` +
                `Time: ${new Date().toLocaleString()}`;

            const sendMessageResponse = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bot ${botToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: testMessage,
                }),
            });

            if (!sendMessageResponse.ok) {
                const error = await sendMessageResponse.text();
                console.error("[Discord Test] Failed to send message:", error);
                return NextResponse.json({
                    ...checks,
                    dmTest: {
                        success: false,
                        step: "send_message",
                        status: sendMessageResponse.status,
                        error: error,
                    }
                });
            }

            console.log("[Discord Test] ✅ Test message sent successfully");

            return NextResponse.json({
                ...checks,
                dmTest: {
                    success: true,
                    message: "Test DM sent successfully! Check your Discord.",
                }
            });

        } catch (error) {
            console.error("[Discord Test] Unexpected error:", error);
            return NextResponse.json({
                ...checks,
                dmTest: {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                }
            });
        }
    }

    return NextResponse.json(checks);
}
