# Colour tokens spec

Status: grilling complete, 20 decisions pinned. Do not implement until Sufyan confirms the spec.

Where an earlier decision is marked as revised, the later one wins (P12 over P2, P13 over P5).

## Starting point (measured 20 Nov 2026)

- 118 distinct colour values in `src` CSS, TS and TSX. 85 are used once.
- 25 more distinct `0xRRGGBB` colours in the Three.js code.
- No colour variables exist. No tests check colour values.

## Pinned implementation decisions

Execute these as written.

**P1. Goal.** This is a pure refactor. The deck must look pixel-identical afterwards. It tidies the code for open sourcing and leaves room for a second theme later. Building a second theme is out of scope.

**P2. Single source in TypeScript.** One TypeScript file holds every colour. Three.js and canvas code import from it directly. The same file writes CSS variables onto the page at startup, and CSS reads those variables. The page background in `index.html` stays hard-coded so there is no flash before the script runs.

**P3. Keep every value exactly.** No near-duplicate colours are merged in this pass. Near-duplicates are listed on a separate HTML review page. Sufyan picks merges there by eye, and merges land later as their own change.

**P4. Scope.** In: all of `src`, including the checkpoint deck view and the illustrations gallery. Out: `src/data/deck.json` and `public/favicon.svg`.

**P5. Proof of no change.** Screenshot all 32 presented slides with motion paused, before and after, and compare pixel by pixel. If the 3D scenes do not render the same twice in a row, fall back to a script check that every old value maps to an identical new value.

**P6. Branch.** Work lands on the local `colour-tokens` branch. No push until Sufyan has reviewed it. Pushing to `main` deploys the live site.

**P7. Naming.** Tokens are grouped by what they belong to, for example `shell.background`, `chrome.silver`, `glow.cloudBlue`, `book.paper`. A shared `core` group holds colours used in more than one place. The script swaps values using placeholder names first. Names are then chosen by reading how each colour is used, reusing words already in `DESIGN.md`. Sufyan reviews the finished palette file.

**P8. See-through colours.** Each colour-plus-alpha value is its own token, stored exactly as written today. Do not split into base colour plus alpha, and do not use `color-mix`.

**P9. Keyword colours.** Tokenise `white` and `black`. Leave `transparent`, `currentColor` and `inherit` as they are.

**P10. Guard.** The finder half of the script stays in the repo as a test. `npm test` fails when a raw colour appears outside the palette file (and outside the P4 exclusions and `index.html`). The swap half is run once and deleted.

**P11. Merge timing.** The pixel-identical pass is committed first. Merges chosen on the review page land as a second commit, so any visual change traces to that commit alone.

**P12. CSS variables come from a generated file (revises P2).** The TypeScript palette stays the single source. A small script generates `tokens.css` from it. `tokens.css` is committed and imported before all other CSS. A test fails if `tokens.css` is out of sync with the palette. Do not write CSS variables from script at startup: in the built site the stylesheet loads before the script, so the first frame would paint without colours. `index.html` keeps its literal `theme-color`.

**P13. Proof of no change (revises P5).** Two proofs, both required.
1. Screenshots at 1920x1080, device pixel ratio 1, reduced motion on, system Chrome, waiting at least 2.5 seconds after the WebGL canvas is ready. Capture the baseline three times first to measure this machine's noise. Pass rule: no pixel differs by more than 2 shades per channel, and under 0.01% of pixels differ.
2. A script confirms that every colour site maps from its old value to the exact same value through its token. This covers closed panels and colours that only show mid-animation.

**P14. Screenshot set.** All 32 presented slides, plus: notes view, slide overview, phone panel, presenter window (`?view=presenter`), phone remote page (`?view=remote`), illustrations gallery (`?view=illustrations`) and checkpoint deck (`?view=checkpoint`). Jump to slides with the `#slide-<id>` hash.

**P15. Format and computed colours.** Opaque colours are stored as `#rrggbb` strings. One helper converts a token to a number for Three.js sites that need one. Tokens that feed the `rgba(hex, a)` helper in `src/visuals/Glow.tsx` must stay 6-digit. Computed colours keep their maths and only their inputs become tokens: the `lerp` in `src/slides/Closing.tsx`, `multiplyScalar(tone)` in `src/visuals/ChromePrimitives.tsx`, and the computed alphas in `Glow.tsx`. The closing halo's literal `rgba(255,255,255,a)` uses the white token with the same computed alpha.

**P16. Commit order.** Four small commits on `colour-tokens`:
1. Palette file, generator and `tokens.css`.
2. The swap.
3. The guard test.
4. Renames from placeholder names to real names, plus a short palette note in `DESIGN.md`.

Run both proofs after commit 2 and again after commit 4. Merges (P11) come after these, as their own commit.

**P17. Merge table.** Sufyan's choices from the review page (20 Nov 2026), with chains followed to one survivor per group. Apply exactly this table in the merge commit. Merges apply only to the fully opaque colours listed. See-through variants of these colours are not touched.

| Survivor | Merged into it |
|---|---|
| `#e6ebf5` | `#e7ecf4` `#e6edfa` `#e9eef8` `#d8e5ff` `#dde7f8` `#dce7ff` `#e2e9fc` |
| `#aab5c9` | `#acb5c9` `#a8b6cc` `#a9b9d0` `#aab9d0` `#aebbd1` |
| `#f1f3fa` | `#eef1f8` `#eef2ff` `#eef3ff` `#f1f3f8` `#f3f4fc` `#f2f5ff` `#f5f7ff` |
| `#536179` | `#54627b` |
| `#05060c` | `#05070c` |
| `#0b0e17` | `#0a0d16` `#0b0d15` `#0a0d17` |
| `#8993aa` | `#8491aa` `#8a94a8` `#8a94aa` `#8f9ab0` |
| `#d9e2ff` | `#d0dcf0` `#d6deed` `#dae0ed` `#d1dfff` |
| `#11131d` | `#10141e` `#111725` `#141824` |
| `#cbd5e6` | `#c4d0e7` `#c4d2ee` `#c9d5e8` |
| `#273247` | `#252e40` |
| `#677082` | `#67728d` `#687389` `#67748b` `#6e778b` |
| `#9aa5ba` | `#98a4bc` `#9aa4b8` `#9aabc7` |
| `#a7b2c8` | `#a2aec5` `#a7b0c1` |
| `#ff7a2e` | `#ff7a3c` |
| `#b3c3df` | `#bcc9df` `#becbe0` `#c1ccdf` |
| `#202532` | `#1d283d` `#202838` |
| `#171b25` | `#171d2b` |
| `#d9a93a` | `#e2b041` |

That is 57 colours merged away, taking about 126 distinct colours to about 69.

**P18. Excluded from merging.** These three keep their current values, even though the review page offered merges for them. They drive whole 3D scenes and were tuned by eye.
- `#d5dce9`: the chrome base tint (`src/visuals/ChromePrimitives.tsx`).
- `#222632`: the main reflection room background (`src/visuals/Environment.tsx`).
- `#474b56`: the hollow book's reflection room background (`src/visuals/Environment.tsx`).

Added after Sufyan's review of the before and after page (20 Nov 2026):
- `#2f374a`: the lecture hall seats (`lecture.seat`). The merge into `#273247` made the seats too dark, so it was reverted.

**P19. Same value, separate tokens.** When a merge joins colours that do different jobs (for example book gold and rocket gold, or a 3D rim and a panel border), they get the same value but stay separate tokens. Only colours doing the same job share one token.

**P20. Checking the merge commit.** The merge commit changes pixels on purpose, so the P13 screenshot rule does not apply to it. Instead, re-capture the P14 set and give Sufyan a before and after comparison of every capture that changed. Sufyan approves by eye before anything is pushed.

## Open decisions

None. Waiting for Sufyan to confirm the spec before implementation starts.
