import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { loadPeerCheck, loadPeerChecks, loadPeerQueue, sendPeerCheck } from "@/app/shift/island/peer-actions";

import { PEER, WHO_CHECKS } from "../copy";
import { PeerChecks } from "../peer/PeerChecks";
import { PeerSheet } from "../peer/PeerSheet";
import { WhoChecks } from "../QuestSections";

jest.mock("@/app/shift/island/peer-actions", () => ({
  loadPeerQueue: jest.fn(),
  loadPeerCheck: jest.fn(),
  sendPeerCheck: jest.fn(),
  loadPeerChecks: jest.fn(),
  setPeerOpen: jest.fn(),
  hidePeerCheck: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, description, footer, children }: { open: boolean; title: string; description?: string; footer?: unknown; children: unknown }) =>
      open
        ? createElement("div", { role: "dialog", "aria-label": title }, createElement("p", null, description), children as never, footer as never)
        : null,
  };
});

const mockedQueue = loadPeerQueue as jest.MockedFunction<typeof loadPeerQueue>;
const mockedView = loadPeerCheck as jest.MockedFunction<typeof loadPeerCheck>;
const mockedSend = sendPeerCheck as jest.MockedFunction<typeof sendPeerCheck>;
const mockedList = loadPeerChecks as jest.MockedFunction<typeof loadPeerChecks>;

const SUB = "33333333-3333-4333-8333-333333333333";
const INSTANCE = "55555555-5555-4555-8555-555555555555";

const VIEW = {
  submissionId: SUB,
  revision: 1,
  status: "pending",
  title: "เจอคนจริงคนแรก",
  goal: "คุยกับคนที่เจอปัญหาจริง",
  criteria: "ชี้ตัวได้\nคุยจริง 10 นาที",
  kind: "proposed" as const,
  slug: null,
  milestone: null,
  evidence: "คุยกับแม่ค้าหน้าโรงเรียน",
  reflection: "กลัวแต่ไปคุย",
  artifactUrl: null,
  photos: [],
  canCheck: true,
  mine: null,
};

beforeEach(() => {
  mockedQueue.mockReset();
  mockedView.mockReset();
  mockedSend.mockReset();
  mockedList.mockReset();
});

describe("PeerSheet", () => {
  it("lists what is waiting with no names, opens one, and sends ticks and one line", async () => {
    mockedQueue.mockResolvedValue({ ok: true, data: [{ submissionId: SUB, title: VIEW.title, revision: 1, createdAt: "t", photos: 0, checks: 0 }] });
    mockedView.mockResolvedValue({ ok: true, data: VIEW });
    mockedSend.mockResolvedValue({ ok: true, data: { id: "c" } });
    render(<PeerSheet open onClose={jest.fn()} />);
    expect(await screen.findByText(PEER.queueCount(1))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(VIEW.title) }));

    expect(await screen.findByText(PEER.anonymous)).toBeInTheDocument();
    expect(screen.getByText(VIEW.evidence)).toBeInTheDocument();
    expect(screen.getByText(PEER.mentorDecides)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "คุยจริง 10 นาที" }));
    fireEvent.change(screen.getByLabelText(PEER.lineLabel), { target: { value: "  ดีมาก ลองถามเพิ่มอีกข้อ  " } });
    fireEvent.click(screen.getByRole("button", { name: PEER.send }));
    await waitFor(() => expect(mockedSend).toHaveBeenCalledWith({ submissionId: SUB, ticked: ["c2"], line: "ดีมาก ลองถามเพิ่มอีกข้อ" }));
    expect(toast.success).toHaveBeenCalledWith(PEER.sent);
    // Back on the list, without the one just checked.
    expect(await screen.findByText(PEER.empty)).toBeInTheDocument();
  });

  it("asks for the line before sending", async () => {
    mockedQueue.mockResolvedValue({ ok: true, data: [{ submissionId: SUB, title: VIEW.title, revision: 1, createdAt: "t", photos: 0, checks: 2 }] });
    mockedView.mockResolvedValue({ ok: true, data: VIEW });
    render(<PeerSheet open onClose={jest.fn()} />);
    expect(await screen.findByText(new RegExp(PEER.checks(2)))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(VIEW.title) }));
    fireEvent.click(await screen.findByRole("button", { name: PEER.send }));
    expect(screen.getByRole("alert")).toHaveTextContent(PEER.lineRequired);
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it("reads back the peer's own check instead of a second form", async () => {
    mockedQueue.mockResolvedValue({ ok: true, data: [{ submissionId: SUB, title: VIEW.title, revision: 1, createdAt: "t", photos: 0, checks: 1 }] });
    mockedView.mockResolvedValue({
      ok: true,
      data: { ...VIEW, canCheck: false, mine: { id: "c", peer: null, ticked: ["c1"], line: "ของฉัน", createdAt: "t", hidden: true } },
    });
    render(<PeerSheet open onClose={jest.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(VIEW.title) }));
    expect(await screen.findByText(PEER.yours)).toBeInTheDocument();
    expect(screen.getByText(PEER.yoursHidden)).toBeInTheDocument();
    expect(screen.getByText("ชี้ตัวได้")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: PEER.send })).not.toBeInTheDocument();
  });

  it("says when nothing is waiting", async () => {
    mockedQueue.mockResolvedValue({ ok: true, data: [] });
    render(<PeerSheet open onClose={jest.fn()} />);
    expect(await screen.findByText(PEER.empty)).toBeInTheDocument();
  });
});

describe("PeerChecks on the quest page", () => {
  it("shows each peer's line, the ticked items, and a peer without consent as เพื่อนบนเกาะ", async () => {
    mockedList.mockResolvedValue({
      ok: true,
      data: {
        submissionId: SUB,
        revision: 1,
        peerOpen: true,
        checks: [
          { id: "c1", peer: "Mint", ticked: ["c1"], line: "ชัดดี", createdAt: "t", hidden: false },
          { id: "c2", peer: null, ticked: [], line: "ลองถามเพิ่ม", createdAt: "t", hidden: false },
        ],
      },
    });
    render(<PeerChecks instanceId={INSTANCE} quest={{ kind: "proposed", slug: null, criteria: VIEW.criteria }} />);
    expect(await screen.findByRole("heading", { name: PEER.heading })).toBeInTheDocument();
    expect(screen.getByText("Mint")).toBeInTheDocument();
    expect(screen.getByText(PEER.someone)).toBeInTheDocument();
    expect(screen.getByText(PEER.ticked(1))).toBeInTheDocument();
    expect(screen.getByText("ชี้ตัวได้")).toBeInTheDocument();
    expect(screen.getByText("ลองถามเพิ่ม")).toBeInTheDocument();
  });

  it("shows nothing for work that is not open to peers and has no checks", async () => {
    mockedList.mockResolvedValue({ ok: true, data: { submissionId: SUB, revision: 1, peerOpen: false, checks: [] } });
    const { container } = render(<PeerChecks instanceId={INSTANCE} quest={{ kind: "main", slug: null, criteria: "" }} />);
    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe("WhoChecks", () => {
  it("says a mentor checks, and with the peer check that peers help and a mentor decides", () => {
    const { rerender } = render(<WhoChecks />);
    expect(screen.getByText(WHO_CHECKS.mentor)).toBeInTheDocument();
    rerender(<WhoChecks peer />);
    expect(screen.getByText(WHO_CHECKS.peer)).toBeInTheDocument();
  });
});
