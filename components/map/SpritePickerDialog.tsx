"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Sparkles, X } from "lucide-react";

interface SpritePickerDialogProps {
  currentSprite?: string;
  onSpriteSelect: (spriteUrl: string) => void;
  children: React.ReactNode;
}

interface SpriteCategory {
  name: string;
  displayName: string;
  sprites: string[];
}

// Static sprite data - in a real app, this could be fetched from an API
const SPRITE_CATEGORIES: SpriteCategory[] = [
  {
    name: "other",
    displayName: "Other",
    sprites: [
      "/islands/other/bio.png",
      "/islands/crystal.png",
      "/islands/other/cyber.png",
      "/islands/other/deepsea.png",
    ],
  },
  //   {
  //     name: "crystal",
  //     displayName: "Crystal",
  //     sprites: ["/islands/crystal.png"],
  //   },
  {
    name: "desert",
    displayName: "Desert Islands",
    sprites: [
      "/islands/desert.png",
      "/islands/desert/Desert01.png",
      "/islands/desert/Desert02.png",
      "/islands/desert/Desert03.png",
      "/islands/desert/Desert04.png",
    ],
  },
  {
    name: "tundra",
    displayName: "Tundra Islands",
    sprites: [
      "/islands/winter.png",
      "/islands/Tundra/Tundra01.png",
      "/islands/Tundra/Tundra02.png",
      "/islands/Tundra/Tundra03.png",
      "/islands/Tundra/Tundra04.png",
    ],
  },
];

export function SpritePickerDialog({
  currentSprite,
  onSpriteSelect,
  children,
}: SpritePickerDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedSprite, setSelectedSprite] = useState<string>(
    currentSprite || ""
  );
  const [hoveredSprite, setHoveredSprite] = useState<string>("");

  useEffect(() => {
    setSelectedSprite(currentSprite || "");
  }, [currentSprite]);

  const handleSpriteClick = (spriteUrl: string) => {
    setSelectedSprite(spriteUrl);
  };

  const handleConfirmSelection = () => {
    onSpriteSelect(selectedSprite);
    setOpen(false);
  };

  const handleClearSprite = () => {
    setSelectedSprite("");
    onSpriteSelect("");
    setOpen(false);
  };

  const getSpriteDisplayName = (spriteUrl: string) => {
    const filename = spriteUrl.split("/").pop();
    return filename?.replace(/\.(png|jpg|jpeg|gif|webp)$/i, "") || spriteUrl;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Choose Node Sprite
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs
            defaultValue={SPRITE_CATEGORIES[0].name}
            className="h-full flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-3">
              {SPRITE_CATEGORIES.map((category) => (
                <TabsTrigger key={category.name} value={category.name}>
                  {category.displayName}
                </TabsTrigger>
              ))}
            </TabsList>

            {SPRITE_CATEGORIES.map((category) => (
              <TabsContent
                key={category.name}
                value={category.name}
                className="flex-1 mt-4"
              >
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
                    {category.sprites.map((spriteUrl) => {
                      const isSelected = selectedSprite === spriteUrl;
                      const isHovered = hoveredSprite === spriteUrl;
                      const isCurrent = currentSprite === spriteUrl;

                      return (
                        <div
                          key={spriteUrl}
                          className={`
                            relative group cursor-pointer transition-all duration-200
                            ${
                              isSelected
                                ? "ring-2 ring-primary ring-offset-2 scale-105"
                                : ""
                            }
                            ${isHovered ? "scale-102" : ""}
                          `}
                          onClick={() => handleSpriteClick(spriteUrl)}
                          onMouseEnter={() => setHoveredSprite(spriteUrl)}
                          onMouseLeave={() => setHoveredSprite("")}
                        >
                          <div
                            className={`
                              aspect-square rounded-lg border-2 overflow-hidden
                              bg-gradient-to-br from-sky-100 to-blue-100
                              flex items-center justify-center p-2
                              transition-all duration-200
                              ${
                                isSelected
                                  ? "border-primary shadow-lg"
                                  : "border-gray-200 hover:border-gray-300"
                              }
                            `}
                          >
                            <img
                              src={spriteUrl}
                              alt={getSpriteDisplayName(spriteUrl)}
                              className="max-w-full max-h-full object-contain drop-shadow-sm"
                              style={{
                                filter: isSelected
                                  ? "brightness(1.1) saturate(1.2)"
                                  : "",
                              }}
                            />

                            {/* Selection overlay */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                  <ImageIcon className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}

                            {/* Current sprite indicator */}
                            {isCurrent && (
                              <Badge
                                variant="secondary"
                                className="absolute -top-2 -right-2 text-xs px-1 py-0"
                              >
                                Current
                              </Badge>
                            )}
                          </div>

                          {/* Sprite name */}
                          <div className="mt-2 text-center">
                            <p className="text-xs font-medium text-gray-700 truncate">
                              {getSpriteDisplayName(spriteUrl)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {selectedSprite && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSprite}
                className="text-gray-600 hover:text-red-600"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Sprite
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSelection}
              disabled={!selectedSprite}
              className="bg-primary hover:bg-primary/90"
            >
              Use This Sprite
            </Button>
          </div>
        </div>

        {/* Preview section */}
        {selectedSprite && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-sky-100 to-blue-100 rounded-lg flex items-center justify-center p-1">
                  <img
                    src={selectedSprite}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain drop-shadow-sm"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Selected Sprite</p>
                  <p className="text-xs text-muted-foreground">
                    {getSpriteDisplayName(selectedSprite)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
