"use client";

import { MapEnrollmentDialog } from "@/components/map/MapEnrollmentDialog";
import { AnimatedMapPreview } from "@/components/map/AnimatedMapPreview";
import { useAuth } from "@/hooks/use-auth";
import { useMapOperations, InitialData } from "@/hooks/use-map-operations";
import { useMapTypeInfo } from "@/hooks/use-map-type-info";
import { HeroHeader } from "@/components/map/HeroHeader";
import { EmptyMapsState } from "@/components/map/EmptyMapsState";
import { MapSection } from "@/components/map/MapSection";
import { LoadMoreButton } from "@/components/map/LoadMoreButton";
import { CreateMapCTA } from "@/components/map/CreateMapCTA";
import Loading from "./loading";
import { MapSkeleton } from "./map-skeleton";

interface MapsClientPageProps {
  initialData: InitialData;
}

export function MapsClientPage({ initialData }: MapsClientPageProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { groupMapsByType } = useMapTypeInfo();

  const {
    maps,
    loading,
    loadingMore,
    hasMore,
    selectedMapForEnrollment,
    selectedMapForPreview,
    loadMoreMaps,
    handleStartAdventure,
    handleCreateNewMap,
    handleEnrollmentSuccess,
    closeEnrollmentDialog,
    closePreviewDialog,
  } = useMapOperations({ initialData });

  console.log(
    "list image_url",
    maps.map((m) => m.cover_image_url)
  );

  const renderMapsSections = () => {
    const sections = groupMapsByType(maps);

    if (sections.length === 0 && !loading) {
      return <EmptyMapsState onCreateMap={handleCreateNewMap} />;
    }

    return (
      <>
        {sections.map((section) => (
          <MapSection
            key={section.type}
            type={section.type}
            maps={section.maps}
            typeInfo={section}
          />
        ))}

        <LoadMoreButton
          onLoadMore={loadMoreMaps}
          loading={loadingMore}
          hasMore={hasMore}
        />
      </>
    );
  };

  if (loading || authLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      <HeroHeader
        isAuthenticated={isAuthenticated}
        onCreateMap={handleCreateNewMap}
      />

      {/* Maps by Category */}
      <div className="container mx-auto px-6 py-12 space-y-12">
        {loading ? <MapSkeleton /> : renderMapsSections()}

        <CreateMapCTA
          isAuthenticated={isAuthenticated}
          onCreateMap={handleCreateNewMap}
        />

        <AnimatedMapPreview
          map={selectedMapForPreview}
          isOpen={!!selectedMapForPreview}
          onClose={closePreviewDialog}
          onStartAdventure={handleStartAdventure}
        />

        {selectedMapForEnrollment && (
          <MapEnrollmentDialog
            isOpen={!!selectedMapForEnrollment}
            onOpenChange={(open) => !open && closeEnrollmentDialog()}
            map={selectedMapForEnrollment}
            onEnrollmentSuccess={handleEnrollmentSuccess}
          />
        )}
      </div>
    </div>
  );
}
