import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProblemDetailPage from "@/components/hackathon/ProblemDetailPage";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({
    problemId: "P1",
  }),
}));

describe("ProblemDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        problemId: "P1",
        title: {
          en: "The Last-Mile Chronic Disease Gap",
          th: "ช่องว่างโรคเรื้อรังในพื้นที่ห่างไกล",
        },
        track: "Traditional & Integrative Healthcare",
        trackNum: "01",
        color: "#91C4E3",
        hook: {
          en: "Rural screening access remains uneven across Thailand.",
          th: "การเข้าถึงการคัดกรองในชนบทของไทยยังไม่ทั่วถึง",
        },
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
        affectedPopulations: [],
        stakeholderMap: { primary: [], secondary: [] },
        rootCauses: [],
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
      }),
    }) as jest.Mock;
  });

  it("renders source links for research claims and switches to Thai content", async () => {
    render(<ProblemDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("The Last-Mile Chronic Disease Gap")).toBeInTheDocument();
    });

    const sourceLink = screen.getAllByRole("link", { name: /WHO Thailand/i })[0];
    expect(sourceLink).toHaveAttribute("href", "https://www.who.int/thailand");

    fireEvent.click(screen.getByRole("button", { name: "TH" }));

    expect(await screen.findByText("ช่องว่างโรคเรื้อรังในพื้นที่ห่างไกล")).toBeInTheDocument();
    expect(screen.getByText("ภาพรวมหลักฐานในไทย")).toBeInTheDocument();
    expect(screen.getByText("การติดตามผลมักล้มเหลวเมื่อระบบคัดกรองและระบบส่งต่อแยกขาดจากกัน")).toBeInTheDocument();
  });
});
