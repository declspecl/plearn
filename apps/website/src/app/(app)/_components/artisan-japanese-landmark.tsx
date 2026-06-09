import React from "react";

export function ArtisanJapaneseLandmark() {
    return (
        <div className="bg-card border-border group relative h-64 w-full overflow-hidden rounded-3xl border shadow-sm">
            {/* Ambient Background Glows */}
            <div className="bg-primary/20 absolute -top-12 -left-12 h-48 w-48 rounded-full opacity-60 blur-[80px] transition-opacity duration-700 group-hover:opacity-100" />
            <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-rose-500/15 opacity-60 blur-[80px] transition-opacity duration-700 group-hover:opacity-100" />

            <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 600 250"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    <linearGradient id="jp-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
                    </linearGradient>
                </defs>

                <g transform="translate(45, 18.75) scale(0.85)">
                    {/* Background Enso (Zen Circle) Motif */}
                    <path
                        d="M 300 55 C 345 55, 380 90, 380 125 C 380 160, 340 195, 300 195 C 255 195, 220 160, 220 125 C 220 90, 255 55, 292 56"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeDasharray="3 4"
                        className="text-foreground"
                        opacity="0.08"
                        fill="none"
                    />

                    {/* Faint Background Character */}
                    <text x="300" y="145" textAnchor="middle" className="fill-foreground font-serif text-[60px]" opacity="0.03">
                        の
                    </text>

                    {/* Connective Tissue: Dashed Leader Lines */}
                    <path
                        d="M 180 125 C 250 125, 300 40, 380 40"
                        stroke="url(#jp-line-gradient)"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        fill="none"
                        className="text-foreground"
                    />
                    <path
                        d="M 180 125 H 380"
                        stroke="url(#jp-line-gradient)"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        fill="none"
                        className="text-foreground"
                    />
                    <path
                        d="M 180 125 C 250 125, 300 210, 380 210"
                        stroke="url(#jp-line-gradient)"
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
                        <text x="75" y="24" textAnchor="middle" className="fill-foreground font-mono text-[11px]">
                            Inner Monologue
                        </text>
                    </g>

                    {/* Right Nodes: Japanese Components */}
                    <g transform="translate(380, 20)">
                        <rect
                            width="140"
                            height="40"
                            rx="8"
                            className="fill-background/50 stroke-border backdrop-blur-sm"
                            strokeWidth="1"
                        />
                        <text x="70" y="25" textAnchor="middle" className="fill-foreground font-serif text-sm italic">
                            漢字 & 読み
                        </text>
                        <text x="70" y="55" textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
                            Kanji & Furigana
                        </text>
                    </g>

                    <g transform="translate(380, 105)">
                        <rect
                            width="140"
                            height="40"
                            rx="8"
                            className="fill-background/50 stroke-border backdrop-blur-sm"
                            strokeWidth="1"
                        />
                        <text x="70" y="25" textAnchor="middle" className="fill-foreground font-serif text-sm italic">
                            助詞
                        </text>
                        <text x="70" y="55" textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
                            Particles & Grammar
                        </text>
                    </g>

                    <g transform="translate(380, 190)">
                        <rect
                            width="140"
                            height="40"
                            rx="8"
                            className="fill-background/50 stroke-border backdrop-blur-sm"
                            strokeWidth="1"
                        />
                        <text x="70" y="25" textAnchor="middle" className="fill-foreground font-serif text-sm italic">
                            語彙
                        </text>
                        <text x="70" y="55" textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
                            Vocabulary
                        </text>
                    </g>

                    {/* Interactive Node Flow Badges */}
                    <g transform="translate(265, 72)">
                        <circle
                            cx="10"
                            cy="10"
                            r="10"
                            className="fill-card stroke-border transition-colors duration-500 group-hover:stroke-rose-500/20"
                            strokeWidth="1"
                        />
                        <text x="10" y="13.5" textAnchor="middle" className="fill-muted-foreground font-serif text-[9px]">
                            字
                        </text>
                    </g>

                    <g transform="translate(265, 115)">
                        <circle
                            cx="10"
                            cy="10"
                            r="10"
                            className="fill-card stroke-border transition-colors duration-500 group-hover:stroke-rose-500/20"
                            strokeWidth="1"
                        />
                        <text x="10" y="14" textAnchor="middle" className="fill-muted-foreground font-serif text-[10px]">
                            は
                        </text>
                    </g>

                    <g transform="translate(265, 158)">
                        <circle
                            cx="10"
                            cy="10"
                            r="10"
                            className="fill-card stroke-border transition-colors duration-500 group-hover:stroke-rose-500/20"
                            strokeWidth="1"
                        />
                        <text x="10" y="13.5" textAnchor="middle" className="fill-muted-foreground font-serif text-[9px]">
                            語
                        </text>
                    </g>

                    {/* Decorative Dots */}
                    <circle cx="180" cy="125" r="3" className="fill-border group-hover:fill-primary/60 transition-colors duration-500" />
                    <circle cx="380" cy="40" r="3" className="fill-border group-hover:fill-primary/60 transition-colors duration-500" />
                    <circle cx="380" cy="125" r="3" className="fill-border group-hover:fill-primary/60 transition-colors duration-500" />
                    <circle cx="380" cy="210" r="3" className="fill-border group-hover:fill-primary/60 transition-colors duration-500" />

                    {/* Hand-drawn style highlight under Inner Monologue */}
                    <path
                        d="M 40 143 Q 105 149 170 143"
                        className="stroke-rose-500/30 opacity-0 transition-all duration-700 group-hover:opacity-100"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                    />
                </g>
            </svg>
        </div>
    );
}
