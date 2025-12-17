"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { SeedSettingsModal } from "./SeedSettingsModal";
import { useRouter } from "next/navigation";

interface SeedSettingsButtonProps {
    seed: any;
}

export function SeedSettingsButton({ seed }: SeedSettingsButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    return (
        <>
            <Button
                variant="outline"
                onClick={() => setIsOpen(true)}
                className="bg-neutral-900/80 backdrop-blur-md border-white/20 hover:bg-neutral-800 text-white hover:text-white gap-2 shadow-lg"
            >
                <Settings className="w-4 h-4" />
                Settings
            </Button>

            <SeedSettingsModal
                seed={seed}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onUpdate={() => router.refresh()}
            />
        </>
    );
}
