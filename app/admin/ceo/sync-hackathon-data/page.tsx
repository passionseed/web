"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function checkAdminAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/login");
  
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "team"]);
    
  if (!roles || roles.length === 0) redirect("/me");
  
  return user;
}

async function syncHackathonToFunnel() {
  "use server";
  
  const supabase = await createClient();
  
  const { data: participants, error } = await supabase
    .from("hackathon_participants")
    .select("id, track, university, grade_level, referral_source, created_at");
    
  if (error || !participants) {
    return { success: false, error: error?.message, count: 0 };
  }
  
  const funnelEvents = participants.map((p) => ({
    user_id: p.id,
    event_name: "hackathon_signup",
    event_timestamp: p.created_at,
    metadata: {
      track: p.track,
      university: p.university,
      grade_level: p.grade_level,
      source: p.referral_source,
    },
  }));
  
  const { error: insertError } = await supabase
    .from("funnel_events")
    .insert(funnelEvents);
    
  if (insertError) {
    return { success: false, error: insertError.message, count: 0 };
  }
  
  const cohortAssignments = participants.map((p) => {
    const date = new Date(p.created_at);
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const cohortDate = new Date(date.setDate(diff));
    
    return {
      user_id: p.id,
      cohort_date: cohortDate.toISOString().split('T')[0],
      acquisition_channel: "hackathon",
      signup_source: "hackathon_registration",
    };
  });
  
  const { error: cohortError } = await supabase
    .from("cohort_assignments")
    .insert(cohortAssignments);
    
  return { 
    success: true, 
    count: participants.length,
    cohortError: cohortError?.message 
  };
}

export default async function SyncHackathonDataPage() {
  await checkAdminAccess();
  
  return (
    <div className="container mx-auto py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Sync Hackathon Data to Funnel</CardTitle>
          <CardDescription>
            Import existing hackathon participants into the CEO dashboard funnel tracking.
            This will create funnel_events and cohort_assignments for all hackathon registrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-950/30 border border-amber-500/20 rounded-lg p-4">
            <p className="text-sm text-amber-200">
              <strong>Warning:</strong> This action will import all hackathon participants into the funnel tracking system. 
              Run this only once to avoid duplicate entries.
            </p>
          </div>
          
          <form action={syncHackathonToFunnel}>
            <Button type="submit" className="w-full ei-button-dusk">
              Start Sync
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
