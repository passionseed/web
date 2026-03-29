import { parseProblemBrief } from "@/lib/hackathon/problem-brief-schema";

describe("parseProblemBrief", () => {
  it("normalizes bilingual content and preserves source links for evidence items", () => {
    const brief = parseProblemBrief({
      problemId: "P1",
      title: {
        en: "The Last-Mile Chronic Disease Gap",
        th: "ช่องว่างโรคเรื้อรังในพื้นที่ห่างไกล",
      },
      track: "Traditional & Integrative Healthcare",
      trackNum: "01",
      color: "#91C4E3",
      hook: "Rural screening access remains uneven across Thailand.",
      challenge: {
        en: "How might we improve early detection in rural communities?",
        th: "เราจะทำให้การตรวจพบตั้งแต่เนิ่น ๆ ในชุมชนชนบทดีขึ้นได้อย่างไร?",
      },
      tags: ["Rural Health"],
      grading: {
        severity: { score: 9, justification: "High disease burden" },
        difficulty: { score: 7, justification: "Workforce and geography" },
        impact: { score: 9, justification: "Large addressable population" },
        urgency: { score: 8, justification: "Late detection worsens outcomes" },
      },
      statistics: [
        {
          stat: {
            en: "NCDs drive most deaths in Thailand.",
            th: "โรค NCD เป็นสาเหตุการเสียชีวิตส่วนใหญ่ในไทย",
          },
          year: "2024",
          sources: [
            {
              label: "WHO Thailand",
              url: "https://www.who.int/thailand",
            },
          ],
        },
      ],
      affectedPopulations: [
        {
          group: {
            en: "Rural older adults",
            th: "ผู้สูงอายุในชนบท",
          },
          size: {
            en: "Millions",
            th: "หลายล้านคน",
          },
          painPoints: [
            {
              en: "Long travel to screening sites",
              th: "ต้องเดินทางไกลเพื่อเข้ารับการคัดกรอง",
            },
          ],
        },
      ],
      stakeholderMap: {
        primary: [
          {
            role: {
              en: "Village Health Volunteers",
              th: "อาสาสมัครสาธารณสุขประจำหมู่บ้าน",
            },
            needs: ["Low-cost tools"],
            painPoints: ["Limited training"],
          },
        ],
        secondary: [],
      },
      rootCauses: [
        {
          cause: {
            en: "Low screening reach",
            th: "การเข้าถึงการคัดกรองต่ำ",
          },
          explanation: {
            en: "Current screening is too facility-centered.",
            th: "การคัดกรองยังยึดติดกับสถานพยาบาลมากเกินไป",
          },
          systemic: true,
        },
      ],
      existingSolutions: [],
      opportunityAreas: [],
      resources: [
        {
          title: "WHO Thailand",
          type: "Reference",
          url: "https://www.who.int/thailand",
          description: "Country profile",
        },
      ],
      keyInsights: [
        {
          en: "Trusted local health workers are a leverage point.",
          th: "บุคลากรสุขภาพในชุมชนที่ได้รับความไว้วางใจคือจุดคานงัดสำคัญ",
        },
      ],
      deepResearch: [
        {
          title: {
            en: "Thai evidence snapshot",
            th: "ภาพรวมหลักฐานในไทย",
          },
          summary: {
            en: "The strongest interventions pair screening with rapid follow-up.",
            th: "การแทรกแซงที่ได้ผลที่สุดคือการคัดกรองที่เชื่อมต่อกับการติดตามผลอย่างรวดเร็ว",
          },
          evidence: [
            {
              claim: {
                en: "Follow-up breaks down when screening and referral sit in separate systems.",
                th: "การติดตามผลมักล้มเหลวเมื่อระบบคัดกรองและระบบส่งต่อแยกขาดจากกัน",
              },
              sources: [
                {
                  label: "WHO Thailand",
                  url: "https://www.who.int/thailand",
                },
              ],
            },
          ],
        },
      ],
    });

    expect(brief.hook.en).toBe("Rural screening access remains uneven across Thailand.");
    expect(brief.hook.th).toBe("Rural screening access remains uneven across Thailand.");
    expect(brief.statistics[0].sources[0].url).toBe("https://www.who.int/thailand");
    expect(brief.deepResearch?.[0].evidence[0].claim.th).toContain("การติดตามผล");
  });

  it("falls back to matching resources when a statistic has no explicit sources", () => {
    const brief = parseProblemBrief({
      problemId: "P2",
      title: "Traditional Medicine Data Gap",
      track: "Traditional & Integrative Healthcare",
      trackNum: "01",
      color: "#91C4E3",
      hook: "Records remain fragmented.",
      challenge: "How might we digitize Thai traditional medicine records?",
      tags: [],
      grading: {
        severity: { score: 8, justification: "Large blind spot" },
        difficulty: { score: 7, justification: "Fragmented systems" },
        impact: { score: 8, justification: "Better care continuity" },
        urgency: { score: 7, justification: "Data keeps compounding" },
      },
      statistics: [
        {
          stat: "Traditional medicine usage remains widespread in Thailand.",
          source: "National Statistical Office Thailand",
          year: "2023",
        },
      ],
      affectedPopulations: [],
      stakeholderMap: { primary: [], secondary: [] },
      rootCauses: [],
      existingSolutions: [],
      opportunityAreas: [],
      resources: [
        {
          title: "National Statistical Office Thailand",
          type: "Dataset",
          url: "https://www.nso.go.th/",
          description: "Official datasets",
        },
      ],
      keyInsights: [],
    });

    expect(brief.statistics[0].sources).toHaveLength(1);
    expect(brief.statistics[0].sources[0].url).toBe("https://www.nso.go.th/");
  });
});
