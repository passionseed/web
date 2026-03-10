import React from "react";
import QRCode from "react-qr-code";
import { Sparkles } from "lucide-react";

interface BetaTicketProps {
  nickname?: string;
  facultyInterest?: string;
  ticketRef?: React.RefObject<HTMLDivElement | null>;
}

export function BetaTicket({
  nickname = "Beta Tester",
  facultyInterest = "Future Innovator",
  ticketRef,
}: BetaTicketProps) {
  // A clean, dark-themed 9:16 vertical ticket suitable for Instagram Stories
  // 9:16 aspect ratio roughly translates to w-[320px] h-[568px]
  return (
    <div
      ref={ticketRef}
      className="relative mx-auto w-[320px] h-[568px] flex flex-col shrink-0 font-[family-name:var(--font-kodchasan)]"
      style={{
        filter: "drop-shadow(0 20px 40px rgba(0, 0, 0, 0.4))",
        // The cutout mask for the ticket shape (top and bottom rounded, with side indents)
        maskImage:
          "radial-gradient(circle at 0% calc(340px + 1px), transparent 16px, black 16.5px), radial-gradient(circle at 100% calc(340px + 1px), transparent 16px, black 16.5px)",
        maskSize: "51% 100%",
        maskPosition: "left top, right top",
        maskRepeat: "no-repeat",
        WebkitMaskImage:
          "radial-gradient(circle at 0% calc(340px + 1px), transparent 16px, black 16.5px), radial-gradient(circle at 100% calc(340px + 1px), transparent 16px, black 16.5px)",
        WebkitMaskSize: "51% 100%",
        WebkitMaskPosition: "left top, right top",
        WebkitMaskRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 rounded-[2rem] border border-white/10 bg-[#0A0A0B] overflow-hidden">
        {/* Subtle noise texture */}
        <div
          className="absolute inset-0 opacity-[0.4] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
          }}
        ></div>

        {/* Grid Background */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 19V21M19 20H21' stroke='white' stroke-width='1' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glowing Orbs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#FF521B]/20 rounded-full blur-[60px]" />
        <div className="absolute top-1/2 -left-16 w-48 h-48 bg-purple-500/10 rounded-full blur-[50px]" />
      </div>

      {/* Top Section (Height: 340px) */}
      <div className="relative h-[340px] p-8 flex flex-col justify-between overflow-hidden rounded-t-[2rem]">
        {/* Header (Top) */}
        <div className="flex justify-between items-start z-10 w-full">
          <div className="flex items-center gap-2">
            <Sparkles className="text-[#FF521B] w-4 h-4" />
            <span className="text-slate-300 tracking-[0.2em] text-[10px] font-bold">
              PASSION SEED
            </span>
          </div>
          <div className="flex gap-1.5 items-center bg-white/5 rounded-full px-2 py-0.5 border border-white/10 backdrop-blur-md">
            <span className="text-[9px] font-bold tracking-wider text-[#FF521B] uppercase">
              Early Access
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF521B] shadow-[0_0_8px_rgba(255,82,27,0.8)] animate-pulse" />
          </div>
        </div>

        {/* Main Title (Center) */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center mt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 mb-4 backdrop-blur-sm">
            <span className="text-white font-semibold text-[10px] tracking-[0.1em] uppercase">
              Class of 2026
            </span>
          </div>
          <h3 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-md">
            CLOSED BETA
          </h3>
          <p className="text-slate-400 text-[10px] tracking-[0.2em] font-medium uppercase">
            Official Invitation
          </p>
        </div>

        {/* User Info (Bottom of Top Section) */}
        <div className="relative z-10 flex flex-col items-center mt-4 pb-2">
          <p className="text-[#FF521B] text-[11px] font-bold uppercase tracking-widest mb-1">
            {facultyInterest}
          </p>
          <p className="text-2xl font-bold text-white max-w-full truncate px-4">
            {nickname}
          </p>
        </div>
      </div>

      {/* Separation Line (Dashed) */}
      <div className="relative h-px w-full flex items-center justify-center z-10">
        <div className="absolute inset-x-6 border-t-[1.5px] border-dashed border-white/20"></div>
        {/* Cutout overlays to match the mask */}
        <div className="absolute -left-1 w-4 h-8 bg-transparent"></div>
        <div className="absolute -right-1 w-4 h-8 bg-transparent"></div>
      </div>

      {/* Bottom Section (Height: ~228px) */}
      <div className="relative flex-1 p-6 flex flex-col items-center justify-center gap-4 z-10 bg-black/20 rounded-b-[2rem] backdrop-blur-sm border-t border-white/5">
        {/* QR Code */}
        <div className="bg-white p-2 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          <QRCode
            value="https://www.passionseed.org/app/beta"
            size={90}
            level="H"
            className="rounded"
          />
        </div>

        <div className="text-center w-full max-w-[240px]">
          <p className="text-slate-300 font-medium leading-snug text-[11px]">
            สแกนเพื่อเข้าร่วม
            <br />
            ทดสอบและออกแบบอนาคตไปด้วยกัน
          </p>
        </div>

        <div className="flex justify-between w-full px-2 mt-1">
          <div className="flex flex-col text-left">
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-0.5">
              Pass Type
            </span>
            <span className="text-sm font-black text-[#FF521B] uppercase tracking-tight">
              STUDENT
            </span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-0.5">
              Status
            </span>
            <span className="text-sm font-black text-white uppercase tracking-tight">
              INVITED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
