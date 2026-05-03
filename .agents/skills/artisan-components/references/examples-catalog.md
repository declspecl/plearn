# Artisan Examples Catalog

A catalog of existing artisan components across Dec's three projects. Before building a new component, scan this list — there is likely something close that you can lift the scaffold from.

File paths are absolute. When working in a different project, open the file, port the pattern, and re-theme it to that project's palette.

## carekitsprojects (editorial / sketchy / heartfelt)

Root: `/Users/dec/programming/web/carekitsprojects/apps/website/src/app/_components/artisan/`

| Component               | File                          | Depicts                                                                              | Copy when you need...                                            |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Kit Exploded Diagram    | `kit-exploded-diagram.tsx`    | Central care kit with 8 radiating supplies + curved leader lines + hand-drawn labels | An exploded / parts-diagram view; responsive dual-layout pattern |
| Heart Note Artifact     | `heart-note-artifact.tsx`     | Warm stationery card with heart + quote, gold gradient border                        | A "testimonial-as-keepsake" card; rim-lit paper look             |
| Approach Pillars        | `approach-pillars.tsx`        | Three illustrated vignettes (Workshop, Distribution, Care Shacks) with connectors    | A three-pillar / three-value section with narrative flow         |
| Confidence Sketch Meter | `confidence-sketch-meter.tsx` | Before/after progress bars with hatch fill + tick marks                              | A "progress with texture" bar; hatched fill patterns             |
| Stat Callout            | `stat-callout.tsx`            | Huge stat with squiggly underline + handwritten narrative connector                  | Editorial-style stat highlights; squiggle underlines             |
| CTA Flourish            | `cta-flourish.tsx`            | Line-dot-wavy-dot-line ornamental divider                                            | A section-break flourish; 17-line example of restraint           |
| CTA Line Icons          | `cta-line-icons.tsx`          | Single-stroke heart + shopping bag with rounded joins                                | Hand-drawn line icons with consistent voice                      |
| Kit Journey Banner      | `kit-journey-banner.tsx`      | Horizontal story strip (school → kits → globe) with gradient path                    | A journey/timeline visualization with color-narrative stroke     |
| Mission Frame           | `mission-frame.tsx`           | Four corner brackets with leaf flourishes around content                             | Ornamental framing; the transform-flip primitive pattern         |
| Workshop Tally          | `workshop-tally.tsx`          | Hand-drawn tally marks (groups of 5) as impact counters                              | Counting-based data viz; tally mark primitive                    |

**What to reuse from this folder:** the separation of shape primitives (small local components) from composition (parent layout), the responsive dual-layout config object, the navy/gold/red palette, and `font-handwritten` for numerals only.

## remindy (polished / ambient / premium)

Root: `/Users/dec/programming/projects/remindy/apps/website`

| Component            | File                                                     | Depicts                                                                   | Copy when you need...                          |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| Hero Highlight       | `src/components/ui/hero-highlight.tsx`                   | Dot-grid background that reveals color under cursor                       | A tactile, mouse-tracked paper texture         |
| Border Beam          | `src/components/ui/border-beam.tsx`                      | Animated gradient spark tracing a card border                             | Premium card highlights; `offsetPath` pattern  |
| Spotlight            | `src/components/ui/spotlight.tsx`                        | Blurred ellipse as hero stage light                                       | Ambient glow on dark heroes                    |
| Flip Words           | `src/components/ui/flip-words.tsx`                       | Rotating words with vertical slide + fade                                 | Hero-headline word rotation                    |
| Shimmer Button       | `src/components/ui/shimmer-button.tsx`                   | Button with conic-gradient sweep + inset emboss                           | A CTA with presence; dual-animation technique  |
| Blur Fade            | `src/components/ui/blur-fade.tsx`                        | Scroll-triggered fade with blur + slide                                   | Restrained scroll reveals                      |
| iPhone Frame         | `src/components/ui/iphone.tsx`                           | Precise iPhone 15 Pro SVG frame with masked content slot                  | Showcasing an app screenshot in-context        |
| Number Ticker        | `src/components/ui/number-ticker.tsx`                    | Spring-physics number count-up on viewport entry                          | Stat animations in hero / metrics strips       |
| Reminder Rhythm      | `src/app/(marketing)/_sections/reminder-rhythm.tsx`      | Cubic-Bezier escalation curve with waypoints, gradient fill, sleep blocks | A narrative chart; hand-interpolated Bezier    |
| Reminder Rhythm Mini | `src/app/(marketing)/_sections/hero.tsx` (lines 121-171) | Smaller companion curve for the hero grid                                 | A miniaturized version of a hero-level graphic |
| Phone Demo           | `src/app/(marketing)/_components/phone-demo.tsx`         | SMS chat conversation rendered in iPhone frame                            | Product demo inside a device frame             |

**What to reuse from this folder:** the ember/sage palette, CSS keyframes (`shimmer-slide`, `spin-around`, `rise`, `breathe`), the `.surface` / `.btn-lift` class system, and spring-physics reveals (not linear fades).

## unifit (energetic / gradient-forward / illustrated)

Root: `/Users/dec/programming/web/unifit/src/`

| Component                 | File                                         | Depicts                                              | Copy when you need...                         |
| ------------------------- | -------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| ReflectiveCard            | `components/home/ReflectiveCard.tsx`         | Radial-gradient border that follows the cursor       | A polished, interactive card surface          |
| Spotlight                 | `components/graphics/Spotlight.tsx`          | Radial gradient hero glow, 4 brightness tiers        | Lighting a dark hero from above               |
| DumbbellSvg               | `components/graphics/DumbbellSvg.tsx`        | Dumbbell icon with red→orange gradient-stroked paths | An illustrated (not flat) icon for a category |
| VeganSvg                  | `components/graphics/VeganSvg.tsx`           | Leaf/plant icon with organic gradient-stroked curves | A nature-themed illustrated icon              |
| UtensilsCrossedSvg        | `components/graphics/UtensilsCrossedSvg.tsx` | Crossed fork + spoon with coordinated gradients      | Overlapping icon composition                  |
| FlatOnTopWave             | `components/graphics/FlatOnTopWave.tsx`      | Smooth-curve wave filling the bottom half            | A section divider with organic feel           |
| FlatOnBottomWave          | `components/graphics/FlatOnBottomWave.tsx`   | Inverted wave variant                                | The companion divider to FlatOnTopWave        |
| Button (gradient variant) | `components/ui/button.tsx` (line 16-17)      | CTA with stacked radial gradients + blur pseudo      | A glowing, embossed gradient button           |
| GradientText              | `components/typography/GradientText.tsx`     | Text clipped to gradient fills                       | Hero headline color treatments                |
| NavMenu underline         | `components/NavMenu.tsx` (lines 13-15)       | `::after` underline that flows in from center        | An animated nav hover state                   |

**What to reuse from this folder:** gradient strokes on SVG icons (vs flat fills), the `boof-gradient` Tailwind utility pattern, wave dividers as an alternative to hard section boundaries, and pseudo-element hover animations.

## Cross-project patterns worth promoting

When you see the same idea appear in 2+ projects, it's a good candidate for a local primitive in a new project:

- **Spotlight glow** — appears in remindy and unifit. Tiny (~20–50 lines). Worth inlining in any new project with a dark hero.
- **Mouse-tracked radial highlight** — ReflectiveCard (unifit) and HeroHighlight (remindy). Same trick, different visual. Good generic primitive.
- **Opacity-tiered SVG depth** — everywhere in carekitsprojects. The single most underrated artisan technique; use it anywhere SVG has 3+ layers.
- **Bezier curve with gradient stroke** — kit-journey-banner (carekits) and reminder-rhythm (remindy). A whole category of "narrative visualization."

## How to use this catalog

1. Identify the closest existing component to what you're building.
2. Read its source end-to-end — it's usually under 200 lines.
3. Port the _structure_ (primitives + composition) and re-theme the palette to match the current project's tokens.
4. Resist the urge to add. Start with a 1:1 port, then subtract what doesn't fit, then add sparingly.
