import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { NewNorthStarFlow } from "@/components/journey/NewNorthStarFlow";

export default async function NewNorthStarPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return <NewNorthStarFlow />;
}
