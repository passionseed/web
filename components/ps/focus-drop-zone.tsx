"use client";

import { useDroppable } from "@dnd-kit/core";
import { Hand } from "lucide-react";

interface FocusDropZoneProps {
    isDragging: boolean;
    themeColor?: any;
}

export function FocusDropZone({ isDragging, themeColor }: FocusDropZoneProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: "focus-drop-zone",
    });

    // if (!isDragging) return null; // Removed to make always visible

    const accentColor = themeColor?.labelStyle?.borderColor || '#3b82f6';

    return (
        <div
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${isDragging ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 hover:opacity-100 hover:translate-y-0'}`}
        >
            <div
                ref={setNodeRef}
                className={`
                flex flex-col items-center justify-center p-6 rounded-full border-2 shadow-2xl backdrop-blur-md pointer-events-auto
                transition-all duration-300 ease-out
                ${isOver ? 'scale-125 bg-background/80 border-primary' : 'scale-100 bg-background/40'}
            `}
                style={{
                    borderColor: isOver ? accentColor : 'currentColor',
                    color: isOver ? accentColor : 'inherit'
                }}
            >
                <Hand className={`w-10 h-10 ${isOver ? 'animate-pulse' : ''}`} strokeWidth={1.5} />
                <span className={`text-xs font-medium mt-2 transition-opacity ${isOver ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                    Drop to Focus
                </span>
            </div>
        </div>
    );
}
