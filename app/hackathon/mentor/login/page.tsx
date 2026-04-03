"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import gsap from "gsap";

export default function MentorLoginPage() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(
      formRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.2 }
    );
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hackathon/mentor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.push("/hackathon/mentor/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen text-white relative overflow-hidden flex items-center justify-center"
      style={{
        background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)",
      }}
    >
      {/* Ambient orbs */}
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#91C4E3] opacity-5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-[#9D81AC] opacity-5 blur-[120px] rounded-full pointer-events-none" />

      <div ref={formRef} className="relative z-10 w-full max-w-md px-6 py-12 opacity-0">
        <button
          onClick={() => router.push("/hackathon")}
          className="flex items-center gap-2 text-[#91C4E3] hover:text-white text-sm mb-8 transition-colors font-[family-name:var(--font-mitr)]"
        >
          ← Back
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
            Mentor Login
          </h1>
          <p className="text-gray-400 text-sm mb-2 font-[family-name:var(--font-mitr)]">
            The Next Decade Hackathon 2026
          </p>
          <p className="text-gray-500 text-xs mb-8 font-[family-name:var(--font-mitr)]">
            New mentor?{" "}
            <button
              onClick={() => router.push("/hackathon/mentor/register")}
              className="text-[#91C4E3] hover:underline"
            >
              Register here
            </button>
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
            {(["email", "password"] as const).map((field) => (
              <div key={field}>
                <label
                  className="block text-sm text-gray-400 mb-1 font-[family-name:var(--font-mitr)] capitalize"
                >
                  {field}
                </label>
                <input
                  name={field}
                  type={field}
                  value={form[field]}
                  onChange={handleChange}
                  required
                  placeholder={field === "email" ? "you@example.com" : "Your password"}
                  className="w-full rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none font-[family-name:var(--font-mitr)]"
                  style={{
                    background: "#0a0e1a",
                    border: "1px solid rgba(145,196,227,0.2)",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(145,196,227,0.6)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(145,196,227,0.2)")
                  }
                />
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
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
