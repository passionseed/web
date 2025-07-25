import { LoginForm } from "@/components/login-form";
import { Layout } from "@/components/layout";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect("/");
  }

  return (
    <div className="flex-1 flex items-center justify-center my-10">
      <LoginForm />
    </div>
  );
}
