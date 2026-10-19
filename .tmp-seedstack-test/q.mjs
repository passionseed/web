import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await s.from("shift_applications").select("cohort, paid_at").not("paid_at","is",null);
if (error) throw error;
const c = {}; for (const r of data) c[r.cohort] = (c[r.cohort]??0)+1; console.log(c);
