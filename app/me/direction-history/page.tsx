import { SavedResultsList } from "@/components/education/direction-finder/SavedResultsList";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "My Direction History | Passion Seed",
  description: "View your past direction profiles and assessments.",
};

export default function DirectionHistoryPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(to_bottom,#020617_0%,#0f172a_28%,#1e1b4b_58%,#312e81_82%,#1e3a5f_100%)] text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/me/journey">
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Journey
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Direction History
          </h1>
          <p className="text-slate-400">
            Review your past assessments and see how your direction has evolved.
          </p>
        </div>

        <SavedResultsList />
      </div>
    </div>
  );
}
