import { shouldSkipRadarAnalytics } from "@/lib/radar/analytics-host";
import { recordRadarPathIntent, recordRadarStartOptionInterest } from "@/lib/supabase/radar";
import { createClient } from "@/utils/supabase/client";

jest.mock("@/lib/radar/analytics-host", () => ({ shouldSkipRadarAnalytics: jest.fn() }));
jest.mock("@/utils/supabase/client", () => ({ createClient: jest.fn() }));

const VISIT = "6f1c2c4e-5b7a-4d1e-9f0a-1b2c3d4e5f60";
const intent = { fieldSlug: "cybersecurity", fieldId: "field-1", pathSlug: "radar:interested" };

function mockClient(insertResults: Array<{ error: { code?: string; message: string } | null }>) {
  const insert = jest.fn();
  insertResults.forEach((result) => insert.mockResolvedValueOnce(result));
  const rpc = jest.fn().mockResolvedValue({ error: null });
  jest.mocked(createClient).mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    from: jest.fn().mockReturnValue({ insert }),
    rpc,
  } as never);
  return { insert, rpc };
}

beforeEach(() => {
  jest.mocked(shouldSkipRadarAnalytics).mockReturnValue(false);
});

test("an intent carries the Radar Guide visit id", async () => {
  const { insert } = mockClient([{ error: null }]);
  await expect(recordRadarPathIntent({ ...intent, visitId: VISIT })).resolves.toBe("recorded");
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ visit_id: VISIT, field_slug: "cybersecurity" }));
});

test("a malformed visit id is not sent", async () => {
  const { insert } = mockClient([{ error: null }]);
  await recordRadarPathIntent({ ...intent, visitId: "not-a-uuid" });
  expect(insert.mock.calls[0][0]).not.toHaveProperty("visit_id");
});

test("the intent is still recorded when the visit_id column is missing", async () => {
  const { insert } = mockClient([
    { error: { code: "PGRST204", message: "column not found" } },
    { error: null },
  ]);
  await expect(recordRadarPathIntent({ ...intent, visitId: VISIT })).resolves.toBe("recorded");
  expect(insert).toHaveBeenCalledTimes(2);
  expect(insert.mock.calls[1][0]).not.toHaveProperty("visit_id");
});

test("a start option interest puts the visit id in metadata", async () => {
  const { rpc } = mockClient([]);
  await recordRadarStartOptionInterest("option-1", "interested", VISIT);
  expect(rpc).toHaveBeenCalledWith("record_radar_interest", expect.objectContaining({ p_metadata: { visit_id: VISIT } }));
  await recordRadarStartOptionInterest("option-1", "opened");
  expect(rpc).toHaveBeenLastCalledWith("record_radar_interest", expect.objectContaining({ p_metadata: {} }));
});
