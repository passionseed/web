"use client";

import { MentorshipIllustration, GuidelineIllustration, TesterIllustration } from "@/components/hackathon/Illustrations";

interface Feature {
  title: string;
  description: string;
  Illustration: React.ComponentType<{ className?: string }>;
  color: string;
}

export function FeaturesSection() {
  const features: Feature[] = [
    {
      title: "Personal Mentorship",
      description:
        "เรามีการจัดสรร Mentor ประจำแต่ละกลุ่มเพื่อคอยให้คำปรึกษาและ Feedback อย่างใกล้ชิด พี่ๆจะช่วยให้คำแนะนำและดูแลให้น้องๆมือใหม่ยังคงอยู่ในเส้นทางและพัฒนาไอเดียได้อย่างเต็มศักยภาพ",
      Illustration: MentorshipIllustration,
      color: "#3b82f6", // Blue
    },
    {
      title: "Learning Guideline",
      description:
        "คุณจะได้เรียนรู้กระบวนการสร้างนวัตกรรมอย่างเป็นระบบผ่านหลักสูตร Design Thinking ที่มุ่งเน้นการลงมือทำจริงเพื่อให้ได้ผลงานที่ใช้งานได้จริง (Functional Prototype) และมีเว็บคอย guide ทางให้ในแต่ละขั้นตอน",
      Illustration: GuidelineIllustration,
      color: "#6366f1", // Indigo
    },
    {
      title: "Real-world Testing",
      description:
        "หัวใจสำคัญคือการนำ Prototype ไปทดลองใช้จริง เพื่อรับ Feedback มาพัฒนาผลงานให้แม่นยำ ขั้นตอนนี้จะช่วยสร้างความมั่นใจว่าสิ่งที่คุณสร้างขึ้นนั้นสามารถแก้ปัญหาได้ตรงจุดและตอบโจทย์คนใช้งานจริง ก่อนนำเสนอผลงานในรอบสุดท้าย",
      Illustration: TesterIllustration,
      color: "#a855f7", // Purple
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-[#03050a]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#a855f7] bg-clip-text text-transparent">
              Anyone Can Make an Impact
            </span>
          </h2>
          <p className="mt-4 text-slate-400 text-base">
            ที่ The Next Decade Hackathon 2026 พื้นฐานไม่ใช่ข้อจำกัด แต่คือจุดเริ่มต้นของการเรียนรู้
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative flex flex-col items-center p-6 bg-[#0d1219]/50 backdrop-blur-sm rounded-2xl border border-[var(--color,rgba(255,255,255,0.08))] transition-all duration-500 hover:border-[var(--color-hover,rgba(255,255,255,0.2))] hover:shadow-lg"
              style={{
                "--color": `rgba(${hexToRgb(feature.color)}, 0.08)`,
                "--color-hover": `rgba(${hexToRgb(feature.color)}, 0.2)`,
              }}
            >
              {/* Illustration */}
              <div className="mb-6 w-16 h-16">
                <feature.Illustration className={`w-full h-full text-[var(--color)]`} style={{ "--color": feature.color }} />
              </div>

              {/* Title */}
              <h3 className="mb-3 text-lg font-semibold text-[var(--color)]" style={{ "--color": feature.color }}>
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-slate-300 text-sm text-center leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Helper function to convert hex to rgb
function hexToRgb(hex: string): string {
  const cleanHex = hex.replace("#", "");
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}