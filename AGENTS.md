# Friends of Figma talk

Read DESIGN.md, docs/implementation-spec.md and progress.md before changing the presentation.

- Current phase: full35slide rollout authorized after the five-slide review. Illustration selections are16C,18B,32A. Do not deploy unless asked.
- Figma Slides8CqcgYkpohVGMg2b9ag5FW is the source of truth for visible content, slide order, image crops and speaker notes. Current correct first UX module date is2015, corrected upstream.
- Keep source snapshots/data separate from per-slide layout modules. Use permanent Figma IDs for identity. Never silently replace content or notes using the older browser deck.
- The user selected flatter-centre chrome with raised lettering and silver slab displays. Preserve approved shapes, materials, typography and restrained accents when refactoring.
- Create reusable visual primitives, but keep individual slide composition and overrides editable. Changing one slide should not require altering a shared component.
- Public speaker notes are intentional. Never ship Figma credentials. Render notes as text.
- Preserve skipped alternatives in source records, excluded from audience sequence.
- Keep tests focused on source fidelity, crop preservation, navigation, presenter state and fallback behavior. Browser screenshots are part of visual verification; no claim of physical projector testing without evidence.
- Do not commit, push or deploy unless asked. Update progress.md before reporting a material checkpoint complete.

- Current sizing rule: fixed 16:9 on every screen, including phones. Scale uniformly, cap width, keep space background around it. Portrait rearrangement is deferred.
