/**
 * Fact registry for the AI Engineer guide (Level 1). Every fact was re-read at
 * its source on 2026-11-18. Research behind the older deck:
 * docs/radar-guide/factsheets/ai-engineer.md (market and salary figures stay
 * on the Level 2 deck and are not repeated here).
 *
 * Rules (guide-lint): every number a Thai sentence prints is in `claimEn` or
 * `values` of a fact that sentence cites; a team's own numbers about its own
 * product carry the vendor badge; simulated game data is `sim.*`.
 */
import type { Fact } from "@/lib/radar-guide/guide-types";

const AS_OF = "2026-11-18" as const;

export const AI_ENGINEER_FACTS: readonly Fact[] = [
  // ---------------------------------------------------------------- dream
  {
    id: "f.ai-risa",
    claimEn:
      "On Aug 20, 2025 (20 ส.ค. 2568) SCB 10X and the Office of the Education Council (สกศ.) signed an MOU around RISA Chatbot, an app built on SCB 10X's Thai large language model Typhoon (researched and developed in Thailand) that lets students practise for PISA 2025 and get answers checked instantly. SCB says more than 9,700 students from more than 300 schools in 74 provinces were already using it.",
    values: ["9,700", "300", "74", "2025", "2568"],
    sources: [
      {
        outlet: "SCB (ธนาคารไทยพาณิชย์)",
        url: "https://www.scb.co.th/th/about-us/news/aug-2568/scb10x-mou-typhoon",
        publishedAt: "2025-08-20",
      },
      {
        outlet: "ไทยพับลิก้า",
        url: "https://thaipublica.org/2025/08/scb-10x-x-onec-ai-typhoon-pr-21082025/",
        publishedAt: "2025-08-21",
      },
    ],
    asOf: AS_OF,
    badge: "vendor",
    note: "Usage numbers are SCB's own press release (ThaiPublica runs the same release). Say กว่า: the source says more than.",
  },
  {
    id: "f.ai-pathumma",
    claimEn:
      "NSTDA (Mar 25, 2025): Pathumma LLM, built by a NECTEC team in Thailand to understand Thai language and culture, has text, vision (image) and audio (Thai speech) models; the Thai Parliament has adopted it to improve public services.",
    values: ["2025", "2568"],
    sources: [
      {
        outlet: "NSTDA (สวทช.)",
        url: "https://www.nstda.or.th/en/news/news-years-2025/pathumma-llm-ai-technology-tailored-to-thai-context-and-culture.html",
        publishedAt: "2025-03-25",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.ai-inspectra",
    claimEn:
      "KMUTT (Mar 21, 2024): Inspectra CXR, a real-time AI system for reading chest X-rays, was developed by scientists at KMUTT's Institute of Field Robotics (FIBO) with the startup Perceptra; it flags up to 8 abnormalities, analyses an image in about 2 seconds, and is meant to support doctors, not replace them. Perceptra (Jan 30, 2025) says it was co-developed with Siriraj and is the first AI medical imaging product in Thailand approved by the Thai FDA.",
    values: ["2", "8", "2024", "2567"],
    sources: [
      {
        outlet: "KMUTT Research and Innovation",
        url: "https://en-ripo.kmutt.ac.th/research_highlights/inspectracxr/",
        publishedAt: "2024-03-21",
      },
      {
        outlet: "Perceptra",
        url: "https://perceptra.tech/resources/ai-medical-innovations-pmac-2025/",
        publishedAt: "2025-01-30",
      },
    ],
    asOf: AS_OF,
    badge: "vendor",
    note: "Speed and abnormality count are the developers' own figures. Do not print the undefined 90% accuracy, and do not say 30 hospitals use it (30 was the field-study count).",
  },
  {
    id: "f.ai-typhoon-ocr",
    claimEn:
      "arXiv (Jan 21, 2026): the Typhoon team published Typhoon OCR, an open vision-language model that reads Thai and English documents, tested on financial reports, government forms, books, infographics and handwritten documents. The code is open source (Apache 2.0).",
    values: ["2026", "2569"],
    sources: [
      { outlet: "arXiv", url: "https://arxiv.org/abs/2601.14722v1", publishedAt: "2026-01-21" },
      { outlet: "GitHub (scb-10x)", url: "https://github.com/scb-10x/typhoon-ocr", publishedAt: "2026-01" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Do not repeat the vendor blog's claim that it beats GPT-4o or Gemini.",
  },

  // ---------------------------------------------------------------- work
  {
    id: "f.ai-thaiexam",
    claimEn:
      "Stanford CRFM (Sep 4, 2024): ThaiExam is a Thai-language benchmark built from Thai standardized exams (ONET, IC, TGAT, TPAT-1, A-Level), first introduced by SCB 10X to evaluate the Typhoon model; Stanford hosts a ThaiExam leaderboard in HELM.",
    sources: [{ outlet: "Stanford CRFM", url: "https://crfm.stanford.edu/2024/09/04/thaiexam.html", publishedAt: "2024-09-04" }],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "sim.ai-helpbot",
    claimEn:
      "Simulated: building a school help-bot on an existing model. First the student picks which of 6 documents the bot may read (this year's calendar and the handbook yes; classmates' grades, parents' phone numbers, the teachers' group chat and last year's calendar no). Then they try it on 7 student questions and pick a fix for each answer: ship it, give the bot the missing data, or hand it to a person. Documents, questions and answers are invented for the game, based on common chatbot failures: made-up answers when the documents are silent, not understanding regional Thai, and health or wellbeing questions a person must handle.",
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },

  // ---------------------------------------------------------------- tonight
  {
    id: "f.ai-teachable-machine",
    claimEn:
      "Teachable Machine FAQ (Google, read on Nov 18, 2026, Thai version available): start at teachablemachine.withgoogle.com, no need to make an account or log in; train with images, sounds or poses without writing code; training runs in the browser tab and samples are not sent to any server unless you save the project to Google Drive; you can download your samples or model instead. The FAQ suggests testing an image model against a different background, lighting or time of day.",
    values: ["18", "2026"],
    sources: [
      { outlet: "Google Teachable Machine (FAQ)", url: "https://teachablemachine.withgoogle.com/faq", publishedAt: "2026-11" },
      { outlet: "Google", url: "https://blog.google/technology/ai/teachable-machine/", publishedAt: "2019-11-07" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "The FAQ does not use the word free; say ไม่ต้องสร้างบัญชี, not ฟรี. Saving to Google Drive needs a Google account: tell students to download instead.",
  },
];
