import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type RegisterLink = {
  id: string;
  token: string;
  note: string | null;
  used: boolean;
  used_by: string | null;
  created_at: string;
  expires_at: string | null;
};

export async function createRegisterLink(note?: string, expiresAt?: Date): Promise<RegisterLink> {
  const token = crypto.randomBytes(24).toString("hex");
  const { data, error } = await getClient()
    .from("hackathon_register_links")
    .insert({
      token,
      note: note || null,
      expires_at: expiresAt?.toISOString() || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as RegisterLink;
}

export async function listRegisterLinks(): Promise<RegisterLink[]> {
  const { data, error } = await getClient()
    .from("hackathon_register_links")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RegisterLink[];
}

export async function deleteRegisterLink(id: string): Promise<void> {
  const { error } = await getClient()
    .from("hackathon_register_links")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getRegisterLinkByToken(token: string): Promise<RegisterLink | null> {
  const now = new Date().toISOString();
  const { data } = await getClient()
    .from("hackathon_register_links")
    .select("*")
    .eq("token", token)
    .eq("used", false)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .single();
  return data ?? null;
}

/** Atomically claims the link. Returns false if already used (race guard). */
export async function claimRegisterLink(token: string, participantId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data } = await getClient()
    .from("hackathon_register_links")
    .update({ used: true, used_by: participantId })
    .eq("token", token)
    .eq("used", false)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .select("id");
  return Array.isArray(data) && data.length > 0;
}
