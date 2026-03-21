"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { InterviewChat } from "@/components/expert-interview/InterviewChat";
import {
  ProfileForm,
  type ProfileData,
} from "@/components/expert-interview/ProfileForm";
import {
  MentoringOptIn,
  type MentoringData,
} from "@/components/expert-interview/MentoringOptIn";
import { ThankYouPage } from "@/components/expert-interview/ThankYouPage";
import { HoneypotField } from "@/components/expert-interview/HoneypotField";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import type {
  ChatMessage,
  ExtractedCareerData,
  InterviewProgress,
  InterviewQuestion,
  InterviewType,
} from "@/types/expert-interview";

type Step =
  | "loading"
  | "language-select"
  | "chat"
  | "profile"
  | "mentoring"
  | "done"
  | "error";

interface SessionData {
  sessionId: string;
  firstQuestion: InterviewQuestion;
  progress: InterviewProgress;
  interviewType: InterviewType;
}

// Rising embers — fixed layout so they don't re-randomise on re-render
const EMBERS = [
  { left: "8%", bottom: "12%", delay: "0s", dur: "6.5s" },
  { left: "18%", bottom: "8%", delay: "1.4s", dur: "8s" },
  { left: "29%", bottom: "15%", delay: "0.6s", dur: "7s" },
  { left: "41%", bottom: "5%", delay: "2.3s", dur: "5.8s" },
  { left: "53%", bottom: "18%", delay: "0.9s", dur: "7.5s" },
  { left: "63%", bottom: "10%", delay: "1.8s", dur: "6s" },
  { left: "74%", bottom: "14%", delay: "3.1s", dur: "5.2s" },
  { left: "83%", bottom: "7%", delay: "0.3s", dur: "8.5s" },
  { left: "22%", bottom: "22%", delay: "4.2s", dur: "6.2s" },
  { left: "67%", bottom: "20%", delay: "1.1s", dur: "7.2s" },
] as const;

export default function ExpertInterviewPage() {
  const searchParams = useSearchParams();
  const interviewType: InterviewType =
    searchParams.get("type") === "student" ? "student" : "expert";

  const [step, setStep] = useState<Step>("loading");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [extractedData, setExtractedData] =
    useState<ExtractedCareerData | null>(null);
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const { language, setLanguage } = useLanguage();

  const toggleLang = () => setLanguage(language === "en" ? "th" : "en");

  // Mobile: trigger dusk button animations when button scrolls into center view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in-view");
        }),
      { threshold: 0.5 },
    );
    document
      .querySelectorAll(".ei-button-dusk")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [step]);

  // Expert content (industry professionals)
  const expertContent = {
    en: {
      title: "Help students discover\nif your career fits them",
      subtitle:
        "Tell us what your job is really like — the boring parts, the hard parts, the moments that make it worth it. 10 minutes, 8 questions.",
      stat1Title: "10 min",
      stat1Desc: "One conversation",
      stat2Title: "Your name",
      stat2Desc: "On every quest we build",
      stat3Title: "Real impact",
      stat3Desc: "Students explore your career",
      startBtn: "Start",
      startingBtn: "Starting...",
      why1Title: "Students need the real story",
      why1Body:
        "Career websites show the polished version. Students need to know the unglamorous parts before committing years of their life.",
      why2Title: "Your insights become quests",
      why2Body:
        "We combine expert insights into 5-day career quests. Students do real tasks, 15 min/day, to discover if this path fits them.",
      why3Title: "Quick and lasting",
      why3Body:
        "Answer 8 questions naturally. We do the rest. Your name stays on the quest permanently.",
      howTitle: "How it works",
      how1: "Chat with AI",
      how1Desc: "8 questions, ~10 min. No prep needed.",
      how2: "We build quests",
      how2Desc: "Your insights + other experts → 5-day career exploration.",
      how3: "Students explore",
      how3Desc: "Real tasks, your insights, your name.",
      bottomTitle: "Ready to share?",
      bottomSubtitle: "10 minutes. Help someone avoid years of wrong turns.",
      footer: "Career exploration for students",
      errorLimit: "Too many attempts. Try again in an hour.",
      errorGeneric: "Failed to start. Please try again.",
      errorSubmit: "Failed to submit. Please try again.",
      tryAgain: "Try again",
    },
    th: {
      title: "ช่วยนักเรียนค้นหา\nว่าอาชีพของคุณ เหมาะกับเขาไหม",
      subtitle:
        "เล่าให้ฟังว่างานของคุณเป็นยังไงจริงๆ — ส่วนที่น่าเบื่อ ส่วนที่ยาก ช่วงเวลาที่ทำให้รู้สึกคุ้ม ใน 10 นาที 8 คำถาม",
      stat1Title: "เพียง 10 นาที",
      stat1Desc: "คำถามเกี่ยวกับงานของคุณ",
      stat2Title: "เครดิตคุณ",
      stat2Desc: "บนภารกิจทุกอันที่สร้าง",
      stat3Title: "ผลกระทบจริง",
      stat3Desc: "นักเรียนเทสอาชีพคุณก่อนล็อคคณะ",
      startBtn: "เริ่มคุยเลย",
      startingBtn: "กำลังเริ่ม...",
      why1Title: "นักเรียนต้องการเรื่องจริง",
      why1Body:
        "เว็บไซต์แสดงแค่เวอร์ชันสวยงาม นักเรียนต้องรู้ความจริง ก่อนจะลงทุนเงินและเวลาหลายปี",
      why2Title: "ประสบการณ์คุณคือแผนที่",
      why2Body:
        "เรารวมข้อมูลผู้เชี่ยวชาญเป็นภารกิจ 5 วัน นักเรียนลองทำงานจริง 15 นาทีต่อวัน เพื่อค้นหาว่าเส้นทางนี้ใช่ไหม",
      why3Title: "เร็วและง่าย",
      why3Body:
        "ตอบ 8 คำถามตามความจริง เราทำส่วนที่เหลือเพื่อช่วยให้นักเรียนไม่เลือกทางผิด",
      howTitle: "วิธีการทำงาน",
      how1: "คุยกับ AI",
      how1Desc: "8 คำถาม ประมาณ 10 นาที ไม่ต้องเตรียมตัว",
      how2: "เราสร้างภารกิจ",
      how2Desc: "ข้อมูลคุณ + ผู้เชี่ยวชาญอื่น → ภารกิจสำรวจ 5 วัน",
      how3: "นักเรียนลองทำเพื่อเทส",
      how3Desc: "งานจริง รวมข้อมูลจากโปรในสายงานจริง",
      bottomTitle: "พร้อมแบ่งปันหรือยัง?",
      bottomSubtitle: "10 นาที ช่วยใครสักคนให้ไม่ต้องเดินผิดทางหลายปี",
      footer: "สำรวจอาชีพสำหรับนักเรียน",
      errorLimit: "พยายามมากเกินไป ลองใหม่ในอีกหนึ่งชั่วโมง",
      errorGeneric: "เริ่มไม่สำเร็จ กรุณาลองใหม่",
      errorSubmit: "ส่งไม่สำเร็จ กรุณาลองใหม่",
      tryAgain: "ลองใหม่",
    },
  };

  // Student content (university students sharing program insights)
  const studentContent = {
    en: {
      title: "Help high schoolers\nchoose the right program",
      subtitle:
        "You know what your program is really like. Tell us in 10 minutes — the workload, the culture, what makes it different.",
      stat1Title: "10 min",
      stat1Desc: "One conversation",
      stat2Title: "Your name",
      stat2Desc: "On every guide we build",
      stat3Title: "Real impact",
      stat3Desc: "Students explore your program",
      startBtn: "Start",
      startingBtn: "Starting...",
      why1Title: "Only students know the truth",
      why1Body:
        "Websites show the polished version. High schoolers need to know the tough courses, the boring parts, before committing years.",
      why2Title: "Your insights become guides",
      why2Body:
        "We combine student insights into program guides that help high schoolers understand what they're signing up for.",
      why3Title: "Quick and lasting",
      why3Body:
        "Answer 8 questions naturally. We do the rest. Your name stays on the guide permanently.",
      howTitle: "How it works",
      how1: "Chat with AI",
      how1Desc: "8 questions, ~10 min. No prep needed.",
      how2: "We build guides",
      how2Desc: "Your insights + other students → program exploration guides.",
      how3: "Students explore",
      how3Desc: "Real insights, your name on the experience.",
      bottomTitle: "Ready to share?",
      bottomSubtitle: "10 minutes. Help someone choose wisely.",
      footer: "Program exploration for students",
      errorLimit: "Too many attempts. Try again in an hour.",
      errorGeneric: "Failed to start. Please try again.",
      errorSubmit: "Failed to submit. Please try again.",
      tryAgain: "Try again",
    },
    th: {
      title: "ช่วยน้องๆ เลือกโปรแกรม\nที่ใช่สำหรับตัวเอง",
      subtitle:
        "คุณรู้ว่าโปรแกรมเป็นยังไงจริงๆ เล่าให้ฟัง 10 นาที — ภาระงาน บรรยากาศ อะไรที่ทำให้ต่างจากที่อื่น",
      stat1Title: "10 นาที",
      stat1Desc: "สนทนาครั้งเดียว",
      stat2Title: "ชื่อคุณ",
      stat2Desc: "บนคู่มือทุกอันที่สร้าง",
      stat3Title: "ผลกระทบจริง",
      stat3Desc: "นักเรียนสำรวจโปรแกรมคุณ",
      startBtn: "เริ่มเลย",
      startingBtn: "กำลังเริ่ม...",
      why1Title: "มีแค่นักศึกษารู้ความจริง",
      why1Body:
        "เว็บไซต์แสดงแค่เวอร์ชันสวยงาม น้องๆ ต้องรู้วิชาที่ยาก ส่วนที่น่าเบื่อ ก่อนจะลงทุนเวลาหลายปี",
      why2Title: "ข้อมูลคุณกลายเป็นคู่มือ",
      why2Body:
        "เรารวมข้อมูลนักศึกษาเป็นคู่มือโปรแกรมที่ช่วยให้น้องๆ เข้าใจว่ากำลังจะเข้าอะไร",
      why3Title: "เร็วและยั่งยืน",
      why3Body:
        "ตอบ 8 คำถามตามธรรมชาติ เราทำส่วนที่เหลือ ชื่อคุณอยู่บนคู่มือตลอดไป",
      howTitle: "วิธีการทำงาน",
      how1: "สนทนากับ AI",
      how1Desc: "8 คำถาม ประมาณ 10 นาที ไม่ต้องเตรียมตัว",
      how2: "เราสร้างคู่มือ",
      how2Desc: "ข้อมูลคุณ + นักศึกษาอื่น → คู่มือสำรวจโปรแกรม",
      how3: "น้องๆ สำรวจ",
      how3Desc: "ข้อมูลจริง ชื่อคุณบนประสบการณ์",
      bottomTitle: "พร้อมแบ่งปัน?",
      bottomSubtitle: "10 นาที ช่วยใครสักคนเลือกให้ถูกต้อง",
      footer: "การสำรวจโปรแกรมสำหรับนักเรียน",
      errorLimit: "พยายามมากเกินไป ลองใหม่ในอีกหนึ่งชั่วโมง",
      errorGeneric: "เริ่มไม่สำเร็จ กรุณาลองใหม่",
      errorSubmit: "ส่งไม่สำเร็จ กรุณาลองใหม่",
      tryAgain: "ลองใหม่",
    },
  };

  // Select content based on interview type
  const content = interviewType === "student" ? studentContent : expertContent;

  const t = content[language];

  const startSession = async (lang?: "en" | "th") => {
    const selectedLang = lang ?? language;
    if (lang) setLanguage(lang);
    setIsStarting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/expert-interview/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: honeypot,
          language: selectedLang,
          type: interviewType,
        }),
      });
      if (response.status === 429) {
        setErrorMessage(t.errorLimit);
        setStep("error");
        return;
      }
      if (!response.ok) throw new Error("Failed to start session");
      const data = await response.json();
      setSessionData({
        sessionId: data.sessionId,
        firstQuestion: data.firstQuestion,
        progress: data.progress,
        interviewType: data.interviewType || interviewType,
      });
      setStep("chat");
    } catch {
      setErrorMessage(t.errorGeneric);
      setStep("error");
    } finally {
      setIsStarting(false);
    }
  };

  const handleChatComplete = (
    data: ExtractedCareerData,
    messages: ChatMessage[],
  ) => {
    setExtractedData(data);
    setTranscript(messages);
    setStep("profile");
  };
  const handleProfileSubmit = (data: ProfileData) => {
    setProfileData(data);
    setStep("mentoring");
  };

  const handleMentoringSubmit = async (mentoringData: MentoringData) => {
    if (!sessionData || !extractedData || !profileData) {
      console.error("[mentoring-submit] Missing required data", {
        hasSessionData: !!sessionData,
        hasExtractedData: !!extractedData,
        hasProfileData: !!profileData,
      });
      setErrorMessage(t.errorSubmit);
      return;
    }

    const payload = {
      sessionId: sessionData.sessionId,
      interviewData: extractedData,
      interviewTranscript: transcript,
      profile: profileData,
      mentoring: mentoringData,
    };
    console.log("[mentoring-submit] Sending payload", payload);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/expert-interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 409 || response.ok) {
        setStep("done");
        return;
      }
      const errorData = await response.json();
      console.error("[mentoring-submit] Server error", errorData);
      console.error("[mentoring-submit] Profile data was:", profileData);
      throw new Error("Failed to submit");
    } catch (err) {
      console.error("[mentoring-submit] Submit failed", err);
      setErrorMessage(t.errorSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Language selection ────────────────────────────────────────────────────
  if (step === "language-select") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{
          background:
            "linear-gradient(to bottom, #06000f 0%, #1a0336 40%, #3b0764 100%)",
        }}
      >
        <div className="w-full max-w-xs space-y-8 text-center">
          <div className="space-y-2">
            <p className="text-white text-2xl font-bold">
              Choose your language
            </p>
            <p className="text-white/60 text-base">เลือกภาษาที่ต้องการ</p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => startSession("en")}
              disabled={isStarting}
              className="w-full py-5 rounded-2xl bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.10] hover:border-white/[0.22] transition-all text-white text-lg font-semibold flex items-center justify-center gap-3 active:scale-[0.97]"
            >
              <span className="text-2xl">🇬🇧</span> English
            </button>
            <button
              onClick={() => startSession("th")}
              disabled={isStarting}
              className="w-full py-5 rounded-2xl bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.10] hover:border-white/[0.22] transition-all text-white text-lg font-semibold flex items-center justify-center gap-3 active:scale-[0.97]"
            >
              <span className="text-2xl">🇹🇭</span> ภาษาไทย
            </button>
          </div>

          {isStarting && (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <div className="ei-loading-orbit">
                <div className="ei-loading-planet" />
                <div className="ei-loading-moon" />
              </div>
              <span>{t.startingBtn}</span>
            </div>
          )}

          <button
            onClick={() => setStep("loading")}
            className="text-sm text-gray-600 hover:text-gray-400 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  if (step === "chat" && sessionData) {
    return (
      <div className="fixed inset-0 z-50" style={{ background: "linear-gradient(to bottom, #06000f 0%, #1a0336 28%, #3b0764 58%, #4a1230 82%, #2a0818 100%)" }}>
        <InterviewChat
          sessionId={sessionData.sessionId}
          firstQuestion={sessionData.firstQuestion}
          initialProgress={sessionData.progress}
          interviewType={sessionData.interviewType}
          onComplete={handleChatComplete}
        />
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#06000f] via-[#1e0440] to-[#3a0c28]">
        <div className="max-w-2xl mx-auto px-4 pt-16">
          <ThankYouPage />
        </div>
      </div>
    );
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  if (step === "profile" && sessionData) {
    return (
      <div
        className="min-h-screen text-white"
        style={{
          background:
            "linear-gradient(to bottom, #06000f 0%, #1a0336 28%, #3b0764 58%, #4a1230 82%, #2a0818 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="ei-card rounded-[24px] border border-white/10 bg-white/[0.04] p-8">
            <ProfileForm
              onSubmit={handleProfileSubmit}
              sessionId={sessionData.sessionId}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Mentoring ─────────────────────────────────────────────────────────────
  if (step === "mentoring") {
    // Safety check: if we don't have profile data, go back to profile step
    if (!profileData && sessionData) {
      setStep("profile");
      return null;
    }

    return (
      <div
        className="min-h-screen text-white"
        style={{
          background:
            "linear-gradient(to bottom, #06000f 0%, #1a0336 28%, #3b0764 58%, #4a1230 82%, #2a0818 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="ei-card rounded-[24px] border border-white/10 bg-white/[0.04] p-8 space-y-4">
            <MentoringOptIn
              onSubmit={handleMentoringSubmit}
              isLoading={isSubmitting}
            />
            {errorMessage && (
              <p className="text-sm text-red-400 text-center">{errorMessage}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Landing — always Dusk ─────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen font-sans antialiased relative overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(to bottom, #06000f 0%, #1a0336 28%, #3b0764 58%, #4a1230 82%, #2a0818 100%)",
      }}
    >
      <HoneypotField value={honeypot} onChange={setHoneypot} />

      {/* ── Dusk atmosphere layer ── */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        {/* Cloud A — amber, top-left */}
        <div
          style={{
            position: "absolute",
            top: "-5%",
            left: "-10%",
            width: 640,
            height: 640,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(251,146,60,0.38) 0%, rgba(234,88,12,0.18) 45%, transparent 70%)",
            filter: "blur(72px)",
            animation: "dusk-cloud-a 14s ease-in-out infinite",
          }}
        />

        {/* Cloud B — rose/magenta, top-right */}
        <div
          style={{
            position: "absolute",
            top: "8%",
            right: "-14%",
            width: 560,
            height: 560,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(190,24,93,0.42) 0%, rgba(157,23,77,0.20) 45%, transparent 70%)",
            filter: "blur(64px)",
            animation: "dusk-cloud-b 18s ease-in-out infinite",
          }}
        />

        {/* Cloud C — deep violet with warm core, center-low (horizon glow) */}
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "18%",
            width: 700,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(249,115,22,0.28) 0%, rgba(124,58,237,0.18) 50%, transparent 72%)",
            filter: "blur(80px)",
            animation: "dusk-cloud-c 22s ease-in-out infinite",
          }}
        />

        {/* Horizon warm glow — sun slowly rising */}
        <div
          style={{
            position: "absolute",
            bottom: "22%",
            left: "0%",
            right: "0%",
            height: 220,
            background:
              "radial-gradient(ellipse 75% 100% at 50% 100%, rgba(251,146,60,0.32) 0%, rgba(234,88,12,0.14) 45%, transparent 100%)",
            filter: "blur(52px)",
            transformOrigin: "bottom center",
            animation: "sun-rise 48s ease-in-out infinite",
          }}
        />

        {/* Dot grid — stars in the upper sky */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.07 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="dusk-grid"
              x="0"
              y="0"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="50%" fill="url(#dusk-grid)" />
        </svg>

        {/* Rising embers */}
        {EMBERS.map((e, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: e.left,
              bottom: e.bottom,
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              borderRadius: "50%",
              background:
                i % 2 === 0 ? "rgba(251,146,60,0.9)" : "rgba(249,115,22,0.85)",
              boxShadow: "0 0 4px rgba(251,146,60,0.8)",
              animation: `ember-rise ${e.dur} ease-in-out ${e.delay} infinite`,
            }}
          />
        ))}

        {/* Bottom fade to ground */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48"
          style={{
            background:
              "linear-gradient(to top, rgba(6,0,15,0.7), transparent)",
          }}
        />
      </div>

      {/* ── Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <nav
          className="border-b"
          style={{
            background: "rgba(6,0,15,0.65)",
            backdropFilter: "blur(16px)",
            borderColor: "rgba(255,255,255,0.04)",
          }}
        >
          <div className="container px-4 md:px-6 h-16 flex items-center justify-between max-w-7xl mx-auto">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/passionseed-logo.svg"
                alt="Passion Seed Logo"
                width={28}
                height={28}
                className="w-7 h-7 object-contain transition-transform group-hover:scale-105"
              />
              <span className="font-bold text-base text-white">
                Passion Seed
              </span>
            </Link>

            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.14]"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === "en" ? "TH" : "EN"}</span>
            </button>
          </div>
        </nav>
      </header>

      {/* ── Content ── */}
      <div className="relative pt-16">
        {step === "error" && (
          <div className="max-w-3xl mx-auto px-4 text-center py-24 space-y-4">
            <p className="text-red-400">{errorMessage}</p>
            <button
              onClick={() => {
                setStep("loading");
                setErrorMessage(null);
              }}
              className="text-sm text-gray-500 underline"
            >
              {t.tryAgain}
            </button>
          </div>
        )}

        {step === "loading" && (
          <>
            {/* Hero */}
            <section className="max-w-3xl mx-auto px-4 pt-20 pb-16 text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight whitespace-pre-line">
                  {t.title}
                </h1>
                <p className="text-gray-300/75 text-lg max-w-xl mx-auto leading-relaxed">
                  {t.subtitle}
                </p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
                {[
                  { title: t.stat1Title, desc: t.stat1Desc },
                  { title: t.stat2Title, desc: t.stat2Desc },
                  { title: t.stat3Title, desc: t.stat3Desc },
                ].map((s) => (
                  <div key={s.title} className="ei-card p-4">
                    <p className="font-semibold text-sm text-white mb-0.5">
                      {s.title}
                    </p>
                    <p className="text-xs leading-snug text-gray-300/70">
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep("language-select")}
                disabled={isStarting}
                className="ei-button-dusk"
              >
                {t.startBtn}
              </button>
            </section>

            {/* Why */}
            <section className="max-w-3xl mx-auto px-4 py-16 border-t border-white/[0.06]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: "🤝", title: t.why1Title, body: t.why1Body },
                  { icon: "✦", title: t.why2Title, body: t.why2Body },
                  { icon: "⚡", title: t.why3Title, body: t.why3Body },
                ].map((w) => (
                  <div key={w.title} className="ei-card p-5 space-y-2">
                    <span className="text-lg">{w.icon}</span>
                    <p className="font-semibold text-sm text-white">
                      {w.title}
                    </p>
                    <p className="text-xs leading-relaxed text-gray-300/70">
                      {w.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* How it works */}
            <section className="max-w-3xl mx-auto px-4 py-16 border-t border-white/[0.06] space-y-6">
              <h2 className="text-xl font-bold text-white">{t.howTitle}</h2>
              <div className="space-y-3">
                {[
                  { n: "1", title: t.how1, desc: t.how1Desc },
                  { n: "2", title: t.how2, desc: t.how2Desc },
                  { n: "3", title: t.how3, desc: t.how3Desc },
                ].map((s) => (
                  <div key={s.n} className="ei-card flex items-start gap-4 p-5">
                    <span className="shrink-0 h-7 w-7 rounded-full bg-orange-500/20 text-orange-300 text-xs font-bold flex items-center justify-center">
                      {s.n}
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-white">
                        {s.title}
                      </p>
                      <p className="text-xs mt-0.5 leading-relaxed text-gray-300/70">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom CTA */}
            <section className="max-w-3xl mx-auto px-4 py-16 border-t border-white/[0.06] text-center space-y-4">
              <p className="font-bold text-xl text-white">{t.bottomTitle}</p>
              <p className="text-sm text-gray-300/70">{t.bottomSubtitle}</p>
              <button
                onClick={() => setStep("language-select")}
                disabled={isStarting}
                className="ei-button-dusk"
              >
                {t.startBtn}
              </button>
              <p className="text-xs text-gray-500/60 pt-2">
                Passion Seed · {t.footer}
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
