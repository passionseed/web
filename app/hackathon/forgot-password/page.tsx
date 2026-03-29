"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import gsap from "gsap";

export default function HackathonForgotPasswordPage() {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(formRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.2 });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    setResetUrl("");

    try {
      const res = await fetch("/api/hackathon/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send reset link");
        return;
      }

      setSuccess(true);
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden flex items-center justify-center" style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)" }}>
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#91C4E3] opacity-5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#9D81AC] opacity-5 blur-[120px] rounded-full pointer-events-none" />

      <div ref={formRef} className="relative z-10 w-full max-w-md px-6 py-12 opacity-0">
        <button
          onClick={() => router.push("/hackathon/login")}
          className="flex items-center gap-2 text-[#91C4E3] hover:text-white text-sm mb-8 transition-colors"
        >
          ← Back to Login
        </button>

        <div className="bg-[#0d1219]/80 backdrop-blur-sm border border-[#91C4E3]/20 rounded-2xl p-8 shadow-[0_0_40px_rgba(145,196,227,0.08)]">
          <h1 className="text-3xl font-medium mb-1 bg-gradient-to-r from-[#91C4E3] to-[#65ABFC] bg-clip-text text-transparent font-[family-name:var(--font-poppins)]">
            Forgot Password
          </h1>
          <p className="text-gray-400 text-sm mb-2">The Next Decade Hackathon 2026</p>
          <p className="text-gray-500 text-xs mb-8">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              <p className="mb-2">Check your email for a password reset link!</p>
              {resetUrl && (
                <div className="mt-3 p-3 bg-[#0a0e1a] rounded-lg">
                  <p className="text-xs text-gray-400 mb-2">Development mode - Click the link below:</p>
                  <a
                    href={resetUrl}
                    className="text-[#91C4E3] hover:text-[#65ABFC] text-xs break-all underline"
                  >
                    {resetUrl}
                  </a>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="jane@example.com"
                className="w-full bg-[#0a0e1a] border border-[#91C4E3]/20 focus:border-[#91C4E3]/60 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#9D81AC] hover:bg-[#8a6f99] text-white py-3 rounded-full text-lg shadow-[0_0_30px_rgba(157,129,172,0.4)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(157,129,172,0.7)] mt-2 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
