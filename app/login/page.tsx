import { LoginForm } from "@/components/login-form";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    // Check if profile is complete before redirecting
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, username, date_of_birth")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profileData?.full_name || !profileData?.username || !profileData?.date_of_birth) {
      // Profile incomplete, redirect to finish profile
      redirect("/auth/finish-profile");
    }

    redirect("/");
  }

  return (
    <div className="flex-1 flex items-center justify-center my-10">
      <LoginForm />
    </div>
  );
}
