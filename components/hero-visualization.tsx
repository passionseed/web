"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GalaxyNode {
  id: string;
  name: string;
  faculty: string | null;
  universityId: string | null;
  universityName: string | null;
  x: number;
  y: number;
  color: string;
}

interface GalaxyHub {
  id: string;
  name: string;
  x: number;
  y: number;
  programCount: number;
  color: string;
}

interface GalaxyData {
  nodes: GalaxyNode[];
  hubs: GalaxyHub[];
  stats: {
    totalPrograms: number;
    totalUniversities: number;
    displayedPrograms: number;
    displayedUniversities: number;
  };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
  subContent?: string;
}

// Fallback data for when API fails
function generateFallbackData(): GalaxyData {
  const universities = [
    { id: "cu", name: "จุฬาลงกรณ์มหาวิทยาลัย", color: "#E5007D" },
    { id: "mu", name: "มหาวิทยาลัยมหิดล", color: "#0066CC" },
    { id: "tu", name: "มหาวิทยาลัยธรรมศาสตร์", color: "#FFD700" },
    { id: "ku", name: "มหาวิทยาลัยเกษตรศาสตร์", color: "#228B22" },
    { id: "cmu", name: "มหาวิทยาลัยเชียงใหม่", color: "#800080" },
    { id: "kku", name: "มหาวิทยาลัยขอนแก่น", color: "#FF6600" },
    { id: "psu", name: "มหาวิทยาลัยสงขลานครินทร์", color: "#008B8B" },
    { id: "kmitl", name: "สถาบันเทคโนโลยีพระจอมเกล้าคุณทหารลาดกระบัง", color: "#C41E3A" },
  ];

  const programs = [
    { name: "วิศวกรรมคอมพิวเตอร์", faculty: "วิศวกรรมศาสตร์", color: "#ff6b4a" },
    { name: "แพทยศาสตร์", faculty: "แพทยศาสตร์", color: "#fb7185" },
    { name: "บริหารธุรกิจ", faculty: "บริหารธุรกิจ", color: "#facc15" },
    { name: "วิทยาการคอมพิวเตอร์", faculty: "วิทยาศาสตร์", color: "#38bdf8" },
    { name: "นิติศาสตร์", faculty: "นิติศาสตร์", color: "#f97316" },
    { name: "สถาปัตยกรรม", faculty: "สถาปัตยกรรมศาสตร์", color: "#06b6d4" },
    { name: "เภสัชศาสตร์", faculty: "เภสัชศาสตร์", color: "#a78bfa" },
    { name: "ศิลปกรรม", faculty: "ศิลปกรรมศาสตร์", color: "#ec4899" },
    { name: "พยาบาลศาสตร์", faculty: "พยาบาลศาสตร์", color: "#f472b6" },
    { name: "ครุศาสตร์", faculty: "ครุศาสตร์", color: "#10b981" },
  ];

  const nodes: GalaxyNode[] = [];
  const hubs: GalaxyHub[] = [];

  // Create hubs
  universities.forEach((uni, i) => {
    const angle = (i / universities.length) * Math.PI * 2;
    const radius = 0.3;
    hubs.push({
      id: uni.id,
      name: uni.name,
      x: 0.5 + Math.cos(angle) * radius,
      y: 0.45 + Math.sin(angle) * radius * 0.6,
      programCount: 5 + Math.floor(Math.random() * 10),
      color: uni.color,
    });
  });

  // Create nodes around hubs
  let nodeId = 0;
  hubs.forEach((hub) => {
    const numPrograms = 5 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numPrograms; i++) {
      const prog = programs[Math.floor(Math.random() * programs.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.05 + Math.random() * 0.12;
      nodes.push({
        id: `node-${nodeId++}`,
        name: prog.name,
        faculty: prog.faculty,
        universityId: hub.id,
        universityName: hub.name,
        x: hub.x + Math.cos(angle) * dist,
        y: hub.y + Math.sin(angle) * dist * 0.8,
        color: prog.color,
      });
    }
  });

  return {
    nodes,
    hubs,
    stats: {
      totalPrograms: nodes.length,
      totalUniversities: universities.length,
      displayedPrograms: nodes.length,
      displayedUniversities: universities.length,
    },
  };
}

export function HeroVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<GalaxyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: "",
  });
  const [hoveredNode, setHoveredNode] = useState<GalaxyNode | null>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const nodesRef = useRef<GalaxyNode[]>([]);
  const hubsRef = useRef<GalaxyHub[]>([]);

  // Fetch data or use fallback
  useEffect(() => {
    fetch("/api/hero-galaxy")
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((data) => {
        if (data.nodes && data.nodes.length > 0) {
          setData(data);
          nodesRef.current = data.nodes;
          hubsRef.current = data.hubs;
        } else {
          // Use fallback if no data
          const fallback = generateFallbackData();
          setData(fallback);
          nodesRef.current = fallback.nodes;
          hubsRef.current = fallback.hubs;
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Using fallback galaxy data:", err.message);
        const fallback = generateFallbackData();
        setData(fallback);
        nodesRef.current = fallback.nodes;
        hubsRef.current = fallback.hubs;
        setLoading(false);
      });
  }, []);

  // Initialize particles
  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    const colors = ["#ff6b4a", "#fbbf24", "#38bdf8", "#fb7185", "#ffffff"];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.6 - 0.3,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1 + Math.random() * 2,
      });
    }
    return particles;
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !data) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    // Initialize particles
    particlesRef.current = initParticles(canvas.width, canvas.height);
    let startTime = Date.now();

    const animate = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const elapsed = (Date.now() - startTime) / 1000;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      const nodes = nodesRef.current;
      const hubs = hubsRef.current;

      // Draw connection lines (subtle)
      ctx.globalAlpha = 0.06;
      nodes.forEach((node) => {
        const hub = hubs.find((h) => h.id === node.universityId);
        if (hub) {
          ctx.beginPath();
          ctx.moveTo(node.x * width, node.y * height);
          ctx.lineTo(hub.x * width, hub.y * height);
          ctx.strokeStyle = hub.color;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });

      // Draw program nodes
      ctx.globalAlpha = 0.6;
      nodes.forEach((node) => {
        const x = node.x * width;
        const y = node.y * height;
        const isHovered = hoveredNode?.id === node.id;
        const baseSize = 2.5;
        const size = isHovered ? baseSize * 2 : baseSize;

        // Glow effect
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
        gradient.addColorStop(0, node.color);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw university hubs (larger, pulsing)
      ctx.globalAlpha = 0.85;
      hubs.forEach((hub) => {
        const x = hub.x * width;
        const y = hub.y * height;
        const pulse = Math.sin(elapsed * 2 + hub.x * 10) * 0.25 + 1;
        const baseSize = 5 + Math.sqrt(hub.programCount) * 1.5;
        const size = baseSize * pulse;

        // Outer glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
        gradient.addColorStop(0, hub.color);
        gradient.addColorStop(0.4, hub.color + "60");
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = hub.color;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw and update particles
      ctx.globalAlpha = 1;
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life++;

        if (particle.life > particle.maxLife || particle.y < 0) {
          particle.x = Math.random() * width;
          particle.y = height + 10;
          particle.vy = -Math.random() * 0.6 - 0.3;
          particle.life = 0;
          particle.maxLife = 100 + Math.random() * 100;
        }

        const alpha = 1 - particle.life / particle.maxLife;
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", updateSize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [data, hoveredNode, initParticles]);

  // Mouse interaction
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    let closestNode: GalaxyNode | null = null;
    let closestDist = 25;

    data.nodes.forEach((node) => {
      const nx = node.x * width;
      const ny = node.y * height;
      const dist = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        closestNode = node;
      }
    });

    if (closestNode) {
      setHoveredNode(closestNode);
      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        content: closestNode.name || "Unknown Program",
        subContent: closestNode.universityName || undefined,
      });
    } else {
      setHoveredNode(null);
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  }, [data]);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip.visible && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: tooltip.x + 15,
              top: tooltip.y - 10,
            }}
          >
            <div className="bg-black/90 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg shadow-lg border border-white/10 max-w-xs">
              <div className="font-medium truncate">{tooltip.content}</div>
              {tooltip.subContent && (
                <div className="text-xs text-gray-400 mt-0.5 truncate">
                  {tooltip.subContent}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats overlay */}
      {data && (
        <div className="absolute bottom-4 left-4 flex gap-4 text-xs text-amber-200/40">
          <span>{data.stats.displayedPrograms.toLocaleString()} programs</span>
          <span>{data.stats.displayedUniversities} universities</span>
        </div>
      )}
    </div>
  );
}