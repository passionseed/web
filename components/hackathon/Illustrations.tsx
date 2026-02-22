import React from 'react';

const strokeColor = "#91C4E3";

export const MentorshipIllustration = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <g stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* --- Back Character (Sitting) --- */}
            {/* Shirt */}
            <path d="M260 280C260 180 320 180 320 280H260Z" />
            {/* Head/Hair */}
            <circle cx="290" cy="160" r="25" />

            {/* --- Foreground Character (Standing/Leaning) --- */}
            {/* Pants */}
            <path d="M120 280L140 180L150 180L135 280H120Z" />
            <path d="M160 280L150 180L160 180L175 280H160Z" />
            {/* Shirt */}
            <path d="M130 190C130 140 160 130 190 150L210 165L200 185L170 160V190Z" />
            <path d="M170 155L240 190C250 195 260 190 265 180L230 165C230 165 240 160 240 155L220 145" />
            {/* Head/Hair */}
            <circle cx="170" cy="100" r="25" />
            {/* Glasses */}
            <circle cx="175" cy="100" r="8" />
            <circle cx="195" cy="100" r="8" />
            <path d="M183 100H187" />
            <path d="M167 100H160" />
            {/* Eyes/Mouth */}
            <path d="M185 110Q190 115 195 110" />

            {/* --- Desk & Laptop --- */}
            <line x1="50" y1="280" x2="350" y2="280" />
            {/* Laptop */}
            <path d="M260 280L280 230H360L340 280Z" />
            {/* Screen Content */}
            <path d="M272 270L288 238H352L336 270Z" />
            <path d="M280 260H340" />
            <path d="M290 250H330" />

            {/* --- Speech Bubbles --- */}
            {/* Left Bubble */}
            <path d="M60 80H140C145.523 80 150 84.4772 150 90V130C150 135.523 145.523 140 140 140H110L90 155V140H60C54.4772 140 50 135.523 50 130V90C50 84.4772 54.4772 80 60 80Z" />
            <rect x="65" y="95" width="25" height="20" rx="3" />
            <path d="M72 100L80 105L72 110V100Z" />
            <line x1="95" y1="100" x2="140" y2="100" />
            <line x1="95" y1="110" x2="125" y2="110" />

            {/* Top Right Bubble */}
            <path d="M230 40H320C325.523 40 330 44.4772 330 50V90C330 95.523 325.523 100 320 100H270L240 115V100H230C224.477 100 220 95.523 220 90V50C220 44.4772 224.477 40 230 40Z" />
            <line x1="235" y1="55" x2="315" y2="55" />
            <line x1="235" y1="70" x2="295" y2="70" />

            {/* Middle Right Bubble */}
            <path d="M290 100H370C375.523 100 380 104.477 380 110V150C380 155.523 375.523 160 370 160H320L300 175V160H290C284.477 160 280 155.523 280 110C280 104.477 284.477 100 290 100Z" />
            <rect x="290" y="115" width="30" height="20" rx="2" />
            <path d="M295 130L300 125L305 130L310 120L315 130" />
            <line x1="330" y1="120" x2="370" y2="120" />
            <line x1="330" y1="130" x2="370" y2="130" />
            <line x1="290" y1="145" x2="370" y2="145" />
        </g>
    </svg>
);

export const GuidelineIllustration = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <g stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Desktop / Workspace */}
            <line x1="60" y1="270" x2="340" y2="270" />

            {/* Character sitting, focused */}
            <path d="M120 270V170H180V270H120Z" />
            <path d="M120 170L150 140V170H120Z" />
            <circle cx="150" cy="130" r="25" />

            {/* Floating "Design Thinking" Windows / Guides */}
            {/* Window 1 */}
            <rect x="180" y="90" width="120" height="80" rx="8" />
            <rect x="190" y="100" width="30" height="30" rx="4" />
            <path d="M198 115L205 122L215 108" />
            <line x1="230" y1="105" x2="290" y2="105" />
            <line x1="230" y1="120" x2="270" y2="120" />
            <line x1="190" y1="145" x2="290" y2="145" />
            <line x1="190" y1="155" x2="270" y2="155" />

            {/* Window 2 (Overlapping) */}
            <rect x="230" y="160" width="100" height="90" rx="8" />
            <rect x="230" y="160" width="100" height="20" rx="6" />
            <circle cx="240" cy="170" r="3" />
            <circle cx="250" cy="170" r="3" />
            <path d="M250 200C250 190 280 190 280 200V220H250V200Z" />
            <circle cx="265" cy="210" r="6" />
            <line x1="245" y1="235" x2="315" y2="235" />

            {/* Steps Path (Arrows connecting the process) */}
            <path d="M165 90L190 60H260L285 100" strokeDasharray="6 6" />
            <path d="M280 90L290 100L275 105" />
        </g>
    </svg>
);

export const TesterIllustration = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <g stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Tester Character */}
            <path d="M120 280C120 200 160 160 200 160C240 160 280 200 280 280H120Z" />
            <circle cx="200" cy="120" r="35" />

            {/* Hand holding device */}
            <path d="M250 240L230 200V180C230 180 240 175 250 180L270 200V240Z" />
            <rect x="240" y="160" width="40" height="70" rx="6" />

            {/* Magnifying Glass */}
            <circle cx="170" cy="180" r="30" />
            <path d="M150 200L130 230" />
            <circle cx="130" cy="230" r="4" />

            {/* Feedback Target Elements */}
            {/* Bubble 1 (Stars) */}
            <path d="M80 80H160C165.5 80 170 84.5 170 90V130C170 135.5 165.5 140 160 140H120L100 155V140H80C74.5 140 70 135.5 70 130V90C70 84.5 74.5 80 80 80Z" />
            <path d="M95 120L100 100L105 120H120L110 130L115 145L100 135L85 145L90 130L80 120H95Z" transform="translate(0, -15) scale(0.6)" />
            <path d="M95 120L100 100L105 120H120L110 130L115 145L100 135L85 145L90 130L80 120H95Z" transform="translate(30, -15) scale(0.6)" />
            <path d="M95 120L100 100L105 120H120L110 130L115 145L100 135L85 145L90 130L80 120H95Z" transform="translate(60, -15) scale(0.6)" />

            {/* Bubble 2 (Checkmark) */}
            <path d="M280 60H350C355.5 60 360 64.5 360 70V100C360 105.5 355.5 110 350 110H310L290 125V110H280C274.5 110 270 105.5 270 100V70C270 64.5 274.5 60 280 60Z" />
            <path d="M285 85L295 95L315 75" />
            <line x1="325" y1="75" x2="350" y2="75" />
            <line x1="325" y1="85" x2="340" y2="85" />

            {/* Heart */}
            <path d="M340 160C340 150 360 140 370 150C380 140 400 150 400 160C400 180 370 200 370 200C370 200 340 180 340 160Z" transform="scale(0.5) translate(360, 160)" />
        </g>
    </svg>
);
