"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { PhaseShell } from "../components/phase-shell";
import {
  dateOfBirthProblem,
  normalizeDateOfBirth,
  requiresGuardianConsent,
  type DateOfBirthProblem,
} from "@/lib/profile-completion";
import type { CollectedData, OnboardingStep } from "@/types/onboarding";

export type AccountPrefill = {
  full_name: string | null;
  username: string | null;
  date_of_birth: string | null;
  education_level: "high_school" | "university" | "unaffiliated" | null;
};

interface Props {
  data: CollectedData;
  advance: (_step: OnboardingStep, _updates: Partial<CollectedData>) => void;
  goBack: () => void | Promise<void>;
  isAnonymous: boolean;
  prefill?: AccountPrefill | null;
  /** Same-origin path to land on after onboarding, e.g. a lobby join link. */
  nextAfterOnboarding?: string | null;
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

const DOB_PROBLEM_COPY: Record<"en" | "th", Record<DateOfBirthProblem, string>> = {
  en: {
    invalid: "Please enter a valid date of birth.",
    too_young: "That date looks too recent. Please check the year of your birth.",
    too_old: "That date looks too far back. Please check the year of your birth.",
  },
  th: {
    invalid: "กรุณาใส่วันเกิดให้ถูกต้อง",
    too_young: "วันเกิดนี้ดูใหม่เกินไป ลองเช็กปีเกิดอีกครั้งนะ",
    too_old: "วันเกิดนี้ดูเก่าเกินไป ลองเช็กปีเกิดอีกครั้งนะ",
  },
};

const INPUT_CLASS =
  "min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-blue-400/50 focus:outline-none transition";

export function AccountPhase({
  data,
  isAnonymous,
  goBack,
  prefill,
  nextAfterOnboarding,
}: Props) {
  const [fullName, setFullName] = useState(
    () => prefill?.full_name?.trim() || data.name?.trim() || ""
  );
  const [username, setUsername] = useState(
    () => prefill?.username?.trim() || ""
  );
  const [dob, setDob] = useState(() => prefill?.date_of_birth || "");
  const [education, setEducation] = useState<
    "high_school" | "university" | "unaffiliated"
  >(prefill?.education_level || "high_school");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [guardianApproved, setGuardianApproved] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const isEn = (data.language || "th") === "en";
  const educationCopy = EDUCATION_COPY[isEn ? "en" : "th"];
  // Thai students often type the Buddhist Era year; store it as Gregorian.
  const normalizedDob = dob ? normalizeDateOfBirth(dob) : "";
  const dobProblem = normalizedDob ? dateOfBirthProblem(normalizedDob) : null;
  const needsGuardian = Boolean(
    normalizedDob && !dobProblem && requiresGuardianConsent(normalizedDob)
  );
  // Shown live, so a bad saved date is flagged before the learner submits.
  const dobError =
    fieldErrors.dob ||
    (dobProblem ? DOB_PROBLEM_COPY[isEn ? "en" : "th"][dobProblem] : "");

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = isEn
        ? "Please enter your full name."
        : "กรุณากรอกชื่อ-นามสกุล";
    }

    if (!username.trim()) {
      errors.username = isEn
        ? "Please choose a username."
        : "กรุณาตั้งชื่อผู้ใช้";
    } else if (username.trim().length < 3) {
      errors.username = isEn
        ? "Username must be at least 3 characters."
        : "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร";
    }

    if (!dob) {
      errors.dob = isEn
        ? "Please select your date of birth."
        : "กรุณาใส่วันเกิดของคุณ";
    } else if (dobProblem) {
      errors.dob = DOB_PROBLEM_COPY[isEn ? "en" : "th"][dobProblem];
    }

    if (isAnonymous) {
      if (!email.trim() || !email.includes("@")) {
        errors.email = isEn
          ? "Please enter a valid email address."
          : "กรุณากรอกอีเมลที่ถูกต้อง";
      }
      if (!password || password.length < 8) {
        errors.password = isEn
          ? "Password must be at least 8 characters."
          : "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
      }
    }

    if (needsGuardian) {
      if (!guardianRelationship.trim()) {
        errors.guardianRelationship = isEn
          ? "Please enter relationship (e.g. Mom, Dad)."
          : "กรุณาระบุความสัมพันธ์ (เช่น แม่, พ่อ)";
      }
      if (!guardianPhone.trim()) {
        errors.guardianPhone = isEn
          ? "Please enter guardian phone number."
          : "กรุณากรอกเบอร์โทรผู้ปกครอง";
      }
      if (!guardianApproved) {
        errors.guardianApproved = isEn
          ? "Parent or guardian approval is required."
          : "กรุณายืนยันการอนุญาตจากผู้ปกครอง";
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(
        isEn
          ? "Please fill in all required fields."
          : "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน"
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    if (!validate()) {
      return;
    }

    setLoading(true);
    setError("");

    const collected = {
      ...data,
      name: fullName.trim() || data.name,
    };

    const body: Record<string, unknown> = {
      username: username.trim().toLowerCase(),
      full_name: fullName.trim(),
      date_of_birth: normalizedDob,
      education_level: education,
      preferred_language: data.language || "th",
      interests: data.interests || [],
      collected_data: collected,
    };

    if (isAnonymous) {
      body.email = email.trim().toLowerCase();
      body.password = password;
    }

    if (needsGuardian) {
      body.guardian_phone = guardianPhone.trim();
      body.guardian_relationship = guardianRelationship.trim();
      body.guardian_approved = true;
    }

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await response.json().catch(() => null)) as {
        error?: string;
        ok?: boolean;
      } | null;

      if (!response.ok) {
        if (response.status === 401) {
          setError(isEn ? "Wrong password." : "รหัสผ่านไม่ถูกต้อง");
        } else if (response.status === 409) {
          setError(
            isEn
              ? "This username is already taken. Please try another."
              : "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น"
          );
          setFieldErrors((prev) => ({
            ...prev,
            username: isEn ? "Username taken" : "ชื่อผู้ใช้ซ้ำ",
          }));
        } else {
          setError(
            json?.error ||
              (isEn ? "Something went wrong. Please try again." : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง")
          );
        }
        return;
      }

      // Hard redirect to ensure full reload of session cookies and profile.
      // Honors the join link the user arrived from, when there was one.
      window.location.assign(nextAfterOnboarding ?? "/me");
    } catch {
      setError(
        isEn
          ? "Network error. Please check your connection and try again."
          : "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhaseShell
      eyebrow={isEn ? "Finish Setup" : "ขั้นตอนสุดท้าย"}
      title={
        isEn
          ? "Last step — save your progress"
          : "ขั้นตอนสุดท้าย — บันทึกความคืบหน้า"
      }
      subtitle={
        isAnonymous
          ? isEn
            ? "Create your account to save everything."
            : "สร้างบัญชีเพื่อบันทึกทุกอย่าง"
          : isEn
            ? "Complete your profile and we’ll take you into PassionSeed."
            : "ตั้งค่าโปรไฟล์ให้เสร็จ แล้วเข้าสู่ PassionSeed"
      }
      backLabel={isEn ? "Back" : "ย้อนกลับ"}
      onBack={() => {
        void goBack();
      }}
      footer={
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading}
          className="ei-button-dawn min-h-12 w-full justify-center py-3.5 text-base font-semibold disabled:opacity-50 sm:min-h-0 sm:py-3 sm:text-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isEn ? "Saving..." : "กำลังบันทึก..."}</span>
            </span>
          ) : isEn ? (
            "Go to PassionSeed →"
          ) : (
            "ไปที่ PassionSeed →"
          )}
        </button>
      }
    >
      <form
        id="onboard-account-form"
        noValidate
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-4"
      >
        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {isAnonymous ? (
          <>
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                {isEn ? "Email" : "อีเมล"} <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder={isEn ? "name@example.com" : "อีเมลของคุณ"}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: "" }));
                  }
                }}
                className={`${INPUT_CLASS} ${
                  fieldErrors.email ? "border-red-400/60 bg-red-500/5" : ""
                }`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                {isEn ? "Password" : "รหัสผ่าน"} <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder={
                  isEn
                    ? "Password (min 8 characters)"
                    : "รหัสผ่าน (อย่างน้อย 8 ตัว)"
                }
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }
                }}
                className={`${INPUT_CLASS} ${
                  fieldErrors.password ? "border-red-400/60 bg-red-500/5" : ""
                }`}
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-400">{fieldErrors.password}</p>
              )}
            </div>
          </>
        ) : null}

        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
            {isEn ? "Full Name" : "ชื่อ-นามสกุล"} <span className="text-red-400">*</span>
          </label>
          <input
            autoComplete="name"
            placeholder={isEn ? "Your name" : "ชื่อและนามสกุล"}
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              if (fieldErrors.fullName) {
                setFieldErrors((prev) => ({ ...prev, fullName: "" }));
              }
            }}
            className={`${INPUT_CLASS} ${
              fieldErrors.fullName ? "border-red-400/60 bg-red-500/5" : ""
            }`}
          />
          {fieldErrors.fullName && (
            <p className="text-xs text-red-400">{fieldErrors.fullName}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
            {isEn ? "Username" : "ชื่อผู้ใช้"} <span className="text-red-400">*</span>
          </label>
          <input
            autoComplete="username"
            placeholder={isEn ? "username" : "ชื่อผู้ใช้ (ภาษาอังกฤษ/ตัวเลข)"}
            value={username}
            onChange={(event) => {
              setUsername(
                event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
              );
              if (fieldErrors.username) {
                setFieldErrors((prev) => ({ ...prev, username: "" }));
              }
            }}
            className={`${INPUT_CLASS} ${
              fieldErrors.username ? "border-red-400/60 bg-red-500/5" : ""
            }`}
          />
          {fieldErrors.username && (
            <p className="text-xs text-red-400">{fieldErrors.username}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
            {isEn ? "Date of Birth" : "วันเกิด"} <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={dob}
            onChange={(event) => {
              setDob(event.target.value);
              if (fieldErrors.dob) {
                setFieldErrors((prev) => ({ ...prev, dob: "" }));
              }
            }}
            className={`${INPUT_CLASS} [color-scheme:dark] ${
              dobError ? "border-red-400/60 bg-red-500/5" : ""
            }`}
          />
          {dobError && <p className="text-xs text-red-400">{dobError}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
            {isEn ? "Education level" : "ระดับการศึกษา"}
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(["high_school", "university", "unaffiliated"] as const).map(
              (level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEducation(level)}
                  className={[
                    "min-h-12 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    education === level
                      ? "border-blue-400/50 bg-blue-500/15 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]",
                  ].join(" ")}
                >
                  {educationCopy[level]}
                </button>
              )
            )}
          </div>
        </div>

        {needsGuardian ? (
          <div className="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-500/[0.04] p-4">
            <p className="dawn-eyebrow text-amber-300">
              {isEn ? "Parent or guardian consent" : "ข้อมูลและคำยินยอมจากผู้ปกครอง"}
            </p>
            <p className="text-xs leading-5 text-white/60">
              {isEn
                ? "Required because you are 18 or under."
                : "จำเป็นต้องระบุเนื่องจากอายุไม่เกิน 18 ปี"}
            </p>
            <div className="space-y-1">
              <input
                placeholder={
                  isEn ? "Relationship (Mom, Dad…)" : "ความสัมพันธ์ (แม่, พ่อ…)"
                }
                value={guardianRelationship}
                onChange={(event) => {
                  setGuardianRelationship(event.target.value);
                  if (fieldErrors.guardianRelationship) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      guardianRelationship: "",
                    }));
                  }
                }}
                maxLength={60}
                className={`${INPUT_CLASS} ${
                  fieldErrors.guardianRelationship
                    ? "border-red-400/60 bg-red-500/5"
                    : ""
                }`}
              />
              {fieldErrors.guardianRelationship && (
                <p className="text-xs text-red-400">
                  {fieldErrors.guardianRelationship}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={isEn ? "Phone number" : "เบอร์โทรศัพท์ผู้ปกครอง"}
                value={guardianPhone}
                onChange={(event) => {
                  setGuardianPhone(event.target.value);
                  if (fieldErrors.guardianPhone) {
                    setFieldErrors((prev) => ({ ...prev, guardianPhone: "" }));
                  }
                }}
                className={`${INPUT_CLASS} ${
                  fieldErrors.guardianPhone
                    ? "border-red-400/60 bg-red-500/5"
                    : ""
                }`}
              />
              {fieldErrors.guardianPhone && (
                <p className="text-xs text-red-400">
                  {fieldErrors.guardianPhone}
                </p>
              )}
            </div>

            <div className="space-y-1 pt-1">
              <label className="flex items-start gap-3 text-sm leading-5 text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={guardianApproved}
                  onChange={(event) => {
                    setGuardianApproved(event.target.checked);
                    if (fieldErrors.guardianApproved) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        guardianApproved: "",
                      }));
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-400 shrink-0"
                />
                <span className="text-xs sm:text-sm">
                  {isEn
                    ? "My parent or guardian approves my use of PassionSeed and may be contacted at this number."
                    : "ผู้ปกครองอนุญาตให้ใช้ PassionSeed และยินยอมให้ติดต่อที่เบอร์นี้"}
                </span>
              </label>
              {fieldErrors.guardianApproved && (
                <p className="text-xs text-red-400">
                  {fieldErrors.guardianApproved}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </form>
    </PhaseShell>
  );
}

