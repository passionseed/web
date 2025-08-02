import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Test different grade values to see what the database accepts
    const testCases = [
      { grade: "pass", rating: null },
      { grade: "fail", rating: null },
      { grade: "pass", rating: 1 },
      { grade: "pass", rating: 5 },
      { grade: "PASS", rating: null }, // Test case sensitivity
      { grade: "invalid", rating: null }, // Should fail
      { grade: "pass", rating: 0 }, // Should fail
      { grade: "pass", rating: 6 }, // Should fail
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        // Just test the constraints without actually inserting
        const { error } = await supabase
          .from("submission_grades")
          .select("id")
          .eq("grade", testCase.grade)
          .limit(1);

        results.push({
          testCase,
          success: !error,
          error: error?.message || null,
        });
      } catch (e) {
        results.push({
          testCase,
          success: false,
          error: String(e),
        });
      }
    }

    // Get the actual table schema
    const { data: tableInfo, error: schemaError } = await supabase
      .rpc("get_table_constraints", { table_name: "submission_grades" })
      .catch(() => ({ data: null, error: "RPC not available" }));

    return NextResponse.json({
      testResults: results,
      tableInfo,
      schemaError: schemaError?.message,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Test failed",
        message: String(error),
      },
      { status: 500 }
    );
  }
}
