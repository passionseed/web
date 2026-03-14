"use client";

import { useState } from "react";
import { InterviewChat } from "@/components/expert-interview/InterviewChat";
import { ProfileForm, type ProfileData } from "@/components/expert-interview/ProfileForm";
import { MentoringOptIn, type MentoringData } from "@/components/expert-interview/MentoringOptIn";
import { ThankYouPage } from "@/components/expert-interview/ThankYouPage";
import { HoneypotField } from "@/components/expert-interview/HoneypotField";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { Button } from "@/components/ui/button";
import type {
  ChatMessage,
  ExtractedCareerData,
  InterviewProgress,
  InterviewQuestion,
} from "@/types/expert-interview";

type Step = "loading" | "chat" | "profile" | "mentoring" | "done" | "error";

interface SessionData {
  sessionId: string;
  firstQuestion: InterviewQuestion;
  progress: InterviewProgress;
}

export default function ExpertInterviewPage() {
  const [step, setStep] = useState<Step>("loading");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedCareerData | null>(null);
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const { language, setLanguage } = useLanguage();

  const toggleLang = () => {
    setLanguage(language === "en" ? "th" : "en");
  };

  const content = {
    en: {
      title: "Share your career story",
      subtitle: "Answer 8 questions in about 10 minutes. We'll turn your experience into a career exploration for students.",
      stat1Title: "10 minutes",
      stat1Desc: "Quick conversational interview",
      stat2Title: "Your attribution",
      stat2Desc: "Your name on the PathLab we create",
      stat3Title: "Real impact",
      stat3Desc: "Students explore your career",
      startBtn: "Start the interview",
      startingBtn: "Starting...",
      errorLimit: "You've started too many interviews recently. Please try again in an hour.",
      errorGeneric: "Failed to start the interview. Please try again.",
      errorSubmit: "Failed to submit your interview. Please try again.",
      tryAgain: "Try again"
    },
    th: {
      title: "แบ่งปันเรื่องราวอาชีพของคุณ",
      subtitle: "ตอบคำถาม 8 ข้อในเวลาประมาณ 10 นาที เราจะเปลี่ยนประสบการณ์ของคุณให้เป็นการสำรวจอาชีพสำหรับนักเรียน",
      stat1Title: "10 นาที",
      stat1Desc: "สัมภาษณ์แบบสนทนาสั้นๆ",
      stat2Title: "เครดิตของคุณ",
      stat2Desc: "ชื่อของคุณบน PathLab ที่เราสร้างขึ้น",
      stat3Title: "ผลลัพธ์ที่แท้จริง",
      stat3Desc: "นักเรียนได้สำรวจอาชีพของคุณ",
      startBtn: "เริ่มการสัมภาษณ์",
      startingBtn: "กำลังเริ่ม...",
      errorLimit: "คุณเริ่มการสัมภาษณ์มากเกินไปเมื่อเร็วๆ นี้ กรุณาลองใหม่ในอีกหนึ่งชั่วโมง",
      errorGeneric: "ไม่สามารถเริ่มการสัมภาษณ์ได้ กรุณาลองใหม่อีกครั้ง",
      errorSubmit: "ไม่สามารถส่งการสัมภาษณ์ของคุณได้ กรุณาลองใหม่อีกครั้ง",
      tryAgain: "ลองใหม่อีกครั้ง"
    }
  };

  const t = content[language];

  const startSession = async () => {
    setIsStarting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/expert-interview/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: honeypot }),
      });

      if (response.status === 429) {
        setErrorMessage(t.errorLimit);
        setStep("error");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to start session");
      }

      const data = await response.json();
      setSessionData({
        sessionId: data.sessionId,
        firstQuestion: data.firstQuestion,
        progress: data.progress,
      });
      setStep("chat");
    } catch {
      setErrorMessage(t.errorGeneric);
      setStep("error");
    } finally {
      setIsStarting(false);
    }
  };

  const handleChatComplete = (data: ExtractedCareerData, messages: ChatMessage[]) => {
    setExtractedData(data);
    setTranscript(messages);
    setStep("profile");
  };

  const handleProfileSubmit = (data: ProfileData) => {
    setProfileData(data);
    setStep("mentoring");
  };

  const handleMentoringSubmit = async (mentoringData: MentoringData) => {
    if (!sessionData || !extractedData || !profileData) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/expert-interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          interviewData: extractedData,
          interviewTranscript: transcript,
          profile: profileData,
          mentoring: mentoringData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      setStep("done");
    } catch {
      setErrorMessage(t.errorSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-2xl mx-auto relative pt-16">
          <ThankYouPage />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLang}
          className="bg-gray-900/50 backdrop-blur-sm border-gray-800 hover:bg-gray-800 transition-all duration-300 text-gray-300"
        >
          {language === "en" ? "🇹🇭 TH" : "🇬🇧 EN"}
        </Button>
      </div>

      <HoneypotField value={honeypot} onChange={setHoneypot} />

      <div className="max-w-2xl mx-auto px-4 py-8 pt-24 sm:pt-16">
        {step === "loading" && (
          <div className="text-center py-24 space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">{t.title}</h1>
              <p className="text-gray-400 max-w-md mx-auto">
                {t.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-400 max-w-lg mx-auto">
              <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                <p className="font-medium text-white mb-1">{t.stat1Title}</p>
                <p>{t.stat1Desc}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                <p className="font-medium text-white mb-1">{t.stat2Title}</p>
                <p>{t.stat2Desc}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                <p className="font-medium text-white mb-1">{t.stat3Title}</p>
                <p>{t.stat3Desc}</p>
              </div>
            </div>

            <button
              onClick={startSession}
              disabled={isStarting}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium px-8 py-3 rounded-full transition-all duration-200 disabled:opacity-50"
            >
              {isStarting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isStarting ? t.startingBtn : t.startBtn}
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-24 space-y-4">
            <p className="text-red-400">{errorMessage}</p>
            <button
              onClick={() => { setStep("loading"); setErrorMessage(null); }}
              className="text-sm text-gray-400 underline"
            >
              {t.tryAgain}
            </button>
          </div>
        )}

        {step === "chat" && sessionData && (
          <div className="h-[80vh] bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <InterviewChat
              sessionId={sessionData.sessionId}
              firstQuestion={sessionData.firstQuestion}
              initialProgress={sessionData.progress}
              onComplete={handleChatComplete}
            />
          </div>
        )}

        {step === "profile" && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
            <ProfileForm onSubmit={handleProfileSubmit} />
          </div>
        )}

        {step === "mentoring" && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
            <MentoringOptIn onSubmit={handleMentoringSubmit} isLoading={isSubmitting} />
          </div>
        )}
      </div>
    </div>
  );
}
