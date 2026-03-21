"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { BackButton } from "../components/back-button";
import type { CollectedData, OnboardingStep } from "@/types/onboarding";

interface Props {
  data: CollectedData;
  advance: (_step: OnboardingStep, _updates: Partial<CollectedData>) => void;
  goBack: () => void | Promise<void>;
  isAnonymous: boolean;
}

const EDUCATION_COPY = {
  en: {
    high_school: "High School",
    university: "University",
    unaffiliated: "Other",
  },
  th: {
    high_school: "ม.ปลาย",
    university: "มหาวิทยาลัย",
    unaffiliated: "อื่นๆ",
  },
} as const;

export function AccountPhase({ data, isAnonymous, goBack }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("");
  const [education, setEducation] = useState<
    "high_school" | "university" | "unaffiliated"
  >("high_school");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEn = (data.language || "en") === "en";
  const educationCopy = EDUCATION_COPY[isEn ? "en" : "th"];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const body: Record<string, unknown> = {
      username,
      date_of_birth: dob,
      education_level: education,
      preferred_language: data.language || "en",
      interests: data.interests || [],
      collected_data: data,
    };

    if (isAnonymous) {
      body.email = email;
      body.password = password;
    }

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        if (response.status === 409) {
          setError(
            isEn
              ? "Account already exists. Sign in instead."
              : "มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ",
          );
        } else {
          setError(
            json?.error || (isEn ? "Something went wrong." : "เกิดข้อผิดพลาด"),
          );
        }
        return;
      }

      router.push("/me");
    } catch {
      setError(isEn ? "Something went wrong." : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md px-6">
      <div className="ei-card rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_80px_rgba(8,0,20,0.45)] sm:p-7">
        <div className="mb-4">
          <BackButton
            label={isEn ? "Back" : "ย้อนกลับ"}
            onClick={() => {
              void goBack();
            }}
          />
        </div>
        <div className="mb-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.26em] text-orange-300/70">
            {isEn ? "Finish Setup" : "ขั้นตอนสุดท้าย"}
          </p>
          <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
            {isEn ? "Last step — save your progress" : "ขั้นตอนสุดท้าย — บันทึกความคืบหน้า"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            {isAnonymous
              ? isEn
                ? "Create your account to save everything."
                : "สร้างบัญชีเพื่อบันทึกทุกอย่าง"
              : isEn
                ? "Complete your profile and we’ll take you straight into PassionSeed."
                : "ตั้งค่าโปรไฟล์ให้เสร็จ แล้วเราจะพาคุณเข้าสู่ PassionSeed ทันที"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isAnonymous ? (
            <>
              <input
                required
                type="email"
                placeholder={isEn ? "Email" : "อีเมล"}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none"
              />
              <input
                required
                type="password"
                minLength={8}
                placeholder={
                  isEn
                    ? "Password (min 8 characters)"
                    : "รหัสผ่าน (อย่างน้อย 8 ตัว)"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none"
              />
            </>
          ) : null}

          <input
            required
            placeholder={isEn ? "Username" : "ชื่อผู้ใช้"}
            value={username}
            onChange={(event) =>
              setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none"
          />

          <input
            required
            type="date"
            value={dob}
            onChange={(event) => setDob(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-violet-400 focus:outline-none"
          />

          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              {isEn ? "Education level" : "ระดับการศึกษา"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                ["high_school", "university", "unaffiliated"] as const
              ).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEducation(level)}
                  className={[
                    "rounded-2xl border px-3 py-2 text-xs font-medium transition-all",
                    education === level
                      ? "border-violet-400 bg-violet-400/12 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white",
                  ].join(" ")}
                >
                  {educationCopy[level]}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="text-center text-xs text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="ei-button-dusk mt-2 w-full justify-center py-3 text-sm font-semibold disabled:opacity-40"
          >
            {loading
              ? isEn
                ? "Saving..."
                : "กำลังบันทึก..."
              : isEn
                ? "Go to PassionSeed →"
                : "ไปที่ PassionSeed →"}
          </button>
        </form>
      </div>
    </div>
  );
}
