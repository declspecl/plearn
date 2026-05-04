import React from "react";

export function ArtisanVietnameseLandmark() {
    return (
        <div className="bg-card border-border group relative h-64 w-full overflow-hidden rounded-3xl border shadow-sm">
            {/* Ambient Background Glows */}
            <div className="bg-primary/20 absolute -top-12 -left-12 h-48 w-48 rounded-full opacity-60 blur-[80px] transition-opacity duration-700 group-hover:opacity-100" />
            <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-blue-500/20 opacity-60 blur-[80px] transition-opacity duration-700 group-hover:opacity-100" />

            <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 600 250"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
                    </linearGradient>
                </defs>

                {/* Connective Tissue: Dashed Leader Lines */}
                <path
                    d="M 180 125 C 250 125, 300 70, 380 70"
                    stroke="url(#line-gradient)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    fill="none"
                    className="text-foreground"
                />
                <path
                    d="M 180 125 C 250 125, 300 180, 380 180"
                    stroke="url(#line-gradient)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    fill="none"
                    className="text-foreground"
                />

                {/* Center Node: The English Thought */}
                <g transform="translate(30, 105)">
                    <rect
                        width="150"
                        height="40"
                        rx="8"
                        className="fill-accent stroke-border group-hover:stroke-primary/50 transition-colors duration-500"
                        strokeWidth="1"
                    />
                    <text x="75" y="24" textAnchor="middle" className="fill-foreground font-mono text-[10px] tracking-[0.15em] uppercase">
                        Inner Monologue
                    </text>
                </g>

                {/* Right Nodes: Vietnamese Components */}
                <g transform="translate(380, 50)">
                    <rect width="130" height="40" rx="8" className="fill-background/50 stroke-border backdrop-blur-sm" strokeWidth="1" />
                    <text x="65" y="25" textAnchor="middle" className="fill-foreground font-serif text-sm italic">
                        Từ vựng
                    </text>
                    <text
                        x="65"
                        y="55"
                        textAnchor="middle"
                        className="fill-muted-foreground font-mono text-[9px] tracking-[0.2em] uppercase"
                    >
                        Vocabulary
                    </text>
                </g>

                <g transform="translate(380, 160)">
                    <rect width="130" height="40" rx="8" className="fill-background/50 stroke-border backdrop-blur-sm" strokeWidth="1" />
                    <text x="65" y="25" textAnchor="middle" className="fill-foreground font-serif text-sm italic">
                        Ngữ pháp
                    </text>
                    <text
                        x="65"
                        y="55"
                        textAnchor="middle"
                        className="fill-muted-foreground font-mono text-[9px] tracking-[0.2em] uppercase"
                    >
                        Grammar
                    </text>
                </g>

                {/* Decorative Flourishes */}
                <circle cx="180" cy="125" r="3" className="fill-border group-hover:fill-primary/60 transition-colors duration-500" />
                <circle cx="380" cy="70" r="3" className="fill-border group-hover:fill-primary/60 transition-colors duration-500" />
                <circle cx="380" cy="180" r="3" className="fill-border group-hover:fill-primary/60 transition-colors duration-500" />

                {/* Hand-drawn style highlight under Inner Monologue */}
                <path
                    d="M 40 143 Q 105 149 170 143"
                    className="stroke-primary/40 opacity-0 transition-all duration-700 group-hover:opacity-100"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
}
