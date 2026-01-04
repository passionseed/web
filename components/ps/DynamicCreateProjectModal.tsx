"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const DynamicCreateProjectModal = dynamic(
    () =>
        import("@/components/ps/CreateProjectModal").then(
            (mod) => mod.CreateProjectModal
        ),
    {
        ssr: false,
        loading: () => (
            <Button>
                <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
        ),
    }
);
