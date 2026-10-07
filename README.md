# Walnut Academy

Website for Walnut Academy, an English medium school in Mansarovar, Jaipur,
teaching Play Group through Class 8.

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
│           ├── app/         layout, pages, metadata, robots, sitemap
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

### Where it is published

The site is served from Cloudflare Pages. It costs nothing at this size, and
the free tier does not meter bandwidth, so a busy admissions week cannot
produce a bill. Azure was the earlier plan and was dropped once it became clear
the credits that motivated it were never paying for anything: the hosting this
site needs is free on either, and Cloudflare already holds the DNS, so the
apex domain needs no record that a registrar might not support.

`main` deploys itself. The `deploy` job in `.github/workflows/ci.yml` waits on
`verify` and then publishes the artifact that job already built, rather than
building again: whatever reaches the live site is the exact directory that
passed lint, typecheck, the export check and the browser tests. It needs two
repository secrets, `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

The deploy uses `cloudflare/wrangler-action`. The older
`cloudflare/pages-action` is retired and carries an unpatched flaw that can
expose the tokens the job is holding, so it must not be reintroduced.

`apps/web/public/_headers` carries what a static export cannot set for itself.
A static host serves files and sends no headers of its own, so the content
security policy, HSTS and the rest live there. The 404 needs no configuration:
Pages serves a top-level `404.html` with a real 404 status, and the presence of
that file is also what stops Pages treating the site as a single-page app and
answering every unknown address with the homepage.

The policy allows `'unsafe-inline'` for both scripts and styles, which is worth
stating plainly rather than leaving to be discovered. Next inlines its
hydration data and Tailwind writes style attributes, and neither can be given a
nonce without a server to generate one. What the policy still does is confine
every source to this origin, so nothing third-party can be fetched, and there
is no form to post to and no untrusted text on the page for an injected script
to arrive in.

Only `/_next/static` sets a cache lifetime, because those names carry a content
hash and can be held for a year. Everything else is left to the platform, which
revalidates against an ETag and clears its edge cache on each deploy, so a
replaced photograph is visible immediately. Cloudflare advises against custom
caching on a Pages domain for exactly that reason.

`_redirects` holds one rule, sending `/careers` to `/careers/`, so the address
without the slash does not fall through to a 404.

Both files are verified against Cloudflare's own runtime rather than by
inspection: `npx wrangler pages dev apps/web/out` serves the export the way the
platform will, which is how the redirect, the 404 status, the cache lifetimes
and the policy were each confirmed.

`pnpm dev` also prints a network address alongside `localhost`, which is how to
open the site on a phone on the same wifi, which is worth doing since most
visitors will arrive on one. Next only serves its development resources to
origins it
has been told about, so `next.config.ts` reads this machine's own addresses
from its network interfaces and names them. Without that, the page loads over
the network but hot reloading does not. Nothing there affects a build.

## Tests

Three layers, all run in CI:

- **`pnpm colours:check`** compares the colours written into the artwork
  against the palette in `globals.css`. Instant, needs no dependencies, and
  runs before anything is installed. It walks `packages/ui/src` and
  `apps/web/src` for `.tsx`, `.ts` and `.svg`, covering `app/icon.svg` as well
  as the components, and reads colours written as `rgba(...)` as well as hex,
  so a shadow written in parts is guarded like everything else. See
  [The crest and mascot](#the-crest-and-mascot) for why those colours cannot be
  written as `var(--color-*)`, and therefore why they need guarding from the
  outside. It also reports any colour that is neither tracked against a token
  nor listed as artwork-owned, so a new one has to be a decision rather than an
  accident, and it fails rather than reporting success if a folder it expects
  to read has gone, or if a colour it is tracking is drawn nowhere.
- **`pnpm test`** builds the export and asserts the generated HTML still
  carries the contact details, every class and learning area, the recognition
  wording, valid JSON-LD matching `school.ts`, every `srcset` rendition, a
  description on every image, that every written-out class range names the last
  class `schoolClasses.list` actually runs, and that the careers page exports
  with both ways to apply, one address, its own share preview and `JobPosting`
  markup that agrees with the switch in `school.ts`.

  Two things make those assertions mean something. The head, scripts, styles,
  anything carrying the `hidden` attribute and **every tag** are stripped
  first, so what is searched is the page's own text rather than its markup: a
  phrase deleted from the page no longer matches because it survives in a
  title, a description or an `alt` attribute. This is not the same as what a
  visitor can see, since a utility class can hide something at one screen size
  and leave the text in place; that is what the browser tests are for. And each
  check is scoped to the region that has to carry it, because the same facts
  are printed in several places: the careers assertions read that page's
  `<main>` rather than the header and footer around it, and the class, facility
  and timings checks read the section a visitor was sent to rather than the
  whole page.

  What the school may and may not claim about itself is the exception, and runs
  against every page twice: once as written, where a claim can hide in a
  description that never reaches the screen, and once as read, where a claim
  broken across two elements comes back together. Those rules are then applied
  to pages deliberately doctored to break them, so a rule that has stopped
  catching anything says so.

  The task is deliberately **not cached**: it asserts that the post's closing
  date is still in the future, which is a different answer tomorrow, and a
  replayed log would go on passing forever.

- **`pnpm test:e2e`** runs Playwright against the built export rather than the
  dev server, on a mobile and a desktop viewport. Covers the areas that static
  checks cannot reach: the mobile menu (the panel hanging from the header over
  a dimmed page, focus handling, Escape, focus restoration, holding the
  reader's place, holding the page it covers out of reach without hiding the
  control that closes it, and every item being reachable on a short screen),
  the call bar staying pinned to the bottom of
  the screen, anchor navigation including a second press of the same link, the
  Back button after a jump to a section, that the way to reach the school is
  actually on screen at both sizes rather than merely present in the markup,
  and that every image decodes. One test asserts the rule behind all the
  navigation ones: that no link on either page is handled in the page rather
  than by the browser. The rule itself is enforced by a lint rule banning the
  `next/link` import, since a test only sees a link it thought to look for.

  A later group covers how the page looks rather than how it behaves, because
  the claims the stylesheet makes about itself were going unchecked. These
  assert that every word clears AA against the colour behind it, that
  neighbouring bands differ in lightness as well as hue so the page survives
  being printed or rendered without colour, that the marks telling the
  facilities groups apart each separate from the surface they sit on and from
  each other, that the sentences a phone does not show are still there for one
  reading the page aloud, and that a mark set beside a line of text keeps to
  that line at every width down to 320px.

  One of them is written as a rule rather than as a measurement. A caption is
  white type on a photograph, and no photograph can be read from the
  stylesheet, so what is checked is the veil between: that it runs upwards from
  the foot of the caption, that it is opaque enough for white to clear AA even
  over a pure white picture, and that every glyph sits inside the part of it
  that has not begun to fade. The threshold is worked out from the contrast
  formula inside the test rather than written down, so it cannot drift away
  from the rule it came from, and the result holds for any photograph the
  school puts behind a caption rather than only for the ten there now.

  This replaced a test that sampled the pixels the browser actually paints. It
  did find the original fault, but it was the slowest in the suite, it proved
  the point only for the pictures currently in the page, and getting it right
  needed two corrections: a full-page screenshot scrolls the page, the header
  shortens when it does, and everything below shifts by enough to miss a band
  of text that thin.

Several of these exist because of a specific bug, and each is written to fail
against that bug rather than around it.

A width written in pixels is not the width Tailwind uses. `lg` is `64rem`, and
a reader who has enlarged their default text moves that to 1280px while a
script saying `1024px` still fires at 1024. The menu was hidden by one and
released by the other, so widening a window from 1100px to 1300px at a 20px
default took the panel and its button off screen while the page stayed inert
and scroll-locked, with nothing left to undo it. Both are now written in
`rem`, and a test states the rule rather than the width: a page held for the
menu must keep something on screen that releases it, at any default size. The
same unit trap is why the word beside the WhatsApp mark yields at `20rem`
rather than at `319px`.

Anything deciding what day it is reads the school's own timezone, written into
the instant itself rather than left to whoever is reading. The admissions line
taught that lesson before it stopped keeping its own dates: taken from the
visitor's clock, the same moment showed admissions open for 2026–27 in Los
Angeles and 2027–28 in Jaipur. What still turns on a date is the vacancy, which
closes at the end of its last day in Jaipur and nowhere else.

The header marks the document with `data-ready` once its effects have run. It
is the one piece of the site that exists for the checks rather than for a
reader, and it earns its place: these pages are served complete and then taken
over, and for a moment the served answer and the live one can differ. Waiting
on a count of frames instead, a check could read the built page and pass
against a fault that appears a moment later, which is how the admissions line
came to be read once in twenty before React had touched it. React runs a
commit's effects together, so the header's having run means the rest of the
page's have too.

Printing is something a reader does in passing, and the page they come back to
should be the one they left. A browser without `::details-content` has the
folded messages opened for it by script, and both halves of putting them back
were wrong. The same print is announced twice, by event and by media query, and
the second telling found the folds already open and recorded that there was
nothing to restore, so they stayed open afterwards; the work is now done once
per print and the later tellings are left alone. And closing a fold again
looked exactly like the reader closing it, which carries them back to the
message it belongs to — from the Visit panel at the foot of the page to the
principal's message halfway up it. A fold the script closes is marked as such,
on the element rather than in a variable, because the browser raises that
notice on its own turn by which time a variable has already been put back.

`backdrop-filter` on the header creates a containing block, which scoped the
dimming behind the menu to the 80px header instead of the viewport. The
assertion on its height catches that class of regression.

The menu is a panel inside the header rather than a dialog, and the control
that closes it stays in the header, outside the panel, by design. Marking the
panel `aria-modal` therefore withheld the only way out from a screen reader
while leaving it on screen for everyone else. What the page gives up instead is
reach: everything the dimming covers is made `inert` while the menu is open,
which is the same promise enforced by the browser rather than asserted to
assistive technology. A test holds both halves of that — the page beyond reach,
the way out still within it.

The room left for the pinned header used to be set on the scrolling page
itself, which meant the browser held that space for anything it brought into
view, including the header's own controls. Stepping backwards from the page
into the header therefore scrolled the page to reveal a control that had never
left the screen, by roughly 350px on a desktop width and 380–415px on a phone,
again on each further step back. The offset now sits on the elements being
navigated to rather than on the page as a whole, and the same walk moves
nothing.

Focus is separately asked not to scroll when the menu closes and the button
that opened it takes focus back. That was worth about 400px on a phone against
the old rule; against the current one it changes nothing either way, and it
stays to hold the reader's position independently of where the header's room is
reserved.

Both tests have to let the header's own compaction finish before taking a
reading, or they measure the tail of that animation instead. That is what the
shared helper at the top of the file is for.

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
photographs, the careers copy and the leadership messages. Editing that file is
enough for most changes; the components read from it.

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
in the Visit panel, is set in `admissions` in `school.ts`. It was worked out
from the date for a while, on the reading that admissions open each November.
Nobody had confirmed that month, so the line changed what it claimed on a date
the school had not chosen. Edit `session` to advertise a different year; both
places read the same value, and a build where they disagree fails the export
check rather than going out.

The cost of that is worth naming. These are static files that may serve for
years between builds, and nothing in them will notice a session going by, so
the line will keep showing `2026–27` until somebody changes it. Treat it as
something to review each year rather than something that looks after itself.

The machine-readable opening hours name Monday to Saturday, although the office
is shut on the second Saturday of each month. `schema.org` has no way to say
"except the second", so the choice is between two wrong answers: naming the day
is wrong once a month, leaving it out tells every search engine the school is
shut on the three or four Saturdays it does keep. The exception is written
beside the visible hours, and the individual closed dates are better entered in
the Google Business Profile, a date at a time. The export check holds the days
in the markup against the line a visitor reads, rather than against the list the
markup was generated from, which would agree with itself whatever it said.

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

Gallery widths are chosen for the screens that fetch them. A phone drawing a
178px tile at three device pixels wants about 600, and the step above costs
230 KB across the ten photographs for pixels nobody can see. The widths are
there to be fitted to the layout, not rounded up.

The script also writes `share.jpg`, which is what someone sees when a link to
the site is pasted into a message. It is the only JPEG the site ships: WhatsApp
and the rest are where these links travel, and the preview is most of what
decides whether a parent opens one.

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

### The careers page

`/careers` invites teaching applications. It is a second route rather than a
band on the home page: the home page is long already and addressed to parents,
and a page of its own earns a title and description that can be found by
someone searching for teaching work in Mansarovar. It is reached from the
footer and the mobile menu, deliberately not from the desktop top navigation,
which stays six parent-facing items.

### Advertising an open post

`vacancy` in `school.ts` carries a switch. With `active: true` the page shows a
panel naming the post and emits `JobPosting` structured data, which is what
makes a listing eligible for the jobs results at the top of a Google search.
With `active: false` the panel and the markup both go, and what is left is the
standing invitation to write at any time.

The page is arranged once and reads the same either way, rather than as two
layouts switched between. Only the panel comes and goes, which is why a page
that outlives its own closing date still reads as it was drawn. Applying works
the same in both states.

Two rules govern this, and both are enforced rather than trusted.

**A filled post must stop being advertised.** `pnpm test` fails if the markup
and the visible block disagree, so neither can be left behind. The more
important guard is `validThrough`: an export is built once and then left alone,
so if nobody rebuilds after the post is filled, that date is the only thing
telling search engines the listing has closed. The export check refuses to
publish a posting whose closing date has already passed.

The visible panel is held to the same instant, and it does not wait for a
rebuild either. `vacancyClosesAt` is the one moment the post closes, at the end
of its closing day where the school is, and the page, the build check and the
structured data all read it. `vacancyOpen()` compares it against the visitor's
own clock, so once that moment passes the panel stands down and the standing
invitation is what is left, whatever timezone it is read from. A tab left open
across the deadline stands down too: the panel is woken at the moment itself
and again whenever the tab is brought back, because it used to keep whatever it
was built with until someone happened to reload, and a post that has closed
must not go on inviting applications. One timer cannot hold more than about
twenty-five days, so the wait is made in steps rather than skipped when the
date is further off than that; set in a single stretch, a tab opened a month
ahead sat through the closing date without noticing it. The structured data
stays in the served file, because that is what `validThrough` is for and a
crawler reads the file rather than the page it becomes.

Nothing that cannot correct itself names the post. The page title, description
and share preview say only that the school takes teaching applications, because
an exported file keeps whatever was true when it was written and no rebuild may
ever come. A claim with an expiry is made only where the format can carry one:
in the `JobPosting`, through `validThrough`, and on the page, which reads the
clock. The same reasoning keeps the post's name out of the prefilled email
subject.

**Nothing in a posting may be guessed.** There is no salary and no list of
requirements because the school has not fixed them, and a `JobPosting` is a
factual claim rather than an advertisement. If a salary is ever agreed, adding
it improves how the listing surfaces.

A gender requirement was asked for and deliberately left out. Google's job
posting policies disallow discriminatory criteria, so including one risks the
listing being rejected, which defeats the reason for the markup. India's Equal
Remuneration Act also restricts conditions of that kind in recruitment
advertising. Screening at the conversation stage avoids both.

**Applications arrive by email and WhatsApp, weighted equally.** The CV decided
this. The site exports to static files with no server, so every form route
either charges for file upload, puts a Google sign-in in front of it, or needs a
backend to store it. Email takes an attachment for free, WhatsApp takes
documents just as well, and both land where the school already looks. The
consistency a form would give is recovered by stating on the page what to
include. Should the volume ever justify a form, the copy around it does not have
to change.

Two details are not decoration. The address is printed as selectable text as
well as behind the `mailto:`, because that link opens nothing on a phone with no
mail app configured. And both actions carry a prefilled subject or message, so
an application is recognisable in an inbox. Both are asserted by `pnpm test`.

**Only the school's address is published.** Forwarding on the school's Gmail
delivers applications anywhere else they are wanted, without putting a second
address on a public page where it is scraped and cannot be withdrawn. `pnpm
test` fails if any address other than the school's appears on any page, read
through link escaping as well as in plain sight.

**There is deliberately no `JobPosting` structured data while no post is open.**
It describes a real, dated vacancy with an employment type and a closing date. A
standing invitation is not that, and marking one up as though it were is treated
as a violation rather than a technicality. Both states are asserted, so the
markup cannot drift from the switch.

Nothing on the page states a number of posts, pay, conditions or anything about
the staff room, for the same reason as the rest of the site: the school has not
confirmed it.

### Linking between pages

Every navigation link in the shared header, footer and announcement bar is
written as `/#section`, not `#section`. A bare fragment resolves to nothing from
`/careers`: it changes the address bar and scrolls to nowhere, leaving the
visitor where they were. The header's scroll spy compares against the same
absolute form. `navLinks` in `school.ts` is the one place these are written.

The footer and announcement bar render on the server, so they cannot read the
current route; absolute links avoid needing to. The browser tests assert that no
link in the chrome begins with `#`, which is the invariant rather than a
sample of it.

They are also plain `<a>` elements rather than `next/link`, which is the
opposite of what the framework's own lint rule asks for, so that rule is off
and a different one bans the `next/link` import outright. The reasoning is in
`eslint.config.mjs`. Enforcing it through the import is deliberate: the
framework's rule only sees an `href` written out in full, and a browser test
only sees a link it thought to look for, so neither notices one arriving in
the middle of a page.

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

- **Review the advertised session each year.** `admissions.session` in
  `apps/web/src/content/school.ts` reads `2026–27`, and nothing will move it on
  by itself. The export check fails if the two places it appears ever disagree,
  but it cannot tell that the year as a whole has gone stale, so this is one to
  put in a calendar rather than to trust to memory.
- **Take the open post down when it is filled.** Set `vacancy.active` to false
  in `apps/web/src/content/school.ts` and rebuild. Until then `validThrough`
  carries it: search engines stop showing the listing after that date on their
  own, so an unattended site does not keep advertising a post that is gone.
- **Set up forwarding for applications.** The careers page publishes only the
  school's address. Gmail's Settings, Forwarding and POP/IMAP, delivers a copy
  of every application anywhere else it is wanted without a second address going
  on a public page.
- **Point the domain at the deployment.** `walnutacademy.in` is registered and
  `siteUrl` reads it. What remains is outside this repository: create the Pages
  project, put an API token and the account id in the `CLOUDFLARE_API_TOKEN`
  and `CLOUDFLARE_ACCOUNT_ID` secrets, move the nameservers to Cloudflare, and
  add the apex as a custom domain. Until that is done `main` builds but
  publishes nowhere.
- **Confirm the exact recognition wording.** The site says "Rajasthan state
  recognition". Match this to the wording printed on the school's own
  recognition certificate if it differs.
- **Have Dr. Rekha Gupta and Surender Mohan Gupta review their messages.** They
  are drafts, written only from confirmed facts, and are meant to be rewritten
  in their own words.
- **Confirm the student and teacher counts, then put the figures back.** The
  band of figures is commented out in `apps/web/src/app/page.tsx` until the
  school is happy for the numbers to be shown. The student count is held back
  with it, in the structured data in `layout.tsx`, so the figure is not handed
  to search engines while it is off the page. Both are marked, and restoring
  them is uncommenting the two places and returning `stats` to the import in
  `layout.tsx`. The counts are written as "250+" and "12+" so small changes do
  not make the page wrong.
- **Confirm the photographed days are yearly ones.** The section is headed
  "What a year here looks like" and closes by saying there are many more
  through the year, so it reads as a sample of a normal year rather than as ten
  particular occasions. Each caption is only what the photograph shows, which
  is safe on its own, but the heading is worth checking against a day the
  school marked once and does not intend to repeat.
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
Board of Secondary Education" appears in **any** exported file — the pages, the
stylesheet, the script chunks and the text payloads alike, since a page whose
menu is built in the browser keeps that wording nowhere but a chunk.

The rule itself is deliberately plain: the word, allowing for dots and spaces
because a person might write `C.B.S.E.` This is worth recording, because it was
once much more than that. Over several review rounds it grew into Unicode
normalisation, a derived separator class covering every dash and mathematical
sign, entity decoding split by context, and some six hundred lines of cases
proving all of it — defending against a claim spelled with a soft hyphen, a
left-to-right mark or a fullwidth alphabet.

That was the wrong threat model. Nothing writes this site's text but
`school.ts`, so there is no adversary to defeat; the realistic failure is
someone here typing the wrong word. The machinery cost far more than it
protected, and it began doing harm: read loosely enough to catch an invisible
character, the same rule read `c && b(s, e)` in a minified chunk as the board's
name, and the companion rule about class numbers refused the school's own
timings line and a truthful count of children per class. All of it was removed,
and the checks that remain are the ones that would have caught a real mistake.

The rule about class numbers is worth a line of its own, because it is the one
that kept rejecting legitimate copy. The singular names a class — "Class 12" is
a claim. The plural only counts when it gives both ends of a span, because a
figure after "classes" is far more often a count: "All classes 100%
air-conditioned", "Small classes 20 children each", and the band of figures,
which renders as "Classes 12 Classes". Every one of those failed the build
under a rule that read any figure following the word.

The same file proves those rules against pages doctored to carry each spelling,
in both directions, because a rule that cries wolf is as useless as one that
sleeps. A case that must fail names the problem it expects, so a page tripping
some other rule proves that rule twice and this one not at all; a case that
must pass is measured against what the page already says, so it stays
meaningful on a page that has a problem of its own.

Facilities asserted only by directory sites are deliberately omitted.
