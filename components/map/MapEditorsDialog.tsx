"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  getMapEditors,
  addMapEditorByEmail,
  removeMapEditor,
  MapEditor,
} from "@/lib/supabase/map-editors";
import { Loader2, Plus, Trash2, User, Mail } from "lucide-react";
import { Label } from "@/components/ui/label";

interface MapEditorsDialogProps {
  mapId: string;
  mapTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MapEditorsDialog({
  mapId,
  mapTitle,
  open,
  onOpenChange,
}: MapEditorsDialogProps) {
  const { toast } = useToast();
  const [editors, setEditors] = useState<MapEditor[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Load editors when dialog opens
  useEffect(() => {
    if (open) {
      loadEditors();
    }
  }, [open, mapId]);

  const loadEditors = async () => {
    try {
      setLoading(true);
      const data = await getMapEditors(mapId);
      setEditors(data);
    } catch (error) {
      console.error("Error loading editors:", error);
      toast({
        title: "Error",
        description: "Failed to load editors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEditor = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setAdding(true);
      const result = await addMapEditorByEmail(mapId, email);

      if (result.success) {
        toast({
          title: "Editor added",
          description: result.message,
        });
        setEmail("");
        await loadEditors();
      } else {
        toast({
          title: "Failed to add editor",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding editor:", error);
      toast({
        title: "Error",
        description: "Failed to add editor",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveEditor = async (userId: string) => {
    try {
      setRemovingId(userId);
      const result = await removeMapEditor(mapId, userId);

      if (result.success) {
        toast({
          title: "Editor removed",
          description: result.message,
        });
        await loadEditors();
      } else {
        toast({
          title: "Failed to remove editor",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing editor:", error);
      toast({
        title: "Error",
        description: "Failed to remove editor",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !adding) {
      handleAddEditor();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Manage Editors</DialogTitle>
          <DialogDescription>
            Grant edit access to &quot;{mapTitle}&quot; by adding users via their email
            address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Add Editor Section */}
          <div className="space-y-2">
            <Label htmlFor="email">Add Editor by Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={adding}
                className="flex-1"
              />
              <Button
                onClick={handleAddEditor}
                disabled={adding || !email.trim()}
                size="sm"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span className="ml-2">Add</span>
              </Button>
            </div>
          </div>

          {/* Editors List */}
          <div className="space-y-2">
            <Label>Current Editors ({editors.length})</Label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : editors.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No editors yet. Add someone using their email above.
              </div>
            ) : (
              <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                {editors.map((editor) => (
                  <div
                    key={editor.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {editor.profiles?.full_name ||
                            editor.profiles?.username ||
                            "Unknown User"}
                        </div>
                        {editor.profiles?.email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {editor.profiles.email}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Added{" "}
                          {new Date(editor.granted_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEditor(editor.user_id)}
                      disabled={removingId === editor.user_id}
                      className="ml-2 flex-shrink-0"
                    >
                      {removingId === editor.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
