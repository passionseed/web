import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, LogIn } from "lucide-react";

interface CreateMapCTAProps {
  isAuthenticated: boolean;
  onCreateMap: () => void;
}

export function CreateMapCTA({ isAuthenticated, onCreateMap }: CreateMapCTAProps) {
  return (
    <div className="mt-16 text-center">
      <Card className="max-w-md mx-auto bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-dashed border-slate-600 hover:border-slate-500 transition-colors backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-800/50 to-purple-800/50 rounded-full flex items-center justify-center border border-indigo-600/30">
            <Plus className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-gray-100">
            Create Your Own Map
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Design interactive learning experiences with gamified content
          </p>
          <Button
            variant="outline"
            className="border-slate-600 hover:bg-slate-700 text-gray-200 hover:text-gray-100"
            onClick={isAuthenticated ? undefined : onCreateMap}
          >
            {isAuthenticated ? (
              <Link href="/map/new">Create New Map</Link>
            ) : (
              <div className="flex items-center gap-2 cursor-pointer">
                <LogIn className="h-4 w-4" />
                Login to Create Maps
              </div>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}