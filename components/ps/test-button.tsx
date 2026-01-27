"use client";

import { FocusButtonDialog } from "./focus-button-dialog";
import { PSTask } from "@/actions/ps";

interface TestButtonProps {
    fixed?: boolean;
    tasks: PSTask[];
}

export function TestButton({ fixed = false, tasks }: TestButtonProps) {
    if (fixed) {
        return (
            <>
                <FocusButtonDialog tasks={tasks}>
                    <button
                        className="group relative w-16 h-16 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                        style={{
                            position: 'fixed',
                            bottom: '1.5rem',
                            right: '1.5rem',
                            zIndex: 9999
                        }}
                    >
                        {/* Animated Doodly Circle */}
                        <div className="absolute inset-0 border-2 border-foreground rounded-[60%_40%_50%_70%/60%_30%_70%_40%] animate-[blob_7s_linear_infinite] group-hover:bg-primary group-hover:border-primary transition-colors duration-300 bg-background shadow-lg"></div>

                        {/* Icon */}
                        <span className="relative z-10 text-2xl group-hover:text-primary-foreground group-hover:rotate-12 transition-all duration-300">
                            ✍️
                        </span>

                        {/* Tooltip on hover */}
                        <span className="absolute -top-10 right-0 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">
                            Start Focus
                        </span>
                    </button>
                </FocusButtonDialog>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes blob {
                    0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                    50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
                    100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                    }
                `}} />
            </>
        );
    }

    return (
        <FocusButtonDialog tasks={tasks}>
            <button className="w-full bg-green-950/30 hover:bg-green-900/50 border-2 border-dashed border-green-800/50 rounded-sm p-4 flex items-center justify-center gap-3 transition-all hover:border-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] cursor-pointer h-[60px] group">
                <span className="text-xl group-hover:scale-110 transition-transform duration-300">✍️</span>
                <span className="font-medium text-green-400/90 group-hover:text-green-200">Start Focus</span>
            </button>
        </FocusButtonDialog>
    );
}
