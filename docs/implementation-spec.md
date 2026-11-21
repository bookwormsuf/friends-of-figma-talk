# Friends of Figma presentation implementation spec

Status: full35slide rollout authorized after five-slide review, 10 November 2026.

## Pinned implementation decisions

1. Authoritative content: Figma Slides supplies audience text, order, images and speaker notes. Preserve wording and notes verbatim. Do not source content from the older browser deck.
2. Visual direction: deep-space chrome, flatter-centre chrome shapes with raised lettering, matching “to” capsule, equal main text sizes, horizontally extensible burst, continuous slow travelling metal highlight. Floating images use silver slab displays.
3. Layout authoring: reusable components with editable settings per slide for position, size and spacing. Individual slide code edits are allowed. A shared component change must not be needed for a one-slide adjustment.
4. Source refresh: deliberate Figma snapshot and change report before applying updates. Keep imported content and notes separate from local layout adjustments so sync does not overwrite layout edits.
5. Notes publication: speaker notes are intentionally available to public website visitors so they can read what the presenter intended to say. Do not strip them from the public build.
6. Scope: present every unskipped slide in Figma order. Retain skipped alternatives in the source record only, outside the audience sequence.
7. Destination: this repository. Prepare for eventual Vercel deployment. The deck is deployed at https://friends-of-figma-talk.vercel.app.
8. Keep earlier design explorations. Some are kept in `docs/explorations/`.
9. Stack: React, TypeScript and Vite, producing a static website suitable for Vercel without a runtime server. Reusable visual components and a separate layout file for each slide.
10. Notes experience: an expandable public notes panel plus a separate presenter window containing the current slide, its notes and the next slide.
11. Navigation: natural scrolling, gentle snapping, arrow-key navigation and direct links. One website section per unskipped Figma slide. Do not invent additional reveal steps. Long sections must scroll fully; keyboard navigation must respect inputs and interactive components.
12. Illustration scope: slides 16, 18 and 32 may be restyled in chrome while preserving meaning, labels and relationships. Provide illustration variations for user selection. Preserve photos and screenshots with source crops.
13. User-confirmed correction: first UX module was in 2015. Apply 2015 in the presentation. Do not silently revert to the stale 2016 timeline on a later import. How the source correction is reconciled remains pending.
14. Retain previously requested reduced-motion behavior, static fallback without WebGL, accessible HTML text, restrained rainbow accents, gentle motion, and offscreen/hidden-tab animation suspension.

15. Illustration review: three variations each for slides 16, 18 and 32, in a separate comparison page. Use the closest faithful match provisionally until the user selects.
16. Stable identity: use Figma slide node IDs, not positions, to associate source content and custom layouts. Reorders must retain layout assignments. Flag additions, deletions and missing assets for review; retain the last valid import until a proposed import passes checks.
17. Correct the Figma slide 10 timeline from 2016 to 2015, then refresh the source snapshot.
18. Delivery checkpoint: first build reusable components and five representative slides, then obtain visual review before extending to all 35. Use slides 1 (opening), 3 (cropped photo), 10 (timeline), 16 (diagram), and 29 (screenshots), in source order.

## Verified source facts, 10 November 2026

Fresh read: 35 main slides and six skipped alternatives. All 41 have notes. Main text, notes and order match the prior snapshot. 30 visible image instances with 29 unique hashes. No embedded video or interactive nodes detected.

Images must retain their individual crops, including the different crops of the same photo on slides 2 and 3. Hidden previous drafts on slides 18 and 32 are not current audience content. Slide 16 notes include a bracketed diagram instruction; it belongs in notes, not visible slide text.

Source discrepancy resolved by the user: 2015 is correct. Slide 10 in the captured Figma source still says 2016; reconcile explicitly before the final fidelity check.

## Pinned implementation contract

### Content and layouts

- Save a versioned, immutable Figma snapshot with capture time, file key, source slide IDs, order, skipped flags, visible text nodes, notes, and image-instance bounds/transforms/crops. Hidden ancestor content stays excluded from the audience representation.
- Normalize a typed deck manifest from that snapshot. Each slide has its source ID, source order, text keyed by source node ID, verbatim notes, and asset references. Local assets have stable filenames and provenance; each image instance retains its own crop even when files are deduplicated.
- Keep one composition module per slide, using shared chrome primitives and local layout settings. Layouts reference content IDs rather than copying prose. Position, scale, spacing, image framing and mobile overrides are editable locally. No browser drag-and-drop editor in this phase.
- Import occurs through an explicit agent-assisted Figma refresh and local validation command, not a runtime Figma connection or automatic scrape. Review text/notes/order/assets diffs before promoting a proposed snapshot. Unknown slide types or missing assets stop promotion with an actionable report. Removed-slide layouts remain archived. New slides require a composition assignment. No Figma credentials in the public app.

### Rendering and interaction

- React + TypeScript + Vite. Use Three.js through React Three Fiber and Drei, honoring the original React rendering requirement. Port the approved geometry, materials, lighting and fonts without redesigning them.
- One shared WebGL canvas/renderer across the presentation. Render visible scene content only, preload adjacent assets, cache shared geometry/materials, and dispose unneeded resources. HTML supplies readable accessible text and interaction; raised lettering retains the approved CSS depth treatment.
- Shared components: presentation section, chrome text object, metal connector, silver slab display, diagram primitives, notes panel, navigation and progress indicator. Per-slide composition remains independent.
- Use native scrolling and proximity snapping, cancellable arrow navigation and stable slide-ID URLs. No extra reveal steps. Respect input focus and let tall sections scroll before advancing.
- Default motion is slow and atmospheric. Reduced motion, paused motion, hidden tabs and offscreen scenes suspend animation. If WebGL fails, show stable SVG/CSS shapes and ordinary images, retaining all text, notes and navigation.
- Public notes panel starts closed. Presenter window uses a same-origin message channel to follow the audience window, shows current slide/notes/next slide, and does not move audience focus. A blocked popup presents an explicit open-window link. Either window closing must not break the other. Notes are plain text, not injected HTML.
- Comparison page hosts three options for each of slides 16, 18 and 32. It is outside the narrative sequence. Only the selected/default illustration appears on its actual slide.

### Validation and delivery

1. Correct Figma date and capture source, then establish repository structure and lockfile using reputable registry packages with pinned resolved versions. Preserve licences and asset provenance.
2. Build the five-slide checkpoint and component examples, including public notes and presenter navigation. Provide the illustration comparison page for review.
3. Check source text/notes/order and crops, responsive fitting, keyboard navigation, rapid navigation cancellation, image enlargement, presenter synchronization, reduced motion, WebGL failure and clean production build. Compare screenshots at desktop and mobile sizes. Record software-browser limits separately from physical projector testing.
4. Stop for the agreed five-slide visual checkpoint. After user review, extend to all35 unskipped slides, keeping per-slide tweaks local, and repeat full-deck fidelity/bounds checks.
5. Prepare a static Vercel build and deployment instructions. Do not deploy as part of this phase. A deployment triggers the applicable security review before publishing.

User confirmed shared understanding and authorized implementation. Figma date correction is complete.

## Approved full-deck rollout

User selected illustration16C (black box),18B (connect the evidence),32A (depth and a new path), then authorized all35slides. Apply these variants in the main deck; retain alternatives in the comparison page. Export remaining sourceimageinstances, preserve allvisiblecontent/notes/order/crops, retain per-slide editablelayoutsettings, and verify all35. No deployment requested.


## Approved framing revision, 10 November 2026
Fixed16:9 composition on every screen, including phones, with uniform scaling,1440px displaywidth cap and surrounding space background. Portrait layout changes deferred. Rounded silver slabs hug image content; explicit padding-only crops allowed while preserving original assets. DESIGN.md is the current visual maintenance guide. Arrow navigation works after focusing ordinary buttons and in presenter view. Fix slab motion across clock resets.

## Notes view, pinned 18 November 2026
Replaces decision 10 and the "public notes panel" lines above. Execute verbatim.

1. The side notes panel is removed. The Notes button and the N key open the **Notes view**: the presenter layout (current slide, speaker notes with Previous and Next, next slide) filling the audience window. N, Esc or the Close button returns to the slide.
2. One layout component draws both the Notes view and the presenter window. It takes the slides, sections, section, step, a navigate function, the edge flags and a header. It holds no navigation state of its own.
3. The Notes view is driven by the audience window's own position from `usePresentation`. There is one position. Closing the Notes view lands on the slide and step reached inside it.
4. Open Notes view no longer blocks navigation. Arrow keys, Page Up, Page Down and the Previous and Next buttons all move the deck. The held-key guard still applies.
5. Slides in the Notes view are still pictures, as in the presenter window. In-slide steps take one press each and the header shows "step n of m".
6. Header in the Notes view: "Close" with an Esc key hint on the right. No sync status. Slide count and step sit beside the "Speaker notes" title, in the Notes view and the presenter window. The presenter window header keeps its link and sync status.
7. A Next or Previous sent from the presenter window or the phone remote does not close the Notes view. It stays open and moves with the press. The overview and an enlarged image still close. (Changed 18 November 2026 at Sufyan's request; the earlier rule closed the Notes view first.)
8. The presenter window keeps opening as a separate window and keeps following the audience window over the message channel.
9. Slide changes inside the Notes view are instant. The deck behind does not glide.
10. O and H do nothing while the Notes view is open.
11. No link opens the Notes view. It always starts closed.
12. Do not push until Sufyan has tried it on the presenting machine.

## Phone remote, pinned 18 November 2026
Execute verbatim.

1. Relay: Supabase Realtime Broadcast. The presenter view is already a remote; it gains a network path beside the same-browser one.
2. Pairing: a "Phone ↗" toolbar button on the audience window shows a QR code. The link carries a long random code that is the only password.
3. Phone shows the presenter layout (current slide, notes, next slide) plus large Previous and Next buttons fixed to the bottom of the screen.
4. When not connected the phone shows a "Not connected" banner and its buttons do nothing. Presses are dropped, never queued. A remote never moves on its own.
5. The remote page keeps the phone screen awake while open, where the browser allows it.
6. Before relying on it: a full run-through on Sufyan's phone on wifi and on mobile data. The laptop's keys and clicker always work without the relay.
7. Supabase project: a new empty project used only for this. No tables.
8. The project URL and publishable key come from the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`, read at build time by `src/shell/remoteConfig.ts`. They are never committed. Blank values hide the "Phone ↗" button.
9. The laptop connects to Supabase only after "Phone ↗" is pressed, and the client library is loaded only then. If the remote was on, a reload reconnects by itself (flag in sessionStorage).
10. The QR panel carries a one-line warning to pair before projecting. The panel can be closed while the remote stays on.
11. Connected means both: the Supabase channel reports subscribed, and the laptop answered in the last 7 seconds. The phone asks every 2 seconds and the laptop answers each ask with where it is. Channel closing shows the banner at once.
12. Takeover defence, three layers. First phone wins: the laptop locks onto the first device that pairs and ignores presses from others, which see "Another device is in control". "Turn remote off" stops the laptop listening at once. "New code" makes a fresh code and QR; old links stop working. The lock survives a laptop reload.
13. Shift + R on the laptop turns the remote off from anywhere. Turning it on is only by clicking "Phone ↗".
14. The Phone panel shows "1 phone connected" or "No phone connected".
15. Phone layout: Next is a very large button across the bottom of the screen, Previous a smaller one above it on the left. Notes scroll above.
16. Volume buttons are not possible from a web page on iPhone. A native app is a later exploration, after the web version.
17. The phone shows only the current slide, its step count and the notes. No next-slide preview. This replaces the "presenter layout" wording in 3. (Sufyan said this of "the mobile app"; applied to the web remote as well.)
18. A press says which slide and step it was made from. The laptop moves only if that is where the deck is now and the press before it has finished (or 1.5 seconds have passed). Otherwise it answers with where it is and does not move. One tap never moves two steps.
19. The relay line is checked every 5 seconds. When the phone page comes back into view it asks at once; with no answer in 2 seconds it starts a fresh connection.
20. Known limit, accepted for 19 November: someone who holds the pairing code can read the owner's device id and pretend to be it. "New code" and Shift + R are the defences. Signed presses are a later follow-up.
21. The Phone panel is a plain side panel, not a dialog. It does not trap focus.

## Small additions, pinned 18 November 2026
1. The progress bar fills on every press of Next, in-slide steps included.
2. Escape brings the UI back when it is hidden. Order per press: overview, phone panel, Notes view, hidden UI. Not while an enlarged image is open.
