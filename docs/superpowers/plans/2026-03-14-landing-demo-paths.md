# Landing Demo Paths Implementation Plan

> **For Claude:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add demo path cards to the hero section showing 3 sample career paths (Medical Doctor, AI Engineer, Startup Founder) with 5-day previews, clickable to show full day descriptions in a modal.

**Architecture:** Two-column hero layout on desktop (text left, cards right). Mobile stacks cards above text/CTA. Modal uses Radix Dialog for accessibility. Cards show icon, title, tagline, and 5 day titles; modal shows full descriptions.

**Tech Stack:** React, Tailwind CSS, Framer Motion, Radix UI Dialog, Lucide icons

---

## Task 1: Create Demo Path Data

**Files:**
- Create: `components/landing-demo-paths.tsx` (data section at top)

- [ ] **Step 1: Define the path data structure and content**

Add at the top of `components/landing-demo-paths.tsx`:

```typescript
"use client";

import { Stethoscope, Bot, Rocket } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

export interface DemoPath {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface PathContent {
  title: string;
  tagline: string;
  days: { title: string; description: string }[];
}

const pathData: Record<string, { en: PathContent; th: PathContent }> = {
  "medical-doctor": {
    en: {
      title: "Medical Doctor",
      tagline: "5 days to test if you're fit for medicine",
      days: [
        { title: "Day 1: Patient Diagnosis", description: "Analyze symptoms and create differential diagnoses for real patient cases. Learn the systematic approach doctors use to narrow down possibilities." },
        { title: "Day 2: Treatment Planning", description: "Design treatment plans considering patient history, drug interactions, and evidence-based medicine. Balance effectiveness with patient preferences." },
        { title: "Day 3: Medical Research", description: "Interpret clinical studies and apply research findings to patient care. Learn to distinguish quality evidence from noise." },
        { title: "Day 4: Emergency Response", description: "Make rapid decisions under pressure in simulated emergency scenarios. Practice the composure and quick thinking medicine demands." },
        { title: "Day 5: Patient Communication", description: "Deliver difficult news and explain complex conditions clearly. Master the human side of healthcare." },
      ],
    },
    th: {
      title: "แพทย์",
      tagline: "5 วันเพื่อทดสอบว่าคุณเหมาะกับการแพทย์ไหม",
      days: [
        { title: "วันที่ 1: การวินิจฉัยผู้ป่วย", description: "วิเคราะห์อาการและสร้างการวินิจฉัยแยกโรคจากเคสผู้ป่วยจริง เรียนรู้แนวทางเป็นระบบที่แพทย์ใช้" },
        { title: "วันที่ 2: วางแผนการรักษา", description: "ออกแบบแผนรักษาโดยพิจารณาประวัติผู้ป่วย ปฏิกิริยายา และการแพทย์ตามหลักฐาน" },
        { title: "วันที่ 3: การวิจัยทางการแพทย์", description: "ตีความการศึกษาทางคลินิกและนำผลวิจัยไปใช้กับการดูแลผู้ป่วย" },
        { title: "วันที่ 4: การตอบสนองฉุกเฉิน", description: "ตัดสินใจอย่างรวดเร็วภายใต้ความกดดันในสถานการณ์ฉุกเฉินจำลอง" },
        { title: "วันที่ 5: การสื่อสารกับผู้ป่วย", description: "สื่อสารข่าวยากและอธิบายอาการซับซ้อนอย่างเข้าใจง่าย" },
      ],
    },
  },
  "ai-engineer": {
    en: {
      title: "AI Engineer",
      tagline: "5 days to discover if you love building AI",
      days: [
        { title: "Day 1: Data Exploration", description: "Dive into real datasets and discover patterns that machines can learn from. Understand what makes data useful for AI." },
        { title: "Day 2: Model Training", description: "Train your first machine learning model. Watch it improve and learn to diagnose when things go wrong." },
        { title: "Day 3: Prompt Engineering", description: "Master the art of communicating with large language models. Learn techniques that get AI to do what you want." },
        { title: "Day 4: AI Ethics", description: "Explore bias, fairness, and the societal impact of AI. Understand the responsibility that comes with building intelligent systems." },
        { title: "Day 5: Ship a Demo", description: "Build and deploy a working AI application end-to-end. See your creation work in the real world." },
      ],
    },
    th: {
      title: "วิศวกร AI",
      tagline: "5 วันเพื่อค้นพบว่าคุณชอบสร้าง AI ไหม",
      days: [
        { title: "วันที่ 1: การสำรวจข้อมูล", description: "ดำดิ่งสู่ชุดข้อมูลจริงและค้นพบรูปแบบที่เครื่องจักรเรียนรู้ได้" },
        { title: "วันที่ 2: การเทรนโมเดล", description: "เทรนโมเดลแมชชีนเลิร์นนิงตัวแรกของคุณ ดูมันพัฒนาและเรียนรู้การวินิจฉัยเมื่อมีปัญหา" },
        { title: "วันที่ 3: Prompt Engineering", description: "เชี่ยวชาญศิลปะการสื่อสารกับโมเดลภาษาขนาดใหญ่ เรียนรู้เทคนิคที่ทำให้ AI ทำในสิ่งที่คุณต้องการ" },
        { title: "วันที่ 4: จริยธรรม AI", description: "สำรวจอคติ ความเป็นธรรม และผลกระทบทางสังคมของ AI" },
        { title: "วันที่ 5: ส่งงาน Demo", description: "สร้างและปล่อยแอปพลิเคชัน AI ที่ใช้งานได้จริงจากต้นน้ำถึงปลายน้ำ" },
      ],
    },
  },
  "startup-founder": {
    en: {
      title: "Startup Founder",
      tagline: "5 days to see if you can turn ideas into reality",
      days: [
        { title: "Day 1: Problem Discovery", description: "Identify real problems worth solving. Learn to spot opportunities others miss and validate that people actually care." },
        { title: "Day 2: Solution Design", description: "Design solutions that are simple enough to build but valuable enough to matter. Balance ambition with realism." },
        { title: "Day 3: MVP Planning", description: "Define your minimum viable product. Learn what to build first and—more importantly—what to leave out." },
        { title: "Day 4: Pitch Crafting", description: "Tell your story in a way that inspires action. Learn to communicate vision to investors, partners, and early users." },
        { title: "Day 5: Validate with Users", description: "Get real people to try your concept. Learn what works, what doesn't, and whether you're on the right track." },
      ],
    },
    th: {
      title: "ผู้ก่อตั้งสตาร์ทอัพ",
      tagline: "5 วันเพื่อดูว่าคุณสามารถเปลี่ยนไอเดียเป็นความจริงได้ไหม",
      days: [
        { title: "วันที่ 1: การค้นหาปัญหา", description: "ระบุปัญหาจริงที่คุ้มค่าจะแก้ เรียนรู้การมองเห็นโอกาสที่คนอื่นพลาด" },
        { title: "วันที่ 2: การออกแบบโซลูชัน", description: "ออกแบบโซลูชันที่เรียบง่ายพอที่จะสร้างแต่มีค่าพอที่จะสำคัญ" },
        { title: "วันที่ 3: วางแผน MVP", description: "กำหนดผลิตภัณฑ์ที่ทำได้ขั้นต่ำ เรียนรู้ว่าควรสร้างอะไรก่อนและสำคัญกว่าคืออะไรที่ควรปล่อยไว้" },
        { title: "วันที่ 4: การสร้าง Pitch", description: "เล่าเรื่องราวของคุณในแบบที่สร้างแรงบันดาลใจ เรียนรู้การสื่อสารวิสัยทัศน์กับนักลงทุนและพาร์ทเนอร์" },
        { title: "วันที่ 5: ตรวจสอบกับผู้ใช้", description: "ให้คนจริงลองคอนเซ็ปต์ของคุณ เรียนรู้ว่าอะไรได้ผล อะไรไม่ได้ผล" },
      ],
    },
  },
};

export const demoPaths: DemoPath[] = [
  { id: "medical-doctor", icon: Stethoscope, color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  { id: "ai-engineer", icon: Bot, color: "text-violet-400", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/20" },
  { id: "startup-founder", icon: Rocket, color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20" },
];

export function getPathContent(pathId: string, language: "en" | "th"): PathContent {
  return pathData[pathId][language];
}
```

---

## Task 2: Create Demo Path Modal Component

**Files:**
- Create: `components/demo-path-modal.tsx`

- [ ] **Step 1: Create the modal component**

```typescript
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DemoPath, getPathContent } from "./landing-demo-paths";
import { useLanguage } from "@/lib/i18n/language-context";

interface DemoPathModalProps {
  path: DemoPath | null;
  isOpen: boolean;
  onClose: () => void;
}

const content = {
  en: {
    close: "Close",
    days: "days",
  },
  th: {
    close: "ปิด",
    days: "วัน",
  },
};

export function DemoPathModal({ path, isOpen, onClose }: DemoPathModalProps) {
  const { language } = useLanguage();
  const t = content[language];

  if (!path) return null;

  const pathContent = getPathContent(path.id, language);
  const Icon = path.icon;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg max-h-[85vh] overflow-auto rounded-2xl bg-[#1a1a1a] border border-white/10 p-6 focus:outline-none"
              >
                <Dialog.Close asChild>
                  <button
                    className="absolute right-4 top-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    aria-label={t.close}
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </Dialog.Close>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl ${path.bgColor} border ${path.borderColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${path.color}`} />
                  </div>
                  <div>
                    <Dialog.Title className="text-xl font-bold text-white">
                      {pathContent.title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-400">
                      {pathContent.tagline}
                    </Dialog.Description>
                  </div>
                </div>

                {/* Days */}
                <div className="space-y-4">
                  {pathContent.days.map((day, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <h4 className="font-semibold text-white mb-1.5">
                        {day.title}
                      </h4>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {day.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: Verify Radix UI Dialog is installed**

Run: `grep -q '"@radix-ui/react-dialog"' package.json && echo "installed" || echo "not installed"`

If not installed, run: `pnpm add @radix-ui/react-dialog`

---

## Task 3: Create Demo Paths Card Component

**Files:**
- Modify: `components/landing-demo-paths.tsx` (add component)

- [ ] **Step 1: Add the card component to landing-demo-paths.tsx**

Append to the file:

```typescript
"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { DemoPath, getPathContent } from "./landing-demo-paths";
import { DemoPathModal } from "./demo-path-modal";
import { useLanguage } from "@/lib/i18n/language-context";

interface LandingDemoPathsProps {
  onPathClick?: (path: DemoPath) => void;
}

const content = {
  en: {
    morePaths: "+ more paths available",
  },
  th: {
    morePaths: "+ เส้นทางอื่นๆ ที่พร้อมให้ลอง",
  },
};

export function LandingDemoPaths({ onPathClick }: LandingDemoPathsProps) {
  const { language } = useLanguage();
  const t = content[language];
  const [selectedPath, setSelectedPath] = useState<DemoPath | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePathClick = (path: DemoPath) => {
    setSelectedPath(path);
    setIsModalOpen(true);
    onPathClick?.(path);
  };

  return (
    <>
      <div className="space-y-3">
        {demoPaths.map((path, index) => {
          const pathContent = getPathContent(path.id, language);
          const Icon = path.icon;

          return (
            <motion.button
              key={path.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              onClick={() => handlePathClick(path)}
              className={`w-full text-left p-4 rounded-xl ${path.bgColor} border ${path.borderColor} hover:border-white/20 transition-all duration-300 group`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon className={`w-5 h-5 ${path.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm mb-0.5">
                    {pathContent.title}
                  </h3>
                  <p className="text-xs text-gray-400 mb-2">
                    {pathContent.tagline}
                  </p>
                  <div className="space-y-1">
                    {pathContent.days.slice(0, 3).map((day, dayIndex) => (
                      <p key={dayIndex} className="text-xs text-gray-500 truncate">
                        {day.title}
                      </p>
                    ))}
                    <p className="text-xs text-gray-600">
                      +2 more {language === "th" ? "วัน" : "days"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}

        {/* More paths indicator */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-gray-500 pt-2"
        >
          {t.morePaths}
        </motion.p>
      </div>

      {/* Modal */}
      <DemoPathModal
        path={selectedPath}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
```

---

## Task 4: Update Hero Layout

**Files:**
- Modify: `components/landing-hero.tsx`

- [ ] **Step 1: Update imports and add LandingDemoPaths**

Replace the imports section:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/language-context";
import { HeroBackground } from "@/components/hero-background";
import { HeroVisualization } from "@/components/hero-visualization";
import { LandingDemoPaths } from "@/components/landing-demo-paths";
```

- [ ] **Step 2: Restructure the hero layout for desktop/mobile**

Replace the return statement (from line 64 onwards) with:

```typescript
  return (
    <section className="relative w-full min-h-[calc(100vh-var(--landing-header-offset,6.5rem))] flex flex-col items-center justify-center overflow-hidden">
      {/* Animated background with sunrise gradient */}
      <HeroBackground />

      {/* Living Education Galaxy - data-driven visualization */}
      <div className="absolute inset-0 w-full h-full">
        <HeroVisualization />
      </div>

      {/* Main content container */}
      <div className="relative z-10 px-6 w-full max-w-7xl mx-auto">
        {/* Mobile: Demo paths first, then text */}
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* Mobile demo paths - shown first on mobile */}
          <div className="lg:hidden w-full max-w-sm">
            <LandingDemoPaths />
          </div>

          {/* Text content */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Eyebrow */}
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-sm font-medium text-orange-300 tracking-wide uppercase mb-6"
            >
              {t.eyebrow}
            </motion.span>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight max-w-xl drop-shadow-[0_2px_30px_rgba(255,107,74,0.3)]"
            >
              {t.headline.split('\n')[0]}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 text-base sm:text-lg md:text-xl text-amber-100/80 max-w-md font-medium leading-relaxed"
            >
              {t.subheadline}
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 w-full sm:w-auto"
            >
              <Button
                size="lg"
                onClick={handleGuestAccess}
                disabled={isLoading}
                className="group relative bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-400 hover:to-amber-400 text-base sm:text-lg h-12 sm:h-14 px-8 sm:px-10 rounded-full font-semibold transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(251,191,36,0.4)] w-full sm:w-auto overflow-hidden"
              >
                {/* Subtle shine effect */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-out" />

                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {t.cta}
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </Button>
            </motion.div>
          </div>

          {/* Desktop demo paths - shown on right side */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <LandingDemoPaths />
          </div>
        </div>

        {/* Social proof / trust indicator - Thai universities */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 lg:mt-16 flex flex-col items-center gap-4"
        >
          <p className="text-xs sm:text-sm text-amber-200/50 font-medium">
            {language === "th" ? "นักเรียนจากมหาวิทยาลัยชั้นนำ" : "Students from top universities"}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 opacity-70">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 grayscale hover:grayscale-0 transition-all duration-300">
              <Image
                src="/universities/chula-logo.png"
                alt="Chulalongkorn University"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 grayscale hover:grayscale-0 transition-all duration-300">
              <Image
                src="/universities/tu-logo.png"
                alt="Thammasat University"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 grayscale hover:grayscale-0 transition-all duration-300">
              <Image
                src="/universities/KU-logo.jpg"
                alt="Kasetsart University"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 grayscale hover:grayscale-0 transition-all duration-300">
              <Image
                src="/universities/kmutt-logo.png"
                alt="KMUTT"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator - desktop only */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:block"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-5 h-8 rounded-full border-2 border-amber-400/40 flex items-start justify-center p-1.5"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-1 h-2 bg-amber-400/60 rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
```

---

## Task 5: Test and Verify

**Files:**
- None (verification only)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Verify desktop layout**

Open: `http://localhost:3000` in browser
Check:
- Hero text on left, demo cards on right
- Cards show icon, title, tagline, 3 days + "more" text
- Clicking a card opens modal with all 5 days and descriptions

- [ ] **Step 3: Verify mobile layout**

Resize browser to mobile width or use dev tools
Check:
- Demo cards appear above the text
- Text and CTA below cards
- All fits in one viewport
- Modal works on mobile

- [ ] **Step 4: Verify language toggle**

Click language toggle (TH/EN)
Check:
- All content switches language
- Modal content also switches

---

## Task 6: Commit Changes

- [ ] **Step 1: Stage and commit**

```bash
git add components/landing-demo-paths.tsx components/demo-path-modal.tsx components/landing-hero.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add demo path cards to hero section

- Add 3 sample career paths (Medical Doctor, AI Engineer, Startup Founder)
- Desktop: side-by-side layout with cards on right
- Mobile: cards above text/CTA in single viewport
- Click cards to see full 5-day descriptions in modal
- Full EN/TH language support

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```