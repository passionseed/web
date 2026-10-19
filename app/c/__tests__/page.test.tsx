import { render, screen } from "@testing-library/react";
import { FIXTURE_PUBLIC_ID, FIXTURE_SNAPSHOTS } from "@/lib/shift-round/certificate/fixtures";
import type { CertificateLookup } from "@/lib/shift-round/certificate/types";

const mockFetch = jest.fn<Promise<CertificateLookup>, [string]>();
const mockLogVisit = jest.fn();
const mockAfter = jest.fn((fn: () => unknown) => fn());
let mockUserAgent: string | null = "Mozilla/5.0 (iPhone) Mobile Safari";

jest.mock("@/lib/shift-round/certificate/rpc", () => {
  const actual = jest.requireActual("@/lib/shift-round/certificate/rpc");
  return {
    ...actual,
    fetchCertificate: (id: string) => mockFetch(id),
    logCertificateVisit: (...args: unknown[]) => mockLogVisit(...args),
  };
});
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
  permanentRedirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT;${url}`);
  },
}));
jest.mock("next/headers", () => ({
  headers: async () => new Map([["user-agent", mockUserAgent]]),
}));
jest.mock("next/server", () => ({ after: (fn: () => unknown) => mockAfter(fn) }));

import CertificatePage, { generateMetadata } from "../[publicId]/page";

const ID = FIXTURE_PUBLIC_ID;
const params = (publicId = ID) => Promise.resolve({ publicId });
const search = (q: Record<string, string> = {}) => Promise.resolve(q);

async function renderPage(publicId = ID, query: Record<string, string> = {}) {
  const ui = await CertificatePage({ params: params(publicId), searchParams: search(query) });
  return render(ui);
}

const valid = (overrides: Partial<Extract<CertificateLookup, { kind: "valid" }>["data"]> = {}, snapshot = FIXTURE_SNAPSHOTS.handle): CertificateLookup => ({
  kind: "valid",
  publicId: ID,
  snapshot,
  data: { status: "valid", tombstone: false, snapshot, render_version: 3, summary: null, ...overrides },
});

beforeEach(() => {
  mockFetch.mockReset();
  mockLogVisit.mockReset();
  mockAfter.mockClear();
  mockUserAgent = "Mozilla/5.0 (iPhone) Mobile Safari";
});

describe("/c/[publicId] verification page", () => {
  it("renders a valid certificate: status, handle, round, the round's missions, statement, disclaimer", async () => {
    mockFetch.mockResolvedValue(valid());
    const { container } = await renderPage(ID, { ref: "share" });
    expect(screen.getByRole("status")).toHaveTextContent("ใบรับรองนี้ใช้ได้");
    expect(screen.getByRole("status")).toHaveTextContent("This certificate is valid");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ต้น");
    expect(container).toHaveTextContent("SHIFT[4]");
    expect(container).toHaveTextContent("ปั้นไอเดียจากปัญหาที่เจอจริง");
    expect(container.querySelectorAll("li")).toHaveLength(7);
    expect(container).toHaveTextContent("คิด 3 ไอเดีย แล้วเลือก 1 · Three ideas, pick one");
    expect(container).toHaveTextContent("ใบรับรองนี้บันทึกว่า ต้น ทำภารกิจครบทั้ง 7 ใน SHIFT[4]");
    expect(container).toHaveTextContent("does not certify project outcomes or imply any admissions endorsement");
    expect(container).toHaveTextContent("สถานะปัจจุบันตรวจได้ที่หน้านี้เท่านั้น");
    expect(container).toHaveTextContent("www.passionseed.org/c/7K2M9QX4T8HBN3PD");
    expect(mockLogVisit).toHaveBeenCalledWith(ID, "share");
  });

  it("lists any number of missions from the snapshot, with the round's own titles", async () => {
    mockFetch.mockResolvedValue(valid({}, FIXTURE_SNAPSHOTS.ten_missions));
    const { container } = await renderPage();
    const items = Array.from(container.querySelectorAll("li"));
    expect(items).toHaveLength(10);
    expect(items[1]).toHaveTextContent("สัมภาษณ์คนที่เจอปัญหา 5 คน · Interview 5 people who have the problem");
    expect(items[7]).toHaveTextContent("ทดลองตั้งราคา · Test a price");
    // A Thai-only title shows once, not "X · X".
    expect(items[8].textContent).not.toContain(" · ");
    expect(container).toHaveTextContent("completed all 10 Missions of SHIFT[7]");
  });

  it("the summary's mission count uses the round's total", async () => {
    mockFetch.mockResolvedValue(
      valid({ summary: { title: "t", description: "d", demo_url: null, counts: { missions: 7 } } })
    );
    const { container } = await renderPage();
    expect(container).toHaveTextContent("ภารกิจ 7 จาก 7");
    expect(container).toHaveTextContent("7 of 7 Missions");
  });

  it("shows the legal name only when the holder opted in", async () => {
    mockFetch.mockResolvedValue(valid({}, FIXTURE_SNAPSHOTS.legal_name));
    await renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ธนกฤต ศรีสุวรรณวงศ์ไพบูลย์");
  });

  it.each([
    ["full snapshot", FIXTURE_SNAPSHOTS.legal_name],
    ["Lane A shape (holder/counts/track stripped)", (({ holder, counts, track, ...rest }) => (void holder, void counts, void track, rest))(FIXTURE_SNAPSHOTS.legal_name)],
  ])("revoked (%s): status, round and title, revoke date; holder hidden", async (_label, snapshot) => {
    mockFetch.mockResolvedValue({
      kind: "revoked",
      publicId: ID,
      snapshot,
      data: {
        status: "revoked",
        tombstone: false,
        snapshot,
        revoked_at: "2026-12-01T10:00:00+07:00",
        render_version: 5,
        summary: null,
      },
    });
    const { container } = await renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("ใบรับรองนี้ถูกเพิกถอนเมื่อ 1 ธ.ค. 2569");
    expect(screen.getByRole("status")).toHaveTextContent("This certificate was revoked on 1 Dec 2026");
    expect(container).toHaveTextContent("SHIFT[4]");
    expect(container).toHaveTextContent("ปั้นไอเดียจากปัญหาที่เจอจริง");
    expect(container).not.toHaveTextContent("ธนกฤต");
    expect(container).not.toHaveTextContent("ต้น ");
    expect(container).not.toHaveTextContent("ใบรับรองนี้ใช้ได้");
  });

  it("tombstone: status only, no name or title", async () => {
    mockFetch.mockResolvedValue({
      kind: "tombstone",
      publicId: ID,
      data: { status: "revoked", tombstone: true, snapshot: null, revoked_at: "2026-12-01T00:00:00Z", render_version: 6, summary: null },
    });
    const { container } = await renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("ใบรับรองนี้ถูกเพิกถอนแล้ว");
    expect(container).not.toHaveTextContent("ปั้นไอเดีย");
    expect(container).not.toHaveTextContent("ต้น");
  });

  it("not found -> notFound() (HTTP 404)", async () => {
    mockFetch.mockResolvedValue({ kind: "not_found", publicId: ID });
    await expect(CertificatePage({ params: params(), searchParams: search() })).rejects.toThrow("404");
  });

  it("RPC failure -> 5xx error, never not found or revoked", async () => {
    mockFetch.mockResolvedValue({ kind: "error", publicId: ID, reason: "rpc:PGRST202" });
    const result = CertificatePage({ params: params(), searchParams: search() });
    await expect(result).rejects.toThrow(/shift_certificate_unavailable/);
    await expect(CertificatePage({ params: params(), searchParams: search() })).rejects.not.toThrow("404");
    expect(mockLogVisit).not.toHaveBeenCalled();
  });

  it("error.tsx shows web.error copy, not not-found or revoked wording", async () => {
    const { default: ErrorView } = await import("../[publicId]/error");
    const { container } = render(<ErrorView error={new Error("x")} reset={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("ตรวจสอบไม่ได้ในขณะนี้");
    expect(screen.getByRole("alert")).toHaveTextContent("This doesn't mean the certificate is invalid.");
    expect(container).not.toHaveTextContent("ไม่พบใบรับรองนี้");
    expect(container).not.toHaveTextContent("เพิกถอน");
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders the summary only when present, with a safe https demo link", async () => {
    mockFetch.mockResolvedValue(valid());
    const first = await renderPage();
    expect(first.container).not.toHaveTextContent("เกี่ยวกับโปรเจกต์");
    first.unmount();

    mockFetch.mockResolvedValue(
      valid({
        summary: {
          title: "Canteen queue fixer",
          description: "Line two\nline three",
          demo_url: "https://example.com/demo",
          counts: { people_talked_to: 9, testers: 3, birth_year: 2009 },
        },
      })
    );
    const { container } = await renderPage();
    expect(container).toHaveTextContent("เกี่ยวกับโปรเจกต์");
    expect(container).toHaveTextContent("Canteen queue fixer");
    expect(container).toHaveTextContent("คุยกับคนจริง 9 คน");
    expect(container).not.toHaveTextContent("2009");
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com/demo");
    expect(link).toHaveAttribute("rel", "noopener nofollow ugc");
  });

  it("never links a non-https demo url", async () => {
    mockFetch.mockResolvedValue(
      valid({ summary: { title: "t", description: "d", demo_url: "javascript:alert(1)", counts: null } })
    );
    await renderPage();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("escapes <script> in title, handle and summary", async () => {
    const evil = "<script>window.__pwned=1</script>";
    const snapshot = {
      ...FIXTURE_SNAPSHOTS.handle,
      round: { ...FIXTURE_SNAPSHOTS.handle.round, title_th: evil },
      holder: { handle: "<img src=x onerror=alert(1)>", legal_name: null, display: "handle" as const },
    };
    mockFetch.mockResolvedValue(valid({ summary: { title: evil, description: evil, demo_url: null, counts: null } }, snapshot));
    const { container } = await renderPage();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<script>");
  });

  it("does not log visits from bots", async () => {
    mockUserAgent = "facebookexternalhit/1.1";
    mockFetch.mockResolvedValue(valid());
    await renderPage();
    expect(mockLogVisit).not.toHaveBeenCalled();
  });

  it("redirects lowercase ids to the canonical uppercase id", async () => {
    await expect(
      CertificatePage({ params: params(ID.toLowerCase()), searchParams: search({ ref: "qr" }) })
    ).rejects.toThrow(`NEXT_REDIRECT;/c/${ID}?ref=qr`);
  });

  it("metadata: noindex always; og:image square only for valid certificates", async () => {
    mockFetch.mockResolvedValue(valid());
    const meta = await generateMetadata({ params: params() });
    expect(meta.robots).toMatchObject({ index: false, follow: false });
    expect(JSON.stringify(meta.openGraph)).toContain(`/c/${ID}/image/square?v=3`);

    mockFetch.mockResolvedValue({ kind: "error", publicId: ID, reason: "x" });
    const failed = await generateMetadata({ params: params() });
    expect(failed.robots).toMatchObject({ index: false, follow: false });
    expect(failed.openGraph).toBeUndefined();
  });
});
