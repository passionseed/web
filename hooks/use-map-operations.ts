import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { LearningMap } from "@/types/map";

export type MapWithStats = LearningMap & {
  node_count: number;
  avg_difficulty: number;
  total_assessments: number;
  isEnrolled: boolean;
  hasStarted: boolean;
  map_type: "personal" | "classroom" | "team" | "forked" | "public";
  source_info?: {
    classroom_name?: string;
    team_name?: string;
    original_title?: string;
  };
  // New image storage fields
  cover_image_url?: string;
  cover_image_blurhash?: string;
  cover_image_key?: string;
  cover_image_updated_at?: string;
};

export type InitialData = {
  maps: MapWithStats[];
  total_count: number;
  has_more: boolean;
} | null;

interface UseMapOperationsProps {
  initialData: InitialData;
}

export function useMapOperations({ initialData }: UseMapOperationsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [maps, setMaps] = useState<MapWithStats[]>(initialData?.maps || []);
  const [loading, setLoading] = useState(!initialData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialData?.has_more || false);
  const [selectedMapForEnrollment, setSelectedMapForEnrollment] = useState<MapWithStats | null>(null);
  const [selectedMapForPreview, setSelectedMapForPreview] = useState<MapWithStats | null>(null);

  useEffect(() => {
    if (initialData) {
      setLoading(false);
      return;
    }

    const fetchMaps = async () => {
      try {
        const response = await fetch('/api/maps/list?page=0&limit=20');
        if (!response.ok) {
          throw new Error('Failed to fetch maps');
        }

        const result = await response.json();

        setMaps(result.maps);
        setHasMore(result.has_more);
      } catch (err) {
        console.error("Error fetching maps:", err);
        toast({
          title: "Error",
          description: "Failed to load learning maps.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMaps();
  }, [toast, initialData]);

  const loadMoreMaps = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/maps/list?page=${nextPage}&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch more maps');
      }

      const result = await response.json();

      setMaps(prevMaps => [...prevMaps, ...result.maps]);
      setHasMore(result.has_more);
      setPage(nextPage);
    } catch (err) {
      console.error("Error loading more maps:", err);
      toast({
        title: "Error",
        description: "Failed to load more maps.",
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleStartAdventure = (map: MapWithStats, event?: React.MouseEvent) => {
    event?.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to start your learning adventure.",
        variant: "default",
      });
      router.push("/login");
      return;
    }

    setSelectedMapForEnrollment(map);
  };

  const handleCreateNewMap = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to create learning maps.",
        variant: "default",
      });
      router.push("/login");
      return;
    }
    router.push("/map/new");
  };

  const handleEnrollmentSuccess = () => {
    if (selectedMapForEnrollment) {
      setMaps((prevMaps) =>
        prevMaps.map((map) =>
          map.id === selectedMapForEnrollment.id
            ? { ...map, isEnrolled: true, hasStarted: false }
            : map
        )
      );
    }
  };

  const closeEnrollmentDialog = () => {
    setSelectedMapForEnrollment(null);
  };

  const closePreviewDialog = () => {
    setSelectedMapForPreview(null);
  };

  return {
    // State
    maps,
    loading,
    loadingMore,
    hasMore,
    selectedMapForEnrollment,
    selectedMapForPreview,

    // Actions
    loadMoreMaps,
    handleStartAdventure,
    handleCreateNewMap,
    handleEnrollmentSuccess,
    closeEnrollmentDialog,
    closePreviewDialog,
    setSelectedMapForPreview,
  };
}