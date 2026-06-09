import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import React from "react";

interface AnalysisBannerProps {
    /** Destination for the "Start analysis" CTA, e.g. `/tools/japanese/analyze`. */
    readonly href: string;
    /** One-line description of what analysis does for this language. */
    readonly blurb: string;
}

export function AnalysisBanner({ href, blurb }: AnalysisBannerProps) {
    return (
        <div className="group border-border bg-card hover:border-primary/30 relative flex min-h-[280px] w-full flex-col justify-end overflow-hidden rounded-[2.5rem] border shadow-sm transition-all duration-500 hover:shadow-md">
            {/* Ambient Background Glows */}
            <div className="bg-primary/10 absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-50 blur-[100px] transition-opacity duration-700 group-hover:opacity-100" />
            <div className="absolute right-12 -bottom-32 h-96 w-96 rounded-full bg-amber-500/10 opacity-50 blur-[100px] transition-opacity duration-700 group-hover:opacity-100" />

            {/* SVG Drafting Canvas */}
            <svg
                className="absolute inset-0 h-full w-full opacity-60 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <pattern id="drafting-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path
                            d="M 40 0 L 0 0 0 40"
                            fill="none"
                            stroke="currentColor"
                            strokeOpacity="0.05"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#drafting-grid)" />

                {/* Stylized Parsing Marks */}
                <g
                    className="text-primary/20 group-hover:text-primary/40 transition-all duration-700"
                    style={{ transform: "translate(10%, 30%)" }}
                >
                    <text x="0" y="0" fontFamily="serif" fontSize="120" opacity="0.3">
                        {`{`}
                    </text>
                </g>
                <g
                    className="text-foreground/10 group-hover:text-foreground/20 transition-all duration-700"
                    style={{ transform: "translate(40%, 60%)" }}
                >
                    <text x="0" y="0" fontFamily="mono" fontSize="80" opacity="0.2">
                        {`[`}
                    </text>
                </g>
                <g
                    className="text-amber-500/20 transition-all duration-700 group-hover:text-amber-500/40"
                    style={{ transform: "translate(80%, 20%)" }}
                >
                    <text x="0" y="0" fontFamily="serif" fontSize="140" opacity="0.2">
                        {`}`}
                    </text>
                </g>

                {/* Abstract Data Streams / Syntax Trees */}
                <path
                    d="M -100 150 C 100 150, 300 200, 500 100 S 800 250, 1200 150"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.1"
                    strokeWidth="1.5"
                    className="group-hover:stroke-primary/30 transition-all duration-1000"
                />
                <path
                    d="M -100 160 C 100 160, 300 210, 500 110 S 800 260, 1200 160"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.05"
                    strokeWidth="1"
                    strokeDasharray="4 8"
                />
            </svg>

            {/* Content Payload */}
            <div className="relative z-10 flex flex-col gap-6 p-10 md:flex-row md:items-end md:justify-between md:p-12">
                <div className="max-w-2xl space-y-3">
                    <h2 className="text-foreground text-4xl leading-none font-[var(--font-display)] tracking-[-0.03em] md:text-5xl">
                        Sentence analysis
                    </h2>
                    <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">{blurb}</p>
                </div>

                <Link
                    href={href}
                    className="group/btn bg-foreground text-background flex h-14 shrink-0 items-center justify-between gap-6 rounded-2xl px-6 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    <span className="font-medium">Start analysis</span>
                    <div className="bg-background/20 flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-300 group-hover/btn:translate-x-1">
                        <ArrowRight className="size-4" weight="bold" />
                    </div>
                </Link>
            </div>
        </div>
    );
}
