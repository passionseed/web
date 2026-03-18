"use client";

import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface IkigaiDiagramProps {
  onDataChange?: (data: {
    what_you_love: string;
    what_you_are_good_at: string;
    what_you_can_be_paid_for: string;
    what_the_world_needs: string;
  }) => void;
  initialData?: {
    what_you_love?: string;
    what_you_are_good_at?: string;
    what_you_can_be_paid_for?: string;
    what_the_world_needs?: string;
  };
}

export function IkigaiDiagram({ onDataChange, initialData }: IkigaiDiagramProps) {
  const [ikigaiData, setIkigaiData] = useState({
    what_you_love: initialData?.what_you_love || "",
    what_you_are_good_at: initialData?.what_you_are_good_at || "",
    what_you_can_be_paid_for: initialData?.what_you_can_be_paid_for || "",
    what_the_world_needs: initialData?.what_the_world_needs || "",
  });

  const handleChange = (field: string, value: string) => {
    const newData = { ...ikigaiData, [field]: value };
    setIkigaiData(newData);
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Visual Diagram */}
      <div className="relative w-full max-w-3xl mx-auto aspect-square">
        <svg
          viewBox="0 0 600 600"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Define gradients */}
          <defs>
            <radialGradient id="gradient-love" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(34, 197, 94, 0.4)" />
              <stop offset="100%" stopColor="rgba(34, 197, 94, 0.1)" />
            </radialGradient>
            <radialGradient id="gradient-good" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(250, 204, 21, 0.4)" />
              <stop offset="100%" stopColor="rgba(250, 204, 21, 0.1)" />
            </radialGradient>
            <radialGradient id="gradient-paid" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(249, 115, 22, 0.4)" />
              <stop offset="100%" stopColor="rgba(249, 115, 22, 0.1)" />
            </radialGradient>
            <radialGradient id="gradient-needs" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(236, 72, 153, 0.4)" />
              <stop offset="100%" stopColor="rgba(236, 72, 153, 0.1)" />
            </radialGradient>
          </defs>

          {/* Four circles - positioned to overlap in center */}
          {/* Top - What you love (Green) */}
          <circle
            cx="300"
            cy="180"
            r="140"
            fill="url(#gradient-love)"
            stroke="rgba(34, 197, 94, 0.6)"
            strokeWidth="2"
            className="transition-all duration-300"
          />

          {/* Left - What you are good at (Yellow) */}
          <circle
            cx="200"
            cy="320"
            r="140"
            fill="url(#gradient-good)"
            stroke="rgba(250, 204, 21, 0.6)"
            strokeWidth="2"
            className="transition-all duration-300"
          />

          {/* Bottom - What you can be paid for (Orange) */}
          <circle
            cx="300"
            cy="420"
            r="140"
            fill="url(#gradient-paid)"
            stroke="rgba(249, 115, 22, 0.6)"
            strokeWidth="2"
            className="transition-all duration-300"
          />

          {/* Right - What the world needs (Pink) */}
          <circle
            cx="400"
            cy="320"
            r="140"
            fill="url(#gradient-needs)"
            stroke="rgba(236, 72, 153, 0.6)"
            strokeWidth="2"
            className="transition-all duration-300"
          />

          {/* Labels */}
          <text
            x="300"
            y="100"
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            What you love
          </text>

          <text
            x="80"
            y="320"
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            What you are
          </text>
          <text
            x="80"
            y="340"
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            good at
          </text>

          <text
            x="300"
            y="560"
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            What you can be paid for
          </text>

          <text
            x="520"
            y="320"
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            What the world
          </text>
          <text
            x="520"
            y="340"
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            needs
          </text>

          {/* Center label */}
          <text
            x="300"
            y="305"
            textAnchor="middle"
            fill="white"
            fontSize="24"
            fontWeight="700"
            className="font-[family-name:var(--font-kodchasan)]"
          >
            Ikigai
          </text>

          {/* Intersection labels */}
          <text
            x="250"
            y="235"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.7)"
            fontSize="12"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            Passion
          </text>

          <text
            x="350"
            y="235"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.7)"
            fontSize="12"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            Mission
          </text>

          <text
            x="250"
            y="385"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.7)"
            fontSize="12"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            Profession
          </text>

          <text
            x="350"
            y="385"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.7)"
            fontSize="12"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            Vocation
          </text>
        </svg>
      </div>

      {/* Input fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label
            htmlFor="what_you_love"
            className="text-sm font-semibold text-green-400 flex items-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            What you love
          </Label>
          <Textarea
            id="what_you_love"
            name="what_you_love"
            value={ikigaiData.what_you_love}
            onChange={(e) => handleChange("what_you_love", e.target.value)}
            placeholder="Activities, subjects, or things you're passionate about..."
            rows={3}
            className="ei-input resize-none py-3"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="what_you_are_good_at"
            className="text-sm font-semibold text-yellow-400 flex items-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            What you are good at
          </Label>
          <Textarea
            id="what_you_are_good_at"
            name="what_you_are_good_at"
            value={ikigaiData.what_you_are_good_at}
            onChange={(e) =>
              handleChange("what_you_are_good_at", e.target.value)
            }
            placeholder="Your skills, talents, and strengths..."
            rows={3}
            className="ei-input resize-none py-3"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="what_you_can_be_paid_for"
            className="text-sm font-semibold text-orange-400 flex items-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            What you can be paid for
          </Label>
          <Textarea
            id="what_you_can_be_paid_for"
            name="what_you_can_be_paid_for"
            value={ikigaiData.what_you_can_be_paid_for}
            onChange={(e) =>
              handleChange("what_you_can_be_paid_for", e.target.value)
            }
            placeholder="Skills or services people would pay for..."
            rows={3}
            className="ei-input resize-none py-3"
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="what_the_world_needs"
            className="text-sm font-semibold text-pink-400 flex items-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-pink-500"></span>
            What the world needs
          </Label>
          <Textarea
            id="what_the_world_needs"
            name="what_the_world_needs"
            value={ikigaiData.what_the_world_needs}
            onChange={(e) =>
              handleChange("what_the_world_needs", e.target.value)
            }
            placeholder="Problems you want to solve or needs you want to address..."
            rows={3}
            className="ei-input resize-none py-3"
          />
        </div>
      </div>
    </div>
  );
}
