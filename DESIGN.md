# Presentation design guide

## Authority and approved direction

Figma Slides `8CqcgYkpohVGMg2b9ag5FW` supplies the wording, speaker notes, slide order and image content. Keep all 32 main slides. Retain the six skipped alternatives in source records only. Speaker notes are intentionally public.

The approved visual direction is deep-space chrome: flatter-centre metallic clouds and elongated bursts, raised lettering, silver slab image displays, sparse stars and restrained iridescent reflections. Illustration choices are 16C, 18B and 32A. Do not replace these with a new style during maintenance.

## Composition and screen sizes

Author every slide on a **1280 × 720, 16:9 canvas**. Scale the entire composition uniformly, including HTML type and Three.js objects. Centre it within the available viewport. Maximum displayed width is **1440px**. Audience slides reserve 32px horizontal space and 144px vertical space for controls. The surrounding screen remains the dark space background.

This same composition applies on phones for now. Do not activate portrait stacks or separate mobile layouts. The user has postponed responsive redesign until the slide elements are final. Do not stretch width and height independently or use viewport-based font sizes inside the composition. Container-relative type sizes refer to the fixed authoring canvas.

Each audience section occupies one viewport. The toolbar and navigation sit outside the composition and remain usable at their normal interface size.

## Type and colour

- Headings and raised object labels: **Alan Sans Medium, weight 500**, not Alan Sans Display.
- Supporting copy and controls: **DM Sans**.
- Background: `#05060c`. Main text: `#f1f3fa`. Supporting text: muted blue-grey, approximately `#aab5c9`.
- Raised type uses layered grey shadows for depth, tight spacing and intentional line breaks. Keep accessible HTML text separate from the WebGL canvas.
- Match the main “What if” and “Try this” label sizes. Widen the burst when needed for longer labels.
- Rainbows are small reflections or edge accents only. No rainbow backgrounds or large colour washes.

### Palette

Every colour lives in `src/theme/palette.ts`, grouped by what it belongs to: `shell`, `chrome`, `glow`, `book` and so on. A colour that one job uses in several files sits in `core`. Code and Three.js import `palette`. CSS reads the same values as variables from `src/theme/tokens.css`, for example `--glow-cloud-far` for `palette.glow.cloudFar`.

Raw colours are not allowed anywhere else in `src`. That means no hex, no `rgba()` written with numbers, no `0xRRGGBB` and no `white` or `black`. `npm test` fails if one appears. `index.html` keeps its own `theme-color` so the page has a background before any script runs. `src/data/deck.json` and `public/favicon.svg` are outside the rule.

`tokens.css` is generated. After you change the palette, run `npm run tokens`. `npm test` fails if the file is out of date.

Two colours that do different jobs get separate tokens, even when the values match. Share a token only when the same job uses it.

## Chrome objects and motion

Use the shared cloud, burst, capsule and circle geometry. The opening follows the approved diagonal composition: cloud upper left, matching “to” capsule between, burst lower right, linked by a metallic line with a slow travelling highlight.

Chrome uses a silver physical material, metalness 1, roughness .17, clearcoat 1 and environment reflections. Keep highlights readable without excessive glow. Share the renderer and lighting system.

Motion stays gentle. Slabs settle from a small tilt to face the viewer. Accumulate bounded local frame time for settling; never subtract a stored start from a global clock that can reset. Pause unnecessary animation offscreen, in hidden tabs, under reduced-motion preferences and when the user pauses motion. Maintain a static fallback when WebGL is unavailable.

## Images and silver slabs

The image determines the slab's proportions. Keep the full intended image content and fit it inside the slide's local size limits. Do not force portrait screenshots into landscape frames or add black letterboxing.

Image corners are rounded to match the inner slab opening. The metallic rim hugs the image, with a consistent thin bevel. The static fallback and enlarged image must respect the same content crop.

Remove only approved, identifiable padding. Preserve the original source asset and record any presentation-only crop with exact bounds and provenance. Never automatically trim dark pixels, which may be real image content. Slides 17, 23, 24 and 31 have approved padding crops. Slide 17 retains its existing vertical clipping while removing the exported background on either side.

## Gallery slides, steps and editor mode

A slide whose layout kind is `gallery` (slide `3:19`) shows several images as silver slabs and has one in-slide step per image. Step 0 is a loose cluster. Step k brings image k to the front at full size and parks the others behind it, peeking out at the edges. Placements live in `galleryLayout` in `src/slides/layouts.ts`. Slabs animate from where they are to the new placement over `motion.seconds` using bounded local frame time, and jump straight there under reduced motion or pause. The move is one overlapping gesture (`src/slides/galleryMotion.ts`): the old front image shrinks where it is, the waiting slabs step aside, depths swap while everything is apart, and the slabs are already drifting to their new places as that happens. Slabs never change depth while they overlap, so they do not cut through each other. Images behind the featured one dim by `motion.dim`. Each image also has an HTML overlay at the same placement, so clicking enlarges it and the static fallback works.

Steps are consumed by Next and Previous (keys, buttons and the presenter window) before the slide changes. Going forward lands on step 0 of the next slide; going back into a gallery lands on its last step. Any other slide change (scroll, link, picker) resets to step 0. The presenter header shows "step N of M".

A layout of kind `pinned` with an `anchor` slide id has no section of its own. It is shown inside its anchor's section as the next in-slide step, so a section with N pinned followers has steps 1..N, each selecting a follower in deck order. The counter, notes, picker, presenter and URL hash all follow the logical slide, so a link to a pinned slide scrolls to its anchor and sets the step. Helpers live in `src/shell/navigation.ts` (`buildSections`, `logicalSlide`). The anchor's composition receives the followers as `pinned` and decides what each step shows. Slides 4 and 5 (`3:29`, with `3:31` pinned) use the lecture screen in `src/slides/LectureScreen.tsx`: a silver slab with a dark screen and no image, whose size and position never change. Step 0 shows "Design" lower left. Step 1 keeps that word in place (bound to node `3:34`), fades in "Introduction to" and "User Experience" above it, and raises a lecture hall behind the slab (stage floor, curved seat rows, faint ceiling arcs, with an SVG fallback). Defaults live in `lectureLayout` in `layouts.ts`, with a "Lecture screen" panel in editor mode.

Append `?editor` to the URL to tune live with dialkit. The editor code loads lazily, so normal builds never include dialkit or motion. Panels cover the gallery placements, slab settle rate and metal line bead speed, and persist in the browser only. Copy the values you want into `layouts.ts` (or the defaults in `src/editor/GlobalTuning.tsx`). Use `useTuning` from `src/editor/tuning.ts` for any new tunable number.

## Navigation and accessibility

Arrow Right/Down and Page Down advance; Arrow Left/Up and Page Up go back. Support these in both audience and presenter views. Ordinary buttons and links must not swallow arrows after a click. Preserve local arrow behaviour in inputs, selects, sliders, menus and other composite controls. Use `data-arrow-keys="local"` for custom controls that own their arrow keys.

Keep natural scrolling, gentle snapping, cancellable transitions, stable slide links and the slide picker. Do not queue animations on rapid input. The overview and image dialogs block background slide navigation. The Notes view does not: slides can be stepped through from it, and they change instantly. Preserve keyboard focus and Escape to close. Escape closes one thing per press: overview, phone panel, Notes view, then it brings back a hidden UI.

## Where to make changes

- `src/slides/layouts.ts`: individual image/statement composition settings, keyed by permanent Figma slide IDs.
- `src/slides/Opening.tsx`, `Timeline.tsx`, `Diagram.tsx`, `Illustrations.tsx`, `Screenshots.tsx`: special compositions.
- `src/visuals/Stage.tsx`: authoring size, uniform scale, camera and visibility.
- `src/visuals/ChromePrimitives.tsx`, `geometry.ts`, `visuals.css`: shared objects, slabs, labels and styling.
- `src/shell/`: navigation and presenter coordination. `src/shell.css`: interface chrome.
- `src/data/` and `source/`: imported content and asset bindings. Follow the reviewed import workflow; never overwrite local compositions during a content refresh.

Use local slide overrides for one-off tweaks. Change shared components only when the change should affect every instance. Keep the exploration gallery available at `?view=illustrations`.

## Verification and handoff

Run `npm test`, `npm run check:source` and `npm run build`. Check a normal desktop, ultrawide desktop and portrait phone: the composition must retain 16:9, relative positions, font sizes and image proportions. Check all 31 slides after shared layout changes.

Exercise arrows after clicking Next, images and toolbar controls. Test pause/resume and tab switching on slide 2, reduced motion, the static fallback, image enlargement and presenter navigation. Browser automation is not physical projector or phone GPU testing.

Record material changes and limits in `progress.md`. Do not commit, push or deploy unless requested. Read this guide and `docs/implementation-spec.md` before changing the visual system.

## Glows

Every chrome cloud and burst has a soft glow behind it (`src/visuals/Glow.tsx`). The cloud runs blue to purple and the burst runs orange to pink. Pink is in both, so they blend where they meet on the opening slide. The glow is a painted canvas texture on one plane inside the shape's group, so it follows the float, and it breathes slowly. Its spread is capped at the distance to the nearest stage edge, because the stage clips anything beyond it.

The glow hugs the shape's outline, with a soft hot rim at the top left. Strength, size and breath are in the Glow panel in `?editor`.

## Hollow book metal

The hollow book slide (`4:49`) is mirror silver: the book, the blocks and the flies. Three things make it read as chrome instead of flat grey (`src/slides/HollowBook.tsx`):

- **Its own room.** `useSilverRoom` in `src/visuals/Environment.tsx` builds a brighter reflection room with a faint pink and a faint blue card, and the slide's materials use it as their `envMap`. The main Studio room is mostly dark, so a large flat mirror face reflects almost nothing in it.
- **Pillow normals.** `pillow()` leans the normals of flat faces outward, so a reflection sweeps across the face as if it bulged. The geometry itself stays flat.
- **Rounded edges.** Covers and blocks are extruded with a wide rounded edge, and the page block is a stack of five rounded layers so its sides look like ridged pages. Each shape is drawn smaller by its edge so overall sizes are unchanged.

## Metal lines

`MetalLine` in `src/visuals/ChromePrimitives.tsx` is one tube whose shape is rewritten every frame. Its radius swells and thins slowly along its length, it sways slightly between its fixed ends, and the pulse is a bulge travelling through the tube itself (with a smaller one trailing it), not a separate bead. The `LINE` constants set thickness, swell, pulse size and sway. The pulse speed is the Metal line dial in `?editor`.

## Touch controls

Pinned implementation decisions, agreed 2026-11-12. Build these as written. Audience view only. The presenter view gets none of this.

**Words.** "UI" is the toolbar plus the slide navigation (`chrome` in `App.tsx`). "Compact" is the layout described next.

1. **Compact layout applies when** the window is 700px wide or less, or the device is touch-first. In CSS: `@media (max-width:700px),(pointer:coarse)`. In JS, the same query through `matchMedia`. Wide desktop windows with a mouse keep the centred pill unchanged.
2. **Corner arrows (UI visible, compact).** Previous sits in the bottom-left corner and Next in the bottom-right. Round, 48px, 12px from the edges plus `env(safe-area-inset-*)`. The slide count and jump picker stay as a small centred pill at the bottom. This needs `viewport-fit=cover` in the viewport meta tag.
3. **Corner taps (UI hidden, compact).** Two invisible 72px by 72px buttons in the same corners, with the same safe-area offsets. No visual feedback on tap. They render outside the `chrome &&` block. They keep `aria-label`s. On wide desktop with the UI hidden there are no corner taps, only the keyboard.
4. **Stacking.** Corner buttons sit above slide content, so they win over a tappable image underneath. They are not shown while the Notes view is open, and sit below the overview and image dialog.
5. **Behaviour.** Corners call the same `navigate(-1|1)` as today's arrows, so they step through in-slide steps. They do nothing at the first and last position. Visible arrows grey out at the ends.
6. **Three-finger hold toggles the UI.** Exactly three touches down, held 500ms, each touch moving less than 12px from where it started. It fires once, while still held. All fingers must lift before it can fire again. A fourth finger, a lifted finger, or movement past 12px cancels it. Works on any touch screen at any width.
7. **Hold is ignored** while the overview, the Notes view or the enlarged image is open.
8. **Hint.** When the UI is hidden on a touch-first device (by the hold or by the Hide UI button), show "UI hidden. Hold three fingers to show it." for 2 seconds, `role="status"`. Nothing is shown when the UI comes back.
9. **Logic lives in a pure helper** (`src/shell/threeFingerHold.ts`) that takes touch points and timestamps and says when to fire, with tests in `tests/`. The React hook only wires touch events and a timer to it.
10. **Target device** is iPhone 17 in Chrome. Sufyan tests on the phone from the local preview before any push. If iOS's own three-finger gestures get in the way, the fallback is a two-finger hold with the same timing.

## Slide 26: one panel splits into six (pinned 2026-11-13)

Pinned implementation decisions. Execute verbatim.

1. The slide is `27:99` (slide 26, brand exploration). Slide 13 is not touched.
2. Step 0 shows one large panel: a fresh capture of the V5 tab of https://form-sg-brand-exploration.vercel.app/ at 1600×1000. It replaces the old image, which came from an earlier version of the site.
3. The slide has one in-slide step. One press plays the whole split.
4. The split: the parent shrinks a little, six smaller panels slide out from behind it about 80ms apart and settle into a grid of 3 across and 2 down, and the parent shrinks to nothing as the last ones leave. About 1.2 seconds in total. Going back plays it in reverse. Reduced motion and pause snap.
5. The parent is gone at step 1. Only the six remain.
6. Grid order, left to right, top row first: V1 Reference from Campsite, V1 Reference from Fruitful, V2 C (V2), V3 B Marked-up document, V5 H The logo as building block, V6.A Sideways top of page.
7. Each small panel shows the top of that actual prototype page, opened from its VIEW button, captured at 1600×1000.
8. No labels under the panels. Images only.
9. Tapping a small panel enlarges it, the same as other deck images.
10. The seven screenshots are local to the deck's code (`public/assets/`). They are not in Figma. The Figma slide keeps its single image, and a source import must not remove the local ones.
11. The grid is loose, not ruled: each panel sits a little off its grid spot and is tilted a few degrees, by hand, in `splitLayout.children`.
12. Three moves exist, chosen by `splitLayout.variation` and previewed with `?split=1`, `2` or `3`: 1 deal (decision 4), 2 burst (all six pop out of the centre at once), 3 divide (the parent splits into a stack per row, then each stack fans out). The other two stay in the code until one is picked.
13. Picked on 2026-11-13: variation 2, burst. This replaces the move in decision 4. The parent collapses fast, then all six pop out of the centre at once, spin a little and overshoot before settling.
