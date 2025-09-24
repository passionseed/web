import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { MapWithStats } from "@/hooks/use-map-operations";
import { VinylRecord } from "./VinylRecord";
import { OptimizedImage } from "./OptimizedImage";
import { getBlurHashAverageColor } from "fast-blurhash";
import {
  VinylColorScheme,
  getVinylColorsFromCover,
} from "@/utils/color-extraction";

interface MapCardProps {
  map: MapWithStats;
}

export function MapCard({ map }: MapCardProps) {
  const router = useRouter();
  const [vinylColors, setVinylColors] = useState<VinylColorScheme | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      const extractColors = () => {
        // Priority: Use blurhash average color if available
        if (map.cover_image_blurhash) {
          try {
            const [r, g, b] = getBlurHashAverageColor(map.cover_image_blurhash);

            // Create a vinyl color scheme from the blurhash average color with stronger opacity
            const darkerColor = `${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)}`;
            const lighterColor = `${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)}`;
            const darkestColor = `${Math.max(0, r - 80)}, ${Math.max(0, g - 80)}, ${Math.max(0, b - 80)}`;

            const vinylScheme: VinylColorScheme = {
              bg: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 1), rgba(${darkerColor}, 0.95), rgba(${darkestColor}, 1))`,
              grooveStyle: {
                borderColor: `rgba(${lighterColor}, 0.9)`,
              },
              labelStyle: {
                background: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.95), rgba(${darkerColor}, 1))`,
                borderColor: `rgba(${lighterColor}, 0.95)`,
              },
            };

            setVinylColors(vinylScheme);
            console.log("Using blurhash colors:", vinylScheme);
            return;
          } catch (error) {
            console.warn("Failed to extract blurhash color:", error);
          }
        }

        // Fallback: Extract colors from image URL if no blurhash
        const imageUrl = map.cover_image_url || map.metadata?.coverImage;
        if (imageUrl) {
          getVinylColorsFromCover(imageUrl).then(setVinylColors);
        }
      };

      if ("requestIdleCallback" in window) {
        requestIdleCallback(extractColors, { timeout: 1000 });
      } else {
        setTimeout(extractColors, 100);
      }
    }
  }, [
    isMounted,
    map.cover_image_blurhash,
    map.cover_image_url,
    map.metadata?.coverImage,
  ]);

  const handleMapClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/map/${map.id}`);
  };

  return (
    <div onClick={handleMapClick} className="block group cursor-pointer">
      <div className="relative w-80 h-80 cursor-pointer perspective-1000 mt-14">
        <VinylRecord
          vinylColors={vinylColors}
          coverImage={map.cover_image_url || map.metadata?.coverImage}
          showClickToPlay
        />

        <div
          className="relative w-full h-full transform-style-preserve-3d transition-all duration-700"
          style={{ zIndex: 10 }}
        >
          <div className="album-cover absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-lg shadow-2xl border border-slate-600 overflow-hidden transform-gpu">
            {map.cover_image_url || map.metadata?.coverImage ? (
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <div className="relative w-full h-full">
                  <OptimizedImage
                    src={map.cover_image_url || map.metadata?.coverImage}
                    blurhash={map.cover_image_blurhash}
                    alt="Map Cover"
                    fill
                    className="object-cover w-full h-full"
                    priority
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-indigo-500/30" />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px),
                                    radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: "20px 20px",
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              </div>
            )}

            <div className="relative z-10 h-full flex flex-col">
              <div className="mt-auto p-6">
                <h3
                  style={{ fontFamily: "League Gothic" }}
                  className={`font-black text-white leading-none mb-2 tracking-wider uppercase ${
                    map.title.length > 20
                      ? "text-2xl"
                      : map.title.length > 16
                        ? "text-3xl"
                        : map.title.length > 12
                          ? "text-4xl"
                          : map.title.length > 8
                            ? "text-5xl"
                            : "text-6xl"
                  }`}
                >
                  {map.title}
                </h3>
                <div
                  className={`text-gray-300 font-medium ${
                    (map.description || "Learning adventure awaits").length > 50
                      ? "text-sm"
                      : "text-lg"
                  }`}
                >
                  {map.description || "Learning adventure awaits"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
