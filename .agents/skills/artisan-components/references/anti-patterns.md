# Anti-patterns

The ways artisan components go wrong. Review this list after a first draft — most of these aren't obvious until you step back.

## Over-decoration

**Symptom:** every element has a gradient, dashed border, shadow, animation, and handwritten label.

**Why it happens:** each technique in isolation looks great, so the instinct is to use them all. But artisan ≠ maximal — artisan is _deliberate_. A real illustrator picks 2–3 tools for a piece, not 10.

**Fix:** the subtraction pass. Remove one thing. If the component is still "too much," remove another.

## Artisan used as wallpaper

**Symptom:** every section of the landing page has a bespoke SVG illustration.

**Why it happens:** artisan components are satisfying to build, and each one individually passes review.

**Fix:** rarity is the whole point. Target 2–4 artisan moments per page, max. The rest should be clean, conventional UI — that contrast is what makes the artisan pieces feel special. If everything is artisan, nothing is.

## Palette drift

**Symptom:** the new component uses #E88864 when the rest of the site uses `--ember` / `#e88864`.

**Why it happens:** copying from another project without re-theming. Or sampling a color from a mood board instead of the existing tokens.

**Fix:** before implementing, open the project's `globals.css` / `tailwind.config.ts` / tokens file. Write the hexes you'll use as a comment at the top of the component. If you need a color that doesn't exist, consider whether it should be added to the tokens.

## Sketchy-slick mixed voice

**Symptom:** a component has hand-drawn tally marks _and_ a perfectly symmetric gradient backdrop with glassmorphism.

**Why it happens:** grabbing techniques from the "techniques" list without committing to a voice.

**Fix:** decide the voice first (sketch / ambient / illustrated / ornamental) and audit every element against it. If an element doesn't fit the voice, replace it or remove it.

## Fake responsiveness

**Symptom:** the desktop SVG is squished onto mobile with `max-width: 100%` and labels overlap.

**Why it happens:** artisan components need layout thinking, not just "shrink to fit."

**Fix:** use the config-driven dual-layout pattern from `composition-patterns.md`. Or, if the mobile version should be meaningfully different (e.g., vertical instead of radial), build two.

## Animation attention grabs

**Symptom:** the hero bounces. Stats count up with a 3-second spring. The CTA button pulses forever.

**Why it happens:** motion is fun and each piece passes in isolation.

**Fix:** artisan voice is confident, not needy. One ambient motion per screen (a spotlight fade-in, a subtle drift) — everything else is static or reveal-on-scroll. If a user's attention is being yanked, the motion is too much.

## Illegible labels

**Symptom:** handwritten font + 14px + 0.5 opacity + on top of a busy gradient.

**Why it happens:** pushing the artisan voice into functional text.

**Fix:** handwritten fonts belong on numerals, pull quotes, and captions — not instructions, not nav, not body. Functional text stays in the project's default font. If a label is information the user needs, prioritize legibility over aesthetic.

## Accessibility left on the floor

**Symptom:** decorative SVGs with no `aria-hidden`, meaningful SVGs with no `<title>`, color-only state indicators, motion with no `prefers-reduced-motion` opt-out.

**Why it happens:** the work feels visual, so a11y feels like an afterthought.

**Fix:** every SVG gets either `aria-hidden="true"` or `role="img" + <title>`. Every motion respects `useReducedMotion()`. Every state has a non-color channel. These take minutes to add at creation, hours to retrofit.

## Copy-paste without re-theming

**Symptom:** you port the heart-note card from carekits to unifit, and it still has the carekits gold `#B8860B` border in a red-orange ember-palette site.

**Why it happens:** the copy-paste works mechanically, so re-theming feels optional.

**Fix:** the catalog says "port the structure and re-theme the palette" for a reason. After pasting, do a find-replace pass on hexes → current project tokens, and a find-replace on fonts → current project fonts.

## Building without a thesis

**Symptom:** "make the hero more interesting" → 200 lines of SVG decoration that's pretty but forgettable.

**Why it happens:** skipping the "what is this component saying?" question.

**Fix:** if you can't write a one-sentence thesis for the component, you don't have a component yet. Don't open a JSX file until the thesis is clear. The thesis is what makes artisan work feel _meaningful_ rather than just pretty.

## Performance blindness

**Symptom:** 20 mouse-tracked components on one page, each re-rendering on mousemove. Page jank on mid-range phones.

**Why it happens:** each component in isolation is cheap.

**Fix:** use CSS-variable mouse tracking (not React state updates) for repeated components. Lazy-load heavy hero SVGs below the fold. Audit on a throttled-CPU browser profile before shipping.
