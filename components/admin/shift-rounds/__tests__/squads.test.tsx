import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import * as actions from "@/app/admin/shift/rounds/actions";
import { SquadsBoard } from "../SquadsBoard";
import { ROUND_ID, makeEntry, makeRound } from "../__fixtures__/rounds";

jest.mock("@/app/admin/shift/rounds/actions", () => ({
  listRoundsAction: jest.fn(),
  listEntriesAction: jest.fn(),
  listRolesAction: jest.fn(),
  upsertSquadAction: jest.fn(),
  assignSquadAction: jest.fn(),
  deleteSquadAction: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const m = actions as jest.Mocked<typeof actions>;
const FULL = "44444444-4444-4444-8444-444444444441";
const OPEN = "44444444-4444-4444-8444-444444444442";
const MENTOR = "55555555-5555-4555-8555-555555555555";

beforeEach(() => {
  m.listRoundsAction.mockResolvedValue({ ok: true, data: [makeRound()] });
  m.listRolesAction.mockResolvedValue({
    ok: true,
    data: [{ user_id: MENTOR, round_id: ROUND_ID, role: "mentor", email: "p@ps.org", display_name: "พี่ปอ" }],
  });
});

function seed(unassigned = 1) {
  const members = [1, 2, 3].map(() => makeEntry({ squad_id: FULL, squad_name: "Squad 1", icebreaker_question: 4, icebreaker_text: "เก่งอะไร", icebreaker_answer: null }));
  const loose = Array.from({ length: unassigned }, () => makeEntry());
  m.listEntriesAction.mockResolvedValue({
    ok: true,
    data: {
      entries: [...members, makeEntry({ squad_id: OPEN, squad_name: "Squad 2" }), ...loose],
      squads: [
        { id: FULL, name: "Squad 1", mentor_user_id: MENTOR, discord_url: null },
        { id: OPEN, name: "Squad 2", mentor_user_id: null, discord_url: null },
      ],
    },
  });
  return loose;
}

test("a full squad cannot take a 4th member", async () => {
  const [kid] = seed();
  render(<SquadsBoard roundId={ROUND_ID} />);
  const select = await screen.findByLabelText(`Squad for ${kid.handle}`);
  const fullOption = within(select).getByRole("option", { name: /Squad 1 \(3\/3\) full/ });
  expect(fullOption).toBeDisabled();
  expect(within(select).getByRole("option", { name: "Squad 2 (1/3)" })).not.toBeDisabled();

  fireEvent.change(select, { target: { value: FULL } });
  expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  expect(m.assignSquadAction).not.toHaveBeenCalled();

  m.assignSquadAction.mockResolvedValue({ ok: true, data: { squad_id: OPEN, icebreaker_question: 2 } });
  fireEvent.change(select, { target: { value: OPEN } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
  });
  expect(m.assignSquadAction).toHaveBeenCalledWith(kid.id, OPEN);
});

test("shows squad size, mentor and member icebreaker question", async () => {
  seed();
  render(<SquadsBoard roundId={ROUND_ID} />);
  const squad = await screen.findByRole("region", { name: "Squad 1" });
  expect(within(squad).getByText("3/3 full")).toBeInTheDocument();
  expect(within(squad).getByText(/พี่ปอ/)).toBeInTheDocument();
  expect(within(squad).getAllByText(/^Q4/)).toHaveLength(3);
});

test("deleting a squad asks for confirmation first", async () => {
  seed();
  m.deleteSquadAction.mockResolvedValue({ ok: true, data: {} });
  render(<SquadsBoard roundId={ROUND_ID} />);
  fireEvent.click(await screen.findByRole("button", { name: "Delete Squad 2" }));
  const dialog = await screen.findByRole("alertdialog");
  expect(m.deleteSquadAction).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete squad" }));
  });
  expect(m.deleteSquadAction).toHaveBeenCalledWith(OPEN);
});

test("suggest groups unassigned students and creates squads after confirm", async () => {
  const loose = seed(3);
  m.upsertSquadAction.mockResolvedValue({ ok: true, data: { squad_id: "66666666-6666-4666-8666-666666666666" } });
  m.assignSquadAction.mockResolvedValue({ ok: true, data: { squad_id: "x", icebreaker_question: 1 } });
  render(<SquadsBoard roundId={ROUND_ID} />);
  fireEvent.click(await screen.findByRole("button", { name: /Suggest squads/ }));
  const preview = await screen.findByRole("region", { name: "Suggested squads" });
  expect(within(preview).getByText(/Squad 3/)).toBeInTheDocument();

  fireEvent.click(within(preview).getByRole("button", { name: "Create these squads" }));
  const dialog = await screen.findByRole("alertdialog");
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Create squads" }));
  });
  await waitFor(() => expect(m.assignSquadAction).toHaveBeenCalledTimes(3));
  expect(m.upsertSquadAction).toHaveBeenCalledWith(ROUND_ID, { id: null, name: "Squad 3", mentor_user_id: null, discord_url: null });
  expect(m.assignSquadAction.mock.calls.map((c) => c[0]).sort()).toEqual(loose.map((e) => e.id).sort());
});

test("search filters squads and the empty state shows when nothing matches", async () => {
  seed();
  render(<SquadsBoard roundId={ROUND_ID} />);
  await screen.findByRole("region", { name: "Squad 1" });
  fireEvent.change(screen.getByLabelText("Search squads and students"), { target: { value: "zzz" } });
  expect(screen.getByText("No squads match your search")).toBeInTheDocument();
});

test("load error shows the code and retries", async () => {
  seed();
  m.listEntriesAction.mockResolvedValueOnce({ ok: false, error: { code: "unavailable", category: "unavailable" } });
  render(<SquadsBoard roundId={ROUND_ID} />);
  expect(await screen.findByText(/\(unavailable\)/)).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
  });
  expect(await screen.findByRole("region", { name: "Squad 1" })).toBeInTheDocument();
});

test("empty squads are listed and editing keeps the current mentor and Discord link", async () => {
  const EMPTY = "77777777-7777-4777-8777-777777777777";
  const OTHER = "88888888-8888-4888-8888-888888888888";
  const kid = makeEntry();
  m.listRolesAction.mockResolvedValue({ ok: false, error: { code: "forbidden", category: "forbidden" } });
  m.listEntriesAction.mockResolvedValue({
    ok: true,
    data: {
      entries: [kid],
      squads: [{ id: EMPTY, name: "Squad 9", mentor_user_id: OTHER, mentor_display_name: "พี่บี", discord_url: "https://discord.gg/abc" }],
      squad_size: 3,
    },
  });
  m.upsertSquadAction.mockResolvedValue({ ok: true, data: { squad_id: EMPTY } });
  render(<SquadsBoard roundId={ROUND_ID} />);
  const squad = await screen.findByRole("region", { name: "Squad 9" });
  expect(within(squad).getByText(/พี่บี/)).toBeInTheDocument();
  expect(within(squad).getByText("No members yet.")).toBeInTheDocument();
  expect(within(screen.getByLabelText(`Squad for ${kid.handle}`)).getByRole("option", { name: "Squad 9 (0/3)" })).toBeInTheDocument();

  fireEvent.click(within(squad).getByRole("button", { name: "Edit Squad 9" }));
  fireEvent.change(within(squad).getByLabelText("Squad name"), { target: { value: "Squad Nine" } });
  await act(async () => {
    fireEvent.click(within(squad).getByRole("button", { name: "Save" }));
  });
  expect(m.upsertSquadAction).toHaveBeenCalledWith(ROUND_ID, {
    id: EMPTY,
    name: "Squad Nine",
    mentor_user_id: OTHER,
    discord_url: "https://discord.gg/abc",
  });
});

test("members show their icebreaker question text", async () => {
  seed();
  render(<SquadsBoard roundId={ROUND_ID} />);
  const squad = await screen.findByRole("region", { name: "Squad 1" });
  expect(within(squad).getAllByText("Q4: เก่งอะไร")).toHaveLength(3);
  expect(within(squad).getAllByText("No answer yet")).toHaveLength(3);
});
