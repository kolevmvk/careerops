---
name: portfolio-design
description: The design language, motion rules and performance budget for the public portfolio. Load before writing or changing any public page, component, animation, stylesheet or design token.
---

# Portfolio design

The reader is an Engineering Manager or CTO at a workforce, logistics or
field-service company, opening this between meetings, often on a phone, often
not in their first language. They decide in about fifteen seconds whether to
keep reading.

The brief is a portfolio with a luxury character that stands with the best
animated sites. Luxury here means restraint, space and precision - not
ornament. The fastest way to look cheap is to animate everything.

## What the design must do

1. Make the positioning sentence legible before anything moves.
2. Make the two shipped applications impossible to miss.
3. Survive a technical reader opening DevTools.

Anything that does not serve one of those three is decoration and gets cut.

## Motion

Load the `cinematic-motion` skill before implementing any scroll or transition
work; it carries the technique. The rules specific to this site:

- Motion directs attention to content that is already there. It never announces
  itself, and it never gates reading behind an animation finishing.
- Entrances are earned once. A section animates in on first view and stays put;
  nothing re-animates on scroll-back.
- Transform and opacity only. Anything that triggers layout is a bug.
- Respect `prefers-reduced-motion` completely: the page must be fully usable and
  visually complete with every animation disabled, not a degraded version.
- No scroll hijacking, no fake loading, no cursor followers, no parallax on
  text.

## Type and space

Space is the main tool. A luxury feel comes from generous margins, a tight type
scale and one accent, not from gradients and glow.

- One typeface for text, at most one more for display. Variable fonts, `swap`,
  subset to the Latin and Cyrillic ranges the locales need.
- A modular scale, not arbitrary sizes. Line length 60-75 characters.
- One accent colour. Everything else is ink, muted ink and surface.
- Design tokens live in `@theme` in `globals.css`. Components never hardcode a
  colour or a spacing value.

## Dark mode

Both themes are first class and defined with tokens, not filters. Every colour
is declared for both, and the page has an explicit background in both.

## Performance budget

Speed is part of the brief, and it is where animated portfolios usually fail.

| Metric                             | Budget                              |
| ---------------------------------- | ----------------------------------- |
| LCP                                | under 1.5s on a mid-range phone, 4G |
| CLS                                | under 0.02                          |
| INP                                | under 150ms                         |
| Our own JS on top of the framework | under 15KB gzipped                  |

The budget is our code, not the total. Next 16 with React 19 ships roughly
170KB gzipped on a page with no client component at all, measured against a
production build - that is the floor of this stack, not something an
implementation can fix. An earlier version of this file set a 90KB total
budget without checking that floor, which made it unmeetable by construction.

What is controllable is what we add. The interactive demo, which is the whole
reason the public page ships any client JavaScript, costs 1.7KB gzipped. If a
component costs materially more than that, it needs a reason.

Measure against `pnpm start`, never `pnpm dev`: the development server serves
`next-devtools`, which alone is larger than everything else on the page and
makes the number meaningless.

Public pages are statically generated and revalidated on a schedule; they never
render per request. No animation library that costs more than the motion it
buys - prefer CSS and the Web Animations API, and reach for a library only when
a sequence genuinely needs orchestration.

Images: modern formats, explicit dimensions, lazy below the fold, never a
layout shift.

## Multilingual

Layouts must survive German, which runs roughly 30% longer than English, and
Serbian in both scripts. Never size a container to fit one language's string,
never centre a heading that will wrap differently, and test every breakpoint in
the longest locale rather than the shortest.

## Accessibility

Not separate from quality. Visible focus rings, real headings in order, WCAG AA
contrast in both themes, keyboard reachable everything, and content that is
complete without JavaScript.

## Before shipping a public page

- [ ] Positioning sentence readable with JavaScript disabled
- [ ] Complete and usable with `prefers-reduced-motion: reduce`
- [ ] Both themes checked, contrast passes in each
- [ ] Longest locale checked at 360px width
- [ ] No layout-triggering animation
- [ ] Within the JS budget
