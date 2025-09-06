import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
  try {
    // Test regular client
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        error: "Authentication required",
        details: authError?.message
      }, { status: 401 });
    }

    // Check admin role
    const { data: userRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError || !userRoles?.some(r => r.role === "admin")) {
      return NextResponse.json({
        error: "Admin access required",
        userRoles: userRoles,
        roleError: roleError?.message
      }, { status: 403 });
    }

    // Test admin client connection
    try {
      const adminSupabase = createAdminClient();
      
      // Simple test query
      const { data: testData, error: testError } = await adminSupabase
        .from("learning_maps")
        .select("id, title")
        .limit(1);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email
        },
        userRoles: userRoles.map(r => r.role),
        adminClientTest: {
          success: !testError,
          error: testError?.message,
          dataCount: testData?.length || 0
        },
        environment: {
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          nodeEnv: process.env.NODE_ENV
        }
      });

    } catch (adminError) {
      return NextResponse.json({
        success: false,
        adminClientError: adminError instanceof Error ? adminError.message : 'Unknown error',
        user: {
          id: user.id,
          email: user.email
        },
        userRoles: userRoles.map(r => r.role),
        environment: {
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          nodeEnv: process.env.NODE_ENV
        }
      });
    }

  } catch (error) {
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}