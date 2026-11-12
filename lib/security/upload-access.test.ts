import { requireUploadAccess } from "./upload-access";
import { createClient } from "@/utils/supabase/server";

jest.mock("@/utils/supabase/server", () => ({ createClient: jest.fn() }));

function client(user: object | null, rows: Record<string, unknown[]>) {
  const from = jest.fn((table: string) => {
    const query = {
      select: () => query,
      eq: () => query,
      limit: () => Promise.resolve({ data: rows[table] ?? [] }),
      then: (resolve: (value: unknown) => void) => resolve({ data: rows[table] ?? [] }),
    };
    return query;
  });
  return { auth: { getUser: async () => ({ data: { user }, error: null }) }, from };
}

describe("temporary node upload access", () => {
  it("rejects anonymous sessions before checking map permissions", async () => {
    const db = client({ id: "u1", is_anonymous: true }, {});
    (createClient as jest.Mock).mockResolvedValue(db);
    expect(await requireUploadAccess("temp_node_123456")).toMatchObject({ ok: false, status: 403 });
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects ordinary users without an editable map", async () => {
    (createClient as jest.Mock).mockResolvedValue(client({ id: "u1" }, {}));
    expect(await requireUploadAccess("temp_node_123456")).toMatchObject({ ok: false, status: 403 });
  });

  it("allows a non-anonymous map creator", async () => {
    (createClient as jest.Mock).mockResolvedValue(client({ id: "u1" }, { learning_maps: [{ id: "m1", map_type: "pathlab" }] }));
    expect(await requireUploadAccess("temp_node_123456")).toMatchObject({ ok: true, userId: "u1" });
  });

  it("rejects a non-admin who can only edit a seed map", async () => {
    (createClient as jest.Mock).mockResolvedValue(client({ id: "u1" }, { learning_maps: [{ id: "m1", map_type: "seed" }] }));
    expect(await requireUploadAccess("temp_node_123456")).toMatchObject({ ok: false, status: 403 });
  });
});
