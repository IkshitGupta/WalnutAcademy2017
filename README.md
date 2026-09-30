# Walnut Academy

Website for Walnut Academy, an English medium school in Mansarovar, Jaipur,
teaching Play Group through Class 5.

The site is informational: no admissions form, no payments, no login. It is a
single, richly sectioned page that answers what a parent searching locally wants
to know: what the school is, where it is, which classes it runs, and how to
call it.

## Stack

| Layer     | Choice                                                                |
| --------- | --------------------------------------------------------------------- |
| Monorepo  | Turborepo + pnpm workspaces                                           |
| Framework | Next.js 16 (App Router) with `output: "export"`, a fully static build |
| Language  | TypeScript, strict                                                    |
| Styling   | Tailwind CSS v4, theme tokens sampled from the school crest           |
| Fonts     | Nunito (headings) and Inter (body), self-hosted via `next/font`       |
| Icons     | lucide-react                                                          |
| Images    | Pre-rendered to WebP at build time with `sharp`                       |

## Layout

```
.
├── apps/
│   └── web/                 the website
│       ├── assets/          original photographs (build inputs)
│       ├── public/images/   generated WebP renditions (do not edit by hand)
│       ├── scripts/         build-time image pipeline, export check, static server
│       ├── tests/           Playwright smoke tests
│       └── src/
│           ├── app/         layout, page, metadata, robots, sitemap
│           ├── components/  header, footer, action bar, page sections
│           └── content/     all copy and facts, in one file
└── packages/
    └── ui/                  brand primitives shared with future apps
```

## Commands

```bash
pnpm install        # once
pnpm dev            # development server
pnpm build          # optimise images, then produce apps/web/out
pnpm lint
pnpm typecheck
pnpm colours:check  # artwork colours still match the palette
pnpm test           # lockfile and colour guards, then build and verify the export
pnpm test:e2e       # browser smoke tests against the built export
pnpm format
```

`pnpm build` writes a static site to `apps/web/out`, deployable to any static
host. No server or database is required.

`pnpm dev` also prints a network address alongside `localhost`, which is how to
open the site on a phone on the same wifi, which is worth doing since most
visitors will arrive on one. Next only serves its development resources to
origins it
has been told about, so `next.config.ts` reads this machine's own addresses
from its network interfaces and names them. Without that, the page loads over
the network but hot reloading does not. Nothing there affects a build.

## Tests

Three layers, all run in CI:

- **`pnpm colours:check`** compares the hex literals in the `packages/ui`
  artwork against the palette in `globals.css`. Instant, needs no dependencies,
  and runs before anything is installed. See
  [The crest and mascot](#the-crest-and-mascot) for why those colours cannot be
  written as `var(--color-*)`, and therefore why they need guarding from the
  outside. It also reports any hex in `packages/ui` that is neither tracked
  against a token nor listed as artwork-owned, so a new colour has to be a
  decision rather than an accident.
- **`pnpm test`** builds the export and asserts the generated HTML still
  carries the contact details, every class and learning area, the recognition
  wording, valid JSON-LD matching `school.ts`, and every `srcset` rendition.
  `<script>` and `<style>` are stripped first, so content embedded in Next's RSC
  payload cannot mask something that no longer renders.
- **`pnpm test:e2e`** runs Playwright against the built export rather than the
  dev server, on a mobile and a desktop viewport. Covers the areas that static
  checks cannot reach: the mobile menu (full-viewport overlay, focus handling,
  Escape, focus restoration), the persistent call bar, anchor navigation, and
  that every image actually decodes.

The menu test exists because of a specific bug: `backdrop-filter` on the header
creates a containing block, which scoped the `fixed` overlay to the 80px header
instead of the viewport. The assertion on the overlay's height catches that
class of regression.

The header height test exists for another. The header compacts once the page
moves, which shortens it, and because it sits in the flow the browser then
corrects the scroll position to hold the content under it still. That correction
is around 16px, so a single threshold at 8px put the scroll position back on the
far side of it and the header changed height for as long as the page was left
alone. `COMPACT_BELOW` and `EXPAND_ABOVE` in `site-header.tsx` are far enough
apart to absorb the correction, and the test stops at several offsets either
side of both, because the offsets that provoke it differ between the dev server
and the export.

### A note on the lockfile

If you install packages from behind a corporate npm mirror, pnpm records an
absolute `tarball:` URL for every package, pinning `pnpm-lock.yaml` to that
private host. The lockfile then publishes the hostname and `pnpm install` fails
for everyone else, CI included.

`pnpm test` and CI both run a guard that fails when this happens. If it fires:

```bash
pnpm lockfile:fix
```

The integrity hashes are npm's own and stay valid. Only the URL override is
removed, so pnpm falls back to deriving the URL from whichever registry is
configured. Expect to need this after any `pnpm add` or `pnpm remove` run behind
such a mirror.

## Editing content

Almost everything the site says lives in
[`apps/web/src/content/school.ts`](apps/web/src/content/school.ts): contact
details, timings, class descriptions, learning areas, facilities, the
photographs and the leadership messages. Editing that file is enough for most
changes; the components read from it.

Facilities carry a `group`, rendered in the order the groups first appear, so a
new entry needs a `group` and is best placed beside its siblings. The grouping
is a reading aid only; the prospectus lists them flat.

Learning areas and facilities also carry an `icon`, naming one of the icons
mapped at the top of `learning-areas.tsx` and `features.tsx`. A new entry needs
a line in both the content file and that map.

Em dashes are not used anywhere on the site, in its copy, its metadata or its
source comments. Where one would go, recast the sentence: split it in two, use
a colon to introduce a list, or fold the aside in with commas. En dashes are
fine in ranges, as in `2026–27` and `8:30 AM – 2:00 PM`.

The academic session in the "Admissions open for …" strip above the header, and
in the Visit panel, is not written down anywhere. It is worked out from the
date, rolling over each November to the session beginning the following April,
and it is read from the visitor's browser rather than from the build. A year
typed into the copy would have gone on being shown long after it stopped being
true, because these are static files that may serve for years between builds.
If admissions should start opening at a different point in the year, edit
`admissionSession` in `school.ts`; nothing else needs touching.

The Visit panel shows an address and a Get Directions link rather than a map
image. Azure Maps and comparable services allow a rendered result to be cached
only to cut latency for one application, not to be served to every visitor, and
cap retention at six months, so a map cannot be generated once and committed
alongside the site. Calling such a service from the page instead would add a
third-party request to every visit and put a key in the client code of a static
export, where it cannot be hidden. The directions link does the same job
without either cost.

### Images

Originals live in `apps/web/assets/`. `apps/web/scripts/optimise-images.mjs`
crops and converts them to WebP at several widths, writing to
`apps/web/public/images/`. It runs automatically as part of both `pnpm dev` and
`pnpm build`, so a fresh clone is never missing images. Crops are expressed in
source pixels inside that script. Renditions are never upscaled and are named
after the width they actually have, so `srcset` descriptors stay truthful.

Replacing `building.jpg` needs care. The hero opens with it directly beneath the
header and shows it whole rather than cropped, because the facade reaches both
edges of the frame and its signage runs from the roof board down to the boundary
wall, so there is no margin to crop on either axis. From `lg` the heading is
centred over it beneath `.hero-veil`, a neutral black gradient: darkening keeps
the building's own warm colour, where a navy wash turned it grey-blue. Only the
name, the tagline and the two ways of reaching the school sit on the
photograph. The building carries its own signage and the header repeats the
name, so anything more is read twice. The heading block is placed between the
roof board and the awning, the one stretch of wall clear of lettering, as a
percentage of the frame's height so it scales rather than drifting onto a sign.
Below `lg` the frame is too short to carry the heading, so the heading follows
underneath. A new photograph means revisiting the crop in the optimise script
and re-measuring the heading against `.hero-veil`; the margin there is modest,
because the heading leans on the 3:1 threshold that applies to large text rather
than 4.5:1.

Photographs for the gallery live in `apps/web/assets/gallery/`, one per
occasion, and are listed by name in the optimise script. They are the one set
that is not hand-cropped: these come from the school's albums in whatever shape
they were taken, and a single ratio is what lets them sit in an even grid, so
they are cut to 4:3 by sharp's `attention` strategy, which in a photograph of a
group finds the group. Adding one means dropping a landscape original in that
folder, adding its name to the script, and adding a `caption` and an `alt` to
`moments` in `school.ts`. Both of those are asserted by `pnpm test`; a
photograph of children with no description is a reader losing the section
rather than losing an ornament.

These photographs are the school's own, and the school had already published
them on its public Facebook page before they were used here, so the decision to
show them publicly was the school's and was taken first. Worth knowing because
this repository is public: committing them is not the step that publishes them.
A photograph that has not been published elsewhere should not be added here
without asking the school first.

### The crest and mascot

Both are vector, in `packages/ui`. The crest was redrawn from the printed
prospectus because the only raster logo available was 123x112px. The squirrel is
original artwork. The one in the prospectus is stock clip art and is not
reused anywhere.

The crest's colours are written as hex literals rather than as `var(--color-*)`
tokens, and they need to stay that way. Tailwind v4 keeps a `@theme` colour only
when its name turns up in the content it scans, and it scans `apps/web`, not
`packages/ui`. A token referenced solely from the artwork is therefore dropped
before it reaches the browser, and the `var()` pointing at it resolves to
nothing, so SVG `fill` falls back to black. This was tried and confirmed:
switching the crest's outer border to `var(--color-brand-red)` painted it black.

The class colours are the same mechanism seen from the other side. No utility
uses `--color-class-kg-text` either, but the name appears in `school.ts`, which
is scanned, so the token survives and the headings render in colour.

Pointing the artwork at tokens would therefore mean adding an `@source` for
`packages/ui` to `globals.css`, which couples the artwork to build
configuration, and would still leave `app/icon.svg` on literals since a
standalone file cannot resolve them. The literals stay instead, and
`pnpm colours:check` guards them from the outside: it fails when a colour in
`globals.css` no longer matches the artwork drawing it, and names the file and
line to change. Colours the artwork owns outright, such as the crest gold
sampled from the printed mark, are listed there as deliberate exceptions.

Every stroked group in an SVG needs an explicit `fill="none"`. Without it the
paths take the default black fill, which stays invisible only while the path
encloses no area, and appears the moment anyone adds a curve.

The wordmark inside the crest is live text set in `var(--font-sans)`, so it
renders identically on every device. `textLength` pins its width, which keeps the
mark's proportions fixed whatever the font falls back to. `app/icon.svg` is a
separate, text-free simplification for the favicon.

## Before going live

- **Register a domain** and replace `siteUrl` in
  `apps/web/src/content/school.ts`. It is currently a placeholder.
- **Confirm the exact recognition wording.** The site says "Rajasthan state
  recognition". Match this to the wording printed on the school's own
  recognition certificate if it differs.
- **Have Dr. Rekha Gupta and Surender Mohan Gupta review their messages.** They
  are drafts, written only from confirmed facts, and are meant to be rewritten
  in their own words.
- **Confirm the student and teacher counts.** Written as "250+" and "12+" so
  small changes do not make the page wrong.
- **Confirm the photographed days are yearly ones.** The section is headed
  "What a year here looks like", so it reads as a normal year rather than as ten
  particular occasions. Each caption is only what the photograph shows, which is
  safe on its own, but the heading is worth checking against a day the school
  marked once and does not intend to repeat.
- **Correct the third-party directory listings.** Justdial and CareerSocho
  currently describe the school as CBSE with science labs, an auditorium and
  sports facilities. None of that is accurate, and those listings presently rank
  above this site.
- **Claim the Google Business Profile.** For a school of this size it will drive
  more enquiries than the website itself.

## Facts policy

The site states only what the school has confirmed. In particular it makes **no
board claim**: Walnut Academy holds **Rajasthan state recognition** under number
RJJAI27726 and is **not** CBSE affiliated.

The number is always rendered together with its label. A bare "Affiliation No."
reads, in the Indian school context, as a claim of board affiliation, so
`school.recognition` and `school.recognitionNo` are printed as a pair. The
export check enforces both halves and fails the build if `CBSE` or "Central
Board of Secondary Education" appears on **any** exported page.

Facilities asserted only by directory sites are deliberately omitted.
