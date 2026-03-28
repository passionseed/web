"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { SimUser } from "./types";

type Props = {
  value: string | null;
  onChange: (userId: string | null) => void;
  options: SimUser[];
  placeholder?: string;
};

export function PreferenceCombobox({
  value,
  onChange,
  options,
  placeholder = "Choose user...",
}: Props) {
  const [open, setOpen] = useState(false);
  const selectedUser = options.find((u) => u.id === value) ?? null;

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-[#111] border-[#444] text-sm h-8 px-2 font-normal text-left"
          >
            <span
              className={cn(
                "truncate",
                !selectedUser && "text-muted-foreground"
              )}
            >
              {selectedUser ? selectedUser.name : placeholder}
            </span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-0 bg-[#1a1a1a] border-[#333]"
          align="start"
        >
          <Command className="bg-transparent">
            <CommandInput placeholder="Search..." className="h-8 text-sm" />
            <CommandEmpty className="py-2 text-center text-sm text-muted-foreground">
              No users found.
            </CommandEmpty>
            <CommandGroup>
              {options.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.name}
                  onSelect={() => {
                    onChange(user.id === value ? null : user.id);
                    setOpen(false);
                  }}
                  className="text-sm cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3",
                      value === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {user.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <button
          onClick={() => onChange(null)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Clear"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
