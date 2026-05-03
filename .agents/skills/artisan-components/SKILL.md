---
name: artisan-components
description: Build "artisan" graphics — rich, handmade-feeling DOM/SVG components for hero sections, about pages, marketing callouts, and decorative moments. Use whenever the user asks for a distinctive illustrated element, exploded diagram, hand-drawn accent, stat callout, editorial flourish, textured hero background, ornamental divider, care/product/journey scene, or says things like "make this feel handcrafted / homemade / artisan / editorial / magazine / not-just-another-card". Also trigger when the user wants to replace a stock icon/image with an in-DOM illustration, or wants to add personality to a landing page without reaching for stock assets or third-party illustrations.
---

# Artisan Components

A skill for designing and implementing "artisan" graphics: rich, in-DOM visuals (SVG + CSS + thoughtful composition) that feel handmade, rare, and intentional. Like an artisan keycap on a keyboard — sprinkled sparingly on the moments that matter most, not slathered everywhere.

## The philosophy

Artisan components exist **where a normal card, icon, or image would do the job, but doing the job isn't the point.** The point is to signal care, craft, and personality — the way a bespoke illustration in a magazine article tells you the editor thought about this story.

Use them:

- In **heroes**, where first impressions set tone.
- On **about / mission / values** pages, where emotional weight matters more than information density.
- Around **key stats or stories** — a single number deserves a flourish; a grid of stats does not.
- As **section dividers or CTAs** that want to feel like the end of a chapter rather than the bottom of a card.

**Do not use them everywhere.** A whole page of artisan components becomes noise — the rarity is what makes them valuable. If the user is building a dashboard or dense utility UI, this skill is the wrong tool.

## Before you draw anything

Ask yourself (and ideally the user) these three questions:

1. **What is this component saying?** An exploded kit diagram says "here's what's inside, every piece matters." A hand-drawn tally says "these are real people, counted one by one." Without a thesis, the drawing becomes decoration, not communication.
2. **Where does it live in the page rhythm?** Hero? Mid-scroll reveal? Footer flourish? The placement changes the technique: heroes want ambient depth (spotlights, big gradients), mid-scroll wants narrative (connectors, labels), flourishes want restraint (corner brackets, rules).
3. **What's the anchor palette and typographic voice?** Artisan components look cheap when they clash with the rest of the site. Sample 2–3 existing colors from the codebase's tokens and the project's existing heading/body font before you start picking strokes.

Skipping these turns artisan work into generic SVG decoration. Don't skip them.

## Core techniques (read `references/techniques.md` for code)

These are the techniques that show up repeatedly across good artisan work. Pick a few per component — using all of them at once looks busy, not crafted.

- **SVG as a first-class design surface** — not a fallback for images. Shapes are defined as data, positioned via transforms, and composed like a layered illustration.
- **Hand-drawn feel via Bezier curves** — `Q` (quadratic) for squiggly underlines and flourishes; `C` (cubic) for smooth narrative curves (think: escalation charts, journey lines).
- **Depth through opacity tiers** — same stroke color at 0.2 / 0.5 / 0.8 reads as foreground/middle/background. More reliable than layering colors.
- **Dashed strokes for "connective tissue"** — use for leader lines, flow arrows, implied motion. Tune `strokeDasharray` (4/5, 3/3, 2/6) to match line weight.
- **Gradient fills on strokes** — a red→gold→blue gradient on a journey path carries story all by itself. Cheap, expensive-looking.
- **Layered CSS gradients + `borderImage`** — for paper-like cards, rim-lit surfaces, and warm editorial backgrounds.
- **CSS radial gradients driven by mouse variables** — for subtle "paper grain" or "follow-the-cursor" glows on interactive cards.
- **Reusable transform-flipped primitives** — define one corner bracket, one tally mark, one leaf; use `scale(-1, 1)` / `rotate(90deg)` to populate. Keeps components short.
- **Config-driven shape placement** — separate _what the shape is_ (the SVG) from _where it sits_ (a layout config object). Enables desktop/mobile layouts without duplicating art.
- **Handwritten font for numerals and ephemera** — pairs with sketch-style SVG to reinforce the handmade voice. Don't use it for body copy.
- **Scroll-triggered reveals (sparingly)** — `motion/react` `whileInView` with opacity + small y-translate. Keep durations ~600ms, no bounce, no stagger on the hero.

## How to build one

Work in this order. Skipping steps (especially step 1 and step 5) is why artisan components often feel off.

1. **Write the thesis in one sentence.** "An exploded view of a care kit so donors see every item we pack." Stick it as a comment at the top of the file. If you can't write the sentence, you don't have a component yet — you have decoration.
2. **Sketch the composition in plain text first.** List the elements ("central kit → 8 radiating items → curved connectors → labels") before you write JSX. Two minutes of listing saves an hour of nudging `cx` values.
3. **Check the catalog.** Read `references/examples-catalog.md` — there is likely a related component already built in one of the three projects. Steal the scaffold.
4. **Pick 2–4 techniques from the list above, not all of them.** Artisan ≠ maximal. A good component might be "SVG Bezier + opacity tiers + handwritten labels." That's enough.
5. **Build the shape primitives first, then compose.** Write `CornerBracket`, `LeaderLine`, `TallyMark` as small local components. Compose them in the parent. This is the single biggest quality multiplier — it's why the carekitsprojects components stay short and editable.
6. **Add responsiveness via config, not media queries on JSX.** Define two layout configs (desktop / mobile) with numeric positions; pick one based on a breakpoint. See `kit-exploded-diagram.tsx` for the canonical example.
7. **Restraint pass.** Remove one thing. Drop the dashed border, or the gradient, or the label halo. Artisan work almost always benefits from one less element than your first draft had.
8. **Theme check.** Verify colors pull from existing tokens (`currentColor`, CSS vars, Tailwind theme keys) so dark mode and rebrands don't break the piece.

## Flavor guide — matching the project

The three reference codebases have distinct artisan voices. Match, don't blend:

- **carekitsprojects (editorial / sketchy / heartfelt):** thin strokes (1–1.4px), dashed connectors, navy + gold + red palette, hand-drawn tally marks, gold `borderImage` cards, squiggly quadratic underlines on stats. Think: a NYT Sunday magazine feature about a nonprofit.
- **remindy (polished / ambient / premium):** offsetPath border beams, radial spotlights with aggressive blur filters, shimmer buttons with conic gradients, spring-physics number tickers, ember/sage warm palette. Think: a high-end SaaS landing page that respects the user.
- **unifit (energetic / gradient-forward / illustrated):** red→orange gradient-stroked SVG icons, radial spotlights on dark backgrounds, wave section dividers, mouse-tracked reflective card borders. Think: athletic brand with a graphic-design heart.

When you're in an unfamiliar project, pick the flavor that matches its existing aesthetic rather than importing one wholesale.

## Reference files

- `references/techniques.md` — Technique recipes with code snippets. Read before implementing.
- `references/examples-catalog.md` — Catalogued components across all three projects with paths, what they depict, and what to copy from them.
- `references/composition-patterns.md` — Higher-level patterns: responsive configs, primitive factoring, scroll-reveal, mouse interactivity.
- `references/anti-patterns.md` — Common mistakes (over-decoration, palette drift, accessibility misses).

## When NOT to use this skill

- Utility UI (forms, tables, dashboards, settings pages).
- Anywhere a user will see the component more than a handful of times per session — artisan work loses its specialness on repetition.
- Places where a real photograph would communicate better (product photography, testimonials with real faces).
- When the timeline or budget is "ship it today" — artisan work takes iteration.
