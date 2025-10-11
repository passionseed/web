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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <typeInfo.icon className={`h-6 w-6 ${typeInfo.iconColor}`} />
        <h2 className="text-2xl font-bold text-white">
          {typeInfo.title}
        </h2>
        <span className="text-sm text-gray-400">
          • {maps.length} {maps.length === 1 ? 'map' : 'maps'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {maps.map((map) => (
          <MapCard key={map.id} map={map} />
        ))}
      </div>
    </div>
  );
}
