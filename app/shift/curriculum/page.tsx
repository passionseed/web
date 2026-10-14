import type { Metadata } from "next";

import { CurriculumEditor } from "@/components/shift/CurriculumEditor";
import { REFUND_HOW, REFUND_STEPS } from "@/lib/content/shift-refund";
import {
  parseCurriculumDoc,
  SHIFT2_DEFAULT_DOC,
  type CurriculumDoc,
} from "@/lib/content/shift2-curriculum";
import {
  DEFAULT_CURRICULUM_KEY,
  curriculumKeyLabel,
  curriculumOptions,
  pickCurriculumKey,
  prepareCurriculumCopy,
  roundForKey,
  type CurriculumRoundRef,
} from "@/lib/shift-round/admin/curriculum";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * SHIFT curriculum for mentors: rules, how to interview, refund steps, and
 * the days, one round at a time (?round=<key>, default: the latest round).
 * Admins can edit and save; a round with no curriculum yet starts from the
 * default or a copy of another round. Internal: not indexed, not linked from
 * the site. Contains no student data.
 */

export const metadata: Metadata = {
  title: "SHIFT Curriculum",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Without the table or env the page shows the SHIFT[2] defaults in code, as it always has. */
const FALLBACK_KEY = "2";

interface Row {
  key: string;
  doc: CurriculumDoc | null;
  updatedAt: string | null;
}

/** Every saved curriculum (service role, as before: the page is readable with the link). Null = no table/env. */
async function loadRows(): Promise<Row[] | null> {
  try {
    const { data, error } = await createAdminClient()
      .from("shift_curriculum")
      .select("round, content, updated_at");
    if (error) return null;
    return (data ?? []).map((r) => ({
      key: String(r.round),
      doc: parseCurriculumDoc(r.content),
      updatedAt: (r.updated_at as string | null) ?? null,
    }));
  } catch {
    return null;
  }
}

/**
 * Rounds and their curriculum keys, read with the visitor's own session: RLS
 * shows staff every round and others the published ones (anonymous: none).
 */
async function loadRounds(): Promise<CurriculumRoundRef[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("shift_rounds")
      .select("number, curriculum_key, starts_at, duration_days, session_days, session_start, session_end")
      .not("curriculum_key", "is", null);
    if (error) return [];
    return (data ?? []) as CurriculumRoundRef[];
  } catch {
    return [];
  }
}

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1);
    return !!data?.length;
  } catch {
    return false;
  }
}

export default async function ShiftCurriculumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const [rows, rounds, canEdit] = await Promise.all([loadRows(), loadRounds(), isAdmin()]);
  const shared = { canEdit, refundSteps: [...REFUND_STEPS], refundHow: REFUND_HOW };

  if (rows === null) {
    const option = { key: FALLBACK_KEY, label: curriculumKeyLabel(FALLBACK_KEY), hasRow: false, rounds: [] };
    return (
      <CurriculumEditor
        {...shared}
        round={FALLBACK_KEY}
        label={option.label}
        options={[option]}
        initial={SHIFT2_DEFAULT_DOC}
        updatedAt={null}
        defaultDoc={SHIFT2_DEFAULT_DOC}
        copySources={[]}
      />
    );
  }

  const options = curriculumOptions(
    rows.map((r) => ({ key: r.key, updated_at: r.updatedAt })),
    rounds,
  );
  const key = pickCurriculumKey(query.round, options);
  if (!options.some((o) => o.key === key)) {
    options.unshift({ key, label: curriculumKeyLabel(key), hasRow: false, rounds: [] });
  }
  const label = options.find((o) => o.key === key)?.label ?? curriculumKeyLabel(key);
  const row = rows.find((r) => r.key === key);
  const target = roundForKey(key, rounds);
  const defaultRow = rows.find((r) => r.key === DEFAULT_CURRICULUM_KEY);
  // Other rounds' full docs (mentor notes included) only go to admins, who are the only ones who can copy.
  const copySources = !canEdit || row?.doc
    ? []
    : rows
        .filter((r): r is Row & { doc: CurriculumDoc } => r.doc !== null && r.key !== key)
        .map((r) => ({
          key: r.key,
          label: options.find((o) => o.key === r.key)?.label ?? curriculumKeyLabel(r.key),
          doc: prepareCurriculumCopy(r.doc, target),
        }));

  // `key` resets the editor's local state when the picker switches rounds.
  return (
    <CurriculumEditor
      key={key}
      {...shared}
      round={key}
      label={label}
      options={options}
      initial={row?.doc ?? null}
      unreadable={!!row && !row.doc}
      updatedAt={row?.updatedAt ?? null}
      defaultDoc={prepareCurriculumCopy(defaultRow?.doc ?? SHIFT2_DEFAULT_DOC, target)}
      copySources={copySources}
    />
  );
}
