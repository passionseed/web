/**
 * GLSL for the /shift/next globe. The Earth is drawn as a field of dots
 * (one per lat/lon cell, sized by the land mask), lit by a sun fixed in view
 * space so the dawn line holds still while the planet turns under it.
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
  uniform vec3 uLandDay;
  uniform vec3 uLandNight;
  uniform vec3 uCity;
  uniform vec3 uDawn;
  uniform vec3 uBeaconColor;
  uniform vec3 uRim;

  varying vec2 vUv;
  varying vec3 vNormalObj;
  varying vec3 vNormalView;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
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
    float dist = length(local);
    float aa = 0.08;
    float radius = mix(0.13, 0.34 + 0.05 * seed, land);
    float dotMask = 1.0 - smoothstep(radius - aa, radius + aa, dist);

    vec3 n = normalize(vNormalView);
    float light = dot(n, normalize(uSun));
    float day = smoothstep(-0.12, 0.4, light);

    // Night side: a few cells flicker like city lights.
    float flicker = 0.55 + 0.45 * sin(uTime * (1.3 + seed * 2.0) + seed * 40.0);
    float city = step(0.84, seed) * land * (1.0 - day) * flicker;

    vec3 landColor = mix(uLandNight, uLandDay, day) + uCity * city * 1.4;
    vec3 seaDot = uSea * (1.6 + 1.2 * day);
    vec3 dotColor = mix(seaDot, landColor, land);
    float dotAlpha = mix(0.35 + 0.35 * day, 1.0, land);

    vec3 color = uSea * (0.25 + 0.55 * day);
    color = mix(color, dotColor, dotMask * dotAlpha);

    // Dawn line: the band where night turns to day glows warm.
    float dawn = exp(-pow(light / 0.11, 2.0));
    color += uDawn * dawn * (0.25 + 0.55 * land * dotMask);

    // Beacon over Bangkok: a steady core and rings sent out on a loop.
    float angle = acos(clamp(dot(normalize(vNormalObj), uBeacon), -1.0, 1.0));
    float core = 1.0 - smoothstep(0.0, 0.022, angle);
    float rings = ripple(angle, fract(uTime * 0.28), 0.42)
      + ripple(angle, fract(uTime * 0.28 + 0.5), 0.42);
    color += uBeaconColor * (core * 2.2 + rings * 1.3);

    // Thin atmosphere rim on the planet itself.
    float fresnel = pow(1.0 - max(n.z, 0.0), 3.0);
    color += uRim * fresnel * (0.35 + 0.65 * day);

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
  uniform vec3 uRim;
  uniform vec3 uDawn;
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
    float lit = smoothstep(-0.5, 0.6, dot(n, normalize(uSun)));
    vec3 color = mix(uDawn, uRim, lit);
    float a = glow * breath * uStrength;
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
