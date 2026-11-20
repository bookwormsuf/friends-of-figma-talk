# Closing animation spec

Status: grilled with and confirmed by Sufyan, 15 November 2026. Built locally. He picked the calm ending and tuned it (P22). Not yet committed or deployed. Pinned decisions below are final and are to be followed exactly. Anything under "Open" is not decided.

## What it is

A wordless animation that plays at the very end of the talk, on slide 32 (Figma 4:140, "Try for half an hour tonight."). Five beats:

1. A cloud of clouds.
2. The clouds separate to show one cloud in the centre.
3. The centre cloud glows.
4. The centre cloud transforms into a spark.
5. The spark glows brightly.

## Pinned implementation decisions

- **P1. Location.** The animation is extra in-slide steps on slide 4:140. No new Figma slide, no change to Figma content, order or notes. Sufyan reads the existing slide 32 script over it.
- **P2. No words.** No shape in the animation carries text: not the small clouds, not the centre cloud, not the spark.
- **P3. Slide 31 stays.** Slide 4:143 ("Try this.") is kept as it is, before slide 32.
- **P4. Two presses of Next.** Press one plays beats 1 to 3 and holds on the glowing centre cloud. Press two plays beats 4 and 5 and holds on the glowing spark. So 4:140 has `steps:2`.
- **P5. Three variations, same beats.** The five beats and P1 to P4 are identical in all three. Only the feel of the motion differs:
  - Calm: clouds drift apart slowly, the cloud melts into the spark.
  - Energetic: clouds are pushed outward fast, the cloud pops into the spark with a flash.
  - Playful: clouds bounce away one by one, the cloud wobbles and puffs out its points.

- **P6. The words leave upward.** On press one, "Try for half an hour tonight." floats up and off the top of the stage. It does not fade in place and does not stay.
- **P7. Loose swarm of 22.** Beat 1 is a loose swarm of 22 small clouds (21 plus the hidden centre one) with no overall silhouette. It is not arranged to look like one big cloud. Raised from about 14 after Sufyan saw the first build and asked for more.
- **P8. The others form a ring.** In beat 2 the other clouds move outward into a rough circle around the centre cloud, nearer the stage edges than the centre. They stay on stage. They do not leave or fade out. After seeing the first build Sufyan asked for the ring to be more spread out: it is now wider, and the clouds alternate between an inner and an outer lane so neighbours do not bunch up.
- **P9. Centre cloud hidden at first.** The centre cloud is behind the swarm in beat 1 and is only seen once the others part.
- **P10. Small shape, very wide glow.** The centre cloud and the spark stay small. The glow is what gets big: it spreads very wide across the stage. This replaces the earlier idea of matching the statement-slide sizes.
- **P11. No white flash.** No variation has a full-screen flash. Clouds glow blue to purple and sparks orange to pink, as elsewhere in the deck.
- **P12. Back and paused behaviour.** Previous steps back one press at a time, playing in reverse. With motion paused or without WebGL, each press shows the still end state: glowing centre cloud, then glowing spark.
- **P13. Comparison switch.** `?ending=1|2|3` selects calm, energetic or playful in the local preview. No deploy until Sufyan picks. After the pick, the switch and the two unused variations are deleted.

- **P14. The swarm rises from below.** After the words leave upward, the clouds float up from below the stage and gather in the middle.
- **P15. Size is a second comparison axis.** `?size=1|2|3` in the local preview, independent of `?ending`. Widths as a share of stage width, small clouds / centre cloud and spark: size 1 = 7% / 11%, size 2 = 9% / 14%, size 3 = 11% / 19%. The spark is always the same width as the centre cloud it came from. In every size the cloud's glow reaches most of the way to the ring and the spark's glow reaches past the ring to the stage edges. Default with no parameter is `ending=1`, `size=2`. Deleted after the pick, like P13.
- **P16. Only the centre glows.** The 13 other clouds have no glow at any point.
- **P17. Ring behaviour.** The ring clouds keep a gentle float in place. They do not circle. When the spark glows they pick up a warm orange-pink tint on the side facing it. Extended after Sufyan's review: the same happens with the cloud's glow, in violet, so the ring always reflects whatever the centre is glowing.
- **P18. True reshape, through a blob.** Beat 4 is one object whose outline bends from cloud to a small round blob, rests there briefly, then bends out into the spark, in all three variations. It is not a swap or a crossfade between two objects. The blob step and the next line were added by Sufyan after the first build.
- **P20. Slightly oval spark.** The spark is a little wider than it is tall (height 0.8 of width).
- **P19. Starting durations.** Press 1 / press 2: calm 7s / 4s, energetic 4s / 1.5s, playful 5.5s / 3s. Pressing Next before a press finishes jumps ahead to the next step.

- **P21. Dials.** In editor mode (`?editor`) a dialkit panel named "Closing animation" controls the ending, speed, cloud count and width, centre width, blob size, spark oval, ring size and lanes, glow spread and brightness, ring warmth and how fast the words leave. Dial values are saved in the browser only. They change nothing for anyone not in editor mode. Once Sufyan settles on values they are written into `closingConfig` as the new defaults. Added at Sufyan's request after the first build.

- **P22. The pick.** Sufyan picked the calm ending and tuned it with the dials on 15 November 2026. These are now the defaults in `closingConfig`: 25 other clouds, small width 9.5, centre width 17.5, blob 0.35, spark oval 0.64, ring 38 wide and 39.5 tall with lanes at 0.85 and 1.1, cloud glow spread 0.56, spark glow spread 1, glow brightness 1.3, ring light 1.55, words leave 0.15. His speed of 0.75 is folded into the durations: 9.3 seconds for press one, 5.3 for press two. This supersedes the numbers in P7, P15, P19 and P20. As P13 and P15 required, the `?ending` and `?size` switches, the three size options and the energetic and playful endings are removed from the live code. They are kept, unbuilt, in `docs/explorations/closing-three-variations`. The dial panel (P21) stays, now without the ending dial.

## Pinned build decisions

- **B1. Files.** `src/slides/Closing.tsx` (composition), `src/slides/closingMotion.ts` (pure motion maths), `tests/closing.test.ts`. Layout entry `'4:140':{kind:'closing',steps:2,...}` in `src/slides/layouts.ts`, keeping the slide's current `fontScale` and `textWidth` for the words.
- **B2. Words still come from the source.** The slide's two text nodes are rendered from the source snapshot as now. `source/content-contracts.json` and `source/layout-map.json` do not change.
- **B3. Reshape geometry.** Add a helper in `src/visuals/geometry.ts` that builds cloud and spark cushions with matching vertex counts and blends between them by a 0 to 1 amount. Uses the house finish `smoothChrome`. Existing `cushion` and `ChromeObject` behaviour is unchanged for every other slide.
- **B4. Glow.** Two layers. The existing `Glow` hugs the shape (one for the cloud, one for the spark, cross-faded through a live `level` dimmer). A separate soft elliptical halo does the very wide spread, tinted from the cloud's colours to the spark's. The halo fades to nothing before the stage edge so it is never clipped. Changed during the build: painting the existing `Glow` at this reach would have needed a canvas several thousand pixels wide. The ring tint in P17 is a warm point light placed behind the shapes, so it only catches the ring clouds' edges that face the centre. No extra glow sprites on the ring.
- **B5. One timeline number.** As in `splitMotion.ts`, a single number p runs the whole animation: 0 to 1 is press one, 1 to 2 is press two. `closingState(variation, size, p)` is pure and returns positions, scales, reshape amount and glow strength for every object. `advanceClosing` moves p towards the current step. `Closing.tsx` only draws what they return. All timings and sizes live in `closingConfig` in `closingMotion.ts`.
- **B6. Tests.** Test the pure function only: 14 clouds, centre hidden at the start of beat 1, every ring cloud farther from the centre than the swarm radius at the end of beat 2 and inside the stage, reshape amount 0 at the end of press 1 and 1 at the end of press 2, glow never decreases across beats 3 to 5 end states, reverse returns to the start, paused shows end states. No rendered-component tests.
- **B7. Performance guard.** Small clouds share one geometry and one material. No per-cloud glow. Target: no visible stutter in desktop Chrome at 1440×900 on Sufyan's laptop. Projector hardware is not tested.
- **B8. No deploy, no Figma change.** Work stays local until Sufyan picks. `progress.md` is updated at each checkpoint.

## Open

Nothing. Next is Sufyan's go-ahead to commit and deploy.
