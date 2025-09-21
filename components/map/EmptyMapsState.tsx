import { Button } from "@/components/ui/button";
import { Map, Plus } from "lucide-react";

interface EmptyMapsStateProps {
  onCreateMap: () => void;
}

export function EmptyMapsState({ onCreateMap }: EmptyMapsStateProps) {
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-full flex items-center justify-center border border-blue-600/30">
        <Map className="h-12 w-12 text-blue-400" />
      </div>
      <h3 className="text-2xl font-bold mb-4 text-gray-100">
        No Learning Maps Available
      </h3>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        Start your learning adventure by creating your first interactive map.
      </p>
      <Button
        onClick={onCreateMap}
        size="lg"
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-900/50"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create Your First Map
      </Button>
    </div>
  );
}