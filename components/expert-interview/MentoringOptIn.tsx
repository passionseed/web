"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { MentoringPreference } from "@/types/expert-interview";
import { useLanguage } from "@/lib/i18n/language-context";

export interface MentoringData {
  preference: MentoringPreference;
  bookingUrl: string;
}

interface MentoringOptInProps {
  onSubmit: (data: MentoringData) => void;
  isLoading?: boolean;
}

export function MentoringOptIn({ onSubmit, isLoading }: MentoringOptInProps) {
  const { language } = useLanguage();
  const [preference, setPreference] = useState<MentoringPreference>("none");
  const [bookingUrl, setBookingUrl] = useState("");

  const content = {
    en: {
      title: "Mentoring preference",
      subtitle: "Would you like to offer mentoring sessions to students and parents?",
      options: [
        {
          value: "none" as MentoringPreference,
          label: "No mentoring",
          description: "Just contribute your career story",
        },
        {
          value: "free" as MentoringPreference,
          label: "Free sessions",
          description: "Offer occasional free sessions to students",
        },
        {
          value: "paid" as MentoringPreference,
          label: "Paid sessions",
          description: "Offer paid sessions to parents and students",
        },
      ],
      bookingLabel: "Booking link (optional)",
      bookingPlaceholder: "https://calendly.com/yourname",
      bookingHint: "Calendly, Cal.com, or any booking link",
      submit: "Submit",
      submitting: "Submitting...",
    },
    th: {
      title: "ความสนใจในการเป็นที่ปรึกษา",
      subtitle: "คุณต้องการเสนอเซสชั่นให้คำปรึกษาแก่นักเรียนและผู้ปกครองหรือไม่?",
      options: [
        {
          value: "none" as MentoringPreference,
          label: "ไม่รับเป็นที่ปรึกษา",
          description: "เพียงแค่ร่วมแบ่งปันเรื่องราวอาชีพของคุณ",
        },
        {
          value: "free" as MentoringPreference,
          label: "เซสชั่นฟรี",
          description: "เสนอเซสชั่นฟรีเป็นครั้งคราวให้กับนักเรียน",
        },
        {
          value: "paid" as MentoringPreference,
          label: "เซสชั่นแบบมีค่าใช้จ่าย",
          description: "เสนอเซสชั่นแบบมีค่าใช้จ่ายให้กับผู้ปกครองและนักเรียน",
        },
      ],
      bookingLabel: "ลิงก์การจอง (ไม่บังคับ)",
      bookingPlaceholder: "https://calendly.com/yourname",
      bookingHint: "Calendly, Cal.com หรือลิงก์การจองอื่นๆ",
      submit: "ส่งข้อมูล",
      submitting: "กำลังส่ง...",
    }
  };

  const t = content[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ preference, bookingUrl });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">{t.title}</h2>
        <p className="text-sm text-gray-400">
          {t.subtitle}
        </p>
      </div>

      <div className="space-y-3">
        {t.options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreference(option.value)}
            className={cn(
              "w-full text-left p-4 rounded-xl border transition-all duration-150",
              preference === option.value
                ? "border-purple-500 bg-purple-500/10"
                : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                  preference === option.value ? "border-purple-500" : "border-gray-600"
                )}
              >
                {preference === option.value && (
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{option.label}</p>
                <p className="text-xs text-gray-400">{option.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {preference === "paid" && (
        <div className="space-y-1">
          <Label htmlFor="bookingUrl" className="text-gray-300">{t.bookingLabel}</Label>
          <Input
            id="bookingUrl"
            value={bookingUrl}
            onChange={(e) => setBookingUrl(e.target.value)}
            placeholder={t.bookingPlaceholder}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
          <p className="text-xs text-gray-500">{t.bookingHint}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white"
      >
        {isLoading ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
