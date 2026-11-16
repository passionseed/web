/** @jest-environment node */
const call = jest.fn();
jest.mock("../db", () => ({ questApi: () => ({ call, rows: jest.fn() }) }));
jest.mock("../evidence", () => ({
  photosAvailable: async () => true,
  photoRows: () => [],
  signedPhotos: async () => [],
}));
jest.mock("../peer", () => ({ checkRows: () => [] }));

import { QuestError } from "@/bot/src/quests/api";

import { loadReview } from "../review";

const ACTOR = "123456789012345678";
const SUB = "00000000-0000-4000-8000-000000000001";

let errorLog: jest.SpyInstance;
beforeEach(() => {
  call.mockReset();
  errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errorLog.mockRestore());

describe("loadReview", () => {
  it("reads a submission for a reviewer", async () => {
    call.mockResolvedValue({ submission_id: SUB, instance_id: "i1", revision: 2, status: "pending", is_latest: true });
    const read = await loadReview(ACTOR, SUB);
    expect(call).toHaveBeenCalledWith("shift_quest_review_view", ACTOR, SUB);
    expect(read).toMatchObject({ state: "ok", view: { submissionId: SUB, revision: 2, isLatest: true } });
  });

  it.each([
    ["not_authorized", "not_authorized"],
    ["conflict_of_interest", "conflict"],
    ["not_found", "not_found"],
    ["bad_state", "unavailable"],
  ])("maps sq:%s to %s", async (code, state) => {
    call.mockRejectedValue(new QuestError(code, undefined, "shift_quest_review_view"));
    expect(await loadReview(ACTOR, SUB)).toEqual({ state });
  });
});
