"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import gsap from "gsap";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const token = searchParams.get("token");

  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(formRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.2 });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    if (!token) {
      setError("Invalid reset link");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/hackathon/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/hackathon/login");
      }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen text-white relative overflow-hidden flex items-center justify-center" style={{ background: "linear-gradient(to bottom, #010108 0%, #010210 60%, #010D18 100%)" }}>
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#91C4E3] opacity-5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#9D81AC] opacity-5 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full max-w-md px-6 py-12">
          <div className="bg-[#0d1219]/80 backdrop-blur-sm border border-red-500/20 rounded-2xl p-8">
            <h1 className="text-2xl font-medium mb-4 text-red-400">Invalid Reset Link</h1>
            <p className="text-gray-400 mb-6">This password reset link is invalid or has expired.</p>
            <Button
              onClick={() => router.push("/hackathon/forgot-password")}
              className="w-full bg-[#9D81AC] hover:bg-[#8a6f99] text-white py-3 rounded-full"
            >
              Request New Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            Reset Password
          </h1>
          <p className="text-gray-400 text-sm mb-2">The Next Decade Hackathon 2026</p>
          <p className="text-gray-500 text-xs mb-8">
            Enter your new password below.
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              Password reset successfully! Redirecting to login...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1">New Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="At least 8 characters"
                className="w-full bg-[#0a0e1a] border border-[#91C4E3]/20 focus:border-[#91C4E3]/60 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Re-enter your password"
                className="w-full bg-[#0a0e1a] border border-[#91C4E3]/20 focus:border-[#91C4E3]/60 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || success}
              className="w-full bg-[#9D81AC] hover:bg-[#8a6f99] text-white py-3 rounded-full text-lg shadow-[0_0_30px_rgba(157,129,172,0.4)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(157,129,172,0.7)] mt-2 disabled:opacity-50"
            >
              {loading ? "Resetting..." : success ? "Password Reset!" : "Reset Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function HackathonResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#03050a] text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
