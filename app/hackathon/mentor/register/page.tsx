"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import gsap from "gsap";

const FIELDS: Array<{
  name: "full_name" | "email" | "password" | "profession" | "institution" | "bio";
  label: string;
  type?: string;
  multiline?: boolean;
  placeholder: string;
  required?: boolean;
}> = [
  { name: "full_name", label: "Full Name", placeholder: "Dr. Somchai Kaewkla", required: true },
  { name: "email", label: "Email", type: "email", placeholder: "you@example.com", required: true },
  {
    name: "password",
    label: "Password (min 8 chars)",
    type: "password",
    placeholder: "••••••••",
    required: true,
  },
  { name: "profession", label: "Profession / Title", placeholder: "Cardiologist, UX Designer…" },
  { name: "institution", label: "Institution / University", placeholder: "Chulalongkorn University" },
  {
    name: "bio",
    label: "Short Bio",
    multiline: true,
    placeholder: "Tell students about your background…",
  },
];

export default function MentorRegisterPage() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    profession: "",
    institution: "",
    bio: "",
  });

  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(
      formRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.2 }
    );
  }, []);

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hackathon/mentor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      router.push("/hackathon/mentor/profile");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden flex items-center justify-center py-16"
      style={{
        background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)",
      }}
    >
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#91C4E3] opacity-5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-[#9D81AC] opacity-5 blur-[120px] rounded-full pointer-events-none" />

      <div ref={formRef} className="relative z-10 w-full max-w-md px-6 opacity-0">
        <button
          onClick={() => router.push("/hackathon/mentor/login")}
          className="flex items-center gap-2 text-[#91C4E3] hover:text-white text-sm mb-8 transition-colors font-[family-name:var(--font-mitr)]"
        >
          ← Back to Login
        </button>

        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(13,18,25,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(145,196,227,0.2)",
            boxShadow: "0 0 40px rgba(145,196,227,0.08)",
          }}
        >
          <h1 className="text-3xl font-medium mb-1 bg-gradient-to-r from-[#91C4E3] to-[#65ABFC] bg-clip-text text-transparent font-[family-name:var(--font-bai-jamjuree)]">
            Become a Mentor
          </h1>
          <p className="text-gray-400 text-sm mb-8 font-[family-name:var(--font-mitr)]">
            The Next Decade Hackathon 2026
          </p>

          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-sm font-[family-name:var(--font-mitr)]"
              style={{
                background: "rgba(255,70,70,0.08)",
                border: "1px solid rgba(255,70,70,0.25)",
                color: "#ff8888",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {FIELDS.map((f) => (
              <div key={f.name}>
                <label
                  className="block text-xs mb-1.5 font-[family-name:var(--font-mitr)]"
                  style={{ color: "#5a7a94" }}
                >
                  {f.label}
                </label>
                {f.multiline ? (
                  <textarea
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    onFocus={() => setFocused(f.name)}
                    onBlur={() => setFocused(null)}
                    placeholder={f.placeholder}
                    rows={3}
                    style={{ ...inputStyle(f.name), resize: "none" }}
                    className="font-[family-name:var(--font-mitr)]"
                  />
                ) : (
                  <input
                    name={f.name}
                    type={f.type ?? "text"}
                    value={form[f.name]}
                    onChange={handleChange}
                    onFocus={() => setFocused(f.name)}
                    onBlur={() => setFocused(null)}
                    placeholder={f.placeholder}
                    required={f.required}
                    style={inputStyle(f.name)}
                    className="font-[family-name:var(--font-mitr)]"
                  />
                )}
              </div>
            ))}

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-full text-lg transition-all duration-300 mt-2 disabled:opacity-50 font-[family-name:var(--font-mitr)]"
              style={{
                background: "#9D81AC",
                boxShadow: "0 0 30px rgba(157,129,172,0.4)",
              }}
            >
              {loading ? "Creating account…" : "Create Mentor Account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
