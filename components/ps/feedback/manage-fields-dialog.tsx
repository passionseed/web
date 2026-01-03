"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldManager } from "./field-manager";
import { PSForm, PSFormField } from "@/actions/ps-feedback";
import { useState } from "react";

interface ManageFieldsDialogProps {
  form: PSForm & { ps_form_fields: PSFormField[] };
  projectId: string;
}

export function ManageFieldsDialog({
  form,
  projectId,
}: ManageFieldsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Manage Fields
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Fields: {form.title}</DialogTitle>
        </DialogHeader>
        <FieldManager form={form} projectId={projectId} />
      </DialogContent>
    </Dialog>
  );
}
