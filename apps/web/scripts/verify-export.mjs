import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  admissions,
  careers,
  contact,
  features,
  learningAreas,
  moments,
  prePrimary,
  primary,
  primaryLabel,
  school,
  social,
  techniques,
  vacancy,
} from "../src/content/school.ts";

/**
 * Checks the exported HTML actually contains the things a parent came for.
 *
 * The site is static and content-driven, so the realistic failure mode is a
 * section silently dropping out of the page rather than a runtime error.
 *
 * Assertions run against markup with <script> and <style> removed. Next embeds
 * the whole RSC payload in the page, so a naive substring search would still
 * find content that no longer renders anywhere visible.
 */
const out = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "out",
);

const failures = [];
const expect = (label, condition) => {
  if (!condition) failures.push(label);
};

const decode = (html) =>
  html
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripNonVisible = (html) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    // React separates adjacent text expressions with an empty comment, which
    // would otherwise split a phrase that renders as one run of text.
    .replace(/<!--[\s\S]*?-->/g, "");

const entries = await readdir(out, { recursive: true, withFileTypes: true });
const pages = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));

expect("at least one exported page", pages.length > 0);

const rawIndex = await readFile(path.join(out, "index.html"), "utf8");
const text = decode(stripNonVisible(rawIndex));
// Attribute values keep their markup but not their entities, so apostrophes in
// copy still match what was written in the content file.
const attributes = decode(rawIndex);

expect("school name", text.includes(school.name));
expect("tagline", text.includes(school.tagline));
expect("managing society", text.includes(school.society));

// The recognition number must never appear bare: unlabelled, an affiliation
// number reads as a claim of board affiliation, which the school does not hold.
expect("recognition number", text.includes(school.recognitionNo));
expect("recognition label", text.includes(school.recognition));

expect("telephone link", rawIndex.includes(contact.phoneHref));
expect("whatsapp link", rawIndex.includes(contact.whatsappHref));
expect("email", text.includes(contact.email));
for (const slot of contact.hours) {
  expect(`hours "${slot.label}"`, text.includes(slot.value));
}
expect("working week", text.includes(contact.hoursNote));

// The session comes from the date, so this matches its shape rather than a
// fixed year, and catches a build that emitted the label with nothing after it.
expect(
  "admissions line names a session",
  new RegExp(`${admissions.label} 20\\d\\d–\\d\\d`).test(text),
);
for (const profile of social) {
  expect(`${profile.label} link`, rawIndex.includes(profile.href));
}
for (const line of contact.addressLines) {
  expect(`address line "${line}"`, text.includes(line));
}

for (const stage of prePrimary) {
  expect(`class "${stage.name}"`, text.includes(stage.name));
}
// Primary is shown as one stage naming its span, not as five separate classes,
// so the label that renders is what gets asserted.
expect(`class "${primaryLabel}"`, text.includes(primaryLabel));
expect("primary description", text.includes(primary.body));

for (const area of learningAreas) {
  expect(`learning area "${area.title}"`, text.includes(area.title));
}
for (const technique of techniques) {
  expect(`technique "${technique.title}"`, text.includes(technique.title));
}
for (const feature of features) {
  expect(`feature "${feature.label}"`, text.includes(feature.label));
}

for (const moment of moments) {
  expect(`moment "${moment.caption}"`, text.includes(moment.caption));
  // A photograph of children carries meaning someone using a screen reader
  // would otherwise lose entirely.
  expect(
    `moment "${moment.caption}" is described`,
    attributes.includes(`alt="${moment.alt}"`),
  );
}

for (const anchor of ["about", "classes", "learning", "facilities", "visit"]) {
  expect(`anchor #${anchor}`, rawIndex.includes(`id="${anchor}"`));
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

// Walnut Academy holds Rajasthan state recognition, not CBSE affiliation.
// Checked across every exported page, not just the home page.
const BOARD_CLAIM = /\bCBSE\b|Central Board of Secondary Education/i;
for (const page of pages) {
  const visible = decode(stripNonVisible(await readFile(page, "utf8")));
  expect(
    `no board claim in ${path.relative(out, page)}`,
    !BOARD_CLAIM.test(visible),
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

const careersText = decode(stripNonVisible(careersHtml));
expect("careers heading", careersText.includes(careers.title));
for (const item of careers.send) {
  expect(`careers asks for "${item}"`, careersText.includes(item));
}
expect(
  "careers shows the address as text",
  careersText.includes(contact.email),
);
expect("careers email action", careersHtml.includes(`mailto:${contact.email}`));
expect("careers whatsapp action", careersHtml.includes(contact.whatsappHref));

// A personal address was deliberately kept off the public page; forwarding on
// the school's account delivers applications without publishing a second one.
const addresses = new Set(careersText.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []);
addresses.delete(contact.email);
expect(
  addresses.size
    ? `careers publishes a second address (${[...addresses].join(", ")})`
    : "careers publishes no second address",
  addresses.size === 0,
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

    // An export is built once and then left alone, so a closing date already
    // in the past would ship an advert that was dead on arrival.
    expect(
      `job posting closes in the future (${posting.validThrough})`,
      new Date(posting.validThrough) > new Date(),
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

if (failures.length) {
  console.error(`✗ ${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`   - ${failure}`);
  process.exit(1);
}

console.log(
  `✓ export verified (${pages.length} page(s), ${referenced.size} renditions)`,
);
