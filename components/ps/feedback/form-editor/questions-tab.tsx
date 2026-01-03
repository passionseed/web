"use client";

import { PSForm, PSFormField, addField } from "@/actions/ps-feedback";
import { useState, useTransition } from "react";
import { FieldCard } from "./field-card";
import { Button } from "@/components/ui/button";
import { Plus, Type, Image as ImageIcon, Video, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card"; // Fallback/Top header info

interface QuestionsTabProps {
  form: PSForm & { ps_form_fields: PSFormField[] };
  projectId: string;
}

export function QuestionsTab({ form, projectId }: QuestionsTabProps) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const handleAdd = () => {
    startTransition(async () => {
      try {
        await addField(form.id, projectId, "text", "Question"); // Default to text
        // Ideally we scroll to bottom and activate the new field
        // New field won't have ID until refresh.
        // RevalidatePath refreshes data.
        // We could optimistically predict ID? No.
        toast({ title: "New question added" });
        // We'll trust the refresh to show it.
        // Could setActiveFieldId to the last one after effect?
      } catch (e) {
        toast({ title: "Error", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex gap-4 relative items-start">
      {/* Main List */}
      <div className="flex-1 space-y-4">
        {/* Form Title Card (Editable later) */}
        <div className="bg-card rounded-lg border-t-8 border-t-primary p-6 shadow-sm border-x border-b">
          <h1 className="text-3xl font-medium mb-2">{form.title}</h1>
          <p className="text-muted-foreground">
            {form.description || "Form Description"}
          </p>
        </div>

        {form.ps_form_fields?.map((field) => (
          <FieldCard
            key={field.id}
            field={field}
            projectId={projectId}
            isActive={activeFieldId === field.id}
            onActivate={() => setActiveFieldId(field.id)}
          />
        ))}

        {form.ps_form_fields?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            Empty form. Add a question to start.
          </div>
        )}
      </div>

      {/* Floating Toolbox */}
      <div className="sticky top-24 bg-card shadow-md rounded-lg p-2 flex flex-col gap-2 border">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAdd}
          title="Add Question"
        >
          <Plus className="w-5 h-5" />
        </Button>
        {/* Placeholders for future features */}
        <Button variant="ghost" size="icon" disabled title="Import">
          <FileText className="w-5 h-5 text-muted-foreground/50" />
        </Button>
        <Button variant="ghost" size="icon" disabled title="Add Title">
          <Type className="w-5 h-5 text-muted-foreground/50" />
        </Button>
      </div>
    </div>
  );
}
