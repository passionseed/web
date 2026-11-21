import { render, screen, within } from "@testing-library/react";

import type { ClaimCount, MemberClaimCode } from "@/lib/supabase/elemental-claims";
import type {
  AdminRegistration,
  PublicRegistration,
  RegistrationStatus,
} from "@/lib/supabase/hackathon-event-registrations";

const mockByToken = jest.fn<Promise<PublicRegistration | null>, [string]>();
const mockList = jest.fn<Promise<AdminRegistration[]>, [string]>();
const mockCodes = jest.fn<Promise<MemberClaimCode[] | null>, [string]>();
const mockCounts = jest.fn<Promise<Map<string, ClaimCount> | null>, []>();

jest.mock("@/lib/supabase/hackathon-event-registrations", () => ({
  getRegistrationByToken: (token: string) => mockByToken(token),
  listRegistrations: (slug: string) => mockList(slug),
}));
jest.mock("@/lib/supabase/elemental-claims", () => ({
  getMemberClaimCodes: (id: string) => mockCodes(id),
  getClaimCounts: () => mockCounts(),
}));
jest.mock("@/lib/admin/requireAdmin", () => ({ requireAdmin: jest.fn(async () => ({})) }));
jest.mock("@/components/admin/hackathon/RegistrationActions", () => ({ RegistrationActions: () => null }));
jest.mock("@/components/hackathon/elemental/PayWithSlip", () => ({
  PayWithSlip: () => <div data-testid="pay-with-slip" />,
  PaidBadge: () => null,
}));
jest.mock("@/components/hackathon/elemental/fonts", () => ({ trirong: { variable: "font-trirong" } }));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ refresh: jest.fn() }),
}));

import AdminHackathonRegistrationsPage from "@/app/admin/hackathon/registrations/page";
import ElementalPayPage from "@/app/hackathon/join/[token]/page";
import { DiscordClaim, formatClaimCode } from "@/components/hackathon/elemental/DiscordClaim";

const TOKEN = "0123456789abcdef0123456789abcdef";
const REG_ID = "11111111-1111-4111-8111-111111111111";

function publicReg(status: RegistrationStatus): PublicRegistration {
  return {
    id: REG_ID,
    status,
    teamName: "Test Team",
    memberCount: 3,
    amountBaht: 1500,
    memberNicknames: ["River", "Stone", "Cloud"],
  };
}

const CODES: MemberClaimCode[] = [
  { position: 1, code: "ABCDEFGH", claimed: true },
  { position: 2, code: "JKLMNPQR", claimed: false },
  { position: 3, code: "STUVWXYZ", claimed: false },
];

async function renderPayPage() {
  render(await ElementalPayPage({ params: Promise.resolve({ token: TOKEN }) }));
}

function rowFor(name: string): HTMLElement {
  const li = screen.getByText(name).closest("li");
  if (!li) throw new Error(`no row for ${name}`);
  return li;
}

beforeEach(() => {
  mockByToken.mockReset();
  mockList.mockReset();
  mockCodes.mockReset();
  mockCounts.mockReset();
});

describe("paid page claim codes", () => {
  it.each(["pending", "review", "cancelled"] as const)("%s shows no code and never reads codes", async (status) => {
    mockByToken.mockResolvedValue(publicReg(status));
    mockCodes.mockResolvedValue(CODES);
    await renderPayPage();
    expect(mockCodes).not.toHaveBeenCalled();
    expect(screen.queryByTestId("discord-claim")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\/join|ABCD-EFGH|ABCDEFGH/);
  });

  it("paid shows each member's code beside the name entered, by position", async () => {
    mockByToken.mockResolvedValue(publicReg("paid"));
    // Fetched out of order: the page still puts each code on its own position.
    mockCodes.mockResolvedValue([CODES[2], CODES[0], CODES[1]]);
    await renderPayPage();

    expect(mockCodes).toHaveBeenCalledWith(REG_ID);
    expect(screen.getByTestId("discord-claim")).toBeInTheDocument();
    expect(within(rowFor("River")).getByTestId("claim-command")).toHaveTextContent("/join code:ABCD-EFGH");
    expect(within(rowFor("Stone")).getByTestId("claim-command")).toHaveTextContent("/join code:JKLM-NPQR");
    expect(within(rowFor("Cloud")).getByTestId("claim-command")).toHaveTextContent("/join code:STUV-WXYZ");
    expect(rowFor("River")).toHaveAttribute("data-position", "1");
    expect(rowFor("Cloud")).toHaveAttribute("data-position", "3");
    // The paid message is still there: the block is additive.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ได้ที่นั่งแล้ว");
  });

  it("paid gives the same codes on every load", async () => {
    mockByToken.mockResolvedValue(publicReg("paid"));
    mockCodes.mockResolvedValue(CODES);
    await renderPayPage();
    const first = screen.getAllByTestId("claim-command").map((n) => n.textContent);
    document.body.innerHTML = "";
    mockCodes.mockResolvedValue([...CODES].reverse());
    await renderPayPage();
    expect(screen.getAllByTestId("claim-command").map((n) => n.textContent)).toEqual(first);
  });

  it("paid but unreadable codes keeps the page as it was", async () => {
    mockByToken.mockResolvedValue(publicReg("paid"));
    mockCodes.mockResolvedValue(null);
    await renderPayPage();
    expect(screen.queryByTestId("discord-claim")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ได้ที่นั่งแล้ว");
  });
});

describe("DiscordClaim", () => {
  it("says codes are coming when none were issued", () => {
    render(<DiscordClaim memberNames={["River"]} codes={[]} />);
    expect(screen.getByTestId("discord-claim")).toBeInTheDocument();
    expect(screen.queryByTestId("claim-command")).not.toBeInTheDocument();
  });

  it("marks a used code and a position without one", () => {
    render(
      <DiscordClaim
        memberNames={["A", "B", "C", "D", "E", "F"]}
        codes={[1, 2, 3, 4, 5].map((position) => ({ position, code: "ABCDEFGH", claimed: position === 1 }))}
      />,
    );
    expect(within(rowFor("A")).getByText("ใช้แล้ว")).toBeInTheDocument();
    expect(within(rowFor("B")).queryByText("ใช้แล้ว")).not.toBeInTheDocument();
    expect(within(rowFor("F")).queryByTestId("claim-command")).not.toBeInTheDocument();
  });

  it("formats an 8-character code in two groups", () => {
    expect(formatClaimCode("ABCDEFGH")).toBe("ABCD-EFGH");
    expect(formatClaimCode("ABC")).toBe("ABC");
  });
});

function adminReg(id: string, status: RegistrationStatus, teamName: string): AdminRegistration {
  return {
    id,
    status,
    teamName,
    memberCount: 2,
    amountBaht: 1000,
    contactEmail: "contact@example.test",
    contactPhone: "000",
    contactLineId: null,
    wantsTeamMatching: false,
    contactAfterConsent: false,
    source: null,
    slipUrl: null,
    slipCheck: null,
    paidAt: null,
    paidBy: null,
    adminNote: null,
    createdAt: "2026-11-22T03:00:00Z",
    members: [],
  };
}

function cardFor(teamName: string): HTMLElement {
  const li = screen.getByText(teamName).closest("li");
  if (!li) throw new Error(`no card for ${teamName}`);
  return li;
}

describe("admin registrations card", () => {
  const rows = [
    adminReg("reg-paid", "paid", "Paid Team"),
    adminReg("reg-new", "paid", "Fresh Team"),
    adminReg("reg-pending", "pending", "Pending Team"),
  ];

  it("shows n/m claimed on paid cards and the total", async () => {
    mockList.mockResolvedValue(rows);
    mockCounts.mockResolvedValue(new Map([["reg-paid", { claimed: 1, issued: 2 }]]));
    render(await AdminHackathonRegistrationsPage());
    expect(within(cardFor("Paid Team")).getByText("1/2 claimed")).toBeInTheDocument();
    expect(within(cardFor("Fresh Team")).getByText("0/0 claimed")).toBeInTheDocument();
    expect(within(cardFor("Pending Team")).queryByText(/claimed/)).not.toBeInTheDocument();
    expect(screen.getByText(/Discord: 1\/2 codes claimed/)).toBeInTheDocument();
  });

  it("hides the badges when counts can't be read, and still lists sign-ups", async () => {
    mockList.mockResolvedValue(rows);
    mockCounts.mockResolvedValue(null);
    render(await AdminHackathonRegistrationsPage());
    expect(screen.getByText("Paid Team")).toBeInTheDocument();
    expect(screen.queryByText(/claimed/)).not.toBeInTheDocument();
  });
});
