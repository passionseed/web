import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { loadEvidencePhotos, removeEvidencePhoto, setTeamProblem } from "@/app/shift/island/evidence-actions";

import { PHOTOS, TEAM_PROBLEM } from "../copy";
import { PhotoPicker } from "../photos/PhotoPicker";
import { QuestPhotos } from "../photos/QuestPhotos";
import { ProblemEditor } from "../ProblemEditor";

jest.mock("@/app/shift/island/evidence-actions", () => ({
  uploadEvidencePhoto: jest.fn(),
  removeEvidencePhoto: jest.fn(),
  loadEvidencePhotos: jest.fn(),
  setTeamProblem: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockedLoad = loadEvidencePhotos as jest.MockedFunction<typeof loadEvidencePhotos>;
const mockedRemove = removeEvidencePhoto as jest.MockedFunction<typeof removeEvidencePhoto>;
const mockedSet = setTeamProblem as jest.MockedFunction<typeof setTeamProblem>;

const INSTANCE = "55555555-5555-4555-8555-555555555555";
const SUB = "33333333-3333-4333-8333-333333333333";
const PROJECT = "66666666-6666-4666-8666-666666666666";
const photo = (n: number) => ({ id: `p${n}`, url: `https://signed.example/p${n}`, width: 800, height: 600 });

beforeEach(() => {
  mockedLoad.mockReset();
  mockedRemove.mockReset().mockResolvedValue({ ok: true, data: null });
  mockedSet.mockReset();
});

describe("PhotoPicker", () => {
  it("puts the rules first (no faces, names, phone numbers or addresses) and shows how many fit", () => {
    render(<PhotoPicker photos={[]} onChange={jest.fn()} />);
    expect(screen.getByText(PHOTOS.label)).toBeInTheDocument();
    for (const rule of PHOTOS.rules) expect(screen.getByText(rule)).toBeInTheDocument();
    expect(screen.getByText(PHOTOS.crop)).toBeInTheDocument();
    expect(screen.getByLabelText(PHOTOS.add)).toHaveAttribute("accept", "image/*");
    expect(screen.getByText(PHOTOS.count(0, 3))).toBeInTheDocument();
  });

  it("has no add tile once three are picked", () => {
    const picked = [1, 2, 3].map((n) => ({ key: `k${n}`, blob: new Blob(), preview: `blob:${n}`, width: 10, height: 10 }));
    render(<PhotoPicker photos={picked} onChange={jest.fn()} />);
    expect(screen.queryByLabelText(PHOTOS.add)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /เอารูปที่/ })).toHaveLength(3);
  });
});

describe("QuestPhotos", () => {
  it("shows the photos as links, and lets the submitter take one back while a mentor has not looked", async () => {
    mockedLoad.mockResolvedValue({ ok: true, data: { submissionId: SUB, revision: 1, status: "pending", photos: [photo(1), photo(2)] } });
    render(<QuestPhotos instanceId={INSTANCE} own />);
    expect(await screen.findByRole("heading", { name: PHOTOS.heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: PHOTOS.open(1) })).toHaveAttribute("href", "https://signed.example/p1");
    expect(screen.getByText(PHOTOS.waiting)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: PHOTOS.remove(2) }));
    await waitFor(() => expect(mockedRemove).toHaveBeenCalledWith({ photoId: "p2" }));
    expect(mockedLoad).toHaveBeenCalledTimes(2);
  });

  it("is read-only once a mentor has decided", async () => {
    mockedLoad.mockResolvedValue({ ok: true, data: { submissionId: SUB, revision: 1, status: "approved", photos: [photo(1)] } });
    render(<QuestPhotos instanceId={INSTANCE} own />);
    expect(await screen.findByRole("link", { name: PHOTOS.open(1) })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: PHOTOS.remove(1) })).not.toBeInTheDocument();
    expect(screen.queryByText(PHOTOS.addMore)).not.toBeInTheDocument();
  });

  it("shows nothing when there is nothing to show", async () => {
    mockedLoad.mockResolvedValue({ ok: true, data: null });
    const { container } = render(<QuestPhotos instanceId={INSTANCE} own />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});

describe("ProblemEditor", () => {
  it("opens from เปลี่ยน, says changing is normal, and saves the trimmed line for the project", async () => {
    mockedSet.mockResolvedValue({ ok: true, data: { ambition: "ร้านข้าวไม่รู้ว่าจะมีคนสั่งกี่จาน" } });
    const onSaved = jest.fn();
    render(<ProblemEditor projectId={PROJECT} current="ปัญหาเดิม" onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: TEAM_PROBLEM.change }));
    expect(screen.getByText(TEAM_PROBLEM.editHint)).toBeInTheDocument();
    const field = screen.getByLabelText(TEAM_PROBLEM.editLabel);
    expect(field).toHaveValue("ปัญหาเดิม");
    fireEvent.change(field, { target: { value: "  ร้านข้าวไม่รู้ว่าจะมีคนสั่งกี่จาน  " } });
    fireEvent.click(screen.getByRole("button", { name: TEAM_PROBLEM.save }));
    await waitFor(() =>
      expect(mockedSet).toHaveBeenCalledWith({ projectId: PROJECT, ambition: "ร้านข้าวไม่รู้ว่าจะมีคนสั่งกี่จาน" }),
    );
    expect(onSaved).toHaveBeenCalledWith("ร้านข้าวไม่รู้ว่าจะมีคนสั่งกี่จาน");
    expect(toast.success).toHaveBeenCalledWith(TEAM_PROBLEM.saved);
  });

  it("asks for a line before saving an empty one", () => {
    render(<ProblemEditor projectId={PROJECT} current="ปัญหาเดิม" />);
    fireEvent.click(screen.getByRole("button", { name: TEAM_PROBLEM.change }));
    fireEvent.change(screen.getByLabelText(TEAM_PROBLEM.editLabel), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: TEAM_PROBLEM.save }));
    expect(screen.getByRole("alert")).toHaveTextContent(TEAM_PROBLEM.required);
    expect(mockedSet).not.toHaveBeenCalled();
  });
});
