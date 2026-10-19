import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const join_token = randomBytes(18).toString("base64url");
const { data, error } = await s.from("shift_applications").insert({
  cohort: "SHIFT[2]", full_name: "SeedStack Test", nickname: "TestSeed", grade: "m5",
  problem: "seedstack link test", availability: "all_days", ig_handle: "seedstack_test",
  parent_contact: "test", consent: true, status: "accepted",
  paid_at: new Date().toISOString(), join_token,
  admin_note: "TEST SEAT for SeedStack link test 2026-10-10. Delete after testing.",
}).select("id, join_token").single();
if (error) throw error;
console.log(data.id, `http://localhost:3000/shift/join/${data.join_token}`);
