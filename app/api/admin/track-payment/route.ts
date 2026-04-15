import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "team"]);
      
    if (!roles || roles.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const body = await req.json();
    const { 
      user_id, 
      amount, 
      currency = "THB", 
      payment_method,
      product_name,
      notes 
    } = body;
    
    if (!user_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "user_id and amount are required" }, 
        { status: 400 }
      );
    }
    
    const { error: funnelError } = await supabase
      .from("funnel_events")
      .insert({
        user_id,
        event_name: "payment_convert",
        metadata: {
          amount,
          currency,
          payment_method,
          product_name,
          notes,
          recorded_by: user.id,
        },
      });
      
    if (funnelError) {
      return NextResponse.json(
        { error: "Failed to track payment", details: funnelError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Payment tracked successfully",
      user_id,
      amount,
      currency 
    });
    
  } catch (error) {
    console.error("Error tracking payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
