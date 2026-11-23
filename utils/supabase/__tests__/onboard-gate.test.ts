/** @jest-environment node */
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "../proxy";

jest.mock("@supabase/ssr", () => ({ createServerClient: jest.fn() }));
jest.mock("@/lib/supabase/auth", () => ({ isAnonymousUser: () => false }));

const ORIGIN = "https://passionseed.org";
const getUser = jest.fn();
const from = jest.fn();
const rpc = jest.fn();

// A fresh account with no profile row and no guardian consent: the onboard
// gate considers it unfinished.
function noRowQuery() {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  return query;
}

beforeEach(() => {
  jest.clearAllMocks();
  from.mockImplementation(noRowQuery);
  rpc.mockImplementation(noRowQuery);
  (createServerClient as jest.Mock).mockReturnValue({ auth: { getUser }, from, rpc });
});

function signedIn() {
  getUser.mockResolvedValue({ data: { user: { id: "user-new" } }, error: null });
}

function signedOut() {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
}

async function visit(path: string) {
  return updateSession(new NextRequest(`${ORIGIN}${path}`));
}

describe("onboard gate for a signed-in user who has not finished onboard", () => {
  beforeEach(signedIn);

  it.each([
    "/whiteboard",
    "/whiteboard/abc",
    "/whiteboard/join/abc",
    "/hackathon",
    "/hackathon/join/abc",
    "/hackathon/island",
  ])("lets %s through without a bounce to /onboard", async (path) => {
    const response = await visit(path);
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
    // The exemption skips the profile lookup entirely.
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("keeps the query string of a board share link", async () => {
    const response = await visit("/whiteboard/abc?view=team");
    expect(response.headers.get("location")).toBeNull();
  });

  it("still lets /shift/island through, as before", async () => {
    const response = await visit("/shift/island");
    expect(response.headers.get("location")).toBeNull();
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(["/dashboard", "/hackathon-old", "/whiteboards"])(
    "still sends %s to /onboard",
    async (path) => {
      const response = await visit(path);
      expect(response.headers.get("location")).toBe(`${ORIGIN}/onboard`);
      expect(rpc).toHaveBeenCalledWith("get_my_profile");
    }
  );

  // The URL parser already folds a bare /%2e%2e/ segment, so these keep the
  // dot segment past parsing (an escaped slash), and only the decoded check in
  // the exemption can catch them.
  it.each([
    "/whiteboard/..%2Fdashboard",
    "/hackathon/%2e%2e%2fme",
    "/whiteboard/%2E%2E%2F%2E%2E%2Fdashboard",
  ])("does not exempt the escaped look-alike %s", async (path) => {
    const response = await visit(path);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/onboard`);
  });
});

describe("signed-out visitors", () => {
  beforeEach(signedOut);

  it("sends a board link to /login with next", async () => {
    const response = await visit("/whiteboard/abc");
    expect(response.headers.get("location")).toBe(
      `${ORIGIN}/login?next=${encodeURIComponent("/whiteboard/abc")}`
    );
  });

  it("keeps public hackathon pages open", async () => {
    const response = await visit("/hackathon/island");
    expect(response.headers.get("location")).toBeNull();
  });
});
