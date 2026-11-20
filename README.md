# Friends of Figma talk

A browser slide deck for Sufyan's Friends of Figma talk, **From "What if" to "Try this"**. It has 32 slides. Live at https://friends-of-figma-talk.vercel.app

Slide text, order, image crops and speaker notes come from a Figma Slides file. Six skipped Figma alternatives stay in the source record and are not shown in the talk.

## Features

- 3D chrome scenes (cloud, spark, hollow book, lecture screen and more), drawn with React Three Fiber.
- Notes view: shows the current slide, its speaker notes and the next slide. Open it with **Notes** or **N**. The notes are public on purpose.
- Presenter window: a separate window with the same layout. It follows the audience window and needs no server.
- Phone remote: use your phone to move through the slides (see below).
- Pause motion: freezes background animation. System reduced-motion settings are respected.
- Slide picker, direct links such as `/#slide-3-47`, and click-to-enlarge screenshots.

## Run it

```sh
npm ci
npm run dev
npm test
npm run build
```

Open http://127.0.0.1:5173 after `npm run dev`. Node 22.12 or newer is needed. All fonts and images are local. The deck makes no Figma connection at run time.

Add `?editor` to the URL to open the dialkit tuning panels. Copy the values you like into `src/slides/layouts.ts`. The panel only saves in your browser.

Other checks: `npm run check:source` checks the slide data. `npm run preview` serves the production build.

## How slides are defined

- `src/data/deck.json` holds the text, notes and image details imported from Figma. Do not edit prose in layout code.
- `src/slides/` holds one composition per slide. `src/slides/layouts.ts` holds the settings for each (position, size, spacing).
- `src/visuals/` holds the shared 3D pieces. `src/shell/` holds scrolling, navigation, notes and the remotes.
- `source/` and `scripts/` hold the source record and the checks that guard imports from Figma. Slides are tied to their Figma node IDs, so reordering keeps each slide's layout.

Read `DESIGN.md` for the style rules and `docs/implementation-spec.md` for the decisions behind the build.

## Colours

Every colour lives in `src/theme/palette.ts`. CSS reads the same values from `src/theme/tokens.css`, which is generated. After you change the palette, run `npm run tokens`. `npm test` fails if `tokens.css` is out of date or if raw colours appear in `src`.

## Phone remote

Pressing "Phone" shows a QR code. The phone opens the link and asks the laptop to move, through a Supabase Realtime channel. The channel is named by a random code made for each session. The first phone to pair becomes the owner. The laptop ignores other phones.

Nothing connects to Supabase until you press that button. "New code" and Shift + R on the laptop shut a phone out. Pair before you project, because anyone with the link's code could try to pair first.

### Use your own Supabase project

This repo does not include a Supabase project. If you use it, link it to your own.

1. Create a free project at https://supabase.com. It needs no tables.
2. Copy `.env.example` to `.env.local`.
3. Fill in `VITE_SUPABASE_URL` with the project URL and `VITE_SUPABASE_KEY` with the publishable key. Never use the secret key. The values end up in the built site, where anyone can read them.
4. On your host, set the same two variables and redeploy.

While either value is blank, the phone remote is off. The "Phone" button is hidden and the site never contacts Supabase.

The full rules are in `docs/implementation-spec.md` under "Phone remote".

There is also an iPhone clicker app that works with the deployed deck: https://github.com/bookwormsuf/fof-clicker

## Deployment

This is a static Vite build. Build command `npm run build`, output directory `dist`. The phone remote needs two environment variables, described above. Everything else works without them. The same page serves the audience, presenter and illustration modes through query parameters. The live site is deployed on Vercel.

## Source

The slides were made in Figma Slides. The first UX module date was corrected in Figma to 2015 before the import.

## Licence

The code is MIT. See `LICENSE`. The talk content is not MIT, and all rights are reserved. See `LICENSE-CONTENT.md`. Fonts in `public/fonts` are under the SIL Open Font Licence.
