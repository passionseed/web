import { Button } from "@/components/ui/button";

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  loading: boolean;
  hasMore: boolean;
}

export function LoadMoreButton({ onLoadMore, loading, hasMore }: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <div className="text-center mt-12">
      <Button
        onClick={onLoadMore}
        disabled={loading}
        size="lg"
        variant="outline"
        className="border-slate-600 hover:bg-slate-700 text-gray-200 hover:text-gray-100"
      >
        {loading ? "Loading..." : "Load More Maps"}
      </Button>
    </div>
  );
}