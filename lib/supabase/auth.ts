import type { User } from "@supabase/supabase-js";

export function isAnonymousUser(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  const providers = new Set<string>();

  if (typeof user.app_metadata?.provider === "string") {
    providers.add(user.app_metadata.provider);
  }

  user.identities?.forEach((identity) => {
    if (typeof identity.provider === "string") {
      providers.add(identity.provider);
    }
  });

  const hasDurableCredential =
    typeof user.email === "string" && user.email.trim().length > 0;
  const hasNonAnonymousProvider = [...providers].some(
    (provider) => provider !== "anonymous"
  );

  if (hasDurableCredential || hasNonAnonymousProvider) {
    return false;
  }

  return (
    user.is_anonymous === true ||
    providers.has("anonymous") ||
    user.aud === "anonymous"
  );
}
