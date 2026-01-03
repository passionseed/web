"use client";

import {
  PSForm,
  PSFormField,
  addField,
  deleteField,
  updateField,
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
import { useState, useTransition } from "react";
import {
  Trash2,
  GripVertical,
  Plus,
  ChevronUp,
  ChevronDown,
  Settings2,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FieldManagerProps {
  form: PSForm & { ps_form_fields: PSFormField[] };
  projectId: string;
}

export function FieldManager({ form, projectId }: FieldManagerProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  // We can keep local state for expanded capabilities if needed,
  // but relying on server state is simpler for "save on blur" or direct actions.

  const handleAdd = () => {
    if (!newFieldLabel) return;
    startTransition(async () => {
      try {
        await addField(form.id, projectId, newFieldType, newFieldLabel);
        setNewFieldLabel("");
        setNewFieldType("text"); // Reset
        toast({ title: "Field added" });
        router.refresh();
      } catch (e) {
        toast({ title: "Error", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this field?")) return;
    startTransition(async () => {
      try {
        await deleteField(id, projectId);
        toast({ title: "Field deleted" });
        router.refresh();
      } catch (e) {
        toast({ title: "Error", variant: "destructive" });
      }
    });
  };

  const handleUpdate = (id: string, updates: Partial<PSFormField>) => {
    startTransition(async () => {
      try {
        await updateField(id, projectId, updates);
        router.refresh();
      } catch (e) {
        // toast({ title: "Error", variant: "destructive" });
      }
    });
  };

  const handleMove = (id: string, direction: "up" | "down") => {
    startTransition(async () => {
      await moveField(id, projectId, direction);
      router.refresh();
    });
  };

  const handleAddOption = (field: PSFormField, option: string) => {
    if (!option) return;
    const currentOptions = (field.options as string[]) || [];
    handleUpdate(field.id, { options: [...currentOptions, option] });
  };

  const handleRemoveOption = (field: PSFormField, index: number) => {
    const currentOptions = (field.options as string[]) || [];
    const newOptions = [...currentOptions];
    newOptions.splice(index, 1);
    handleUpdate(field.id, { options: newOptions });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {form.ps_form_fields?.map((field, index) => (
          <Card
            key={field.id}
            className="relative group border-l-4 border-l-transparent hover:border-l-primary transition-all"
          >
            <CardContent className="p-4 flex gap-4">
              {/* Drag / Move Controls */}
              <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === 0 || isPending}
                  onClick={() => handleMove(field.id, "up")}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <GripVertical className="w-4 h-4" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={
                    index === (form.ps_form_fields?.length || 0) - 1 ||
                    isPending
                  }
                  onClick={() => handleMove(field.id, "down")}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>

              {/* Main Content */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Question Label
                    </Label>
                    <Input
                      value={field.label}
                      onChange={(e) =>
                        handleUpdate(field.id, { label: e.target.value })
                      }
                      className="font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Type
                    </Label>
                    <Select
                      value={field.field_type}
                      onValueChange={(val: any) =>
                        handleUpdate(field.id, { field_type: val })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Short Text</SelectItem>
                        <SelectItem value="long_text">Long Text</SelectItem>
                        <SelectItem value="rating">Rating (1-5)</SelectItem>
                        <SelectItem value="boolean">Yes/No</SelectItem>
                        <SelectItem value="select">
                          Dropdown / Select
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Options Editor for 'select' type */}
                {field.field_type === "select" && (
                  <div className="bg-muted/30 p-3 rounded-md space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider">
                      Options
                    </Label>
                    <div className="space-y-2">
                      {(field.options as string[])?.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full border border-primary/50" />
                          <span className="text-sm flex-1">{opt}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-red-500"
                            onClick={() => handleRemoveOption(field, i)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      {(field.options as string[])?.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">
                          No options added.
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add option..."
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption(
                              field,
                              (e.target as HTMLInputElement).value
                            );
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8"
                        onClick={(e) => {
                          // This is tricky because we need the input value.
                          // Easier is using onKeyDown or a controlled state for this input just like new field.
                          // For now, let's just use Enter key instruction or simple state if we wanted.
                          // Let's rely on Enter for now to keep code concise, or add a simple ref?
                          // Actually, let's make it intuitive.
                          const input = e.currentTarget
                            .previousElementSibling as HTMLInputElement;
                          handleAddOption(field, input.value);
                          input.value = "";
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={field.is_required}
                      onCheckedChange={(c) =>
                        handleUpdate(field.id, { is_required: c })
                      }
                      id={`req-${field.id}`}
                    />
                    <Label
                      htmlFor={`req-${field.id}`}
                      className="text-xs cursor-pointer"
                    >
                      Required
                    </Label>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8"
                    onClick={() => handleDelete(field.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {form.ps_form_fields?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
            No fields yet. Add one below to get started.
          </div>
        )}
      </div>

      <div className="border-t pt-6">
        <div className="bg-card border rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Add New Field
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_150px_auto] gap-3">
            <Input
              placeholder="Question Label (e.g., How likely are you to recommend us?)"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Select value={newFieldType} onValueChange={setNewFieldType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Short Text</SelectItem>
                <SelectItem value="long_text">Long Text</SelectItem>
                <SelectItem value="rating">Rating (1-5)</SelectItem>
                <SelectItem value="boolean">Yes/No</SelectItem>
                <SelectItem value="select">Dropdown</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={isPending || !newFieldLabel}>
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
