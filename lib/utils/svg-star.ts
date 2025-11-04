/**
 * SVG Star Generation Utilities
 * Creates procedural star shapes with customizable parameters
 */

export interface StarConfig {
  coreSize: number; // 30-100, size of the center
  flareCount: number; // 4-12, number of points
  rotation: number; // 0-360, rotation angle in degrees
  innerRadiusRatio: number; // 0.3-0.7, ratio of inner to outer radius (point sharpness)
  glowIntensity: number; // 0-10, glow effect intensity
  seed: string; // For deterministic randomization
}

export interface StarSVGData {
  path: string;
  viewBox: string;
  centerX: number;
  centerY: number;
}

/**
 * Simple seeded random number generator
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }

  return function() {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
}

/**
 * Generate a random seed string
 */
export function generateSeed(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Create default star configuration
 */
export function createDefaultStarConfig(): StarConfig {
  return {
    coreSize: 60,
    flareCount: 5,
    rotation: 0,
    innerRadiusRatio: 0.4,
    glowIntensity: 5,
    seed: generateSeed(),
  };
}

/**
 * Generate SVG path for a star shape
 */
export function generateStarPath(config: StarConfig): StarSVGData {
  const { coreSize, flareCount, rotation, innerRadiusRatio, seed } = config;
  const random = seededRandom(seed);

  const centerX = 128;
  const centerY = 128;
  const outerRadius = coreSize * 1.2; // Flare tips
  const innerRadius = outerRadius * innerRadiusRatio; // Use ratio for point sharpness

  const points: Array<{ x: number; y: number }> = [];
  const rotationRad = (rotation * Math.PI) / 180; // Convert degrees to radians

  // Generate star points
  for (let i = 0; i < flareCount * 2; i++) {
    const angle = (i * Math.PI) / flareCount - Math.PI / 2 + rotationRad;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;

    // Add slight randomization to make each star unique
    const radiusVariation = 1 + (random() - 0.5) * 0.15;
    const angleVariation = (random() - 0.5) * 0.1;

    const finalRadius = radius * radiusVariation;
    const finalAngle = angle + angleVariation;

    points.push({
      x: centerX + finalRadius * Math.cos(finalAngle),
      y: centerY + finalRadius * Math.sin(finalAngle),
    });
  }

  // Build SVG path
  const pathData = points.reduce((path, point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${path} ${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, '');

  const closedPath = `${pathData} Z`;

  return {
    path: closedPath,
    viewBox: '0 0 256 256',
    centerX,
    centerY,
  };
}

/**
 * Generate a randomized star configuration
 */
export function randomizeStarConfig(): StarConfig {
  const coreSize = Math.floor(Math.random() * 40) + 50; // 50-90
  const flareCount = Math.floor(Math.random() * 7) + 5; // 5-11
  const rotation = Math.floor(Math.random() * 360); // 0-360
  const innerRadiusRatio = Math.random() * 0.4 + 0.3; // 0.3-0.7
  const glowIntensity = Math.floor(Math.random() * 8) + 3; // 3-10
  const seed = generateSeed();

  return {
    coreSize,
    flareCount,
    rotation,
    innerRadiusRatio,
    glowIntensity,
    seed,
  };
}

/**
 * Validate star configuration
 */
export function validateStarConfig(config: Partial<StarConfig>): StarConfig {
  return {
    coreSize: Math.max(30, Math.min(100, config.coreSize || 60)),
    flareCount: Math.max(4, Math.min(12, config.flareCount || 5)),
    rotation: Math.max(0, Math.min(360, config.rotation || 0)),
    innerRadiusRatio: Math.max(0.3, Math.min(0.7, config.innerRadiusRatio || 0.4)),
    glowIntensity: Math.max(0, Math.min(10, config.glowIntensity || 5)),
    seed: config.seed || generateSeed(),
  };
}
