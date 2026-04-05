"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
import MentorAvailabilityGrid from "@/components/hackathon/mentor/MentorAvailabilityGrid";
import SessionTypeSelector from "@/components/hackathon/mentor/SessionTypeSelector";
import type { MentorProfile, MentorAvailabilitySlot, MentorSessionType } from "@/types/mentor";

type Slot = { day_of_week: number; hour: number };

const PROFILE_FIELDS: Array<{
  name: "full_name" | "profession" | "institution";
  label: string;
}> = [
  { name: "full_name", label: "Full Name" },
  { name: "profession", label: "Profession / Title" },
  { name: "institution", label: "Institution / University" },
];

export default function MentorProfilePage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lineCode, setLineCode] = useState("");
  const [lineConnecting, setLineConnecting] = useState(false);
  const [lineSuccess, setLineSuccess] = useState(false);
  const [lineError, setLineError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    profession: "",
    institution: "",
    bio: "",
    session_type: "healthcare" as MentorSessionType,
    instagram_url: "",
    linkedin_url: "",
    website_url: "",
  });

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%",
    borderRadius: "0.75rem",
    padding: "0.65rem 0.875rem",
    outline: "none",
    background: focused === name ? "#0d1219" : "#0a0f16",
    border: `1px solid ${focused === name ? "rgba(145,196,227,0.5)" : "rgba(74,107,130,0.3)"}`,
    boxShadow: focused === name ? "0 0 18px rgba(145,196,227,0.06)" : "none",
    color: "#C0D8F0",
    caretColor: "#91C4E3",
    fontSize: "0.875rem",
    transition: "all 0.2s",
  });

  useEffect(() => {
    if (!mentor || !pageRef.current) return;
    gsap.fromTo(
      pageRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    );
  }, [mentor]);

  useEffect(() => {
    fetch("/api/hackathon/mentor/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.mentor) {
          router.replace("/hackathon/mentor/login");
          return;
        }
        const m: MentorProfile = data.mentor;
        setMentor(m);
        setForm({
          full_name: m.full_name,
          profession: m.profession,
          institution: m.institution,
          bio: m.bio,
          session_type: m.session_type,
          instagram_url: m.instagram_url ?? "",
          linkedin_url: m.linkedin_url ?? "",
          website_url: m.website_url ?? "",
        });
      })
      .catch(() => router.replace("/hackathon/mentor/login"));

    fetch("/api/hackathon/mentor/availability")
      .then((r) => r.json())
      .then((data) => {
        setSlots(
          (data.slots ?? []).map((s: MentorAvailabilitySlot) => ({
            day_of_week: s.day_of_week,
            hour: s.hour,
          }))
        );
      });
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/hackathon/mentor/photo", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setMentor(data.mentor);
    } catch {
      setError("Photo upload failed");
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleConnectLine = async () => {
    if (!lineCode.trim()) return;
    setLineConnecting(true);
    setLineError("");
    try {
      const res = await fetch("/api/hackathon/mentor/line-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: lineCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เชื่อมต่อไม่สำเร็จ");
      setLineSuccess(true);
      setLineCode("");
      const meRes = await fetch("/api/hackathon/mentor/me");
      const meData = await meRes.json();
      if (meData.mentor) setMentor(meData.mentor);
    } catch (err) {
      setLineError(err instanceof Error ? err.message : "เชื่อมต่อไม่สำเร็จ");
    } finally {
      setLineConnecting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const profileRes = await fetch("/api/hackathon/mentor/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!profileRes.ok) {
        const d = await profileRes.json();
        setError(d.error || "Failed to save profile");
        return;
      }

      const availRes = await fetch("/api/hackathon/mentor/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (!availRes.ok) {
        const d = await availRes.json();
        setError(d.error || "Failed to save availability");
        return;
      }

      setSuccess("Profile saved successfully!");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!mentor) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#010108" }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-[#91C4E3]/30 border-t-[#91C4E3] animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden py-16"
      style={{
        background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)",
      }}
    >
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#91C4E3] opacity-4 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#9D81AC] opacity-4 blur-[150px] rounded-full pointer-events-none" />

      <div ref={pageRef} className="relative z-10 max-w-2xl mx-auto px-6 opacity-0">
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => router.push("/hackathon/mentor/dashboard")}
            className="text-[#91C4E3] hover:text-white text-sm transition-colors font-[family-name:var(--font-mitr)]"
          >
            ← Dashboard
          </button>
          <h1 className="text-2xl font-medium text-white font-[family-name:var(--font-bai-jamjuree)]">
            Edit Profile
          </h1>
          <div className="w-24" />
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Photo + basic info */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            <div className="flex gap-8 items-start">
              {/* Photo upload */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <label className="cursor-pointer group relative">
                  <div
                    className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center transition-all duration-200"
                    style={{
                      background: "rgba(13,18,25,0.8)",
                      border: "2px solid rgba(74,107,130,0.4)",
                    }}
                  >
                    {mentor.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mentor.photo_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">👤</span>
                    )}
                    {photoLoading && (
                      <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-[#91C4E3]/30 border-t-[#91C4E3] rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                </label>
                <p
                  className="text-xs text-center font-[family-name:var(--font-mitr)]"
                  style={{ color: "#5a7a94" }}
                >
                  Click to upload
                  <br />
                  Max 5MB
                </p>
              </div>

              {/* Fields */}
              <div className="flex-1 space-y-4 min-w-0">
                {PROFILE_FIELDS.map((f) => (
                  <div key={f.name}>
                    <label
                      className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]"
                      style={{ color: "#5a7a94" }}
                    >
                      {f.label}
                    </label>
                    <input
                      name={f.name}
                      type="text"
                      value={form[f.name]}
                      onChange={handleChange}
                      onFocus={() => setFocused(f.name)}
                      onBlur={() => setFocused(null)}
                      required
                      style={inputStyle(f.name)}
                      className="font-[family-name:var(--font-mitr)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div className="mt-5">
              <label
                className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]"
                style={{ color: "#5a7a94" }}
              >
                Bio
              </label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                onFocus={() => setFocused("bio")}
                onBlur={() => setFocused(null)}
                rows={3}
                style={{ ...inputStyle("bio"), resize: "none" }}
                className="font-[family-name:var(--font-mitr)]"
              />
            </div>
          </div>

          {/* Session type */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            <h2 className="text-lg font-medium text-white mb-4 font-[family-name:var(--font-bai-jamjuree)]">
              Session Type
            </h2>
            <SessionTypeSelector
              value={form.session_type}
              onChange={(v) => setForm((prev) => ({ ...prev, session_type: v }))}
            />
          </div>

          {/* Availability */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            <h2 className="text-lg font-medium text-white mb-4 font-[family-name:var(--font-bai-jamjuree)]">
              Weekly Availability
            </h2>
            <MentorAvailabilityGrid slots={slots} onChange={setSlots} />
          </div>

          {/* Line Notification */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "1.25rem" }}>💬</span>
              <h2 className="text-lg font-medium text-white font-[family-name:var(--font-bai-jamjuree)]">
                Line Notification
              </h2>
            </div>

            {mentor?.line_user_id ? (
              <div className="text-sm font-[family-name:var(--font-mitr)]" style={{ color: "#4ade80" }}>
                ✓ เชื่อมต่อ Line แล้ว
              </div>
            ) : (
              <>
                <p
                  className="text-sm font-[family-name:var(--font-mitr)] mb-4"
                  style={{ color: "#7fa8c8", lineHeight: 1.8 }}
                >
                  1. เพิ่ม <strong style={{ color: "#C0D8F0" }}>@PassionSeed</strong> เป็นเพื่อนใน Line<br />
                  2. Bot จะส่งโค้ดให้คุณทางแชท<br />
                  3. กรอกโค้ดนั้นด้านล่าง
                </p>

                {lineSuccess && (
                  <p className="text-sm font-[family-name:var(--font-mitr)] mb-3" style={{ color: "#4ade80" }}>
                    ✓ เชื่อมต่อสำเร็จ!
                  </p>
                )}
                {lineError && (
                  <p className="text-sm font-[family-name:var(--font-mitr)] mb-3" style={{ color: "#f87171" }}>
                    {lineError}
                  </p>
                )}

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    value={lineCode}
                    onChange={(e) => setLineCode(e.target.value.toUpperCase())}
                    placeholder="โค้ด 6 หลัก เช่น A3F9B2"
                    maxLength={6}
                    className="font-[family-name:var(--font-mitr)]"
                    style={{
                      flex: 1,
                      borderRadius: "0.75rem",
                      padding: "0.6rem 0.875rem",
                      background: "#0d1219",
                      border: "1px solid rgba(74,107,130,0.3)",
                      color: "#C0D8F0",
                      fontSize: "0.875rem",
                      letterSpacing: "0.1em",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleConnectLine}
                    disabled={lineConnecting || lineCode.length < 6}
                    className="font-[family-name:var(--font-mitr)]"
                    style={{
                      padding: "0.6rem 1.25rem",
                      borderRadius: "0.75rem",
                      background: "rgba(0,195,0,0.15)",
                      border: "1px solid rgba(0,195,0,0.3)",
                      color: "#4ade80",
                      cursor: lineConnecting || lineCode.length < 6 ? "not-allowed" : "pointer",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      opacity: lineCode.length < 6 ? 0.5 : 1,
                    }}
                  >
                    {lineConnecting ? "..." : "เชื่อมต่อ"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Social Links */}
          <div
            className="rounded-3xl p-8"
            style={{
              background: "linear-gradient(135deg, rgba(13,18,25,0.9), rgba(18,28,41,0.8))",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            <h2 className="text-lg font-medium text-white mb-5 font-[family-name:var(--font-bai-jamjuree)]">
              Social Links
            </h2>
            <div className="space-y-4">
              {([
                { name: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/yourhandle", icon: "📸" },
                { name: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourprofile", icon: "💼" },
                { name: "website_url", label: "Website / Portfolio", placeholder: "https://yourwebsite.com", icon: "🌐" },
              ] as const).map((f) => (
                <div key={f.name}>
                  <label
                    className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]"
                    style={{ color: "#5a7a94" }}
                  >
                    <span className="mr-1.5">{f.icon}</span>
                    {f.label}
                  </label>
                  <input
                    name={f.name}
                    type="url"
                    value={form[f.name]}
                    onChange={handleChange}
                    onFocus={() => setFocused(f.name)}
                    onBlur={() => setFocused(null)}
                    placeholder={f.placeholder}
                    style={inputStyle(f.name)}
                    className="font-[family-name:var(--font-mitr)]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm font-[family-name:var(--font-mitr)]"
              style={{
                background: "rgba(255,70,70,0.08)",
                border: "1px solid rgba(255,70,70,0.25)",
                color: "#ff8888",
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              className="px-4 py-3 rounded-xl text-sm font-[family-name:var(--font-mitr)]"
              style={{
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.25)",
                color: "#34d399",
              }}
            >
              {success}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full text-white py-4 rounded-full text-lg transition-all duration-300 disabled:opacity-50 font-[family-name:var(--font-mitr)]"
            style={{
              background: "#9D81AC",
              boxShadow: "0 0 30px rgba(157,129,172,0.4)",
            }}
          >
            {loading ? "Saving…" : "Save Profile"}
          </Button>
        </form>
      </div>
    </div>
  );
}
