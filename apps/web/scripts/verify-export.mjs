import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  admissions,
  boardClaim,
  careers,
  contact,
  features,
  learningAreas,
  moments,
  navLinks,
  prePrimary,
  primary,
  primaryLabel,
  school,
  siteUrl,
  social,
  techniques,
  vacancy,
  vacancyClosesAt,
  vacancyOpen,
} from "../src/content/school.ts";

/**
 * Checks the exported HTML actually contains the things a parent came for.
 *
 * The site is static and content-driven, so the realistic failure mode is a
 * section silently dropping out of the page rather than a runtime error.
 *
 * Content assertions run against the text a visitor can read, with the head,
 * scripts, styles and every tag removed. Markup left in place is what makes a
 * check of this shape worthless: a phrase deleted from the page still matches
 * while it survives in a description, a title or an image description, so the
 * check goes on passing long after the page stopped saying it.
 */
const out = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "out",
);

const failures = [];
const expect = (label, condition, detail) => {
  if (!condition) failures.push(detail ? `${label} — ${detail}` : label);
};

const decode = (html) =>
  html
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // Reads as a space, so a phrase held together by one has to match a phrase
    // written with an ordinary space.
    .replace(/&nbsp;|&#160;|&#xa0;/gi, "\u00a0");

// Void elements hold nothing, so there is no region after one to remove.
const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

/**
 * An opening tag with its quoted values blanked out, so that a word sitting in
 * a class list is not read as an attribute standing on its own. Utility class
 * names and attribute names overlap, and `hidden` is both.
 */
const withoutValues = (tag) => tag.replace(/"[^"]*"|'[^']*'/g, '""');

/**
 * Drops every element hidden from view, along with everything inside it. The
 * end of the region is counted rather than taken from the next closing tag, so
 * an element of the same name nested within does not end it early.
 */
const stripHidden = (html) => {
  const OPENING = /<(\w+)\b[^>]*>/g;
  let opening;

  while ((opening = OPENING.exec(html))) {
    const [tag, name] = opening;
    if (!/\shidden(?=[\s/>=])/.test(withoutValues(tag))) continue;

    let end = opening.index + tag.length;
    if (!VOID.has(name.toLowerCase())) {
      const SCAN = new RegExp(`<${name}\\b[^>]*>|</${name}\\s*>`, "gi");
      SCAN.lastIndex = end;

      let depth = 1;
      let step;
      while (depth > 0 && (step = SCAN.exec(html))) {
        depth += step[0].startsWith("</") ? -1 : 1;
      }
      end = depth === 0 ? SCAN.lastIndex : html.length;
    }

    html = `${html.slice(0, opening.index)} ${html.slice(end)}`;
    OPENING.lastIndex = opening.index + 1;
  }

  return html;
};

const stripNonVisible = (html) =>
  stripHidden(
    html
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, " ")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " "),
  )
    // An SVG title is an accessible name rather than anything drawn.
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, " ")
    // React separates adjacent text expressions with an empty comment, which
    // would otherwise split a phrase that renders as one run of text.
    .replace(/<!--[\s\S]*?-->/g, "");

/**
 * The reading order of a passage, as one run of text. Tags become spaces so
 * that two elements never fuse into a word nobody wrote, and the result
 * collapses so a phrase split across elements still matches how it looks on
 * screen. Takes markup whose invisible parts have already been removed, so
 * that a region scoped out of a page carries its surroundings' visibility
 * with it rather than being read on its own.
 */
const asText = (markup) =>
  decode(markup.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

/**
 * The page's own content, without the header and footer every route shares.
 * Unscoped, a check that a route says something is satisfied by the chrome
 * around it, which is how a page can lose its whole body and still pass.
 */
const bodyOf = (html) =>
  html.match(/<main\b[^>]*>([\s\S]*)<\/main>/)?.[1] ?? "";

/**
 * One section of the home page. The same facts are printed in more than one
 * place, so a check that only asks whether the page mentions something at all
 * passes while the panel a visitor was sent to stands empty.
 */
const sectionOf = (html, id) =>
  html.match(
    new RegExp(`<section[^>]*\\sid="${id}"[^>]*>([\\s\\S]*?)</section>`),
  )?.[1] ?? "";

const entries = await readdir(out, { recursive: true, withFileTypes: true });
const pages = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));

expect("at least one exported page", pages.length > 0);

const rawIndex = await readFile(path.join(out, "index.html"), "utf8");
// Scoped out of the stripped markup rather than the raw file, so a region
// hidden from view above a section takes that section with it.
const seenIndex = stripNonVisible(rawIndex);
const text = asText(seenIndex);
const homeBody = asText(bodyOf(seenIndex));
// Attribute values keep their markup but not their entities, so apostrophes in
// copy still match what was written in the content file.
const attributes = decode(rawIndex);

expect("page has a body", homeBody.length > 0);
expect("school name", text.includes(school.name));
expect("tagline", homeBody.includes(school.tagline));
expect("managing society", text.includes(school.society));

// The recognition number must be printed where a visitor can read it, and it
// must never appear bare: unlabelled, an affiliation number reads as a claim
// of board affiliation, which the school does not hold.
expect("recognition number is printed", text.includes(school.recognitionNo));
expect("recognition wording is printed", text.includes(school.recognition));

expect("telephone link", rawIndex.includes(contact.phoneHref));
expect("whatsapp link", rawIndex.includes(contact.whatsappHref));
expect("email", text.includes(contact.email));

// Scoped to the panel a visitor is sent to when they want to come and see the
// school. The footer prints the same facts, and would answer for a panel that
// had lost them.
const visit = asText(sectionOf(seenIndex, "visit"));
expect("visit panel has content", visit.length > 0);
for (const slot of contact.hours) {
  expect(`visit panel hours "${slot.label}"`, visit.includes(slot.value));
}
expect("visit panel working week", visit.includes(contact.hoursNote));
for (const line of contact.addressLines) {
  expect(`visit panel address "${line}"`, visit.includes(line));
}

// The session comes from the date, so this matches its shape rather than a
// fixed year, and catches a build that emitted the label with nothing after it.
expect(
  "admissions line names a session",
  new RegExp(`${admissions.label} 20\\d\\d–\\d\\d`).test(text),
);
for (const profile of social) {
  expect(`${profile.label} link`, rawIndex.includes(profile.href));
}

// Each list is checked inside the section that carries it. Asked of the whole
// page, a card losing its name still passes on the strength of the same words
// appearing in an introduction somewhere above it.
const classes = asText(sectionOf(seenIndex, "classes"));
const learning = asText(sectionOf(seenIndex, "learning"));
const facilities = asText(sectionOf(seenIndex, "facilities"));
const gallery = asText(sectionOf(seenIndex, "moments"));

for (const stage of prePrimary) {
  expect(`class "${stage.name}"`, classes.includes(stage.name));
}
// Primary is shown as one stage naming its span, not as five separate classes,
// so the label that renders is what gets asserted.
expect(`class "${primaryLabel}"`, classes.includes(primaryLabel));
expect("primary description", classes.includes(primary.body));

for (const area of learningAreas) {
  expect(`learning area "${area.title}"`, learning.includes(area.title));
}
for (const technique of techniques) {
  expect(`technique "${technique.title}"`, homeBody.includes(technique.title));
}
for (const feature of features) {
  expect(`feature "${feature.label}"`, facilities.includes(feature.label));
}

for (const moment of moments) {
  expect(`moment "${moment.caption}"`, gallery.includes(moment.caption));
  // A photograph of children carries meaning someone using a screen reader
  // would otherwise lose entirely.
  expect(
    `moment "${moment.caption}" is described`,
    attributes.includes(`alt="${moment.alt}"`),
  );
}

// Every destination the navigation offers, so a link cannot outlive the
// section it points at.
for (const anchor of [
  "top",
  "about",
  "classes",
  "learning",
  "facilities",
  "moments",
  "visit",
]) {
  expect(`anchor #${anchor}`, rawIndex.includes(`id="${anchor}"`));
}
for (const [, href] of rawIndex.matchAll(/href="\/#([\w-]+)"/g)) {
  expect(
    `link to #${href} has somewhere to land`,
    rawIndex.includes(`id="${href}"`),
  );
}

// The row a visitor reads across the top of a wide screen is built separately
// from the one behind the menu button, so it is asked for in its own right.
// It is also the part of the page most easily lost to a reading that treats a
// utility class as an attribute of the same name.
const primaryNav = asText(
  seenIndex.match(
    /<nav[^>]*aria-label="Primary"[^>]*>([\s\S]*?)<\/nav>/,
  )?.[1] ?? "",
);
for (const link of navLinks) {
  expect(
    `primary navigation offers "${link.label}"`,
    primaryNav.includes(link.label),
  );
}

// The persistent mobile call bar is the highest-value element on the page, and
// would otherwise be masked by the other telephone links.
expect(
  "mobile call bar",
  /class="[^"]*fixed[^"]*inset-x-0[^"]*bottom-0[^"]*"/.test(rawIndex),
);

const ldMatch = rawIndex.match(
  /<script type="application\/ld\+json">(.*?)<\/script>/s,
);
expect("JSON-LD present", Boolean(ldMatch));
if (ldMatch) {
  const data = JSON.parse(ldMatch[1]);
  expect("JSON-LD is a School", data["@type"] === "School");
  expect(
    "JSON-LD address matches content",
    data.address?.postalCode === contact.postalAddress.postalCode &&
      data.address?.streetAddress === contact.postalAddress.streetAddress,
  );
  expect(
    "JSON-LD hours match content",
    data.openingHoursSpecification?.opens === contact.openingHours.opens &&
      data.openingHoursSpecification?.closes === contact.openingHours.closes,
  );
  expect("JSON-LD has telephone", Boolean(data.telephone));
  expect(
    "JSON-LD geo matches content",
    data.geo?.latitude === contact.geo.latitude &&
      data.geo?.longitude === contact.geo.longitude,
  );
  // Ties the school's own profiles to this site for search engines.
  expect(
    "JSON-LD sameAs lists every profile",
    social.every((profile) => data.sameAs?.includes(profile.href)),
  );
}

/**
 * What the school may and may not say about itself. This is the one rule that
 * has to hold on every page and in every part of one, so it is written once,
 * applied to each page, and then proved against pages doctored to break it.
 *
 * Each page is read twice: as it was written, where a claim can hide in a
 * description that never reaches the screen, and as it is read, where a claim
 * broken across two elements comes back together.
 */
const claimProblems = (html) => {
  const problems = [];
  const written = decode(html);
  const read = asText(stripNonVisible(html));

  for (const [where, content] of [
    ["markup", written],
    ["text", read],
  ]) {
    if (boardClaim.test(content)) problems.push(`board claim in the ${where}`);
    // The school is recognised by the state and affiliated to no board, so
    // the word belongs nowhere on the site in any form.
    if (/affiliat/i.test(content)) {
      problems.push(`affiliation claim in the ${where}`);
    }
  }

  // Unlabelled, the recognition number reads as a board affiliation number.
  // Counted rather than merely looked for: the label being somewhere on the
  // page says nothing about the number that was printed further down.
  const printings = [...written.matchAll(new RegExp(school.recognitionNo, "g"))]
    .length;
  const labelled = [
    ...written.matchAll(
      new RegExp(
        `${school.recognition}[^A-Za-z0-9]{0,24}${school.recognitionNo}`,
        "g",
      ),
    ),
  ].length;
  if (labelled !== printings) {
    problems.push(
      `recognition number printed without its label (${labelled} of ${printings} labelled)`,
    );
  }

  // One address is published, on purpose. A second one reaches a public page
  // through a link as easily as through a printed line, and through its
  // escaping as easily as in plain sight.
  const unescaped = written.replace(/%[0-9a-f]{2}/gi, (sequence) => {
    try {
      return decodeURIComponent(sequence);
    } catch {
      return sequence;
    }
  });
  const addresses = new Set(unescaped.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []);
  addresses.delete(contact.email);
  if (addresses.size) {
    problems.push(`a second address (${[...addresses].join(", ")})`);
  }

  return problems;
};

for (const page of pages) {
  const name = path.relative(out, page);
  const html = await readFile(page, "utf8");

  for (const problem of claimProblems(html)) {
    expect(`${name}: ${problem}`, false);
  }

  // Every photograph here is content rather than decoration, so each one has
  // something to say to a reader who cannot see it.
  const undescribed = [...html.matchAll(/<img\b[^>]*>/g)].filter(
    ([tag]) => !/\salt="[^"]+"/.test(tag),
  ).length;
  expect(`every image in ${name} is described`, undescribed === 0);
}

// A rule nothing can break is a rule nobody is keeping. Each of these is a way
// the same claim has been made before, and each has to be seen for what it is.
// The problem each one raises is named, because a page that trips a different
// rule proves that other rule twice and this one not at all.
for (const [description, planted, expected] of [
  [
    "a board claim in a description",
    (html) =>
      html.replace("<head>", '<head><meta name="x" content="CBSE affiliated">'),
    /board claim/,
  ],
  [
    "a board claim spelled out",
    (html) => html.replace("</main>", "<p>C.B.S.E.</p></main>"),
    /board claim/,
  ],
  [
    "a board name broken across elements",
    (html) =>
      html.replace(
        "</main>",
        "<p>Central Board of <b>Secondary Education</b></p></main>",
      ),
    /board claim/,
  ],
  [
    "a board name held together by a fixed space",
    (html) =>
      html.replace(
        "</main>",
        "<p>Central Board of&nbsp;Secondary Education</p></main>",
      ),
    /board claim/,
  ],
  [
    "the school described as affiliated",
    (html) => html.replace("</main>", "<p>Affiliated to a board</p></main>"),
    /affiliation claim/,
  ],
  [
    "the recognition number printed bare",
    (html) => html.replace("</main>", `<p>${school.recognitionNo}</p></main>`),
    /without its label/,
  ],
  [
    "the recognition number under a borrowed label",
    (html) =>
      html.replace(
        "</main>",
        `<p>Affiliation No. ${school.recognitionNo}</p></main>`,
      ),
    /affiliation claim|without its label/,
  ],
  [
    "a second address written out",
    (html) => html.replace("</main>", "<p>someone@example.com</p></main>"),
    /second address/,
  ],
  [
    "a second address inside a link",
    (html) =>
      html.replace(
        "</main>",
        '<p><a href="mailto:someone%40example.com">Write</a></p></main>',
      ),
    /second address/,
  ],
]) {
  const doctored = planted(
    await readFile(path.join(out, "index.html"), "utf8"),
  );
  const problems = claimProblems(doctored);
  expect(
    `the claim rules notice ${description}`,
    problems.some((problem) => expected.test(problem)),
    problems.length
      ? `raised instead: ${problems.join("; ")}`
      : "raised nothing",
  );
}

for (const file of ["sitemap.xml", "robots.txt"]) {
  expect(
    `${file} emitted`,
    await readFile(path.join(out, file)).then(
      () => true,
      () => false,
    ),
  );
}

// Every rendition referenced by a srcset must exist, with a descriptor that
// matches the file: a stale descriptor silently costs mobile users bandwidth.
const referenced = new Set();
for (const [, srcset] of rawIndex.matchAll(
  /srcSet="([^"]+)"|srcset="([^"]+)"/g,
)) {
  for (const candidate of (srcset ?? "").split(",")) {
    const [url] = candidate.trim().split(/\s+/);
    if (url?.startsWith("/images/")) referenced.add(url);
  }
}
for (const url of referenced) {
  expect(
    `rendition ${url} exists`,
    await readFile(path.join(out, url.slice(1))).then(
      () => true,
      () => false,
    ),
  );
}
expect("hero renditions referenced", referenced.size > 0);

// The careers page is a second route, so it has to be exported at all, and it
// carries the only invitation to apply. Asserted against the same content file
// the page renders from.
const careersHtml = await readFile(
  path.join(out, "careers", "index.html"),
  "utf8",
).catch(() => "");
expect("careers page emitted", careersHtml.length > 0);

// Scoped to the page's own content. The footer carries the address and the
// header carries the school name on every route, so an unscoped check here
// would survive the page losing everything it was written to say.
const careersMarkup = bodyOf(careersHtml);
const careersText = asText(bodyOf(stripNonVisible(careersHtml)));
expect("careers page has a body", careersText.length > 0);
expect("careers heading", careersText.includes(careers.title));
expect("careers explains itself", careersText.includes(careers.intro));
expect("careers says who may apply", careersText.includes(careers.openTo));
expect("careers names what to send", careersText.includes(careers.sendHeading));
for (const item of careers.send) {
  expect(`careers asks for "${item}"`, careersText.includes(item));
}
expect("careers closing line", careersText.includes(careers.close));
expect(
  "careers shows the address as text",
  careersText.includes(contact.email),
);
expect(
  "careers email action",
  careersMarkup.includes(`mailto:${contact.email}`),
);
expect("careers whatsapp action", careersMarkup.includes(contact.whatsappHref));

// Both actions open with the application already named, so one arrives
// recognisable rather than as an unlabelled message.
expect(
  "email action opens with a subject",
  /mailto:[^"]*\?subject=[^"&]+/.test(careersMarkup),
);
expect(
  "whatsapp action opens with a message",
  /wa\.me\/[^"]*\?text=[^"&]+/.test(careersMarkup),
);

// Shared as a link, a job reaches people through a preview rather than the
// page, so it has to describe the post rather than inherit the home page.
const canonical = careersHtml.match(/rel="canonical"\s+href="([^"]+)"/)?.[1];
expect("careers names its canonical address", Boolean(canonical));

for (const [property, pattern] of [
  ["og:title", /property="og:title"\s+content="([^"]*)"/],
  ["og:description", /property="og:description"\s+content="([^"]*)"/],
  ["og:url", /property="og:url"\s+content="([^"]*)"/],
  ["twitter:title", /name="twitter:title"\s+content="([^"]*)"/],
  ["twitter:description", /name="twitter:description"\s+content="([^"]*)"/],
]) {
  const value = careersHtml.match(pattern)?.[1];
  expect(`careers sets ${property}`, Boolean(value));
  expect(
    `careers ${property} is its own, not the home page's`,
    !value || !rawIndex.includes(`content="${value}"`),
  );
}

// A link pasted into a message is mostly a picture, and a preview that names a
// picture the site never shipped is a blank one.
for (const [name, html] of [
  ["home", rawIndex],
  ["careers", careersHtml],
]) {
  const image = html.match(/property="og:image"\s+content="([^"]*)"/)?.[1];
  expect(`${name} offers a share image`, Boolean(image));

  const file = image?.replace(/^https?:\/\/[^/]+/, "");
  expect(
    `${name} share image exists (${file})`,
    Boolean(file) &&
      (await readFile(path.join(out, file.slice(1))).then(
        () => true,
        () => false,
      )),
  );
}

// A preview that points somewhere other than the page being shared sends the
// reader to the wrong place and splits the signal between two addresses.
const shareUrl = careersHtml.match(
  /property="og:url"\s+content="([^"]*)"/,
)?.[1];
expect(
  `og:url matches the canonical (${shareUrl} vs ${canonical})`,
  Boolean(shareUrl) && shareUrl === canonical,
);

// A standing invitation is not a vacancy, so the markup has to follow the
// switch in both directions. Advertising a post that is filled, or one whose
// closing date has passed, is a policy breach rather than an oversight.
const posting = [
  ...careersHtml.matchAll(
    /<script type="application\/ld\+json">(.*?)<\/script>/gs,
  ),
]
  .map(([, json]) => {
    try {
      return JSON.parse(decode(json));
    } catch {
      return null;
    }
  })
  .find((data) => data?.["@type"] === "JobPosting");

if (vacancy.active) {
  expect("job posting emitted while the post is open", Boolean(posting));

  if (posting) {
    for (const field of [
      "title",
      "description",
      "datePosted",
      "validThrough",
      "employmentType",
      "hiringOrganization",
      "jobLocation",
    ]) {
      expect(`job posting has ${field}`, Boolean(posting[field]));
    }

    // A day that does not exist, 31 November say, is not rejected: it rolls
    // into the next month and goes on reading as a date everywhere it is
    // compared against itself. Asking the calendar to give the same day back
    // is what tells the two apart.
    const [year, month, day] = vacancy.closingDay.split("-").map(Number);
    const roundTrip = new Date(Date.UTC(year, month - 1, day));
    expect(
      `the closing day is a real date (${vacancy.closingDay})`,
      roundTrip.getUTCFullYear() === year &&
        roundTrip.getUTCMonth() === month - 1 &&
        roundTrip.getUTCDate() === day,
    );

    // An export is built once and then left alone, so a closing date already
    // in the past would ship an advert that was dead on arrival. Asked through
    // the same function the page itself uses, so the build and the browser
    // cannot disagree about when the post closes.
    expect(
      `job posting closes in the future (${posting.validThrough})`,
      vacancyOpen(),
    );
    expect(
      "job posting closes when the content file says it does",
      posting.validThrough === vacancyClosesAt,
    );
    expect(
      "job posting title matches the content file",
      posting.title === vacancy.title,
    );
    expect("careers names the open post", careersText.includes(vacancy.title));
  }
} else {
  expect("no job posting while there is no open post", !posting);
}

expect(
  "careers linked from the home page",
  /href="\/careers\/?"/.test(rawIndex),
);

// `trailingSlash` is on, so the exported page canonicalises itself with one. A
// sitemap entry written without it advertises an address the page itself
// disclaims, splitting the signal between two URLs for one page.
const sitemapXml = await readFile(path.join(out, "sitemap.xml"), "utf8");
for (const [, canonical] of careersHtml.matchAll(
  /rel="canonical"\s+href="([^"]+)"/g,
)) {
  expect(
    `sitemap lists the careers canonical (${canonical})`,
    sitemapXml.includes(`<loc>${canonical}</loc>`),
  );
}

// Not a failure: the domain is a known pre-launch item, and the build has to
// go on working before one is registered. Said on every run so it is in front
// of whoever ships, rather than only in the README.
if (siteUrl.includes("walnutacademy.in")) {
  console.warn(
    `! ${siteUrl} is the placeholder domain. The canonical URL, the share image and the job posting all point at it, so register it before the site goes live.`,
  );
}

if (failures.length) {
  console.error(`✗ ${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`   - ${failure}`);
  process.exit(1);
}

console.log(
  `✓ export verified (${pages.length} page(s), ${referenced.size} renditions)`,
);
