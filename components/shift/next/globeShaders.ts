/**
 * GLSL for the SHIFT globe: the planet at dawn, printed in the riso inks.
 * The Earth is a halftone plate (one dot per lat/lon cell, sized by the land
 * mask and by how much light falls on it), lit by a sun fixed in view space
 * to the east, so the dawn line holds still while places turn out of the
 * night and into it. The line itself runs pink, orange, then gold, the same
 * order as the sky on the home page and the posters.
 * Bangkok carries a beacon: SHIFT runs from here.
 */

export const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalObj;
  varying vec3 vNormalView;

  void main() {
    vUv = uv;
    vNormalObj = normalize(normal);
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const earthFragment = /* glsl */ `
  #define PI 3.14159265359

  uniform sampler2D uMask;
  uniform float uTime;
  uniform float uRows;
  uniform vec3 uSun;
  uniform vec3 uBeacon;
  uniform vec3 uSea;
  uniform vec3 uSeaInk;
  uniform vec3 uLandDay;
  uniform vec3 uLandNight;
  uniform vec3 uCity;
  uniform vec3 uDawnPink;
  uniform vec3 uDawnOrange;
  uniform vec3 uDawnGold;
  uniform vec3 uBeaconColor;
  uniform vec3 uRimNight;

  varying vec2 vUv;
  varying vec3 vNormalObj;
  varying vec3 vNormalView;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float band(float light, float centre, float width) {
    return exp(-pow((light - centre) / width, 2.0));
  }

  /** Ring travelling outward from the beacon, 0..1 phase. */
  float ripple(float angle, float phase, float reach) {
    float radius = phase * reach;
    float width = 0.004 + 0.01 * phase;
    return (1.0 - smoothstep(0.0, width, abs(angle - radius))) * (1.0 - phase);
  }

  void main() {
    // One row of cells per latitude band; fewer cells per row towards the
    // poles keeps every dot roughly the same size on the sphere.
    float row = floor(vUv.y * uRows);
    float rowLat = ((row + 0.5) / uRows - 0.5) * PI;
    float perRow = max(1.0, floor(uRows * 2.0 * cos(rowLat)));
    float col = floor(vUv.x * perRow);
    vec2 cellUv = vec2((col + 0.5) / perRow, (row + 0.5) / uRows);
    vec2 local = vec2(fract(vUv.x * perRow), fract(vUv.y * uRows)) - 0.5;

    float land = texture2D(uMask, cellUv).r;
    float seed = hash(vec2(col, row));

    vec3 n = normalize(vNormalView);
    float light = dot(n, normalize(uSun));
    float day = smoothstep(-0.12, 0.4, light);

    // The dawn line, night side to day side: pink, then orange, then gold.
    float pink = band(light, -0.11, 0.1);
    float orange = band(light, 0.0, 0.075);
    float gold = band(light, 0.13, 0.11);
    vec3 dawn = uDawnPink * pink + uDawnOrange * orange + uDawnGold * gold;
    float dawnAmount = clamp(pink + orange + gold, 0.0, 1.0);

    // Halftone: a dot carries more ink where more light lands, like a
    // printed plate. Night land thins out instead of going grey.
    float dist = length(local);
    float aa = 0.08;
    float seaRadius = mix(0.09, 0.2, day) + 0.05 * orange;
    float landRadius = mix(0.24, 0.36, day) + 0.05 * seed;
    float radius = mix(seaRadius, landRadius, land);
    float dotMask = 1.0 - smoothstep(radius - aa, radius + aa, dist);

    // Night side: a few cells flicker like city lights.
    float flicker = 0.55 + 0.45 * sin(uTime * (1.3 + seed * 2.0) + seed * 40.0);
    float city = step(0.82, seed) * land * (1.0 - day) * flicker;

    vec3 landColor = mix(uLandNight, uLandDay, day);
    landColor = mix(landColor, dawn, 0.72 * dawnAmount);
    landColor += uCity * city * 1.5;
    vec3 seaDot = mix(uSeaInk * (0.55 + 0.95 * day), dawn, 0.5 * dawnAmount);
    vec3 dotColor = mix(seaDot, landColor, land);
    float dotAlpha = mix(0.4 + 0.5 * day, 1.0, land);

    // Open water: near-black at night, a thin wash of the blue plate by day.
    vec3 color = mix(uSea * 0.6, uSeaInk * 0.2, day);
    color = mix(color, dotColor, dotMask * dotAlpha);

    // First light spills past the dots as a soft wash along the line.
    color += dawn * (0.1 + 0.08 * land);

    // Beacon over Bangkok: a steady core and rings sent out on a loop.
    float angle = acos(clamp(dot(normalize(vNormalObj), uBeacon), -1.0, 1.0));
    float core = 1.0 - smoothstep(0.0, 0.022, angle);
    float rings = ripple(angle, fract(uTime * 0.28), 0.42)
      + ripple(angle, fract(uTime * 0.28 + 0.5), 0.42);
    color += uBeaconColor * (core * 2.2 + rings * 1.3);

    // Thin atmosphere on the planet's own edge: cool on the night limb,
    // warming through the dawn line to gold where the sun already is.
    float fresnel = pow(1.0 - max(n.z, 0.0), 3.0);
    vec3 rim = mix(uRimNight, uDawnGold, day);
    rim = mix(rim, uDawnOrange, 0.8 * orange + 0.5 * pink);
    color += rim * fresnel * (0.4 + 0.5 * day + 0.5 * dawnAmount);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const atmosphereVertex = /* glsl */ `
  varying vec3 vNormalView;

  void main() {
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragment = /* glsl */ `
  uniform vec3 uSun;
  uniform vec3 uNight;
  uniform vec3 uDawn;
  uniform vec3 uDay;
  uniform float uTime;
  /** -n.z at the planet's limb for this shell: sqrt(1 - 1 / scale^2). */
  uniform float uEdge;
  uniform float uStrength;
  uniform float uPower;

  varying vec3 vNormalView;

  void main() {
    vec3 n = normalize(vNormalView);
    // Back faces seen past the limb: brightest right at the planet's edge,
    // gone at the shell's outer edge.
    float glow = pow(smoothstep(0.0, uEdge, -n.z), uPower);
    // Slow breath: two prime-length cycles (7s, 13s) so it never loops visibly.
    float breath = 0.78
      + 0.16 * sin(uTime * 6.28318 / 7.0)
      + 0.08 * sin(uTime * 6.28318 / 13.0 + 1.7);
    // Light at the stretch of limb this fragment sits behind.
    vec3 limb = vec3(n.xy / max(length(n.xy), 0.0001), 0.0);
    float light = dot(limb, normalize(uSun));
    // Blue over the night, pink where the dawn line meets the limb, warm
    // gold over the day. The night limb stays quiet so the sunrise leads.
    vec3 color = mix(uNight, uDawn, smoothstep(-0.5, 0.0, light));
    color = mix(color, uDay, smoothstep(0.0, 0.45, light));
    float lit = mix(0.55, 1.15, smoothstep(-0.4, 0.5, light));
    float a = glow * breath * uStrength * lit;
    gl_FragColor = vec4(color * a, a);
  }
`;

export const starVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aSeed;
  varying float vTwinkle;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vTwinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 1.7) + aSeed * 60.0);
    gl_PointSize = aSize * uPixelRatio * (40.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const starFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vTwinkle;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = (1.0 - smoothstep(0.0, 0.5, d)) * vTwinkle;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export const orbitVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aAngle;
  varying float vHead;

  void main() {
    // A comet runs the ring: points just behind its head glow, the rest dim.
    float head = mod(uTime * 0.35, 6.28318530718);
    float behind = mod(head - aAngle + 6.28318530718, 6.28318530718);
    vHead = exp(-behind * 1.6);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (1.6 + 4.0 * vHead) * uPixelRatio;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const orbitFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHeadColor;
  varying float vHead;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = (1.0 - smoothstep(0.2, 0.5, d)) * (0.22 + 0.78 * vHead);
    gl_FragColor = vec4(mix(uColor, uHeadColor, vHead), alpha);
  }
`;
