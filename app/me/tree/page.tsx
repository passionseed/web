import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { PassionTreeGarden } from "@/components/passion-tree/passion-tree-garden";

export const metadata = {
  title: "Passion Tree Garden | PassionSeed",
  description: "Cultivate your passions and watch them grow over time.",
};

export default async function PassionTreePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 to-emerald-900">
      <PassionTreeGarden userId={user.id} />
    </div>
  );
}
