"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shuffle, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoverImageMakerProps {
  onImageCreated: (file: File) => void;
  disabled?: boolean;
}

// Curated emoji list organized by categories
const EMOJI_CATEGORIES = {
  Faces: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳"],
  Animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐢", "🐙", "🦀", "🐡", "🐠"],
  Food: ["🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🍆", "🥔", "🥕", "🌽", "🥒", "🥬", "🥦", "🍄", "🥜", "🌰", "🍞", "🥐", "🥖", "🧀"],
  Objects: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🥅", "⛳", "🎯", "🏹", "🎣", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂"],
  Symbols: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "⭐", "🌟", "✨", "💫", "🔥", "💥", "💯", "✅", "🎯", "🏆", "🎖️", "🎨"],
  Nature: ["🌸", "🌺", "🌻", "🌷", "🌹", "🥀", "🌼", "🌵", "🎄", "🌲", "🌳", "🌴", "🌱", "🌿", "☘️", "🍀", "🎍", "🎋", "🍃", "🍂", "🍁", "🌾", "🌞", "🌝", "🌛", "🌜", "⭐", "🌟", "✨", "💫"],
};

// Gradient presets with vibrant colors
const GRADIENT_PRESETS = [
  // Vibrant
  { type: "linear", colors: ["#FF6B6B", "#4ECDC4", "#45B7D1"], name: "Sunset Beach" },
  { type: "linear", colors: ["#A8EDEA", "#FED6E3", "#FFB88C"], name: "Cotton Candy" },
  { type: "radial", colors: ["#F093FB", "#F5576C", "#4FACFE"], name: "Neon Dreams" },
  { type: "linear", colors: ["#FA8BFF", "#2BD2FF", "#2BFF88"], name: "Electric" },
  { type: "radial", colors: ["#FF9A8B", "#FF6A88", "#FF99AC"], name: "Peach Fuzz" },
  // Pastel
  { type: "linear", colors: ["#E0C3FC", "#8EC5FC", "#B8E6F6"], name: "Pastel Sky" },
  { type: "linear", colors: ["#FBD3E9", "#BB377D", "#F8B88B"], name: "Pink Lemonade" },
  { type: "radial", colors: ["#FFA8A8", "#FCFF8E", "#8EFFC8"], name: "Soft Rainbow" },
  // Bold
  { type: "linear", colors: ["#667EEA", "#764BA2", "#F093FB"], name: "Purple Haze" },
  { type: "radial", colors: ["#FF0844", "#FFB199", "#FFC837"], name: "Fire" },
  { type: "linear", colors: ["#11998E", "#38EF7D", "#7DE3FF"], name: "Ocean Breeze" },
  { type: "linear", colors: ["#FF5E7E", "#FF99B1", "#FDDE7C"], name: "Sunrise" },
  // Dark
  { type: "radial", colors: ["#134E5E", "#71B280", "#A8E6CF"], name: "Deep Forest" },
  { type: "linear", colors: ["#360033", "#0B8793", "#4ECDC4"], name: "Galaxy" },
  { type: "linear", colors: ["#232526", "#414345", "#667EEA"], name: "Midnight" },
];

const generateMeshGradient = (preset: typeof GRADIENT_PRESETS[0]): string => {
  if (preset.type === "radial") {
    return `radial-gradient(circle at 30% 20%, ${preset.colors[0]} 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, ${preset.colors[1]} 0%, transparent 50%),
            radial-gradient(circle at 40% 70%, ${preset.colors[2] || preset.colors[0]} 0%, transparent 50%),
            linear-gradient(135deg, ${preset.colors[0]} 0%, ${preset.colors[1]} 100%)`;
  }

  return `linear-gradient(135deg, ${preset.colors.join(", ")})`;
};

export function CoverImageMaker({ onImageCreated, disabled = false }: CoverImageMakerProps) {
  const [selectedEmoji, setSelectedEmoji] = useState("🎨");
  const [currentGradient, setCurrentGradient] = useState(GRADIENT_PRESETS[0]);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [emojiSize, setEmojiSize] = useState(120);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const randomizeGradient = () => {
    const randomIndex = Math.floor(Math.random() * GRADIENT_PRESETS.length);
    setCurrentGradient(GRADIENT_PRESETS[randomIndex]);
  };

  const filteredEmojis = Object.entries(EMOJI_CATEGORIES).reduce(
    (acc, [category, emojis]) => {
      const filtered = emojis.filter((emoji) =>
        category.toLowerCase().includes(emojiSearch.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, string[]>
  );

  const generateImage = async (): Promise<File> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Canvas not available");

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");

    // Set canvas size (square for cover images)
    const size = 1200;
    const width = size;
    const height = size;
    canvas.width = width;
    canvas.height = height;

    // Create gradient background
    let gradient;
    if (currentGradient.type === "radial") {
      // Create multiple radial gradients for mesh effect
      gradient = ctx.createRadialGradient(width * 0.3, height * 0.2, 0, width * 0.3, height * 0.2, width * 0.7);
      gradient.addColorStop(0, currentGradient.colors[0]);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      gradient = ctx.createRadialGradient(width * 0.8, height * 0.8, 0, width * 0.8, height * 0.8, width * 0.6);
      gradient.addColorStop(0, currentGradient.colors[1]);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Base gradient
      gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, currentGradient.colors[0]);
      gradient.addColorStop(1, currentGradient.colors[1]);
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
    } else {
      gradient = ctx.createLinearGradient(0, 0, width, height);
      currentGradient.colors.forEach((color, index) => {
        gradient.addColorStop(index / (currentGradient.colors.length - 1), color);
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Add emoji in center
    const fontSize = emojiSize * 3; // Scale up for canvas
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Add subtle shadow for depth
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;

    ctx.fillText(selectedEmoji, width / 2, height / 2);

    // Convert canvas to blob and then to file
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create image blob"));
            return;
          }
          const file = new File([blob], `cover-${Date.now()}.png`, {
            type: "image/png",
          });
          resolve(file);
        },
        "image/png",
        1.0
      );
    });
  };

  const handleCreateImage = async () => {
    try {
      const file = await generateImage();
      onImageCreated(file);
    } catch (error) {
      console.error("Failed to create image:", error);
    }
  };

  // Initialize with random gradient
  useEffect(() => {
    randomizeGradient();
  }, []);

  return (
    <div className="space-y-3">
      {/* Compact Preview */}
      <div className="relative">
        <div
          ref={previewRef}
          className="w-full max-w-xs mx-auto aspect-square rounded-lg overflow-hidden shadow-md"
          style={{
            background: generateMeshGradient(currentGradient),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: `${emojiSize}px`,
              textShadow: "0 10px 20px rgba(0, 0, 0, 0.2)",
            }}
          >
            {selectedEmoji}
          </div>
        </div>
        <div className="absolute top-2 right-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={randomizeGradient}
            disabled={disabled}
            className="bg-white/90 hover:bg-white backdrop-blur-sm h-8 px-2"
          >
            <Shuffle className="h-3 w-3 mr-1" />
            <span className="text-xs">Randomize</span>
          </Button>
        </div>
        <div className="absolute bottom-2 left-2">
          <div className="bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-medium text-gray-700">
            {currentGradient.name}
          </div>
        </div>
      </div>

      {/* Compact Controls */}
      <div className="grid grid-cols-2 gap-3">
        {/* Emoji Size Slider */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">
            Size: {emojiSize}px
          </label>
          <input
            type="range"
            min="60"
            max="200"
            value={emojiSize}
            onChange={(e) => setEmojiSize(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Action Button */}
        <div className="flex items-end">
          <Button
            onClick={handleCreateImage}
            disabled={disabled}
            className="w-full h-8"
            size="sm"
          >
            <Download className="h-3 w-3 mr-1" />
            <span className="text-xs">Use Cover</span>
          </Button>
        </div>
      </div>

      {/* Compact Emoji Picker */}
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Search emojis..."
          value={emojiSearch}
          onChange={(e) => setEmojiSearch(e.target.value)}
          disabled={disabled}
          className="h-8 text-sm"
        />

        <div className="max-h-40 overflow-y-auto border rounded-lg p-2 bg-gray-50">
          {Object.entries(filteredEmojis).map(([category, emojis]) => (
            <div key={category} className="mb-2 last:mb-0">
              <div className="text-[10px] font-semibold text-gray-500 mb-1">
                {category}
              </div>
              <div className="grid grid-cols-10 gap-1">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    disabled={disabled}
                    className={cn(
                      "text-lg p-1 rounded hover:bg-white transition-colors",
                      selectedEmoji === emoji && "bg-blue-100 ring-1 ring-blue-500"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
