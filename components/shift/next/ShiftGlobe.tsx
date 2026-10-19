"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import { COSMOS } from "./cosmos";

import {
  atmosphereFragment,
  atmosphereVertex,
  earthFragment,
  earthVertex,
  orbitFragment,
  orbitVertex,
  starFragment,
  starVertex,
} from "./globeShaders";

/**
 * The /shift/next hero planet. Land mask from Natural Earth, built by
 * scripts/build-shift-globe-mask.mjs. Pauses when off screen and holds
 * still for prefers-reduced-motion.
 */

const MASK_SRC = "/shift/globe/land-mask.png";
const BANGKOK = { lat: 13.75, lon: 100.5 };
const SPIN_PER_SECOND = 0.045;
const TILT = 0.32;

const color = (hex: string) => new THREE.Color(hex);

/** Object-space direction of a lat/lon on three's SphereGeometry. */
function sphereDirection(lat: number, lon: number): THREE.Vector3 {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(
    Math.cos(la) * Math.cos(lo),
    Math.sin(la),
    -Math.cos(la) * Math.sin(lo)
  );
}

/** Y rotation that turns a longitude to face the camera. */
const faceLongitude = (lon: number) =>
  -Math.PI / 2 - THREE.MathUtils.degToRad(lon);

/** Where the planet sits: right of the copy on wide screens, rising from the bottom on phones. */
function useLayout() {
  const { viewport } = useThree();
  const wide = viewport.aspect > 1.05;
  return wide
    ? {
        position: new THREE.Vector3(viewport.width * 0.2, -0.05, 0),
        scale: 1.05,
      }
    : {
        position: new THREE.Vector3(0, -viewport.height * 0.5, 0),
        scale: 1.22,
      };
}

function usePointer() {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return pointer;
}

function Planet({ still, onReady }: { still: boolean; onReady?: () => void }) {
  const mask = useTexture(MASK_SRC);
  // Runs once the mask has loaded, so the placeholder hands over to a lit planet.
  useEffect(() => onReady?.(), [onReady]);
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const pointer = usePointer();
  const layout = useLayout();
  const sun = useMemo(
    () => new THREE.Vector3(-0.85, 0.45, 0.55).normalize(),
    []
  );

  const earthUniforms = useMemo(
    () => ({
      uMask: { value: mask },
      uTime: { value: 0 },
      uRows: { value: 150 },
      uSun: { value: sun },
      uBeacon: { value: sphereDirection(BANGKOK.lat, BANGKOK.lon) },
      uSea: { value: color(COSMOS.sea) },
      uLandDay: { value: color("#e9eeff") },
      uLandNight: { value: color(COSMOS.indigo) },
      uCity: { value: color(COSMOS.sol) },
      uDawn: { value: color(COSMOS.nebula) },
      uBeaconColor: { value: color(COSMOS.sol) },
      uRim: { value: color(COSMOS.aurora) },
    }),
    [mask, sun]
  );
  useFrame((state, delta) => {
    const t = still ? 0 : state.clock.elapsedTime;
    earthUniforms.uTime.value = t;
    if (spin.current)
      spin.current.rotation.y =
        faceLongitude(BANGKOK.lon) + 0.35 + t * SPIN_PER_SECOND;
    if (group.current) {
      const ease = 1 - Math.exp(-delta * 2.5);
      group.current.rotation.x +=
        (TILT + pointer.current.y * 0.08 - group.current.rotation.x) * ease;
      group.current.rotation.z +=
        (-0.12 + pointer.current.x * -0.05 - group.current.rotation.z) * ease;
      group.current.position.lerp(layout.position, ease);
      const s =
        group.current.scale.x + (layout.scale - group.current.scale.x) * ease;
      group.current.scale.setScalar(s);
    }
  });

  return (
    <group
      ref={group}
      position={layout.position}
      scale={layout.scale}
      rotation={[TILT, 0, -0.12]}
    >
      <group ref={spin}>
        <mesh>
          <sphereGeometry args={[1, 128, 128]} />
          <shaderMaterial
            vertexShader={earthVertex}
            fragmentShader={earthFragment}
            uniforms={earthUniforms}
          />
        </mesh>
      </group>
      <Aura sun={sun} still={still} />
      <Orbit still={still} />
      <Satellites still={still} />
    </group>
  );
}

/** -n.z at the planet's limb, seen on the back faces of a shell this big. */
const limbEdge = (scale: number) => Math.sqrt(1 - 1 / (scale * scale));

/**
 * Two glow shells that breathe on slow prime-length cycles: a tight rim and
 * a wide halo that also swells a little, so the planet reads as alive.
 */
function Aura({ sun, still }: { sun: THREE.Vector3; still: boolean }) {
  const halo = useRef<THREE.Mesh>(null);
  const shell = (scale: number, strength: number, power: number) => ({
    uSun: { value: sun },
    uRim: { value: color(COSMOS.aurora) },
    uDawn: { value: color(COSMOS.nebula) },
    uTime: { value: 0 },
    uEdge: { value: limbEdge(scale) },
    uStrength: { value: strength },
    uPower: { value: power },
  });
  const rim = useMemo(() => shell(1.16, 1.5, 2.4), [sun]); // eslint-disable-line react-hooks/exhaustive-deps
  const wide = useMemo(() => shell(1.5, 0.55, 1.6), [sun]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state) => {
    const t = still ? 0 : state.clock.elapsedTime;
    rim.uTime.value = t;
    wide.uTime.value = t + 2.3;
    const scale = 1.5 + 0.05 * Math.sin((t * Math.PI * 2) / 11);
    wide.uEdge.value = limbEdge(scale);
    halo.current?.scale.setScalar(scale);
  });

  const material = (uniforms: typeof rim) => (
    <shaderMaterial
      vertexShader={atmosphereVertex}
      fragmentShader={atmosphereFragment}
      uniforms={uniforms}
      side={THREE.BackSide}
      blending={THREE.AdditiveBlending}
      transparent
      depthWrite={false}
    />
  );

  return (
    <>
      <mesh scale={1.16}>
        <sphereGeometry args={[1, 64, 64]} />
        {material(rim)}
      </mesh>
      <mesh ref={halo} scale={1.5}>
        <sphereGeometry args={[1, 64, 64]} />
        {material(wide)}
      </mesh>
    </>
  );
}

interface SatelliteOrbit {
  radius: number;
  /** Tilt of the orbit plane, radians around x then z. */
  tilt: [number, number];
  /** Radians per second; negative runs the other way. */
  speed: number;
  phase: number;
  light: string;
}

const SATELLITES: SatelliteOrbit[] = [
  {
    radius: 1.32,
    tilt: [1.1, 0.2],
    speed: 0.21,
    phase: 0.4,
    light: COSMOS.aurora,
  },
  {
    radius: 1.46,
    tilt: [-0.5, 0.9],
    speed: -0.15,
    phase: 2.6,
    light: COSMOS.sol,
  },
  {
    radius: 1.78,
    tilt: [0.25, -0.35],
    speed: 0.09,
    phase: 4.1,
    light: COSMOS.nebula,
  },
  {
    radius: 2.05,
    tilt: [0.7, 1.4],
    speed: -0.06,
    phase: 1.2,
    light: COSMOS.aurora,
  },
];

/** One satellite: a body, two solar panels and a blinking light, on a faint orbit line. */
function Satellite({
  orbit,
  still,
}: {
  orbit: SatelliteOrbit;
  still: boolean;
}) {
  const carrier = useRef<THREE.Group>(null);
  const craft = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.MeshBasicMaterial>(null);
  const path = useMemo(() => {
    const points = Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(a) * orbit.radius,
        0,
        Math.sin(a) * orbit.radius
      );
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [orbit.radius]);

  useFrame((state) => {
    const t = still ? 0 : state.clock.elapsedTime;
    if (carrier.current)
      carrier.current.rotation.y = orbit.phase + t * orbit.speed;
    if (craft.current) craft.current.rotation.x = t * 0.4;
    // Short blink every ~2.3s, offset per satellite.
    if (beacon.current)
      beacon.current.opacity = (t + orbit.phase) % 2.3 < 0.18 ? 1 : 0.15;
  });

  return (
    <group rotation={[orbit.tilt[0], 0, orbit.tilt[1]]}>
      <lineLoop geometry={path}>
        <lineBasicMaterial
          color={COSMOS.orbit}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </lineLoop>
      <group ref={carrier}>
        <group ref={craft} position={[orbit.radius, 0, 0]} scale={0.9}>
          <mesh>
            <boxGeometry args={[0.03, 0.03, 0.045]} />
            <meshBasicMaterial color={COSMOS.star} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[0, 0, side * 0.062]}>
              <boxGeometry args={[0.05, 0.003, 0.07]} />
              <meshBasicMaterial color={COSMOS.panel} />
            </mesh>
          ))}
          <mesh position={[0, 0.024, 0]}>
            <sphereGeometry args={[0.009, 8, 8]} />
            <meshBasicMaterial ref={beacon} color={orbit.light} transparent />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Satellites({ still }: { still: boolean }) {
  return (
    <>
      {SATELLITES.map((orbit) => (
        <Satellite key={orbit.radius} orbit={orbit} still={still} />
      ))}
    </>
  );
}

/** A tilted ring of points with a comet running it. */
function Orbit({ still }: { still: boolean }) {
  const { gl } = useThree();
  const geometry = useMemo(() => {
    const count = 260;
    const positions = new Float32Array(count * 3);
    const angles = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      positions.set([Math.cos(a) * 1.62, 0, Math.sin(a) * 1.62], i * 3);
      angles[i] = a;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aAngle", new THREE.BufferAttribute(angles, 1));
    return g;
  }, []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: gl.getPixelRatio() },
      uColor: { value: color(COSMOS.orbit) },
      uHeadColor: { value: color(COSMOS.sol) },
    }),
    [gl]
  );
  useFrame((state) => {
    uniforms.uTime.value = still ? 1.2 : state.clock.elapsedTime;
  });
  return (
    <points geometry={geometry} rotation={[0.42, 0, 0.28]}>
      <shaderMaterial
        vertexShader={orbitVertex}
        fragmentShader={orbitFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Stars({ still }: { still: boolean }) {
  const { gl } = useThree();
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    // Fixed seed so the sky is the same on every visit.
    let s = 7;
    const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const r = 18 + rand() * 30;
      const k = Math.sqrt(1 - u * u);
      positions.set(
        [r * k * Math.cos(theta), r * u, r * k * Math.sin(theta) - 10],
        i * 3
      );
      sizes[i] = 0.6 + Math.pow(rand(), 6) * 3.2;
      seeds[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: gl.getPixelRatio() },
      uColor: { value: color(COSMOS.star) },
    }),
    [gl]
  );
  useFrame((state) => {
    const t = still ? 0 : state.clock.elapsedTime;
    uniforms.uTime.value = t;
    if (points.current) points.current.rotation.y = t * 0.006;
  });
  return (
    <points ref={points} geometry={geometry}>
      <shaderMaterial
        vertexShader={starVertex}
        fragmentShader={starFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** True while the element is on screen, so the render loop can sleep. */
function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting)
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

export function ShiftGlobe({ onReady }: { onReady?: () => void }) {
  const reduced = usePrefersReducedMotion();
  const { ref, visible } = useOnScreen<HTMLDivElement>();

  return (
    <div ref={ref} className="absolute inset-0" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 4.4], fov: 38 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        frameloop={visible && !reduced ? "always" : "demand"}
        fallback={null}
      >
        <Suspense fallback={null}>
          <Stars still={reduced} />
          <Planet still={reduced} onReady={onReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default ShiftGlobe;
