"use server";

interface BetaSignupData {
  fullName: string;
  nickname: string;
  email: string;
  phone: string;
  school: string;
  grade: string;
  platform: string;
  motivation: string;
  facultyInterest: string;
}

export async function sendBetaSignupNotification(data: BetaSignupData) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("DISCORD_WEBHOOK_URL not set, skipping notification");
    return;
  }

  const platformEmoji = data.platform.toLowerCase().includes("ios")
    ? "📱"
    : data.platform.toLowerCase().includes("android")
      ? "🤖"
      : "📱";

  const embed = {
    title: "🚀 New Beta Registration",
    description: `Someone just signed up for the Passion Seed App Beta!`,
    color: 0x00c49f, // Green
    fields: [
      {
        name: "👤 Name",
        value: `${data.fullName} (${data.nickname})`,
        inline: true,
      },
      {
        name: "📧 Email",
        value: data.email,
        inline: true,
      },
      {
        name: "🏫 School",
        value: data.school,
        inline: true,
      },
      {
        name: "🎓 Grade",
        value: data.grade,
        inline: true,
      },
      {
        name: `${platformEmoji} Platform`,
        value: data.platform,
        inline: true,
      },
      {
        name: "🎯 Faculty Interest",
        value: data.facultyInterest || "Not specified",
        inline: true,
      },
      {
        name: "💭 Motivation",
        value: data.motivation.length > 200 
          ? data.motivation.substring(0, 200) + "..." 
          : data.motivation,
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "Passion Seed Beta Signups",
    },
  };

  const payload = {
    content: "@here New beta signup! 🎉",
    embeds: [embed],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        "Failed to send Discord notification:",
        response.status,
        await response.text()
      );
    }
  } catch (error) {
    console.error("Error sending Discord notification:", error);
  }
}
