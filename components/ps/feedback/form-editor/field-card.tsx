"use client";

import {
  PSFormField,
  updateField,
  deleteField,
  duplicateField,
  moveField,
} from "@/actions/ps-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trash2,
  Copy,
  MoreVertical,
  GripHorizontal,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useTransition, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface FieldCardProps {
  field: PSFormField;
  projectId: string;
  isActive: boolean;
  onActivate: () => void;
}

export function FieldCard({
  field,
  projectId,
  isActive,
  onActivate,
}: FieldCardProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  // Local state for immediate feedback on inputs, syncing with prop when it changes
  // Actually, safer to rely on optimiztic or just controlled by prop + transition?
  // Let's use controlled by prop for simplicity, might feel slighly lagging on slow networks but standard for server actions.
  // For "Google Forms" feel, we want instant updates. Local state + debounce is best.
  // For MVP: Direct update.

  const [localLabel, setLocalLabel] = useState(field.label);
  const [localType, setLocalType] = useState(field.field_type);

  // Sync local state when prop changes (e.g. after server update)
  useEffect(() => {
    setLocalLabel(field.label);
    setLocalType(field.field_type);
  }, [field.label, field.field_type]);

  const handleUpdate = (updates: Partial<PSFormField>) => {
    startTransition(async () => {
      await updateField(field.id, projectId, updates);
    });
  };

  const commitLabel = () => {
    if (localLabel !== field.label) {
      handleUpdate({ label: localLabel });
    }
  };

  const handleMove = (direction: "up" | "down") => {
    startTransition(async () => {
      await moveField(field.id, projectId, direction);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteField(field.id, projectId);
      toast({ title: "Deleted" });
    });
  };

  const handleDuplicate = () => {
    startTransition(async () => {
      await duplicateField(field.id, projectId);
      toast({ title: "Duplicated" });
    });
  };

  // Options logic
  const handleAddOption = () => {
    const currentOptions = (field.options as string[]) || [];
    handleUpdate({
      options: [...currentOptions, `Option ${currentOptions.length + 1}`],
    });
  };

  const handleOptionChange = (index: number, val: string) => {
    const currentOptions = (field.options as string[]) || [];
    const newOptions = [...currentOptions];
    newOptions[index] = val;
    handleUpdate({ options: newOptions });
  };

  const handleRemoveOption = (index: number) => {
    const currentOptions = (field.options as string[]) || [];
    const newOptions = currentOptions.filter((_, i) => i !== index);
    handleUpdate({ options: newOptions });
  };

  // Scroll into view when activated?
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isActive]);

  if (!isActive) {
    // Preview View
    return (
      <div
        ref={cardRef}
        onClick={onActivate}
        className="bg-card border hover:border-l-4 hover:border-l-primary p-6 rounded-lg shadow-sm cursor-pointer transition-all group"
      >
        <div className="pointer-events-none">
          <p className="font-medium text-base mb-2">
            {field.label}{" "}
            {field.is_required && <span className="text-red-500">*</span>}
          </p>
          {field.field_type === "text" && (
            <Input
              disabled
              placeholder="Short answer text"
              className="border-b border-t-0 border-x-0 rounded-none px-0"
            />
          )}
          {field.field_type === "long_text" && (
            <Input
              disabled
              placeholder="Long answer text"
              className="border-b border-t-0 border-x-0 rounded-none px-0"
            />
          )}
          {field.field_type === "select" && (
            <div className="space-y-1">
              {(field.options as string[])?.map((opt, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-muted-foreground text-sm"
                >
                  <div className="w-3 h-3 rounded-full border" /> {opt}
                </div>
              ))}
            </div>
          )}
          {field.field_type === "rating" && (
            <div className="flex gap-2 text-muted-foreground text-sm">
              {[1, 2, 3, 4, 5].map((v) => (
                <div
                  key={v}
                  className="w-8 h-8 rounded-full border flex items-center justify-center"
                >
                  {v}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Edit View
  return (
    <div
      ref={cardRef}
      className="bg-card border-l-4 border-l-blue-600 rounded-lg shadow-lg scale-[1.01] transition-all"
    >
      <div className="p-6 space-y-4">
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <Input
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => e.key === "Enter" && commitLabel()}
              className="bg-muted/50 border-input text-lg py-6 transition-colors focus:bg-background"
              placeholder="Question"
            />
          </div>
          <div className="w-[200px]">
            <Select
              value={localType}
              onValueChange={(v: any) => {
                setLocalType(v);
                handleUpdate({ field_type: v });
              }}
            >
              <SelectTrigger className="h-12 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Short Answer</SelectItem>
                <SelectItem value="long_text">Paragraph</SelectItem>
                <SelectItem value="select">Multiple Choice</SelectItem>
                <SelectItem value="checkbox">
                  Checkboxes (Coming Soon)
                </SelectItem>
                <SelectItem value="rating">Linear Scale</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Type Specific Editor */}
        <div className="pt-2">
          {localType === "select" && (
            <div className="space-y-2">
              {(field.options as string[])?.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <div className="w-4 h-4 rounded-full border border-gray-400" />
                  <Input
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    className="border-none hover:border-b hover:border-gray-200 focus:border-b-2 focus:border-blue-500 rounded-none px-0 h-8 shadow-none bg-transparent"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(i)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2">
                <div className="w-4 h-4 rounded-full border border-gray-300" />
                <button
                  onClick={handleAddOption}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Add option
                </button>
              </div>
            </div>
          )}

          {(localType === "text" || localType === "long_text") && (
            <p className="text-sm text-muted-foreground border-b border-dotted pb-2 w-1/2">
              {localType === "text" ? "Short answer text" : "Long answer text"}
            </p>
          )}
        </div>
      </div>

      <div className="border-t p-4 flex justify-end items-center gap-4 bg-muted/30 rounded-b-lg">
        <div className="flex items-center gap-1 border-r pr-4 border-border/50 mr-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleMove("up")}
            title="Move Up"
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleMove("down")}
            title="Move Down"
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDuplicate}
          title="Duplicate"
        >
          <Copy className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          title="Delete"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
        <div className="h-6 w-px bg-border mx-2" />
        <div className="flex items-center gap-2">
          <Label className="text-sm">Required</Label>
          <Switch
            checked={field.is_required}
            onCheckedChange={(c) => handleUpdate({ is_required: c })}
          />
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
