# Composition Patterns

Higher-level patterns that show up repeatedly in artisan work. Techniques (in `techniques.md`) are the _brush strokes_; these are the _compositions_.

## 1. Shape primitives + composition parent

The single biggest quality multiplier. Rather than writing one 400-line SVG, factor into small local components.

**Anti-pattern (hard to edit, hard to reason about):**

```tsx
export function KitDiagram() {
    return (
        <svg>
            <rect x={100} y={50} width={80} height={100} fill="..." />
            <rect x={250} y={60} /* ...bandage... */ />
            <path d="M 180 100 Q 215 70, 250 80" /* ...leader line... */ />
            {/* ...350 more lines... */}
        </svg>
    );
}
```

**Pattern:**

```tsx
function KitShape({ x, y }: Pos) {
    return <g transform={`translate(${x},${y})`}>...</g>;
}
function BandageShape({ x, y }: Pos) {
    return <g transform={`translate(${x},${y})`}>...</g>;
}
function LeaderLine({ from, to }: { from: Pos; to: Pos }) {
    /* Q curve */
}
function Label({ text, at }: { text: string; at: Pos }) {
    /* positioned text */
}

export function KitDiagram() {
    const layout = useBreakpoint() === "mobile" ? mobileLayout : desktopLayout;
    return (
        <svg viewBox={layout.viewBox}>
            <KitShape {...layout.kit} />
            {layout.items.map((item) => (
                <BandageShape key={item.id} {...item.pos} />
            ))}
            {layout.connectors.map((c) => (
                <LeaderLine key={c.id} {...c} />
            ))}
            {layout.labels.map((l) => (
                <Label key={l.id} {...l} />
            ))}
        </svg>
    );
}
```

Primitives are now editable without scrolling, the parent reads as a scene description, and swapping layouts is a config change.

## 2. Config-driven responsive layout

Media queries on JSX forces duplication. A config object per breakpoint keeps the _art_ fixed and the _placement_ fluid.

```tsx
const desktopLayout = {
    viewBox: "0 0 920 556",
    kit: { x: 420, y: 220 },
    items: [
        { id: "bandage", pos: { x: 120, y: 80 } },
        { id: "thermo", pos: { x: 720, y: 90 } },
        // ...
    ],
    connectors: [
        { id: "c1", from: { x: 460, y: 250 }, to: { x: 160, y: 120 } },
        // ...
    ],
};

const mobileLayout = {
    viewBox: "0 0 760 1080",
    kit: { x: 380, y: 520 },
    items: [
        /* vertical stack */
    ],
    connectors: [
        /* vertical leaders */
    ],
};
```

Pick via `useMediaQuery` or CSS `display: none` on two `<svg>` elements — both work. Don't try to tween between layouts; it looks worse than a clean swap.

## 3. Scroll-triggered reveal wrapper

One wrapper, used consistently, beats bespoke animations per component.

```tsx
export function Reveal({ children, delay = 0 }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay }}
            viewport={{ once: true, margin: "-80px" }}
        >
            {children}
        </motion.div>
    );
}
```

Use `delay` for staggering groups of items. Keep the delta between children ≤150ms — longer reads as "broken."

## 4. Mouse-tracked CSS variables

React listener updates CSS variables; CSS does the rendering. Avoids re-rendering React tree on every mousemove.

```tsx
const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

// className uses var(--mx) / var(--my) in a gradient or transform
```

Debounce only if you're seeing jank on low-end devices — on modern browsers, mousemove → style.setProperty is already cheap.

## 5. Gradient as a story element

Color is a character, not decoration. A journey path that starts red (urgency/struggle) and ends blue (resolution/calm) carries the narrative without a caption.

Plan the palette before drawing:

- What does the _start_ of this feel like?
- What does the _end_ of this feel like?
- Is the middle a bridge, or a tension point?

Map those to colors from the project's tokens, not abstract emotions-to-hex.

## 6. "Sketch voice" consistency

If you're committing to a hand-drawn aesthetic, do it everywhere in the component or not at all. Mixed voice (one sketchy element + three slick elements) reads as inconsistent, not intentional.

Checklist for sketch-voice components:

- Strokes ≤1.4px, `strokeLinecap="round"`, `strokeLinejoin="round"`
- At least one deliberate asymmetry (a rotated tally mark, a slightly-off curve)
- Handwritten font on any numerals or labels
- Dashed rather than solid connectors
- Opacity ≤0.85 even for "foreground" elements

## 7. "Ambient voice" consistency (the remindy flavor)

Opposite philosophy, equally committed:

- Soft blurs (`feGaussianBlur stdDeviation` 80–250)
- Slow spring physics (damping 100+, stiffness 300–500)
- Warm radial gradients > sharp linear ones
- Inset rim-light shadows on cards
- No sharp strokes visible; everything feels like light, not ink

## 8. The subtraction pass

After the first draft, **remove one thing** before committing:

- The dashed border? Maybe not needed.
- The gradient background? Solid might read better.
- The scroll animation? Static might be stronger.
- The label? The visual might speak for itself.

Artisan components almost always benefit from one less element than your first draft. If you remove it and the component gets worse, put it back — but you'll be surprised how often you won't.

## 9. Accessibility considerations

Artisan ≠ ignore a11y. Minimum bar:

- SVG that conveys meaning gets `role="img"` and `<title>`. Purely decorative SVG gets `aria-hidden="true"`.
- Color is never the _only_ channel for meaning (pair with shape/text/position).
- Handwritten fonts stay at 18px+ and out of body copy.
- Motion respects `prefers-reduced-motion`:
    ```tsx
    const reduceMotion = useReducedMotion();
    <motion.div animate={reduceMotion ? {} : { y: [0, -10, 0] }} />;
    ```
