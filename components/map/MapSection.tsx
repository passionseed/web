import { MapTypeInfo } from "@/hooks/use-map-type-info";
import { MapWithStats } from "@/hooks/use-map-operations";
import { MapCard } from "./MapCard";

interface MapSectionProps {
  type: string;
  maps: MapWithStats[];
  typeInfo: MapTypeInfo;
}

export function MapSection({ maps, typeInfo }: MapSectionProps) {
  return (
    <div className="space-y-25">
      <div
        className={`bg-gradient-to-r ${typeInfo.bgColor} rounded-lg border ${typeInfo.borderColor} p-6`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border ${typeInfo.borderColor}`}
          >
            <typeInfo.icon className={`h-6 w-6 ${typeInfo.iconColor}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {typeInfo.title}
            </h2>
            <p className="text-sm text-gray-300">
              {typeInfo.description} " {maps.length} maps
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-12 justify-items-center mt-24">
        {maps.map((map) => (
          <MapCard key={map.id} map={map} />
        ))}
      </div>
    </div>
  );
}
