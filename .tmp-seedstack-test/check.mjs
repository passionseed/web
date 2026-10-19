import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await s.from("shift_applications").select("user_id, discord_username, linked_at, discord_joined_at, discord_error").eq("id", "9ddab50f-c112-4f9a-90ca-5af3c45f5e50").single();
console.log(data);
