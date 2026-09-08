export interface SlideData {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  section: string;
  speakerNotes: string[];
  defenseScript?: string;
  anticipatedQuestions?: { q: string; a: string }[];
}

export const CAPSTONE_META = {
  projectTitle: "PassionSeed: ProjectSeed",
  shortTitle: "PassionSeed",
  subtitle: "Real projects, real users, evidence students can defend",
  program: "Bachelor of Arts and Science in Integrated Innovation (BAScii)",
  institution: "Chulalongkorn School of Integrated Innovation (CSII)",
  academicYear: "2026-2027",
  stage: "Pre-launch validation",
  submissionDeadline: "3 September 2026",
  presenter: "Bunyasit Fang",
};

export const SLIDES_DATA: SlideData[] = [
  {
    id: "slide-1",
    number: 1,
    section: "Project Slide Deck",
    title: "PassionSeed: ProjectSeed",
    subtitle: "Real projects, real users, evidence students can defend",
    speakerNotes: [
      "This deck summarizes the ProjectSeed capstone project, its objectives, and its current progress.",
      "ProjectSeed uses the TCAS Round 1 portfolio window to help Thai high-school students build work that is real, self-authored, and testable.",
      "The central promise is a shipped project with evidence, not a certificate and not an admission guarantee.",
    ],
  },
  {
    id: "slide-2",
    number: 2,
    section: "Project Overview",
    title: "Turn the portfolio window into real work",
    subtitle: "A time-boxed build program for students who need evidence, not another attendance certificate",
    speakerNotes: [
      "The approved strategy identifies one unusually valuable moment: TCAS Round 1 lets students build something real inside a high-stakes admissions process.",
      "ProjectSeed serves M6 students first, while accepting M4-M5, and works backward from the external submission window.",
      "Parents buy reduced deadline risk. Students do the work. The output is a functioning project, interviews with real users, and documentation the student can explain.",
      "ProjectSeed does not promise admission and must not ghostwrite the project. The student authors the artifact.",
    ],
    defenseScript:
      "The project is intentionally outcome-specific: ship and document a real student-authored project before the TCAS deadline. Admissions results remain outside our control.",
  },
  {
    id: "slide-3",
    number: 3,
    section: "Key Objectives",
    title: "Four objectives define success",
    subtitle: "Every objective ends in observable evidence",
    speakerNotes: [
      "First, each student must ship a real artifact and be able to explain the decisions behind it.",
      "Second, the project must encounter real users and preserve what was learned, including failures and changes.",
      "Third, delivery with minors must be observable and parent-visible, with no private one-to-one mentoring conversations.",
      "Fourth, Batch 1 must measure the operating model: completion, mentor hours, willingness to pay, and whether alumni can add capacity.",
    ],
  },
  {
    id: "slide-4",
    number: 4,
    section: "Milestones and Progress",
    title: "The product foundation exists. Launch readiness does not.",
    subtitle: "Status grounded in the approved strategy and launch gate tracker",
    speakerNotes: [
      "The foundation is real: approximately 1,300 students reached across four earlier products over 18 months.",
      "The ProjectSeed offer and operating model are defined: M6 primary, 2,990 baht, one tier, a shipped-project guarantee, and no admission guarantee.",
      "An alumni-first hub MVP is live in code, but the strategy records that it is not yet in production.",
      "The launch gate tracker dated 1 August records only 2 of 17 cohort-level safeguarding items done. Current code checked on 3 September still keeps sales locked.",
      "That makes Batch 1 launch an open milestone, not completed traction. The deck states this directly.",
    ],
    anticipatedQuestions: [
      {
        q: "Why show a blocked milestone in a presentation?",
        a: "Because the blocker protects minors and determines the real launch date. Hiding it would turn a progress slide into marketing rather than project management.",
      },
    ],
  },
  {
    id: "slide-5",
    number: 5,
    section: "Next Milestone",
    title: "Next: earn permission to launch Batch 1",
    subtitle: "Close the safety gate, run a bounded cohort, and measure the model",
    speakerNotes: [
      "The next milestone is not growth. It is safe launch readiness.",
      "The longest-lead work is appointing and screening a deputy safeguarding lead and every mentor.",
      "In parallel, we must establish the reporting inbox and record store, configure approved group channels, and verify the broadcast-only bot behavior.",
      "After briefing mentors and collecting parent acknowledgements, Batch 1 can open as a bounded validation cohort.",
      "The cohort must measure ship rate, evidence from real users, and mentor hours per student. Those numbers decide whether the model is repeatable.",
    ],
    defenseScript:
      "Batch 1 remains closed until the safeguarding gate is complete. The project will trade speed for safety where minors are involved.",
  },
];
