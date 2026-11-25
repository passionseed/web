/** @jest-environment node */
import { slipOkAccounts, verifySlip } from "../client";

const PAID = { success: true, data: { success: true, transRef: "T1", amount: 199 } };
const OVER_QUOTA = { success: false, code: 1004, message: "over quota" };
const WRONG_AMOUNT = { success: false, code: 1013, message: "amount" };
const quota = (left: number) => ({ success: true, data: { quota: left, overQuota: 0 } });

type Reply = unknown | Error;

/** Fake SlipOK: one reply per URL. Returns the list of calls made, as "METHOD url key". */
function fakeSlipOk(replies: Record<string, Reply>): string[] {
  const calls: string[] = [];
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    const key = (init?.headers as Record<string, string>)["x-authorization"];
    calls.push(`${init?.method ?? "GET"} ${url.replace("https://api.slipok.com/api/line/apikey/", "")} ${key}`);
    const reply = replies[`${init?.method ?? "GET"} ${url.replace("https://api.slipok.com/api/line/apikey/", "")}`];
    if (reply instanceof Error) throw reply;
    return { status: 200, json: async () => reply } as Response;
  }) as unknown as typeof fetch;
  return calls;
}

const slip = new Blob(["x"], { type: "image/png" });
const ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ENV };
  for (const name of Object.keys(process.env)) if (name.startsWith("SLIPOK_")) delete process.env[name];
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(() => {
  process.env = ENV;
});

describe("slipOkAccounts", () => {
  it("reads the first account and the numbered ones, in order", () => {
    expect(
      slipOkAccounts({
        SLIPOK_API_KEY: "k1",
        SLIPOK_BRANCH_ID: "b1",
        SLIPOK_API_KEY_2: " k2 ",
        SLIPOK_BRANCH_ID_2: "b2",
      }),
    ).toEqual([
      { number: 1, key: "k1", branch: "b1" },
      { number: 2, key: "k2", branch: "b2" },
    ]);
  });

  it("leaves out an account with only half its values", () => {
    expect(slipOkAccounts({ SLIPOK_API_KEY: "k1", SLIPOK_BRANCH_ID: "b1", SLIPOK_API_KEY_2: "k2" })).toEqual([
      { number: 1, key: "k1", branch: "b1" },
    ]);
    expect(slipOkAccounts({ SLIPOK_API_KEY_2: "k2", SLIPOK_BRANCH_ID_2: "b2" })).toEqual([
      { number: 2, key: "k2", branch: "b2" },
    ]);
  });
});

describe("verifySlip", () => {
  const two = () => {
    process.env.SLIPOK_API_KEY = "k1";
    process.env.SLIPOK_BRANCH_ID = "b1";
    process.env.SLIPOK_API_KEY_2 = "k2";
    process.env.SLIPOK_BRANCH_ID_2 = "b2";
  };

  it("sends a slip to a person when no account is set", async () => {
    const calls = fakeSlipOk({});
    expect(await verifySlip(slip, "slip.png", 199)).toMatchObject({ kind: "unverified" });
    expect(calls).toEqual([]);
  });

  it("with one account, checks the slip without asking for the quota", async () => {
    process.env.SLIPOK_API_KEY = "k1";
    process.env.SLIPOK_BRANCH_ID = "b1";
    const calls = fakeSlipOk({ "POST b1": PAID });
    expect(await verifySlip(slip, "slip.png", 199)).toMatchObject({ kind: "paid", transRef: "T1", account: 1 });
    expect(calls).toEqual(["POST b1 k1"]);
  });

  it("uses the first account while it has slips left", async () => {
    two();
    const calls = fakeSlipOk({ "GET b1/quota": quota(12), "GET b2/quota": quota(100), "POST b1": PAID });
    expect(await verifySlip(slip, "slip.png", 199)).toMatchObject({ kind: "paid", account: 1 });
    expect(calls.filter((c) => c.startsWith("POST"))).toEqual(["POST b1 k1"]);
  });

  it("uses the second account when the first has no slips left", async () => {
    two();
    const calls = fakeSlipOk({ "GET b1/quota": quota(0), "GET b2/quota": quota(100), "POST b2": PAID });
    expect(await verifySlip(slip, "slip.png", 199)).toMatchObject({ kind: "paid", account: 2 });
    expect(calls.filter((c) => c.startsWith("POST"))).toEqual(["POST b2 k2"]);
  });

  it("moves on to the second account when the first can't decide", async () => {
    two();
    const calls = fakeSlipOk({
      "GET b1/quota": new Error("timeout"),
      "GET b2/quota": new Error("timeout"),
      "POST b1": OVER_QUOTA,
      "POST b2": PAID,
    });
    expect(await verifySlip(slip, "slip.png", 199)).toMatchObject({ kind: "paid", account: 2 });
    expect(calls.filter((c) => c.startsWith("POST"))).toEqual(["POST b1 k1", "POST b2 k2"]);
  });

  it("moves on when the first account can't be reached", async () => {
    two();
    fakeSlipOk({ "GET b1/quota": quota(5), "GET b2/quota": quota(5), "POST b1": new Error("network"), "POST b2": PAID });
    expect(await verifySlip(slip, "slip.png", 199)).toMatchObject({ kind: "paid", account: 2 });
  });

  it("treats a clear answer as final and doesn't ask the next account", async () => {
    two();
    const calls = fakeSlipOk({ "GET b1/quota": quota(5), "GET b2/quota": quota(5), "POST b1": WRONG_AMOUNT, "POST b2": PAID });
    expect(await verifySlip(slip, "slip.png", 199)).toMatchObject({ kind: "rejected", reason: "amount", account: 1 });
    expect(calls.filter((c) => c.startsWith("POST"))).toEqual(["POST b1 k1"]);
  });

  it("still tries an account that has run out when every account has", async () => {
    two();
    const calls = fakeSlipOk({ "GET b1/quota": quota(0), "GET b2/quota": quota(0), "POST b1": PAID });
    expect(await verifySlip(slip, "slip.png", 199)).toMatchObject({ kind: "paid", account: 1 });
    expect(calls.filter((c) => c.startsWith("POST"))).toEqual(["POST b1 k1"]);
  });

  it("sends the slip to a person when no account can decide", async () => {
    two();
    fakeSlipOk({ "GET b1/quota": quota(0), "GET b2/quota": quota(0), "POST b1": OVER_QUOTA, "POST b2": OVER_QUOTA });
    expect(await verifySlip(slip, "slip.png", 199)).toMatchObject({ kind: "unverified", code: 1004, account: 2 });
  });
});
