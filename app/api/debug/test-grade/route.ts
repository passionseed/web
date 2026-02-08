import { NextRequest, NextResponse } from "next/server";
import { requireDebugAccess, safeServerError } from "@/lib/security/route-guards";

export async function POST(_request: NextRequest) {
  const debug = await requireDebugAccess();
  if (!debug.ok) return debug.response;

  try {
    const { supabase } = debug.value;

    const testCases = [
      { grade: "pass", rating: null },
      { grade: "fail", rating: null },
      { grade: "pass", rating: 1 },
      { grade: "pass", rating: 5 },
      { grade: "PASS", rating: null },
      { grade: "invalid", rating: null },
      { grade: "pass", rating: 0 },
      { grade: "pass", rating: 6 },
    ];

    const results: Array<{ testCase: any; success: boolean; error: string | null }> = [];
    for (const testCase of testCases) {
      const { error } = await supabase
        .from("submission_grades")
        .select("id")
        .eq("grade", testCase.grade)
        .limit(1);

      results.push({ testCase, success: !error, error: error?.message || null });
    }

    return NextResponse.json({ testResults: results });
  } catch (error) {
    return safeServerError("Test failed", error);
  }
}
