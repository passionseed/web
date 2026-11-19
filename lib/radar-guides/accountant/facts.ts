/**
 * Fact registry for the Accountant guide (Level 1). Every fact was re-read at
 * its source on 2026-11-20. Research notes:
 * docs/radar-guide/factsheets/accountant.md (salary and market figures from
 * the older deck stay on the Level 2 deck and are not repeated here).
 *
 * Rules (guide-lint): every number a Thai sentence prints is in `claimEn` or
 * `values` of a fact that sentence cites; a company's own claims about its own
 * product carry the vendor badge; simulated game data is `sim.*`.
 */
import type { Fact } from "@/lib/radar-guide/guide-types";

const AS_OF = "2026-11-20" as const;

export const ACCOUNTANT_FACTS: readonly Fact[] = [
  // ---------------------------------------------------------------- dream
  {
    id: "f.acc-stark-audit",
    claimEn:
      "Thansettakij (Jun 17, 2023 / 17 มิ.ย. 2566): STARK, a company listed on the Thai stock exchange, explained that a special auditor, working to an extended scope the SEC (ก.ล.ต.) asked for, found 202 unusual sales transactions worth 8,063 million baht in 2022 (2565) and 3,593 million baht in 2021 (2564). They were found by confirming balances with customers, checking how payments were received, unusual payment patterns, forged payer names, and payments made from a former employee's account on behalf of customers. InfoQuest (Feb 14, 2023): Phelps Dodge is a STARK subsidiary and STARK's main business is wire and cable (ธุรกิจสายไฟฟ้าและสายเคเบิ้ล).",
    values: ["202", "8,063", "3,593", "2566", "2565", "2564"],
    sources: [
      {
        outlet: "ฐานเศรษฐกิจ",
        url: "https://www.thansettakij.com/business/economy/568357",
        publishedAt: "2023-06-17",
      },
      { outlet: "InfoQuest", url: "https://www.infoquest.co.th/?p=275636", publishedAt: "2023-02-14" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Say ผิดปกติ (unusual), as the audit did; the criminal case is not decided. Never name a person. Do not use the 15.6 billion or 100 billion figures: they come from later or different scopes.",
  },
  {
    id: "f.acc-stark-sec",
    claimEn:
      "The Standard (Apr 1, 2026) and Mitihoon (Mar 31, 2026): on Jul 6, 2023 (6 ก.ค. 2566) the SEC referred 10 former STARK directors and executives to the DSI over false entries in the books of STARK and its subsidiaries in 2021 to 2022. On Apr 1, 2026 (2569) the SEC also referred the auditor who signed STARK's 2019 to 2021 financial statements to the DSI, finding the audits seriously failed auditing standards (not enough evidence for trade receivables, inventory, service revenue and costs), and barred new approval as a capital-market auditor for 6 years. The SEC says this starts the criminal process; investigation, prosecution and the courts come next.",
    values: ["10", "6", "2566", "2569"],
    sources: [
      { outlet: "THE STANDARD", url: "https://thestandard.co/sec-charges-deloitte-stark-auditor-fraud/", publishedAt: "2026-04-01" },
      { outlet: "มิติหุ้น", url: "https://www.mitihoon.com/2026/03/31/630005/", publishedAt: "2026-03-31" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Referrals (กล่าวโทษ), not convictions: say ส่งเรื่อง or กล่าวโทษ and คดียังไม่จบ. Do not name the auditor or the audit firm in copy.",
  },

  // ---------------------------------------------------------------- work
  {
    id: "f.acc-ai-tools",
    claimEn:
      "FlowAccount, a Thai accounting software company (blog, Aug 19, 2026): AI OCR reads text from receipts, tax invoices and other documents; RPA does repetitive steps such as recording accounting entries and reconciling accounts; AI still cannot replace analysis, tax planning, risk assessment and business advice.",
    values: ["2026", "2569"],
    sources: [
      { outlet: "FlowAccount", url: "https://flowaccount.com/blog/digital-accountant-skills/", publishedAt: "2026-08-19" },
    ],
    asOf: AS_OF,
    badge: "vendor",
    note: "A seller of accounting software describing what its kind of tool does. Do not turn it into a share of work automated.",
  },
  {
    id: "f.acc-wef-2025",
    claimEn:
      "World Economic Forum, Future of Jobs Report 2025 (January 2025): respondents expect the fastest-declining roles to include clerical roles such as cashiers and ticket clerks, administrative assistants and executive secretaries, printing workers, and accountants and auditors; broadening digital access, AI and information processing technologies, and robots are the primary drivers. The outlook runs to 2030.",
    values: ["2025", "2568", "2030"],
    sources: [
      {
        outlet: "World Economic Forum",
        url: "https://reports.weforum.org/docs/WEF_Future_of_Jobs_Report_2025.pdf",
        publishedAt: "2025-01",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "A global employer survey, not Thailand and not a count of jobs. Say นายจ้างทั่วโลกคาดว่า.",
  },
  {
    id: "sim.acc-shop-books",
    claimEn:
      "Simulated: a bubble-tea shop near a school uses an app whose AI reads slips and receipts and records the entries itself. The student checks 7 entries from one week against the evidence and sorts each: it adds up (fresh milk 1,200 baht matches its receipt; rent 8,000 baht matches the lease), it doesn't add up (ice recorded twice at 350 baht from one slip; plastic cups recorded as 2,500 baht when the receipt says 250; Saturday sales 6,400 baht in the shop app but 5,200 baht reached the bank, a gap of 1,200; a 3,000 baht transfer from an unknown name with no order), or it is not the shop's money (a 299 baht mobile game top-up paid with the shop's card). Then the owner asks how the week went. Entries, names and amounts are invented for the game, based on common bookkeeping errors: duplicates, misread amounts, cash not yet counted, money with no source, and personal spending mixed with business spending.",
    values: ["7", "1,200", "8,000", "350", "700", "2,500", "250", "6,400", "5,200", "3,000", "299"],
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },
  {
    id: "f.acc-cpa-ta",
    claimEn:
      "FlowAccount (Jun 4, 2026): a CPA (ผู้สอบบัญชีรับอนุญาต) is registered and licensed by the Federation of Accounting Professions (สภาวิชาชีพบัญชี) and can sign to certify the financial statements of companies and registered partnerships. A TA (ผู้สอบบัญชีภาษีอากร) is approved by the Director-General of the Revenue Department and audits small registered partnerships.",
    sources: [{ outlet: "FlowAccount", url: "https://flowaccount.com/blog/cpa-vs-ta-auditors/", publishedAt: "2026-06-04" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Explainer from a software company, consistent with the Accounting Profession Act; no digits used.",
  },
  {
    id: "f.acc-forensic",
    claimEn:
      "Journal of the Federation of Accounting Professions (วารสารสภาวิชาชีพบัญชี, Aug 18, 2020): forensic accountants work behind the scenes of the justice process, investigating, collecting and proving evidence in economic crime cases, and serve as expert witnesses in court; the field is still not widely known in Thai society.",
    sources: [
      {
        outlet: "วารสารสภาวิชาชีพบัญชี",
        url: "https://so02.tci-thaijo.org/index.php/JFAC/article/view/242719",
        publishedAt: "2020-08-18",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.acc-cfo",
    claimEn:
      "ACCA (career page, read Nov 20, 2026): a CFO's day-to-day work can include sourcing and managing funds, tracking performance and producing financial reports; CFOs typically progress from senior roles such as financial controller, and qualified accountants who can lead a finance or management accounting team are well placed for the role.",
    values: ["20", "2026"],
    sources: [
      {
        outlet: "ACCA",
        url: "https://www.accaglobal.com/my/en/study-with-acca/your-career/sectors-industries-roles/chief-financial-officer.html",
        publishedAt: "2026-11",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Undated professional-body career page (ACCA Malaysia); used only for what the role is, no digits.",
  },

  // ---------------------------------------------------------------- tonight
  {
    id: "f.acc-sheets",
    claimEn:
      "LibreOffice (read Nov 20, 2026): LibreOffice is free and open source software; Calc is its spreadsheet. Google Account Help (read Nov 20, 2026): 13 is the minimum age to manage your own Google Account in countries not listed (Thailand is not listed); for younger children parents can create and manage an account with Family Link.",
    values: ["13", "20", "2026"],
    sources: [
      { outlet: "LibreOffice", url: "https://www.libreoffice.org/discover/libreoffice/", publishedAt: "2026-11" },
      { outlet: "Google Account Help", url: "https://support.google.com/accounts/answer/1350409?hl=en", publishedAt: "2026-11" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Only LibreOffice is called ฟรี. Google Sheets is offered only to a student who already has a Google account; never tell a student to sign up.",
  },

  // ---------------------------------------------------------------- round 1
  {
    id: "f.acc-tcas-programmes",
    claimEn:
      "mytcas TCAS70 programme feed (CUPT, courses.json, read Nov 20, 2026): 94 programmes (unique program_id) at 56 universities have บัญชี in the programme or field name. The most common faculties are คณะบริหารธุรกิจ, คณะวิทยาการจัดการ and คณะพาณิชยศาสตร์และการบัญชี.",
    values: ["94", "56", "70"],
    sources: [
      {
        outlet: "mytcas (ทปอ.)",
        url: "https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/courses.json",
        publishedAt: "2026-11",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Our count over the official feed (one row per programme). The feed lists programmes, not which rounds each one opens.",
  },
];
