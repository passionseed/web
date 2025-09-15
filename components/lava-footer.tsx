"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
// import { Facebook, Instagram, Github } from "lucide-react";
import {
  SiDiscord,
  SiGithub,
  SiInstagram,
  SiFacebook,
} from "@icons-pack/react-simple-icons";

export function LavaFooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = 100;

    const lavaParticles: {
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      originalY: number;
    }[] = [];

    // Create lava particles
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = canvas.height - Math.random() * 20;
      const radius = 3 + Math.random() * 5;
      const vx = -0.5 + Math.random();
      const vy = -0.5 + Math.random() * 0.5;
      lavaParticles.push({
        x,
        y,
        radius,
        vx,
        vy,
        originalY: y,
      });
    }

    function drawLava() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create gradient for lava
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "#b91c1c"); // red-700
      gradient.addColorStop(0.5, "#ef4444"); // red-500
      gradient.addColorStop(1, "#b91c1c"); // red-700

      // Draw base lava
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);

      // Create wavy top
      for (let i = 0; i <= canvas.width; i += 20) {
        const y =
          canvas.height - 20 + Math.sin(i * 0.01 + Date.now() * 0.001) * 5;
        ctx.lineTo(i, y);
      }

      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Draw lava particles
      lavaParticles.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off walls
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -1;
        }

        // Gravity effect
        const distFromOriginal = particle.originalY - particle.y;
        particle.vy += 0.01;

        // Keep particles in the lava
        if (particle.y > particle.originalY) {
          particle.y = particle.originalY;
          particle.vy = -Math.abs(particle.vy) * 0.3;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#fbbf24"; // amber-400
        ctx.fill();
      });

      requestAnimationFrame(drawLava);
    }

    drawLava();

    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <footer className="w-full bg-purple-950 text-white">
      <canvas
        ref={canvasRef}
        className="w-full h-[100px]"
        aria-hidden="true"
      ></canvas>
      <div className="container px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Passion Seed</h3>
            <p className="text-sm text-white/80">
              Discover your passion, ignite your potential, and grow with a
              supportive community.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:underline">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/workshops" className="hover:underline">
                  Workshops
                </Link>
              </li>
              <li>
                <Link href="/communities" className="hover:underline">
                  Communities
                </Link>
              </li>
              <li>
                <Link href="/me" className="hover:underline">
                  My Journey
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="hover:underline">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:underline">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:underline">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Connect</h3>
            <div className="flex space-x-4">
              <Link href="#" className="hover:text-red-400">
                <SiFacebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              {/* <Link href="#" className="hover:text-red-400">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link> */}
              <Link
                href="https://www.instagram.com/passion_seed.th/"
                className="hover:text-red-400"
              >
                <SiInstagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link href="#" className="hover:text-red-400">
                <SiGithub className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
            </div>
            <p className="text-sm text-white/80">
              Subscribe to our newsletter for updates.
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-white/20 pt-8 text-center text-sm text-white/60">
          <p>
            © {new Date().getFullYear()} Passion Seed. All rights reserved v2.
          </p>
        </div>
      </div>w
    </footer>
  );
}
