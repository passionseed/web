"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import gsap from "gsap";

const ROLES = [
  "Developer",
  "Designer",
  "Healthcare Professional",
  "Researcher",
  "Student",
  "Other",
];

export default function RegisterPage() {
  const router = useRouter();
  const waterRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    university: "",
    role: "",
    team: "",
  });

  // Drain water on mount to reveal the page
  useEffect(() => {
    if (!waterRef.current || !formRef.current) return;

    const tl = gsap.timeline();

    // Water drains upward
    tl.to(waterRef.current, {
      yPercent: -100,
      duration: 0.9,
      ease: "power3.inOut",
      delay: 0.2,
    })
    // Form fades in after water drains
    .fromTo(
      formRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    );
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleBack = () => {
    if (!waterRef.current) return;

    gsap.fromTo(
      waterRef.current,
      { yPercent: 100 },
      {
        yPercent: 0,
        duration: 0.9,
        ease: "power3.inOut",
        onComplete: () => router.push("/hackathon"),
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#03050a] text-white relative overflow-hidden flex items-center justify-center">

      {/* Subtle glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#91C4E3] opacity-5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#9D81AC] opacity-5 blur-[120px] rounded-full pointer-events-none" />

      {/* Water overlay — starts covering screen, drains on mount */}
      <div
        ref={waterRef}
        className="fixed inset-0 z-[200] pointer-events-none overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #4a90c4 0%, #1a5a8a 50%, #0d3a5c 100%)",
        }}
      >
        <div className="absolute -top-10 left-0 w-[200%] h-16" style={{ animation: "waveShift 2s linear infinite" }}>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-1/2 h-full inline-block">
            <path d="M0,30 C180,60 360,0 540,30 C720,60 900,0 1080,30 C1260,60 1440,0 1440,30 L1440,60 L0,60 Z" fill="#4a90c4" />
          </svg>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-1/2 h-full inline-block">
            <path d="M0,30 C180,60 360,0 540,30 C720,60 900,0 1080,30 C1260,60 1440,0 1440,30 L1440,60 L0,60 Z" fill="#4a90c4" />
          </svg>
        </div>
      </div>

      <style jsx>{`
        @keyframes waveShift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Form */}
      <div ref={formRef} className="relative z-10 w-full max-w-lg px-6 py-12 opacity-0">

        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[#91C4E3] hover:text-white text-sm mb-8 transition-colors"
        >
          ← Back
        </button>

        <div className="bg-[#0d1219]/80 backdrop-blur-sm border border-[#91C4E3]/20 rounded-2xl p-8 shadow-[0_0_40px_rgba(145,196,227,0.08)]">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-[#91C4E3]">You're registered!</h2>
              <p className="text-gray-400">We'll be in touch soon. See you at the hackathon.</p>
              <Button
                onClick={handleBack}
                className="mt-4 bg-[#9D81AC] hover:bg-[#8a6f99] text-white px-8 py-3 rounded-full"
              >
                Back to Home
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-[#91C4E3] to-[#65ABFC] bg-clip-text text-transparent font-[family-name:var(--font-poppins)]">
                Register
              </h1>
              <p className="text-gray-400 text-sm mb-8">The Next Decade Hackathon 2026</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="Jane Doe"
                    className="w-full bg-[#0a0e1a] border border-[#91C4E3]/20 focus:border-[#91C4E3]/60 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="jane@example.com"
                    className="w-full bg-[#0a0e1a] border border-[#91C4E3]/20 focus:border-[#91C4E3]/60 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">University / Organization</label>
                  <input
                    name="university"
                    value={form.university}
                    onChange={handleChange}
                    required
                    placeholder="Chulalongkorn University"
                    className="w-full bg-[#0a0e1a] border border-[#91C4E3]/20 focus:border-[#91C4E3]/60 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Role</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#0a0e1a] border border-[#91C4E3]/20 focus:border-[#91C4E3]/60 rounded-xl px-4 py-3 text-white outline-none transition-colors appearance-none"
                  >
                    <option value="" disabled>Select your role</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Team Name <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    name="team"
                    value={form.team}
                    onChange={handleChange}
                    placeholder="Leave blank to join solo"
                    className="w-full bg-[#0a0e1a] border border-[#91C4E3]/20 focus:border-[#91C4E3]/60 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#9D81AC] hover:bg-[#8a6f99] text-white py-3 rounded-full text-lg shadow-[0_0_30px_rgba(157,129,172,0.4)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(157,129,172,0.7)] mt-2"
                >
                  Register Now
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
