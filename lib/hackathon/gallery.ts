import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return getClient();
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );
}

export type GalleryProduct = {
  id: string;
  team_id: string;
  product_name: string;
  product_name_th: string | null;
  problem_statement: string;
  problem_statement_th: string | null;
  solution_description: string;
  solution_description_th: string | null;
  cover_image_url: string | null;
  additional_images: string[];
  test_mode: "direct" | "contact";
  demo_url: string | null;
  contact_email: string | null;
  line_qr_url: string | null;
  line_id: string | null;
  youtube_url: string | null;
  tags: string[];
  hackathon_year: number;
  hackathon_name: string;
  interest_count: number;
  match_count: number;
  target_personas: { who: string[]; what: string[] } | null;
  created_at: string;
  team: {
    name: string;
    members: { name: string }[];
  } | null;
};

export type GalleryProductSummary = Pick<
  GalleryProduct,
  | "id"
  | "team_id"
  | "product_name"
  | "product_name_th"
  | "problem_statement"
  | "problem_statement_th"
  | "cover_image_url"
  | "tags"
  | "hackathon_year"
  | "hackathon_name"
  | "interest_count"
  | "match_count"
  | "target_personas"
> & { team_name: string };

export async function getGalleryProducts(): Promise<GalleryProductSummary[]> {
  try {
    const { data, error } = await getAdminClient()
      .from("hackathon_gallery_products")
      .select(`
        id,
        team_id,
        product_name,
        product_name_th,
        problem_statement,
        problem_statement_th,
        cover_image_url,
        tags,
        hackathon_year,
        hackathon_name,
        interest_count,
        hackathon_teams!inner ( name )
      `)
      .eq("is_published", true)
      .order("interest_count", { ascending: false });

    if (error) {
      console.error("[getGalleryProducts] Error fetching gallery products:", error);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      team_id: row.team_id,
      product_name: row.product_name,
      product_name_th: row.product_name_th ?? null,
      problem_statement: row.problem_statement,
      problem_statement_th: row.problem_statement_th ?? null,
      cover_image_url: row.cover_image_url,
      tags: row.tags,
      hackathon_year: row.hackathon_year,
      hackathon_name: row.hackathon_name,
      interest_count: row.interest_count,
      match_count: row.match_count ?? 0,
      target_personas: row.target_personas ?? null,
      team_name: row.hackathon_teams?.name ?? "",
    }));
  } catch (err) {
    console.error("[getGalleryProducts] Unexpected error:", err);
    return [];
  }
}

export async function getGalleryProduct(teamId: string): Promise<GalleryProduct | null> {
  try {
    const { data, error } = await getAdminClient()
      .from("hackathon_gallery_products")
      .select(`
        *,
        hackathon_teams!inner (
          name,
          hackathon_team_members (
            hackathon_participants ( name )
          )
        )
      `)
      .eq("team_id", teamId)
      .eq("is_published", true)
      .single();

    if (error || !data) {
      if (error && error.code !== "PGRST116") {
        console.error("[getGalleryProduct] Error fetching product for team:", teamId, error);
      }
      return null;
    }

    return {
      id: data.id,
      team_id: data.team_id,
      product_name: data.product_name,
      product_name_th: data.product_name_th ?? null,
      problem_statement: data.problem_statement,
      problem_statement_th: data.problem_statement_th ?? null,
      solution_description: data.solution_description,
      solution_description_th: data.solution_description_th ?? null,
      cover_image_url: data.cover_image_url,
      additional_images: data.additional_images ?? [],
      test_mode: data.test_mode ?? "contact",
      demo_url: data.demo_url,
      contact_email: data.contact_email ?? null,
      line_qr_url: data.line_qr_url ?? null,
      line_id: data.line_id ?? null,
      youtube_url: data.youtube_url ?? null,
      tags: data.tags,
      hackathon_year: data.hackathon_year,
      hackathon_name: data.hackathon_name,
      interest_count: data.interest_count,
      match_count: data.match_count ?? 0,
      target_personas: data.target_personas ?? null,
      created_at: data.created_at,
      team: {
        name: data.hackathon_teams.name,
        members: (data.hackathon_teams.hackathon_team_members ?? []).map(
          (m: any) => ({ name: m.hackathon_participants?.name ?? "" })
        ),
      },
    };
  } catch (err) {
    console.error("[getGalleryProduct] Unexpected error:", err);
    return null;
  }
}

export async function submitGalleryInterest(params: {
  productId: string;
  name: string;
  email: string;
  message: string;
}): Promise<{ error: string | null }> {
  const { error } = await getClient()
    .from("hackathon_gallery_interests")
    .insert({
      product_id: params.productId,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      message: params.message.trim() || null,
    });

  if (error) return { error: error.message };
  return { error: null };
}

export function getAllTags(products: GalleryProductSummary[]): string[] {
  const set = new Set<string>();
  for (const p of products) {
    for (const t of p.tags) set.add(t);
  }
  return Array.from(set).sort();
}

export const ALLOWED_TAGS = [
  "Community, Public & Environmental Health",
  "Traditional & Integrative Healthcare",
  "Mental Health",
] as const;

export type GalleryProductInput = {
  product_name: string;
  product_name_th?: string | null;
  problem_statement: string;
  problem_statement_th?: string | null;
  solution_description: string;
  solution_description_th?: string | null;
  tags: string[];
  test_mode?: "direct" | "contact";
  demo_url?: string | null;
  contact_email?: string | null;
  cover_image_url?: string | null;
  additional_images?: string[];
  line_qr_url?: string | null;
  line_id?: string | null;
  youtube_url?: string | null;
  target_personas?: { who: string[]; what: string[] } | null;
};

export type GalleryProductWithPublished = GalleryProduct & { is_published: boolean };

/** Fetch team's own product regardless of publish state (uses service role) */
export async function getMyGalleryProduct(teamId: string): Promise<GalleryProductWithPublished | null> {
  const { data, error } = await getAdminClient()
    .from("hackathon_gallery_products")
    .select(`
      *,
      hackathon_teams!inner (
        name,
        hackathon_team_members (
          hackathon_participants ( name )
        )
      )
    `)
    .eq("team_id", teamId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    team_id: data.team_id,
    product_name: data.product_name,
    product_name_th: data.product_name_th ?? null,
    problem_statement: data.problem_statement,
    problem_statement_th: data.problem_statement_th ?? null,
    solution_description: data.solution_description,
    solution_description_th: data.solution_description_th ?? null,
    cover_image_url: data.cover_image_url,
    additional_images: data.additional_images ?? [],
    test_mode: data.test_mode ?? "contact",
    demo_url: data.demo_url,
    contact_email: data.contact_email ?? null,
    line_qr_url: data.line_qr_url ?? null,
    line_id: data.line_id ?? null,
    youtube_url: data.youtube_url ?? null,
    tags: data.tags,
    hackathon_year: data.hackathon_year,
    hackathon_name: data.hackathon_name,
    interest_count: data.interest_count,
    match_count: data.match_count ?? 0,
    target_personas: data.target_personas ?? null,
    created_at: data.created_at,
    is_published: data.is_published,
    team: {
      name: data.hackathon_teams.name,
      members: (data.hackathon_teams.hackathon_team_members ?? []).map(
        (m: any) => ({ name: m.hackathon_participants?.name ?? "" })
      ),
    },
  };
}

/** Upsert (insert or update) a team's gallery product. is_published stays untouched on update. */
export async function upsertGalleryProduct(
  teamId: string,
  data: GalleryProductInput
): Promise<GalleryProductWithPublished> {
  const admin = getAdminClient();

  const payload = {
    team_id: teamId,
    product_name: data.product_name,
    product_name_th: data.product_name_th ?? null,
    problem_statement: data.problem_statement,
    problem_statement_th: data.problem_statement_th ?? null,
    solution_description: data.solution_description,
    solution_description_th: data.solution_description_th ?? null,
    tags: data.tags,
    test_mode: data.test_mode ?? "contact",
    demo_url: data.demo_url ?? null,
    contact_email: data.contact_email ?? null,
    cover_image_url: data.cover_image_url ?? null,
    additional_images: data.additional_images ?? [],
    line_qr_url: data.line_qr_url ?? null,
    line_id: data.line_id ?? null,
    youtube_url: data.youtube_url ?? null,
    target_personas: data.target_personas ?? null,
    hackathon_year: new Date().getFullYear(),
    hackathon_name: "PassionSeed Hackathon",
  };

  const { data: row, error } = await admin
    .from("hackathon_gallery_products")
    .upsert(payload, { onConflict: "team_id", ignoreDuplicates: false })
    .select()
    .single();

  if (error || !row) throw new Error(error?.message ?? "Failed to upsert gallery product");

  return {
    id: row.id,
    team_id: row.team_id,
    product_name: row.product_name,
    problem_statement: row.problem_statement,
    solution_description: row.solution_description,
    cover_image_url: row.cover_image_url,
    additional_images: row.additional_images ?? [],
    test_mode: row.test_mode ?? "contact",
    demo_url: row.demo_url,
    contact_email: row.contact_email ?? null,
    line_qr_url: row.line_qr_url ?? null,
    line_id: row.line_id ?? null,
    youtube_url: row.youtube_url ?? null,
    product_name_th: row.product_name_th ?? null,
    problem_statement_th: row.problem_statement_th ?? null,
    solution_description_th: row.solution_description_th ?? null,
    tags: row.tags,
    hackathon_year: row.hackathon_year,
    hackathon_name: row.hackathon_name,
    interest_count: row.interest_count ?? 0,
    match_count: row.match_count ?? 0,
    target_personas: row.target_personas ?? null,
    created_at: row.created_at,
    is_published: row.is_published,
    team: null,
  };
}

/** Admin: list all products regardless of publish state */
export async function adminGetAllProducts(): Promise<(GalleryProductWithPublished & { team_name: string })[]> {
  const { data, error } = await getAdminClient()
    .from("hackathon_gallery_products")
    .select(`
      *,
      hackathon_teams!inner ( name )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    team_id: row.team_id,
    product_name: row.product_name,
    problem_statement: row.problem_statement,
    solution_description: row.solution_description,
    cover_image_url: row.cover_image_url,
    additional_images: row.additional_images ?? [],
    test_mode: row.test_mode ?? "contact",
    demo_url: row.demo_url,
    contact_email: row.contact_email ?? null,
    line_qr_url: row.line_qr_url ?? null,
    line_id: row.line_id ?? null,
    youtube_url: row.youtube_url ?? null,
    product_name_th: row.product_name_th ?? null,
    problem_statement_th: row.problem_statement_th ?? null,
    solution_description_th: row.solution_description_th ?? null,
    tags: row.tags,
    hackathon_year: row.hackathon_year,
    hackathon_name: row.hackathon_name,
    interest_count: row.interest_count ?? 0,
    match_count: row.match_count ?? 0,
    target_personas: row.target_personas ?? null,
    created_at: row.created_at,
    is_published: row.is_published,
    team_name: row.hackathon_teams?.name ?? "",
    team: null,
  }));
}

/** Admin: set published state for a product */
export async function adminSetPublished(productId: string, published: boolean): Promise<void> {
  const { error } = await getAdminClient()
    .from("hackathon_gallery_products")
    .update({ is_published: published })
    .eq("id", productId);

  if (error) throw error;
}
