# Authoritative Figma content

`current.json` is the promoted source snapshot. Dated snapshots of earlier imports are kept privately and are not in this repository. The initial import followed the user-approved correction of the first UX module year to 2015 in Figma. All 41 slides are retained: 35 main slides and six skipped alternatives. The full presentation renders all 35 main slides in source order. The earlier five-slide checkpoint remains available separately.

`src/data/deck.json` is generated from the source and `asset-bindings.json`. `src/data/deck.ts` exports typed `allSlides`, `presentationSlides` and `checkpointSlides`. It does not rewrite text or notes. All 30 visible image instances are now `ready`, with local exports and explicit dimensions.

`layout-map.json` assigns stable source IDs to compositions. `content-contracts.json` pins the exact text node IDs each composition has reviewed, including empty sets for image-only slides. Added, removed or replaced text IDs block promotion even with `--reviewed`; update the composition bindings and this contract together after review. Ordinary wording edits under the same IDs still appear in the diff and may be deliberately promoted. Source refresh never rewrites it or `src/slides`. Image instances retain their original hash, bounds, transform, Figma crop settings and slide-relative transform. Page absolute transforms are recorded for provenance but do not alone invalidate crops when slides move in Figma's grid.

## Deliberate refresh

1. Use the official Figma connector to capture a new snapshot, keeping schemaVersion 1 and the current fields: capture time, file key, source order, visible text, verbatim notes, skipped flags, image metadata and slide-relative transforms. Exclude hidden ancestor content. Keep skipped alternatives in the record.
2. Save it outside `source/current.json`, for example `/tmp/proposed-source.json`. Never replace the current file before checking it.
3. Run `node scripts/diff-source.mjs source/current.json /tmp/proposed-source.json`.
4. Run `node scripts/import-source.mjs /tmp/proposed-source.json`. This reports changes and checks without changing files. New IDs require explicit composition assignments. Missing files, changed image content/crops, unsupported media and a stale 2016 date block promotion. Every unskipped slide now requires a composition, a reviewed text-node contract and ready image bindings.
5. Export changed image instances from Figma. Update their asset bindings with the new source metadata and file hashes, then review the diff again. Keep removed slide compositions archived; the import script never deletes them.
6. After reviewing content, order, notes, assets and layout assignments, run `node scripts/import-source.mjs /tmp/proposed-source.json --apply --reviewed`. This archives both snapshots under `source/snapshots/` (ignored by git) and replaces source/generated data only.
7. Run `node scripts/validate-source.mjs` and `node --test tests/source.test.mjs` before visual checks.

No runtime Figma connection, credentials or expiring asset URLs are stored. Public speaker notes are intentional, as approved in the implementation spec. Source notes may contain editorial instructions; they remain in notes and are never automatically inserted into audience text.

## Checks

Ten source tests cover source order, skipped slide handling, exact text/notes, the 2015 correction, additions/deletions/reorders, missing presentation files stale crop bindings, reviewed content-node identities, and the actual import command preserving last-valid files when node bindings change. Validation compares the generated manifest with a fresh normalization. Crop preservation was checked from the exported images and source bounds, including parent clipping viewports. Full-rollout snapshot `snapshots/2026-11-10-full-approved.json` records a fresh Figma read with unchanged visible text, notes and order. These are agent checks, not a human review of the talk.
