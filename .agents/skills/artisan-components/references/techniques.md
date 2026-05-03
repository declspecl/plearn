# Artisan Techniques — Recipes

Concrete, copy-adaptable recipes for the techniques listed in `SKILL.md`. Each recipe explains _why it works_ so you can bend it, not just paste it.

## 1. Hand-drawn Bezier underlines (squiggle under a stat)

Why it works: straight lines under numbers look like form-field underlines. A quadratic Bezier with one control point above-and-offset reads as a deliberate pen mark.

```tsx
<svg viewBox="0 0 200 12" className="h-3 w-full">
    <path d="M 4 8 Q 50 2, 100 7 T 196 6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
</svg>
```

The `T` command continues a smooth Bezier using the mirror of the previous control point — this is what gives multi-bump squiggles their "one motion of the hand" feel. Tune the `Q` control y-offset (2 vs 7) to change wobble depth.

Seen in: `carekitsprojects/apps/website/src/app/_components/artisan/stat-callout.tsx`

## 2. Cubic Bezier narrative curve (escalating chart, journey line)

Why it works: cubic (`C`) gives you two control points, which means you can shape acceleration. Perfect for "started small, grew over time" visuals that flat line charts can't express emotionally.

```tsx
<path d="M 10 90 C 40 85, 60 70, 90 50 S 150 10, 190 8" fill="none" stroke="url(#curveGradient)" strokeWidth={2.5} />
```

Pair with a `<linearGradient>` stroke so the line itself tells a color story (start cold → end warm, for instance).

Seen in: `remindy/apps/website/src/app/(marketing)/_sections/reminder-rhythm.tsx`

## 3. Depth through opacity tiers, not color

Why it works: using the _same_ color at 0.2 / 0.5 / 0.8 keeps the palette tight and reads as "same illustration, different planes." Using three different colors reads as "chart with categories."

```tsx
<g stroke="#1A2744">
    <line opacity={0.2} x1="..." /> {/* background grid */}
    <line opacity={0.5} x1="..." /> {/* mid structure */}
    <line opacity={0.85} x1="..." /> {/* foreground marks */}
</g>
```

Rule of thumb: three opacity tiers is plenty. Four starts to mud.

## 4. Dashed connectors (leader lines, flow arrows)

Why it works: dashes imply "this is a conceptual link, not a physical edge." Great for exploded diagrams, org-chart-style flows, before/after arrows.

```tsx
<path d="M 100 100 Q 160 60, 220 100" fill="none" stroke="#B8860B" strokeWidth={1.2} strokeDasharray="4 5" opacity={0.7} />
```

Dash ratios: `4 5` (balanced), `2 6` (airy/scattered), `8 3` (assertive). Match the line weight — dashes on a 3px stroke need larger gaps than dashes on a 1px stroke or they blob together.

## 5. Gradient strokes that tell a story

Why it works: a single stroke with a red→gold→blue gradient carries a three-act narrative without three separate elements. The eye reads the color transition as time/emotion/change.

```tsx
<defs>
    <linearGradient id="journey" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#C8372D" />
        <stop offset="50%" stopColor="#B8860B" />
        <stop offset="100%" stopColor="#3B7DD8" />
    </linearGradient>
</defs>
<path d="..." stroke="url(#journey)" strokeWidth={3} fill="none" />
```

Seen in: `carekitsprojects/.../kit-journey-banner.tsx`, `unifit/src/components/graphics/DumbbellSvg.tsx`.

## 6. Rim-lit "paper" cards with borderImage

Why it works: a gradient `borderImage` + warm background gradient + inset `box-shadow` creates the illusion of a thick handmade paper card with a rim-light. Looks nothing like a default Tailwind card.

```tsx
<div
    style={{
        background: "linear-gradient(160deg, #fdf8f0 0%, #f7f0e3 50%, #faf5eb 100%)",
        borderImage: "linear-gradient(135deg, #d4a843, #b8860b) 1",
        borderWidth: "1px",
        borderStyle: "solid",
        boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
    }}
>
    ...content
</div>
```

The `inset 0 1px 0 rgba(255,255,255,0.7)` is the rim-light. Without it, the card looks flat. With it, the card looks like there's a light source above.

Seen in: `carekitsprojects/.../heart-note-artifact.tsx`.

## 7. Mouse-tracked reflective borders (interactive cards)

Why it works: a `::before` pseudo-element with a radial gradient whose center tracks the mouse creates a "the card is a polished surface catching light" effect. Subtle, but it elevates cards from "div with a border" to "object."

```tsx
const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

// CSS:
// .card::before {
//   content: "";
//   position: absolute; inset: 0;
//   background: radial-gradient(300px circle at var(--mx) var(--my),
//               rgba(255,255,255,0.08), transparent 40%);
//   pointer-events: none;
// }
```

Seen in: `unifit/src/components/home/ReflectiveCard.tsx`, `remindy/src/components/ui/hero-highlight.tsx`.

## 8. Spotlight glow (hero background)

Why it works: a huge SVG ellipse with an aggressive `feGaussianBlur` filter creates a soft, diffuse light source that gives heroes depth without needing a photographic background.

```tsx
<svg className="pointer-events-none absolute inset-0" viewBox="0 0 1000 500">
    <defs>
        <filter id="blur">
            <feGaussianBlur stdDeviation="150" />
        </filter>
    </defs>
    <ellipse cx="500" cy="100" rx="400" ry="200" fill="rgba(232, 136, 100, 0.35)" filter="url(#blur)" />
</svg>
```

Tune `stdDeviation` — 80 is crisp, 150 is soft, 250 is ambient wash.

Seen in: `remindy/src/components/ui/spotlight.tsx`, `unifit/src/components/graphics/Spotlight.tsx`.

## 9. Hatched / cross-hatched fill patterns

Why it works: a repeating line pattern at 45° fills shapes with "pencil-sketch" texture. Great for gauge bars, stat highlights, anywhere a solid fill would feel too slick.

```tsx
<defs>
    <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse"
             patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="#C8372D" strokeWidth="1.2" />
    </pattern>
</defs>
<rect width="100" height="20" fill="url(#hatch)" />
```

Seen in: `carekitsprojects/.../confidence-sketch-meter.tsx`.

## 10. Tally marks as data viz

Why it works: bar charts abstract. Tally marks count. When the number represents _people_ or _things_, drawing one mark per unit (with a tiny rotation wobble for humanity) hits harder than "60."

```tsx
function TallyMarks({ count }: { count: number }) {
    const groups = Math.floor(count / 5);
    const extras = count % 5;
    return (
        <svg viewBox={`0 0 ${groups * 28 + extras * 5 + 20} 30`}>
            {Array.from({ length: groups }).map((_, g) => (
                <g key={g} transform={`translate(${g * 28}, 0)`}>
                    {[0, 5, 10, 15].map((x) => (
                        <line
                            key={x}
                            x1={x}
                            y1={2}
                            x2={x}
                            y2={28}
                            stroke="#1A2744"
                            strokeWidth={2.4}
                            transform={`rotate(${((g + x) % 3) - 1})`}
                        />
                    ))}
                    {/* slash across the four */}
                    <line x1={-2} y1={25} x2={18} y2={5} stroke="#1A2744" strokeWidth={2.4} />
                </g>
            ))}
            {/* remainder */}
            {Array.from({ length: extras }).map((_, i) => (
                <line key={i} x1={groups * 28 + i * 5} y1={2} x2={groups * 28 + i * 5} y2={28} stroke="#1A2744" strokeWidth={2.4} />
            ))}
        </svg>
    );
}
```

The `rotate(${(g + x) % 3 - 1})` is the humanity trick — a tiny deterministic wobble that reads as "hand-drawn" without being animated.

Seen in: `carekitsprojects/.../workshop-tally.tsx`.

## 11. Corner flourishes (ornamental framing)

Why it works: four small SVG corner brackets around a quote or mission statement frame the content like a hand-drawn certificate. No full border needed.

```tsx
function CornerBracket({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
    const transform = {
        tl: "",
        tr: "scale(-1, 1)",
        bl: "scale(1, -1)",
        br: "scale(-1, -1)",
    }[position];
    return (
        <svg className="absolute h-12 w-12" style={{ transform }}>
            <path d="M 4 4 L 4 30 M 4 4 L 30 4" stroke="#B8860B" strokeWidth="1.4" fill="none" opacity={0.45} />
            {/* tiny leaf */}
            <path d="M 8 8 Q 14 4, 18 10 Q 14 12, 8 8 Z" fill="#B8860B" opacity={0.45} />
        </svg>
    );
}
```

One primitive, four placements via transform. Seen in: `carekitsprojects/.../mission-frame.tsx`.

## 12. Border beam (offsetPath animation)

Why it works: `offsetPath` lets you animate an element along an arbitrary path — including a `rect()` that traces a card's border. A single gradient-filled div follows the rectangle, creating a "running light" effect with almost no DOM.

```tsx
<motion.div
    className="absolute aspect-square w-[80px]"
    style={{
        offsetPath: `rect(0 auto auto 0 round 12px)`,
        background: "linear-gradient(to right, transparent, #e88864, transparent)",
    }}
    animate={{ offsetDistance: ["0%", "100%"] }}
    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
/>
```

Seen in: `remindy/src/components/ui/border-beam.tsx`.

## 13. Wave section dividers

Why it works: straight section borders are visually rigid. An asymmetric wave says "we thought about this transition" — and costs ~20 lines.

```tsx
<svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="h-16 w-full">
    <path d="M0,40 C360,120 720,0 1440,80 L1440,120 L0,120 Z" fill="hsl(var(--accent))" />
</svg>
```

Use `preserveAspectRatio="none"` so the wave stretches to container width. Flip vertically for "flat on bottom" vs "flat on top" variants.

Seen in: `unifit/src/components/graphics/FlatOnTopWave.tsx`.

## 14. Scroll-triggered reveal (restrained)

Why it works: a small fade + rise as elements enter the viewport reinforces "this was placed here deliberately." Anything more (bounce, stagger, rotation) crosses into "look at me" territory and cheapens the artisan feel.

```tsx
<motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    viewport={{ once: true, margin: "-80px" }}
>
    {children}
</motion.div>
```

Durations 500–700ms. No bounce easing. `once: true` so it doesn't keep firing on scroll-back.

## 15. Handwritten font for numerals / labels

Why it works: pairing sketch-style SVG with a system-sans label breaks the illusion. A handwritten font on the numerals and captions (body copy stays in the normal font) keeps voice consistent.

Good pairings: Caveat, Kalam, Indie Flower, Gloria Hallelujah (Google Fonts). In carekitsprojects this is exposed as a `font-handwritten` Tailwind class.

**Don't** use handwritten fonts for long paragraphs — accessibility drops and it reads as "kids' birthday card" instead of "editorial."
