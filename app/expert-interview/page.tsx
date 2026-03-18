"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { InterviewChat } from "@/components/expert-interview/InterviewChat";
import { ProfileForm, type ProfileData } from "@/components/expert-interview/ProfileForm";
import { MentoringOptIn, type MentoringData } from "@/components/expert-interview/MentoringOptIn";
import { ThankYouPage } from "@/components/expert-interview/ThankYouPage";
import { HoneypotField } from "@/components/expert-interview/HoneypotField";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
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

// Rising embers — fixed layout so they don't re-randomise on re-render
const EMBERS = [
  { left: "8%",  bottom: "12%", delay: "0s",    dur: "6.5s" },
  { left: "18%", bottom: "8%",  delay: "1.4s",  dur: "8s"   },
  { left: "29%", bottom: "15%", delay: "0.6s",  dur: "7s"   },
  { left: "41%", bottom: "5%",  delay: "2.3s",  dur: "5.8s" },
  { left: "53%", bottom: "18%", delay: "0.9s",  dur: "7.5s" },
  { left: "63%", bottom: "10%", delay: "1.8s",  dur: "6s"   },
  { left: "74%", bottom: "14%", delay: "3.1s",  dur: "5.2s" },
  { left: "83%", bottom: "7%",  delay: "0.3s",  dur: "8.5s" },
  { left: "22%", bottom: "22%", delay: "4.2s",  dur: "6.2s" },
  { left: "67%", bottom: "20%", delay: "1.1s",  dur: "7.2s" },
] as const;

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

  const toggleLang = () => setLanguage(language === "en" ? "th" : "en");

  // Mobile: trigger dusk button animations when button scrolls into center view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("in-view");
      }),
      { threshold: 0.5 }
    );
    document.querySelectorAll(".ei-button-dusk").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [step]);

  const content = {
    en: {
      title: "Your story can change\na student's future",
      subtitle: "You've walked a path that students are trying to find. Share it in 10 minutes — we'll turn it into a career exploration they can actually experience.",
      stat1Title: "10 minutes",   stat1Desc: "One conversation, at your pace",
      stat2Title: "Your credit",  stat2Desc: "Your name on every PathLab we build",
      stat3Title: "Real students", stat3Desc: "Exploring your exact career path",
      startBtn: "Start the interview", startingBtn: "Starting...",
      why1Title: "Give back what you were given",
      why1Body: "Someone opened a door for you once — a mentor, a chance conversation, a story that clicked. This is your chance to be that person for someone who hasn't found their path yet.",
      why2Title: "Leave something that lasts",
      why2Body: "Your interview becomes a 5-day curriculum. Your name stays on it permanently. Long after the conversation, students are still discovering your career through your story.",
      why3Title: "10 minutes. Real impact.",
      why3Body: "We know your time matters. That's exactly why we built this as a conversation, not a form. Answer 8 questions naturally, and we do the rest.",
      howTitle: "How it works",
      how1: "Chat with our AI interviewer",       how1Desc: "8 questions, conversational, about 10 minutes. No preparation needed.",
      how2: "We build a PathLab from your story", how2Desc: "Our team turns your interview into a 5-day career exploration curriculum.",
      how3: "Students discover your world",        how3Desc: "Hands-on activities, your real insights, your name on the experience.",
      bottomTitle: "Ready to share your story?",
      bottomSubtitle: "It takes 10 minutes. The impact lasts years.",
      footer: "Career exploration for students",
      errorLimit: "You've started too many interviews recently. Please try again in an hour.",
      errorGeneric: "Failed to start the interview. Please try again.",
      errorSubmit: "Failed to submit your interview. Please try again.",
      tryAgain: "Try again",
    },
    th: {
      title: "เรื่องราวของคุณ\nเปลี่ยนอนาคตนักเรียนได้",
      subtitle: "คุณเดินบนเส้นทางที่นักเรียนกำลังค้นหา แบ่งปันในเวลา 10 นาที แล้วเราจะเปลี่ยนเป็นการสำรวจอาชีพที่พวกเขาได้ลงมือทำจริง",
      stat1Title: "10 นาที",         stat1Desc: "สนทนาตามจังหวะของคุณ",
      stat2Title: "เครดิตของคุณ",   stat2Desc: "ชื่อของคุณบน PathLab ทุกอัน",
      stat3Title: "นักเรียนจริง",   stat3Desc: "สำรวจเส้นทางอาชีพของคุณโดยตรง",
      startBtn: "เริ่มการสัมภาษณ์", startingBtn: "กำลังเริ่ม...",
      why1Title: "ส่งต่อสิ่งที่คุณเคยได้รับ",
      why1Body: "มีคนเปิดประตูให้คุณครั้งหนึ่ง — พี่เลี้ยง การสนทนาที่บังเอิญ หรือเรื่องราวที่โดนใจ นี่คือโอกาสของคุณ",
      why2Title: "ทิ้งสิ่งที่ยั่งยืนไว้",
      why2Body: "การสัมภาษณ์ของคุณกลายเป็นหลักสูตร 5 วัน ชื่อของคุณอยู่บนนั้นตลอดไป นักเรียนยังค้นพบอาชีพของคุณผ่านเรื่องราวของคุณ",
      why3Title: "10 นาที ผลลัพธ์จริง",
      why3Body: "เราเข้าใจว่าเวลาของคุณมีค่า นั่นคือเหตุผลที่เราสร้างสิ่งนี้เป็นการสนทนา ตอบ 8 คำถามตามธรรมชาติ แล้วเราทำส่วนที่เหลือ",
      howTitle: "วิธีการทำงาน",
      how1: "สนทนากับ AI ของเรา",                  how1Desc: "8 คำถาม แบบสนทนา ประมาณ 10 นาที ไม่ต้องเตรียมตัว",
      how2: "เราสร้าง PathLab จากเรื่องราวของคุณ", how2Desc: "ทีมงานของเราเปลี่ยนการสัมภาษณ์เป็นหลักสูตรสำรวจอาชีพ 5 วัน",
      how3: "นักเรียนค้นพบโลกของคุณ",              how3Desc: "กิจกรรมลงมือทำ ข้อมูลเชิงลึกจริงของคุณ ชื่อของคุณบนประสบการณ์",
      bottomTitle: "พร้อมแบ่งปันเรื่องราวของคุณแล้วหรือยัง?",
      bottomSubtitle: "ใช้เวลาเพียง 10 นาที ผลกระทบอยู่ได้หลายปี",
      footer: "การสำรวจอาชีพสำหรับนักเรียน",
      errorLimit: "คุณเริ่มการสัมภาษณ์มากเกินไปเมื่อเร็วๆ นี้ กรุณาลองใหม่ในอีกหนึ่งชั่วโมง",
      errorGeneric: "ไม่สามารถเริ่มการสัมภาษณ์ได้ กรุณาลองใหม่อีกครั้ง",
      errorSubmit: "ไม่สามารถส่งการสัมภาษณ์ของคุณได้ กรุณาลองใหม่อีกครั้ง",
      tryAgain: "ลองใหม่อีกครั้ง",
    },
  };

  const t = content[language];

  const startSession = async () => {
    setIsStarting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/expert-interview/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: honeypot, language }),
      });
      if (response.status === 429) { setErrorMessage(t.errorLimit); setStep("error"); return; }
      if (!response.ok) throw new Error("Failed to start session");
      const data = await response.json();
      setSessionData({ sessionId: data.sessionId, firstQuestion: data.firstQuestion, progress: data.progress });
      setStep("chat");
    } catch {
      setErrorMessage(t.errorGeneric);
      setStep("error");
    } finally {
      setIsStarting(false);
    }
  };

  const handleChatComplete = (data: ExtractedCareerData, messages: ChatMessage[]) => {
    setExtractedData(data); setTranscript(messages); setStep("profile");
  };
  const handleProfileSubmit = (data: ProfileData) => { setProfileData(data); setStep("mentoring"); };

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
      if (response.status === 409 || response.ok) { setStep("done"); return; }
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

  // ── Chat ──────────────────────────────────────────────────────────────────
  if (step === "chat" && sessionData) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <InterviewChat
          sessionId={sessionData.sessionId}
          firstQuestion={sessionData.firstQuestion}
          initialProgress={sessionData.progress}
          onComplete={handleChatComplete}
        />
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#06000f] via-[#1e0440] to-[#3a0c28]">
        <div className="max-w-2xl mx-auto px-4 pt-16"><ThankYouPage /></div>
      </div>
    );
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  if (step === "profile" && sessionData) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
            <ProfileForm onSubmit={handleProfileSubmit} sessionId={sessionData.sessionId} />
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
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 space-y-4">
            <MentoringOptIn onSubmit={handleMentoringSubmit} isLoading={isSubmitting} />
            {errorMessage && <p className="text-sm text-red-400 text-center">{errorMessage}</p>}
          </div>
        </div>
      </div>
    );
  }

  // ── Landing — always Dusk ─────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen font-sans antialiased relative overflow-hidden text-white"
      style={{ background: "linear-gradient(to bottom, #06000f 0%, #1a0336 28%, #3b0764 58%, #4a1230 82%, #2a0818 100%)" }}
    >
      <HoneypotField value={honeypot} onChange={setHoneypot} />

      {/* ── Dusk atmosphere layer ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>

        {/* Cloud A — amber, top-left */}
        <div style={{
          position: "absolute", top: "-5%", left: "-10%",
          width: 640, height: 640, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(251,146,60,0.38) 0%, rgba(234,88,12,0.18) 45%, transparent 70%)",
          filter: "blur(72px)",
          animation: "dusk-cloud-a 14s ease-in-out infinite",
        }} />

        {/* Cloud B — rose/magenta, top-right */}
        <div style={{
          position: "absolute", top: "8%", right: "-14%",
          width: 560, height: 560, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(190,24,93,0.42) 0%, rgba(157,23,77,0.20) 45%, transparent 70%)",
          filter: "blur(64px)",
          animation: "dusk-cloud-b 18s ease-in-out infinite",
        }} />

        {/* Cloud C — deep violet with warm core, center-low (horizon glow) */}
        <div style={{
          position: "absolute", top: "40%", left: "18%",
          width: 700, height: 500, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(249,115,22,0.28) 0%, rgba(124,58,237,0.18) 50%, transparent 72%)",
          filter: "blur(80px)",
          animation: "dusk-cloud-c 22s ease-in-out infinite",
        }} />

        {/* Horizon warm glow — sun slowly rising */}
        <div style={{
          position: "absolute", bottom: "22%", left: "0%", right: "0%",
          height: 220,
          background: "radial-gradient(ellipse 75% 100% at 50% 100%, rgba(251,146,60,0.32) 0%, rgba(234,88,12,0.14) 45%, transparent 100%)",
          filter: "blur(52px)",
          transformOrigin: "bottom center",
          animation: "sun-rise 48s ease-in-out infinite",
        }} />

        {/* Dot grid — stars in the upper sky */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.07 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dusk-grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
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
              background: i % 2 === 0 ? "rgba(251,146,60,0.9)" : "rgba(249,115,22,0.85)",
              boxShadow: "0 0 4px rgba(251,146,60,0.8)",
              animation: `ember-rise ${e.dur} ease-in-out ${e.delay} infinite`,
            }}
          />
        ))}

        {/* Bottom fade to ground */}
        <div className="absolute bottom-0 left-0 right-0 h-48"
          style={{ background: "linear-gradient(to top, rgba(6,0,15,0.7), transparent)" }} />
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
              <Image src="/passionseed-logo.svg" alt="Passion Seed Logo" width={28} height={28}
                className="w-7 h-7 object-contain transition-transform group-hover:scale-105" />
              <span className="font-bold text-base text-white">Passion Seed</span>
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
            <button onClick={() => { setStep("loading"); setErrorMessage(null); }}
              className="text-sm text-gray-500 underline">{t.tryAgain}</button>
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
                <p className="text-gray-300/75 text-lg max-w-xl mx-auto leading-relaxed">{t.subtitle}</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
                {[
                  { title: t.stat1Title, desc: t.stat1Desc },
                  { title: t.stat2Title, desc: t.stat2Desc },
                  { title: t.stat3Title, desc: t.stat3Desc },
                ].map((s) => (
                  <div key={s.title} className="ei-card p-4">
                    <p className="font-semibold text-sm text-white mb-0.5">{s.title}</p>
                    <p className="text-xs leading-snug text-gray-300/70">{s.desc}</p>
                  </div>
                ))}
              </div>

              <button onClick={startSession} disabled={isStarting} className="ei-button-dusk">
                {isStarting ? (
                  <div className="flex items-center gap-2">
                    <div className="ei-loading-orbit">
                      <div className="ei-loading-planet" />
                      <div className="ei-loading-moon" />
                    </div>
                    <span>{t.startingBtn}</span>
                  </div>
                ) : (
                  t.startBtn
                )}
              </button>
            </section>

            {/* Why */}
            <section className="max-w-3xl mx-auto px-4 py-16 border-t border-white/[0.06]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: "🤝", title: t.why1Title, body: t.why1Body },
                  { icon: "✦",  title: t.why2Title, body: t.why2Body },
                  { icon: "⚡", title: t.why3Title, body: t.why3Body },
                ].map((w) => (
                  <div key={w.title} className="ei-card p-5 space-y-2">
                    <span className="text-lg">{w.icon}</span>
                    <p className="font-semibold text-sm text-white">{w.title}</p>
                    <p className="text-xs leading-relaxed text-gray-300/70">{w.body}</p>
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
                      <p className="font-semibold text-sm text-white">{s.title}</p>
                      <p className="text-xs mt-0.5 leading-relaxed text-gray-300/70">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom CTA */}
            <section className="max-w-3xl mx-auto px-4 py-16 border-t border-white/[0.06] text-center space-y-4">
              <p className="font-bold text-xl text-white">{t.bottomTitle}</p>
              <p className="text-sm text-gray-300/70">{t.bottomSubtitle}</p>
              <button onClick={startSession} disabled={isStarting} className="ei-button-dusk">
                {isStarting ? (
                  <div className="flex items-center gap-2">
                    <div className="ei-loading-orbit">
                      <div className="ei-loading-planet" />
                      <div className="ei-loading-moon" />
                    </div>
                    <span>{t.startingBtn}</span>
                  </div>
                ) : (
                  t.startBtn
                )}
              </button>
              <p className="text-xs text-gray-500/60 pt-2">Passion Seed · {t.footer}</p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
