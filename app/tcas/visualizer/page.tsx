import { TCASVisualizer } from "@/components/tcas/TCASVisualizer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VisualizerPage() {
  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" className="w-fit -ml-4 text-muted-foreground">
          <Link href="/me">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TCAS Semantic Explorer</h1>
          <p className="text-muted-foreground">
            Explore the relationships between programs based on their semantic embeddings. 
            Programs that are closer together have similar course content and requirements.
          </p>
        </div>
      </div>
      
      <TCASVisualizer />
    </div>
  );
}
