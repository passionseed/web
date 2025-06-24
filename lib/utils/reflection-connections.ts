import { ReflectionTimelineNode } from "@/types/reflection";

interface Connection {
  source: string; // reflection ID
  target: string; // reflection ID
  tags: string[]; // shared tag IDs
  strength: number; // number of shared tags
}

/**
 * Find connections between reflections based on shared tags
 */
export function findReflectionConnections(
  reflections: ReflectionTimelineNode[]
): Connection[] {
  const connections: Connection[] = [];
  const processedPairs = new Set<string>();

  // Only process reflections that have tags
  const reflectionsWithTags = reflections.filter(r => r.tags && r.tags.length > 0);

  for (let i = 0; i < reflectionsWithTags.length; i++) {
    const source = reflectionsWithTags[i];
    
    for (let j = i + 1; j < reflectionsWithTags.length; j++) {
      const target = reflectionsWithTags[j];
      const pairId = [source.id, target.id].sort().join('_');
      
      // Skip if we've already processed this pair
      if (processedPairs.has(pairId)) continue;
      processedPairs.add(pairId);

      // Find shared tags
      const sharedTags = source.tags.filter(sourceTag => 
        target.tags.some(targetTag => targetTag.id === sourceTag.id)
      );

      // Only create a connection if they share at least one tag
      if (sharedTags.length > 0) {
        connections.push({
          source: source.id,
          target: target.id,
          tags: sharedTags.map(tag => tag.id),
          strength: sharedTags.length
        });
      }
    }
  }

  return connections;
}

/**
 * Get the color for a connection based on the shared tags
 */
export function getConnectionColor(tags: any[]): string {
  if (!tags || tags.length === 0) return '#94a3b8';
  
  // For now, use the first tag's color with some opacity
  // You might want to enhance this to blend colors if multiple tags are shared
  return `${tags[0].color}80`; // 50% opacity
}

/**
 * Calculate the distance between two points for connection strength
 */
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Get the position of a reflection element by ID
 */
export function getReflectionPosition(reflectionId: string): DOMRect | null {
  const element = document.querySelector(`[data-reflection-id="${reflectionId}"]`);
  return element ? element.getBoundingClientRect() : null;
}
