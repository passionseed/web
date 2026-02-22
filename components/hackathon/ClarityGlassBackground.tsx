"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function FractalGlassBackground() {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: false,
            powerPreference: "high-performance"
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            uniform vec2 uResolution;
            uniform float uDistortionStrength;
            uniform float uStripeDensity;
            uniform float uNoiseIntensity;
            uniform float uAnimationSpeed;

            varying vec2 vUv;

            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }

            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }

            float fbm(vec2 st) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 2.0;
                for (int i = 0; i < 4; i++) {
                    value += amplitude * noise(st * frequency);
                    amplitude *= 0.5;
                    frequency *= 2.0;
                }
                return value;
            }

            vec3 gradientColor(float t) {
                vec3 color1 = vec3(0.004, 0.008, 0.016); // Very dark ocean #010210
                vec3 color2 = vec3(0.012, 0.031, 0.054); // Darker blue
                vec3 color3 = vec3(0.051, 0.078, 0.122); // Muted deep blue
                vec3 color4 = vec3(0.176, 0.298, 0.443); // Dimmed cyan
                vec3 color5 = vec3(0.239, 0.322, 0.412); // Darker bioluminescent
                vec3 color6 = vec3(0.294, 0.235, 0.337); // Dimmed purple

                float step1 = 0.2;
                float step2 = 0.4;
                float step3 = 0.6;
                float step4 = 0.8;

                if (t < step1) {
                    return mix(color1, color2, t / step1);
                } else if (t < step2) {
                    return mix(color2, color3, (t - step1) / (step2 - step1));
                } else if (t < step3) {
                    return mix(color3, color4, (t - step2) / (step3 - step2));
                } else if (t < step4) {
                    return mix(color4, color5, (t - step3) / (step4 - step3));
                } else {
                    return mix(color5, color6, (t - step4) / (1.0 - step4));
                }
            }

            void main() {
                vec2 uv = vUv;
                vec2 st = uv * uResolution / min(uResolution.x, uResolution.y);

                float time = uTime * uAnimationSpeed;

                // More chaotic wave motion with multiple frequencies
                float waveY = sin(uv.y * uStripeDensity + time * 1.2) * uDistortionStrength;
                float waveY2 = sin(uv.y * uStripeDensity * 0.7 - time * 0.9) * uDistortionStrength * 0.7;
                float waveY3 = sin(uv.y * uStripeDensity * 1.3 + time * 1.5) * uDistortionStrength * 0.4;
                float waveX = cos(uv.x * uStripeDensity * 0.6 + time * 0.8) * uDistortionStrength * 0.6;

                // Chaotic fractal noise with multiple layers
                vec2 noiseUv1 = st * 3.2 + vec2(time * 0.2, -time * 0.1);
                vec2 noiseUv2 = st * 1.8 + vec2(-time * 0.15, time * 0.12);
                float fractalNoise = fbm(noiseUv1) * uNoiseIntensity * 1.5;
                float fractalNoise2 = fbm(noiseUv2) * uNoiseIntensity * 0.8;

                // Combined chaotic distortion
                float distortion = waveY + waveY2 + waveY3 + waveX + fractalNoise + fractalNoise2;

                // More chaotic slice refraction
                float sliceIndex = floor(uv.y * uStripeDensity * 0.7);
                float sliceOffset = sin(sliceIndex * 1.3 + time * 0.7) * 0.06;
                float sliceOffsetX = cos(sliceIndex * 0.9 - time * 0.5) * 0.04;

                // Apply chaotic distortion to UV
                vec2 distortedUv = vec2(
                    uv.x + distortion + sliceOffsetX,
                    uv.y + sliceOffset + distortion * 0.3
                );

                // Chaotic gradient position
                float gradientPos = distortedUv.y * 0.6 + distortedUv.x * 0.4 - time * 0.12;
                gradientPos += sin(distortedUv.x * 5.0 + time) * 0.1;
                gradientPos = fract(gradientPos);

                // Get gradient color
                vec3 color = gradientColor(gradientPos);

                // Reduced and darker wave bands
                float bandPattern = abs(sin(uv.y * uStripeDensity * 0.4 + time * 0.7));
                vec3 glowColor = vec3(0.08, 0.15, 0.25) * bandPattern * 0.15;
                color += glowColor;

                // Subtle darker pulses
                float pulse = sin(time * 2.5 + uv.y * 4.0 + uv.x * 2.0) * 0.5 + 0.5;
                color += vec3(0.05, 0.08, 0.12) * pulse * 0.08;

                // Reduced edge highlights
                float edgeGlow = smoothstep(0.98, 1.0, abs(sin(uv.y * uStripeDensity * 0.6 + time * 0.6)));
                color += vec3(0.1, 0.2, 0.3) * edgeGlow * 0.2;

                // Random glitch-like flickers
                float glitch = step(0.98, random(vec2(floor(time * 3.0), floor(uv.y * 20.0))));
                color += vec3(0.05, 0.1, 0.15) * glitch * 0.3;

                // Darken overall more
                color *= 0.65;

                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const uniforms = {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uDistortionStrength: { value: 0.28 },
            uStripeDensity: { value: 12.0 },
            uNoiseIntensity: { value: 0.15 },
            uAnimationSpeed: { value: 0.35 }
        };

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        meshRef.current = mesh;

        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            if (mesh.material instanceof THREE.ShaderMaterial) {
                mesh.material.uniforms.uResolution.value.set(width, height);
            }
        };

        const animate = () => {
            rafRef.current = requestAnimationFrame(animate);

            if (mesh.material instanceof THREE.ShaderMaterial) {
                mesh.material.uniforms.uTime.value += 0.016;
            }

            renderer.render(scene, camera);
        };

        window.addEventListener("resize", handleResize);
        animate();

        return () => {
            window.removeEventListener("resize", handleResize);

            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }

            if (meshRef.current) {
                meshRef.current.geometry.dispose();
                if (meshRef.current.material instanceof THREE.ShaderMaterial) {
                    meshRef.current.material.dispose();
                }
            }

            if (rendererRef.current) {
                rendererRef.current.dispose();
                if (containerRef.current && rendererRef.current.domElement.parentNode === containerRef.current) {
                    containerRef.current.removeChild(rendererRef.current.domElement);
                }
            }

            sceneRef.current = null;
            cameraRef.current = null;
            rendererRef.current = null;
            meshRef.current = null;
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
}
