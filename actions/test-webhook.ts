"use server";

import { sendBetaSignupNotification } from "./discord-notifications";

export async function testDiscordWebhook() {
  // Test data simulating a beta signup
  const testData = {
    fullName: "Test User",
    nickname: "Testy",
    email: "test@example.com",
    phone: "+66 81 234 5678",
    school: "Test University",
    grade: "M.6",
    platform: "iOS",
    motivation: "I'm really excited to try out the new features and help improve the app!",
    facultyInterest: "Computer Science",
  };

  try {
    await sendBetaSignupNotification(testData);
    return { success: true, message: "Test notification sent to Discord" };
  } catch (error) {
    console.error("Test webhook failed:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
