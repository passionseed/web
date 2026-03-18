"use client";

import React, { useState, useRef, useCallback, memo, useEffect } from "react";
import { Plus, X, GripVertical } from "lucide-react";

interface IkigaiItem {
  id: string;
  text: string;
  x: number;
  y: number;
  category: "love" | "good_at" | "paid_for" | "needs";
}

interface IkigaiDiagramInteractiveProps {
  onDataChange?: (items: IkigaiItem[]) => void;
  initialItems?: IkigaiItem[];
}

const CATEGORIES = {
  love: {
    label: "What you love",
    color: "rgba(34, 197, 94, 0.3)",
    textColor: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  good_at: {
    label: "What you are good at",
    color: "rgba(250, 204, 21, 0.3)",
    textColor: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  paid_for: {
    label: "What you can be paid for",
    color: "rgba(249, 115, 22, 0.3)",
    textColor: "text-orange-400",
    bgColor: "bg-orange-500/20",
  },
  needs: {
    label: "What the world needs",
    color: "rgba(236, 72, 153, 0.3)",
    textColor: "text-pink-400",
    bgColor: "bg-pink-500/20",
  },
};

// Memoized draggable item component
const DraggableItem = memo(
  ({
    item,
    category,
    isDragging,
    onDragStart,
    onDelete,
    onEdit,
    onUpdateText,
    isEditing,
    onCategoryChange,
  }: {
    item: IkigaiItem;
    category: typeof CATEGORIES.love;
    isDragging: boolean;
    onDragStart: (e: React.MouseEvent) => void;
    onDelete: () => void;
    onEdit: () => void;
    onUpdateText: (text: string) => void;
    isEditing: boolean;
    onCategoryChange: (newCategory: keyof typeof CATEGORIES) => void;
  }) => {
    return (
      <div
        className={`absolute cursor-move transition-shadow touch-manipulation ${
          isDragging ? "z-50 shadow-2xl scale-110" : "z-10"
        }`}
        style={{
          left: `${item.x}%`,
          top: `${item.y}%`,
          transform: "translate(-50%, -50%)",
        }}
        onMouseDown={onDragStart}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          onDragStart(touch as any);
        }}
      >
        <div
          className={`group relative flex items-center gap-1.5 px-2.5 py-2 md:px-2.5 md:py-1.5 rounded-lg ${category.bgColor} border border-current backdrop-blur-sm shadow-lg ${category.textColor} min-w-[100px] md:min-w-[100px] max-w-[160px] md:max-w-[180px]`}
        >
          {/* Category color indicator */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <GripVertical className="w-3.5 h-3.5 md:w-3 md:h-3 opacity-50" />
            <select
              value={item.category}
              onChange={(e) => {
                e.stopPropagation();
                onCategoryChange(e.target.value as keyof typeof CATEGORIES);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="w-3.5 h-3.5 md:w-3 md:h-3 rounded-full cursor-pointer border-none bg-current appearance-none touch-manipulation"
              style={{ minWidth: "14px", padding: 0 }}
              title="Change category"
            >
              <option value="love"></option>
              <option value="good_at"></option>
              <option value="paid_for"></option>
              <option value="needs"></option>
            </select>
          </div>

          {isEditing ? (
            <input
              type="text"
              value={item.text}
              onChange={(e) => onUpdateText(e.target.value)}
              onBlur={onEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") onEdit();
              }}
              autoFocus
              placeholder="Type here..."
              className="flex-1 bg-transparent outline-none text-white text-xs placeholder:text-white/40"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="flex-1 text-xs text-white cursor-text truncate"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              {item.text || "Click to edit"}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="opacity-60 md:opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/10 active:bg-white/20 rounded flex-shrink-0 touch-manipulation"
            aria-label="Delete item"
          >
            <X className="w-3.5 h-3.5 md:w-3 md:h-3" />
          </button>
        </div>
      </div>
    );
  }
);

DraggableItem.displayName = "DraggableItem";

export function IkigaiDiagramInteractive({
  onDataChange,
  initialItems = [],
}: IkigaiDiagramInteractiveProps) {
  const [items, setItems] = useState<IkigaiItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Notify parent of changes (outside of render)
  useEffect(() => {
    if (onDataChange) {
      onDataChange(items);
    }
  }, [items, onDataChange]);

  const handleAddItem = useCallback(() => {
    const newItem: IkigaiItem = {
      id: `item-${Date.now()}`,
      text: "",
      x: 50, // Center
      y: 50, // Center
      category: "love", // Default category
    };
    setItems((prev) => [...prev, newItem]);
    setEditingId(newItem.id);
  }, []);

  const handleUpdateText = useCallback((id: string, text: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );
  }, []);

  const handleCategoryChange = useCallback(
    (id: string, category: keyof typeof CATEGORIES) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, category } : item))
      );
    },
    []
  );

  const handleDeleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setDraggingId(id);
  }, []);

  const handleDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingId || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const clampedX = Math.max(5, Math.min(95, x));
      const clampedY = Math.max(5, Math.min(95, y));

      setItems((prev) =>
        prev.map((item) =>
          item.id === draggingId
            ? { ...item, x: clampedX, y: clampedY }
            : item
        )
      );
    },
    [draggingId]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  return (
    <div className="w-full space-y-4 md:space-y-6">
      {/* Interactive Diagram Container - Larger on mobile */}
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl mx-auto aspect-square rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden min-h-[600px] md:min-h-0"
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          handleDrag(touch as any);
        }}
        onTouchEnd={handleDragEnd}
      >
        {/* SVG Background with circles */}
        <svg
          viewBox="0 0 600 600"
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="gradient-love" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(34, 197, 94, 0.35)" />
              <stop offset="100%" stopColor="rgba(34, 197, 94, 0.08)" />
            </radialGradient>
            <radialGradient id="gradient-good" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(250, 204, 21, 0.35)" />
              <stop offset="100%" stopColor="rgba(250, 204, 21, 0.08)" />
            </radialGradient>
            <radialGradient id="gradient-paid" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(249, 115, 22, 0.35)" />
              <stop offset="100%" stopColor="rgba(249, 115, 22, 0.08)" />
            </radialGradient>
            <radialGradient id="gradient-needs" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(236, 72, 153, 0.35)" />
              <stop offset="100%" stopColor="rgba(236, 72, 153, 0.08)" />
            </radialGradient>
          </defs>

          {/* Four circles */}
          <circle
            cx="300"
            cy="180"
            r="140"
            fill="url(#gradient-love)"
            stroke="rgba(34, 197, 94, 0.5)"
            strokeWidth="1.5"
          />
          <circle
            cx="200"
            cy="320"
            r="140"
            fill="url(#gradient-good)"
            stroke="rgba(250, 204, 21, 0.5)"
            strokeWidth="1.5"
          />
          <circle
            cx="300"
            cy="420"
            r="140"
            fill="url(#gradient-paid)"
            stroke="rgba(249, 115, 22, 0.5)"
            strokeWidth="1.5"
          />
          <circle
            cx="400"
            cy="320"
            r="140"
            fill="url(#gradient-needs)"
            stroke="rgba(236, 72, 153, 0.5)"
            strokeWidth="1.5"
          />

          {/* Circle labels */}
          <text
            x="300"
            y="90"
            textAnchor="middle"
            fill="rgba(34, 197, 94, 0.8)"
            fontSize="13"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            What you love
          </text>

          <text
            x="90"
            y="325"
            textAnchor="middle"
            fill="rgba(250, 204, 21, 0.8)"
            fontSize="13"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            What you're good at
          </text>

          <text
            x="300"
            y="520"
            textAnchor="middle"
            fill="rgba(249, 115, 22, 0.8)"
            fontSize="13"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            What you can be paid for
          </text>

          <text
            x="510"
            y="325"
            textAnchor="middle"
            fill="rgba(236, 72, 153, 0.8)"
            fontSize="13"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            What the world needs
          </text>

          {/* Center label */}
          <text
            x="300"
            y="310"
            textAnchor="middle"
            fill="white"
            fontSize="20"
            fontWeight="700"
            className="font-[family-name:var(--font-kodchasan)]"
            opacity="0.9"
          >
            Ikigai
          </text>

          {/* Intersection labels */}
          <text
            x="250"
            y="240"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.5)"
            fontSize="10"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            Passion
          </text>

          <text
            x="350"
            y="240"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.5)"
            fontSize="10"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            Mission
          </text>

          <text
            x="250"
            y="380"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.5)"
            fontSize="10"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            Profession
          </text>

          <text
            x="350"
            y="380"
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.5)"
            fontSize="10"
            fontWeight="600"
            className="font-[family-name:var(--font-bai-jamjuree)]"
          >
            Vocation
          </text>
        </svg>

        {/* Single Add button at top-left - Larger on mobile */}
        <button
          onClick={handleAddItem}
          className="absolute top-3 left-3 md:top-4 md:left-4 z-20 flex items-center gap-2 px-4 py-3 md:px-4 md:py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 text-white text-sm md:text-sm font-medium shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95 touch-manipulation"
        >
          <Plus className="w-5 h-5 md:w-4 md:h-4" />
          <span>Add Item</span>
        </button>

        {/* Draggable items */}
        {items.map((item) => (
          <DraggableItem
            key={item.id}
            item={item}
            category={CATEGORIES[item.category]}
            isDragging={draggingId === item.id}
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDelete={() => handleDeleteItem(item.id)}
            onEdit={() =>
              setEditingId(editingId === item.id ? null : item.id)
            }
            onUpdateText={(text) => handleUpdateText(item.id, text)}
            onCategoryChange={(category) =>
              handleCategoryChange(item.id, category)
            }
            isEditing={editingId === item.id}
          />
        ))}

      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(CATEGORIES).map(([key, category]) => (
          <div
            key={key}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
          >
            <div
              className={`w-3 h-3 rounded-full ${category.bgColor} border border-current ${category.textColor}`}
            />
            <span className="text-xs text-slate-300">{category.label}</span>
          </div>
        ))}
      </div>

      {/* Simplified instructions */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1">
        <p className="text-xs text-slate-300 font-medium">💡 Quick guide:</p>
        <ul className="text-xs text-slate-400 space-y-0.5 list-disc list-inside">
          <li>Click "Add Item" to create new text boxes in the center</li>
          <li>Drag items to position them in the appropriate circles</li>
          <li>Click the colored dot to change category</li>
          <li>Click text to edit, hover to delete</li>
        </ul>
      </div>
    </div>
  );
}
