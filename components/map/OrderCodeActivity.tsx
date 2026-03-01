"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
    MeasuringStrategy,
    useDroppable,
    CollisionDetection,
    getFirstCollision,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RotateCcw, Copy } from "lucide-react";
import Prism from "prismjs";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";

// --- Types ---
interface OrderCodeActivityProps {
    initialBlocks: string[];
    title?: string | null;
}

type ItemType = "line" | "container";

interface CodeItem {
    id: string;
    content: string;     // e.g. "if (x) {"
    footer?: string;     // e.g. "}" (only for containers)
    type: ItemType;
    children: CodeItem[];
    collapsed?: boolean; // Optional: if we want to collapse containers
}

// Flat representation for dnd-kit lookup
interface FlatItem {
    id: string;
    parentId: string | null; // null = root
    item: CodeItem;
}

// --- Parser & Utils ---

// Detects if a string looks like a block start: e.g. "if (...) {" or "function() {" or just "{" 
// And if it ends with "}"
function parseInitialBlocks(blocks: string[]): CodeItem[] {
    return blocks.map((rawContent, index) => {
        const id = `item-${index}-${Math.random().toString(36).substr(2, 5)}`;
        const trimmed = rawContent.trim();

        // Check for explicit "empty" block pattern like "header { }"
        // Regex for:  <anything> { <whitespace> }
        // We use [\s\S] to match any character including newlines
        const match = rawContent.match(/^([\s\S]*)\{\s*\}\s*$/);

        if (match) {
            // It's a container
            return {
                id,
                content: match[1].trim() + " {",
                footer: "}",
                type: "container",
                children: [],
            };
        }

        // Also check if block explicitly ends with "{"
        // This supports inputs like "if (x) {" without the closing brace in the input string
        if (trimmed.endsWith("{")) {
            return {
                id,
                content: trimmed,
                footer: "}",
                type: "container",
                children: [],
            };
        }

        // Fallback: treat as normal line
        return {
            id,
            content: rawContent,
            type: "line",
            children: [],
        };
    });
}

// Custom collision detection: balanced approach.
// Pointer -> DropZone overrides everything.
const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);

    // If cursor is over a drop zone, use it immediately
    // This allows precise nesting by hovering the container body
    const dropZone = pointerCollisions.find(c => String(c.id).endsWith('-drop-zone'));
    if (dropZone) return [dropZone];

    // If cursor is over other things (like Header or Footer or Root Wrapper), use them
    if (pointerCollisions.length > 0) return pointerCollisions;

    // Fallback to center for better feel if cursor is off-target
    const centerCollisions = closestCenter(args);
    const centerDropZone = centerCollisions.find(c => String(c.id).endsWith('-drop-zone'));
    if (centerDropZone) return [centerDropZone];

    return centerCollisions;
};

// --- Components ---

function SortableItem({
    item,
    depth = 0
}: {
    item: CodeItem;
    depth?: number
}) {
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef, // Rename
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        data: { type: item.type, item }
    });

    // Dedicated drop zone for nesting
    const { setNodeRef: setDroppableRef, isOver: isOverDroppable } = useDroppable({
        id: item.id + '-drop-zone',
        disabled: item.type !== 'container', // Only for containers
        data: { type: 'container-zone', containerId: item.id }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    const highlightedHeader = useMemo(() => {
        const html = Prism.highlight(
            item.content,
            Prism.languages.typescript || Prism.languages.javascript,
            "typescript"
        );
        return sanitizeHtml(html);
    }, [item.content]);

    const highlightedFooter = useMemo(() => {
        if (!item.footer) return "";
        const html = Prism.highlight(
            item.footer,
            Prism.languages.typescript || Prism.languages.javascript,
            "typescript"
        );
        return sanitizeHtml(html);
    }, [item.footer]);

    return (
        <div
            ref={setSortableRef}
            style={style}
            className={cn(
                "relative flex rounded-lg border border-slate-700 bg-slate-900 group mb-2 overflow-hidden",
                isDragging ? "opacity-30 z-50 ring-2 ring-blue-500" : "hover:border-slate-600",
            )}
        >
            {/* Left: Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="flex items-center justify-center p-2 border-r border-slate-800/50 bg-slate-900/50 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-400 hover:bg-white/5"
            >
                <GripVertical className="h-5 w-5" />
            </div>

            {/* Right: Content & Drop Zone */}
            <div
                ref={setDroppableRef}
                className={cn(
                    "flex-1 flex flex-col transition-colors",
                    isOverDroppable ? "bg-blue-500/10 ring-2 ring-inset ring-blue-500/50" : ""
                )}
            >
                {/* Header */}
                <div className={cn(
                    "p-3 font-mono text-sm leading-relaxed text-slate-200 whitespace-pre-wrap",
                    item.type === 'container' ? "border-b border-slate-800/50" : ""
                )}>
                    <span dangerouslySetInnerHTML={{ __html: highlightedHeader }} />
                </div>

                {/* Container Children Area */}
                {item.type === "container" && (
                    <>
                        <div className="bg-black/20 p-2 pl-4 min-h-[60px] flex flex-col">
                            <SortableContext
                                items={item.children.map(c => c.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {item.children.length === 0 && !isDragging && (
                                    <div className="text-xs text-slate-600 italic py-2 px-4 border border-dashed border-slate-800 rounded">
                                        Drag items here
                                    </div>
                                )}
                                {item.children.map((child) => (
                                    <SortableItem key={child.id} item={child} depth={depth + 1} />
                                ))}
                            </SortableContext>
                        </div>

                        {/* Footer */}
                        <div className="bg-black/20 p-2 pl-4 font-mono text-sm text-slate-200 opacity-70 border-t border-slate-800/30 whitespace-pre-wrap">
                            <span dangerouslySetInnerHTML={{ __html: highlightedFooter }} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// --- Main Component ---

export function OrderCodeActivity({
    initialBlocks,
    title,
}: OrderCodeActivityProps) {
    const [items, setItems] = useState<CodeItem[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Initialize blocks only once
    useEffect(() => {
        if (initialBlocks && initialBlocks.length > 0) {
            setItems(parseInitialBlocks(initialBlocks));
        }
    }, [initialBlocks]);

    // Ensure Prism highlights
    useEffect(() => {
        Prism.highlightAll();
    }, [items]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- Helpers for Recursive Tree ---

    // Find item and its parent
    const findItemPath = (
        items: CodeItem[],
        id: string,
        path: { items: CodeItem[], index: number }[] = []
    ): { item: CodeItem; parentItems: CodeItem[]; index: number } | null => {

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.id === id) {
                return { item, parentItems: items, index: i };
            }
            if (item.children.length > 0) {
                const found = findItemPath(item.children, id, [...path, { items, index: i }]);
                if (found) return found;
            }
        }
        return null;
    };

    // Flatten for DragOverlay lookup
    const findItemById = (items: CodeItem[], id: string): CodeItem | null => {
        const data = findItemPath(items, id);
        return data ? data.item : null;
    };

    const handleCopy = () => {
        const generateCode = (items: CodeItem[], level = 0): string => {
            const indent = "    ".repeat(level);
            return items.map(item => {
                if (item.type === 'container') {
                    const childrenCode = generateCode(item.children, level + 1);
                    const inner = childrenCode ? `\n${childrenCode}\n` : '\n';
                    return `${indent}${item.content}${inner}${indent}${item.footer || ''}`;
                }
                return `${indent}${item.content}`;
            }).join('\n');
        };

        const code = generateCode(items);
        navigator.clipboard.writeText(code);
        alert("Code copied to clipboard!");
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find containers involved
        const activeData = findItemPath(items, activeId);
        const overData = findItemPath(items, overId);

        if (!activeData || !overData) return;

        // If over a container and NOT the container itself, dragging INTO it?
        // Actually, dnd-kit sortable handles sorting within lists.
        // Moving between lists (nesting) is the tricky part.

        // If the over item is active's peer, normal sort.
        // If the over item is in a DIFFERENT list (different parent), we need to move.

        // NOTE: Implementing full nested sortable is complex.
        // Simplified strategy: 
        // We only perform the "move" operation on DragEnd to simplify state updates,
        // unless visual feedback requires it. 
        // BUT dnd-kit requires onDragOver for moving between containers to show validity.

        // Let's rely on flattened state only if we use `dnd-kit/sortable/tree` which we don't have.
        // We manually handle the move.

        const activeParentList = activeData.parentItems;
        const overParentList = overData.parentItems;

        if (activeParentList !== overParentList) {
            // Moving items between containers during drag is tricky without flickering.
            // We will defer structural changes to onDragEnd for stability, 
            // OR implement a robust recursive arrayMove.

            // For now, let's just allow sorting and see if basic dnd-kit context handles the "over" detection correctly
            // to permit the drop.
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // NEW: Handle drop specifically on the dropzone in DragEnd
        if (overId.endsWith('-drop-zone')) {
            const containerId = overId.replace('-drop-zone', '');
            setItems(prev => {
                const clone = JSON.parse(JSON.stringify(prev));
                const activeInfo = findItemPath(clone, activeId);
                const containerInfo = findItemPath(clone, containerId);

                if (activeInfo && containerInfo) {
                    // Prevent circular
                    if (findItemPath(activeInfo.item.children, containerId)) return clone;

                    // If already inside
                    if (activeInfo.parentItems === containerInfo.item.children) {
                        // FEATURE: Move to end of list (bottom of container)
                        const [moved] = activeInfo.parentItems.splice(activeInfo.index, 1);
                        containerInfo.item.children.push(moved);
                        return clone;
                    }

                    // Move
                    const [moved] = activeInfo.parentItems.splice(activeInfo.index, 1);
                    containerInfo.item.children.push(moved);
                }
                return clone;
            });
            return;
        }

        // Standard Sorting Logic
        const activeInfo = findItemPath(items, activeId);
        const overInfo = findItemPath(items, overId);

        if (!activeInfo || !overInfo) return;

        // 1. Same List Reorder
        if (activeInfo.parentItems === overInfo.parentItems) {
            if (activeInfo.index !== overInfo.index) {
                setItems((prev) => {
                    const clone = JSON.parse(JSON.stringify(prev));
                    const activeInClone = findItemPath(clone, activeId);
                    const overInClone = findItemPath(clone, overId);

                    if (activeInClone && overInClone && activeInClone.parentItems === overInClone.parentItems) {
                        const list = activeInClone.parentItems;
                        const movedItem = list.splice(activeInClone.index, 1)[0];
                        list.splice(overInClone.index, 0, movedItem);
                    }
                    return clone;
                });
            }
            return;
        }

        // 2. Different List (Move to specific position)
        setItems((prev) => {
            const clone = JSON.parse(JSON.stringify(prev));
            const activeInClone = findItemPath(clone, activeId);
            const overInClone = findItemPath(clone, overId);

            if (activeInClone && overInClone) {
                // Remove from old
                const [movedItem] = activeInClone.parentItems.splice(activeInClone.index, 1);
                // Add to new
                overInClone.parentItems.splice(overInClone.index, 0, movedItem);
            }
            return clone;
        });
    };

    // Custom Drag Over to support "Dropping INTO empty container"
    // Wait, if a container is empty, we can't drop specific OVER an item inside it.
    // We need to drop OVER the container itself.
    // If we drop over a container, we should probably append to its children.
    // But wait, SortableItem for container has a SortableContext. 
    // If children is empty, it renders "Drag items here".
    // dnd-kit doesn't automatically detect dropping "into" the container unless we have a droppable zone there.
    // The SortableContext provides droppable zones for its ITEMS. 
    // If empty, we need a placeholder Droppable?

    // Simpler approach: 
    // We treat the "Container" as having a droppable zone for its children list.
    // But SortableContext expects items.

    // Let's optimize: The "empty" placeholder text should handle the drop?
    // We can't easily implement complex tree drag-and-drop in one shot without a library like @dnd-kit/sortable/tree (custom impl).
    // Given the constraints, let's allow:
    // 1. Reordering at top level.
    // 2. Dropping ONTO a container moves it inside (append).

    const handleDragOverRobust = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Look up in current state
        const activeInfo = findItemPath(items, activeId);
        const overInfo = findItemPath(items, overId);

        if (!activeInfo || !overInfo) return;

        const activeItem = activeInfo.item;
        const overItem = overInfo.item;

        // Scenario: Moving into a container
        // If we are dragging over a Container Item, we might want to move inside it.
        if (overItem.type === 'container' && !activeInfo.parentItems.includes(overItem)) {
            // If we are simply hovering the container "header", we might mean "inside".
            // BUT we also might mean "reorder this container vs me".
            // Ambiguity. 
            // Convention: If hovering the *center* or *bottom* of container?
            // Or strictly: if container is empty, hovering it drops inside.

            if (overItem.children.length === 0) {
                setItems(prev => {
                    const clone = JSON.parse(JSON.stringify(prev));
                    const a = findItemPath(clone, activeId);
                    const o = findItemPath(clone, overId);

                    if (a && o) {
                        const [moved] = a.parentItems.splice(a.index, 1);
                        o.item.children.push(moved);
                    }
                    return clone;
                });
            }
        }

        // Moving between lists is handled by SortableContext usually...
        // But we need to update state so the "ghost" placeholder appears in the new list.
        if (activeInfo.parentItems !== overInfo.parentItems) {
            setItems(prev => {
                const clone = JSON.parse(JSON.stringify(prev));
                const a = findItemPath(clone, activeId);
                const o = findItemPath(clone, overId);

                if (a && o) {
                    const [moved] = a.parentItems.splice(a.index, 1);
                    o.parentItems.splice(o.index, 0, moved);
                }
                return clone;
            });
        }
    };

    const handleReset = () => {
        if (initialBlocks && initialBlocks.length > 0) {
            setItems(parseInitialBlocks(initialBlocks));
        }
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        🧩 Code Sandbox
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Arrange the blocks. You can nest logic inside blocks with braces.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                        title="Copy code order"
                    >
                        <Copy className="w-4 h-4" />
                        Copy
                    </button>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                        title="Reset to original order"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={customCollisionDetection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOverRobust}
                onDragEnd={handleDragEnd}
                measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            >
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                    <SortableContext
                        items={items.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {items.length === 0 && (
                            <div className="text-slate-500 text-center py-8">No code blocks available.</div>
                        )}
                        {items.map((item) => (
                            <SortableItem key={item.id} item={item} />
                        ))}
                    </SortableContext>
                </div>

                <DragOverlay dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                        styles: { active: { opacity: '0.5' } },
                    }),
                }}>
                    {activeId ? (
                        <div className="opacity-90 rotate-2 cursor-grabbing pointer-events-none">
                            {/* Simplified Overlay */}
                            <div className="rounded-lg border border-blue-500 bg-slate-800 p-3 text-white shadow-xl flex items-center gap-3">
                                <GripVertical className="h-5 w-5 text-slate-400" />
                                <span className="font-mono text-sm">{findItemById(items, activeId)?.content || "Moving..."}</span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
