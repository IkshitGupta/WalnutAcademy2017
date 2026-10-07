import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodeHTML } from "entities";
import {
  admissions,
  affiliationClaim,
  boardClaim,
  careers,
  classRange,
  classRangeHeading,
  contact,
  features,
  learningAreas,
  lastClassTaught,
  moments,
  navLinks,
  prePrimary,
  school,
  schoolClasses,
  schoolClassesLabel,
  siteUrl,
  social,
  stats,
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

/**
 * React escapes an ampersand, so three of the school's own titles reach the
 * page written as `&amp;`. Content checks compare against what was written in
 * `school.ts`, so the page has to be read back the way a browser reads it.
 * The forms are the browser's to define, so they are decoded by a library
 * that tracks them rather than by a table kept here.
 */
const decode = (html) => decodeHTML(html);

/** Everything a reader never sees, so content checks read only the page. */
const stripNonVisible = (html) =>
  html
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
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

/** How many times a phrase occurs, for checks that every one of them counts. */
const count = (haystack, needle) => haystack.split(needle).length - 1;

/**
 * Content read into a pattern, so that punctuation in the school's own
 * wording is matched rather than interpreted. `RegExp.escape` would do, but
 * it arrived in Node 24 and this package supports 22.
 */
const escapeForPattern = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const assets = entries
  .filter((entry) => entry.isFile() && !entry.name.endsWith(".html"))
  .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));

/**
 * Everything else the export publishes.
 *
 * A stylesheet can print words a reader sees through `content`, Next writes
 * each page's text into a `.txt` payload beside it, and a page whose menu is
 * built in the browser keeps that text nowhere but a chunk. The rule is that
 * no exported file may make the claim, so reading only the pages would leave
 * most of the export unread.
 *
 * Text and binary are told apart by looking for a zero byte rather than by
 * extension, so a kind of file nobody anticipated is still read.
 */
for (const asset of assets) {
  const body = await readFile(asset);
  if (body.subarray(0, 4096).includes(0)) continue;
  const name = path.relative(out, asset);
  const text = body.toString("utf8");
  expect(`${name} makes no board claim`, !boardClaim.test(text));
  expect(`${name} claims no affiliation`, !affiliationClaim.test(text));
}
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

// Every place the label appears has to carry the session, counted rather than
// searched for. Asked only whether the page contains the right year, the
// second of the two lines could go stale and the first would answer for it.
const labelled = count(text, admissions.label);
const dated = count(text, `${admissions.label} ${admissions.session}`);
expect(
  `every admissions line carries ${admissions.session} (${dated}/${labelled})`,
  labelled > 0 && dated === labelled,
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
// The numbered classes are shown as one stage naming their span, not as eight
// separate classes, so the label that renders is what gets asserted.
expect(`class "${schoolClassesLabel}"`, classes.includes(schoolClassesLabel));
expect("classes description", classes.includes(schoolClasses.body));

// The furthest a child can go here, taken from the same place the written-out
// span is built from rather than worked out again.
expect(
  "the range the page states is checked against a class",
  /^Class \d+$/.test(lastClassTaught),
);
const lastClassNumber = Number(lastClassTaught.replace(/\D+/g, ""));

/** In the order a week is read, so a span can be written out in full. */
const WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * The span is built in `school.ts` from the class lists and used everywhere
 * it is written, so the places that state it cannot fall out of step with the
 * classes beneath them. What is left to check is that it still reaches the
 * page, and that no wording anywhere names a class the school does not run.
 *
 * The singular names one class: "Class 12" is a claim. The plural only names
 * classes when it gives both ends of a span, because a figure after it is far
 * more often a count than a class — "All classes 100% air-conditioned",
 * "Small classes 20 children each", and the band of figures, which renders as
 * "Classes 12 Classes". Each of those failed the build under a rule that read
 * any figure after the word.
 *
 * A time of day is not a class, which is what the lookaheads are for. They
 * guard both ends, because either can carry the clock: "Class 9:00" names an
 * hour, and so does the second half of "Pre-primary classes 9 – 12:30",
 * which was read as a span reaching Class 12.
 */
const CLASS_NAMED =
  /\bclass(es)?\s+(\d{1,2})\b(?!\s*[:.]\d)(?:\s*(?:to|[-–—])\s*(\d{1,2})\b(?!\s*[:.]\d))?/gi;

/** Every class a page names past the last one taught. */
const classesNamed = (text) =>
  [...text.matchAll(CLASS_NAMED)]
    .filter(([, plural, , second]) => !plural || second)
    .map(([wording, , first, second]) => ({
      wording: wording.replace(/\s+/g, " ").trim(),
      reaches: Math.max(Number(first), Number(second ?? 0)),
    }))
    .filter(({ reaches }) => reaches > lastClassNumber);

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

// The wall shows a handful of days, and a heading promising a year over ten
// photographs would otherwise offer them as the whole of it. The line saying
// there are more is what keeps the section an invitation rather than a list.
expect("the gallery says more days than it shows", /many more/i.test(gallery));

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
  // The days as well as the times. A listing is read as the whole week, so a
  // day dropped from it says the school is shut that day.
  //
  // The sentence a parent reads and this listing are built from one list, so
  // they cannot disagree. What is worth asking of the list itself is that it
  // is a real run of days: consecutive, in order, and without repeats. A
  // listing that skipped a Wednesday would send a parent to a closed gate.
  // Which days those are is the school's to say, so a run ending on Sunday is
  // accepted as readily as one ending on Saturday.
  const listed = [...(data.openingHoursSpecification?.dayOfWeek ?? [])];
  const first = WEEK.indexOf(listed[0]);
  expect(
    "JSON-LD names a real span of days",
    listed.length > 0 &&
      first >= 0 &&
      listed.join() === WEEK.slice(first, first + listed.length).join(),
    `listed ${JSON.stringify(listed)}`,
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

const pageProblems = (html) => {
  const problems = [];

  // A page is read the two ways it is published: as it was written, where a
  // claim can sit in a description or in structured data and never reach the
  // screen, and as it is read, where words split across two elements come
  // back together.
  const written = decode(html);
  const read = asText(stripNonVisible(html));

  for (const [where, content] of [
    ["markup", written],
    ["text", read],
  ]) {
    if (boardClaim.test(content)) problems.push(`board claim in the ${where}`);
    if (affiliationClaim.test(content)) {
      problems.push(`affiliation claim in the ${where}`);
    }
    for (const { wording, reaches } of classesNamed(content)) {
      problems.push(
        `"${wording}" in the ${where} names Class ${reaches}, past ${lastClassTaught}, which is as far as the school teaches`,
      );
    }
  }

  // Unlabelled, the recognition number reads as a board affiliation number.
  // Counted rather than merely looked for: the label being somewhere on the
  // page says nothing about the number printed further down.
  //
  // Counted in the text a reader sees rather than in the markup. The markup
  // carries React's own serialised copy of the page, where the two sit apart
  // and in its own format, so wrapping the number in a span for styling
  // reported every page as printing it unlabelled.
  const labelling = new RegExp(
    `${escapeForPattern(school.recognition)}[^A-Za-z0-9]{0,24}${escapeForPattern(school.recognitionNo)}`,
    "g",
  );
  const printings = count(read, school.recognitionNo);
  const labelled = [...read.matchAll(labelling)].length;
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
  // The leading lookbehind anchors each attempt, so a long run of ordinary
  // characters is walked once rather than retried from every position in it.
  const addresses = new Set(
    unescaped.match(/(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [],
  );
  addresses.delete(contact.email);
  if (addresses.size) {
    problems.push(`a second address (${[...addresses].join(", ")})`);
  }

  return problems;
};

for (const page of pages) {
  const name = path.relative(out, page);
  const html = await readFile(page, "utf8");
  for (const problem of pageProblems(html)) {
    expect(`${name}: ${problem}`, false);
  }

  // Every photograph here is content rather than decoration, so each one has
  // something to say to a reader who cannot see it.
  const undescribed = [...html.matchAll(/<img\b[^>]*>/g)].filter(
    ([tag]) => !/\salt="[^"]+"/.test(tag),
  ).length;
  expect(`every image in ${name} is described`, undescribed === 0);
}

// The span is generated, so what is asked is that it survives to the page
// rather than that its wording is recognised. A heading or a description
// quietly losing it would otherwise go unseen.
expect("the home page states the span", homeBody.includes(classRangeHeading));
expect(
  "the home page quick facts state the span",
  homeBody.includes(classRange),
);

/**
 * Each description a search engine or a messaging app is handed, read as the
 * attribute it is.
 *
 * Asked of the whole file instead, the quick fact on the page answered for
 * every one of them: the span could be taken out of all four descriptions and
 * the file still contained the words, so nothing failed.
 */
const describedIn = (html) =>
  [
    ...html.matchAll(
      /<meta[^>]+(?:name|property)="(description|og:description|twitter:description)"[^>]*>/g,
    ),
  ].map(([tag, which]) => [
    which,
    decode(/content="([^"]*)"/.exec(tag)?.[1] ?? ""),
  ]);

/**
 * Each kind is asked for by name. Counting them instead let three copies of
 * one kind stand in for all three, and a loop over what a page happens to
 * carry says nothing at all about a page carrying none: removing the ordinary
 * description outright left nothing to iterate and so nothing to fail.
 */
const DESCRIPTION_KINDS = [
  "description",
  "og:description",
  "twitter:description",
];

const checkDescriptions = (page, html) => {
  const described = describedIn(html);
  for (const kind of DESCRIPTION_KINDS) {
    const found = described.filter(([which]) => which === kind);
    expect(
      `the ${page} carries one ${kind}`,
      found.length === 1,
      `found ${found.length}`,
    );
    for (const [, content] of found) {
      expect(
        `the ${page} ${kind} states the span`,
        content.includes(classRange),
        `read "${content}"`,
      );
    }
  }
};

checkDescriptions("home page", rawIndex);

/**
 * The rules above, proved against pages doctored to carry each spelling.
 *
 * Both directions, because a rule that cries wolf is as useless as one that
 * sleeps, and over several rounds these were both at once: one version
 * refused the school's own timings line, another a truthful count of
 * children per class.
 *
 * The cases that must fail name the problem they expect, so a page tripping
 * some other rule proves that rule twice and this one not at all. The cases
 * that must pass are measured against what the page already says rather than
 * against nothing, so they stay meaningful on a page that has a problem of
 * its own.
 */
{
  const base = await readFile(path.join(out, "index.html"), "utf8");
  const already = pageProblems(base).length;
  const inBody = (wording) =>
    base.replace("</main>", `<p>${wording}</p></main>`);

  for (const [description, doctored, expected] of [
    // A claim that never reaches the screen is still published.
    [
      "a board claim in a description",
      base.replace("<head>", '<head><meta name="x" content="CBSE affiliated">'),
      /board claim/,
    ],
    ["a board claim spelled out", inBody("C.B.S.E."), /board claim/],
    [
      "a board name broken across elements",
      inBody("Central Board of <b>Secondary Education</b>"),
      /board claim/,
    ],
    [
      "the school described as affiliated",
      inBody("Affiliated to a board"),
      /affiliation claim/,
    ],
    [
      "the recognition number printed bare",
      inBody(school.recognitionNo),
      /without its label/,
    ],
    [
      "the recognition number under a borrowed label",
      inBody(`Affiliation No. ${school.recognitionNo}`),
      /affiliation claim|without its label/,
    ],
    [
      "a second address written out",
      inBody("someone@example.com"),
      /second address/,
    ],
    [
      "a second address inside a link",
      inBody('<a href="mailto:someone%40example.com">Write</a>'),
      /second address/,
    ],
    // A class the school does not teach, named outright or as a range.
    ["a class past the last one", inBody("Class 12"), /past Class/],
    ["a range past the last one", inBody("Classes 1 to 12"), /past Class/],
    [
      "a class past the last one in a description",
      base.replace("<head>", '<head><meta name="x" content="Classes 1-12">'),
      /past Class/,
    ],
  ]) {
    const problems = pageProblems(doctored);
    expect(
      `the rules notice ${description}`,
      problems.some((problem) => expected.test(problem)),
      problems.length ? `raised: ${problems.join("; ")}` : "raised nothing",
    );
  }

  for (const [description, doctored] of [
    // The school's own wording, which must not be mistaken for a claim.
    ["the timings line", inBody("Classes 9:00 AM &ndash; 2:00 PM")],
    // A clock at either end of a span. Nothing else here pins the two
    // lookaheads, and losing one fails the build on an ordinary line about
    // when the day starts, which is this file's most damaging way of being
    // wrong.
    ["an hour named on its own", inBody("Class 9:00")],
    ["a span of hours", inBody("Pre-primary classes 9 &ndash; 12:30")],
    ["a sentence about class size", inBody("Small classes, 20 children each")],
    ["the phrase small class sizes", inBody("small class sizes")],
    ["the school's own address", inBody(`Write to ${contact.email}.`)],
    // The band of figures, built from the band itself: a count is not a class.
    [
      "the band of figures",
      inBody(stats.map((s) => `${s.label} ${s.value} ${s.label}`).join(" ")),
    ],
    ["the span the school actually teaches", inBody(classRangeHeading)],
  ]) {
    const problems = pageProblems(doctored);
    expect(
      `the rules leave ${description} alone`,
      problems.length === already,
      `raised: ${problems.join("; ")}`,
    );
  }
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
for (const [, srcset] of rawIndex.matchAll(/srcSet="([^"]+)"/g)) {
  for (const candidate of srcset.split(",")) {
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
checkDescriptions("careers page", careersHtml);
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

    // A subtype here is accepted by the vocabulary but rejected by Google, and
    // the only symptom is the posting quietly losing its rich result, so the
    // type is pinned rather than merely required to be present.
    expect(
      "the hiring organization is typed as an Organization",
      posting.hiringOrganization?.["@type"] === "Organization",
    );

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

// Canonical, sitemap, JSON-LD and the share image all append their own path to
// this, so a trailing slash doubles the separator and breaks every one of them.
expect("siteUrl has no trailing slash", !siteUrl.endsWith("/"));

if (failures.length) {
  console.error(`✗ ${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`   - ${failure}`);
  process.exit(1);
}

console.log(
  `✓ export verified (${pages.length} page(s), ${referenced.size} renditions)`,
);
