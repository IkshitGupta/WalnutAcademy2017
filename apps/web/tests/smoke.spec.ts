import { expect, test } from "@playwright/test";
import { careers, contact, moments, vacancy } from "../src/content/school";

test("loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Walnut Academy",
  );
  expect(errors).toEqual([]);
});

test("every image actually renders", async ({ page }) => {
  await page.goto("/");
  // Lazy images decode when they near the viewport, so step down the page
  // rather than jumping to the end, which would skip everything in the middle.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  });
  await page.waitForTimeout(1000);

  const broken = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
  );

  expect(broken).toEqual([]);
});

test("makes no board affiliation claim", async ({ page }) => {
  await page.goto("/");
  const visible = await page.evaluate(() => document.body.innerText);
  expect(visible).not.toMatch(/\bCBSE\b|Central Board of Secondary Education/i);
  expect(visible).toContain("Rajasthan state recognition");
});

test("the admissions line names an academic session", async ({ page }) => {
  await page.goto("/");
  const lines = page.getByText(/^Admissions open for/);
  await expect(lines).toHaveCount(2);
  for (const line of await lines.all()) {
    await expect(line).toHaveText(/^Admissions open for 20\d\d–\d\d$/);
  }
});

// Admissions for a session open in the November before it begins. These files
// are built once and may serve for years, so the session follows the visitor's
// clock and the built-in value only has to hold until the page hydrates.
test("the admissions session follows the date, not the build", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2031-11-04T09:00:00+05:30"));
  await page.goto("/");
  await expect(page.getByText(/^Admissions open for/).first()).toHaveText(
    "Admissions open for 2032–33",
  );
});

// Both stay pinned: the admissions line is the message the school most wants
// read, and the header is how a visitor acts on it.
test("the announcement and the header stay pinned together", async ({
  page,
}) => {
  await page.goto("/");
  const bar = page.getByText(/^Admissions open for/).first();
  await expect(bar).toBeInViewport();

  await page.evaluate(() => window.scrollTo(0, 1600));
  await page.waitForTimeout(300);

  await expect(bar).toBeInViewport();
  const header = page.locator("header");
  expect((await header.boundingBox())?.y).toBeLessThanOrEqual(1);
});

// The header compacts as the page moves, which shortens it, and the browser
// then corrects the scroll position to hold the content under it still. With a
// single threshold that correction landed back on the other side of it, and the
// header changed height for as long as the page was left alone. Stopping just
// either side of a threshold is where that shows, so several offsets are
// checked rather than one.
test("the header settles at one height once scrolling stops", async ({
  page,
}) => {
  await page.goto("/");

  for (const offset of [4, 8, 26, 74]) {
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(150);
    await page.evaluate((y) => window.scrollTo(0, y), offset);
    await page.waitForTimeout(350);

    const header = page.locator("header");
    const settled = (await header.boundingBox())?.height;
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(70);
      expect(
        (await header.boundingBox())?.height,
        `header height changed after stopping at ${offset}px`,
      ).toBe(settled);
    }
  }
});

// Every photograph is of children, so a missing description is a reader losing
// the section entirely rather than losing a decoration.
test("the gallery shows every photograph, each described", async ({ page }) => {
  await page.goto("/");
  const photos = page.locator("#moments img");
  await expect(photos).toHaveCount(moments.length);

  for (const photo of await photos.all()) {
    await expect(photo).toHaveAttribute("alt", /\S/);
  }
});

test("phone number is reachable as a tel: link", async ({ page }) => {
  await page.goto("/");
  expect(await page.locator('a[href^="tel:"]').count()).toBeGreaterThan(0);
});

// The careers page is the only route other than the home page, so every
// navigation link in the shared header, footer and announcement bar has to
// resolve from somewhere that is not the home page. They are written as
// /#section for that reason, and a bare #section would silently do nothing
// here while still working everywhere it was tested before.
test("navigation works from the careers page", async ({ page }) => {
  await page.goto("/careers");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    careers.title,
  );

  // The invariant, asserted directly rather than through one link: nothing in
  // the shared chrome may be a bare fragment, which from here would change the
  // URL and scroll to nothing.
  const bareFragments = await page.evaluate(() =>
    [...document.querySelectorAll("header a, footer a")]
      .map((anchor) => anchor.getAttribute("href") ?? "")
      .filter((href) => href.startsWith("#")),
  );
  expect(bareFragments).toEqual([]);

  // The footer nav is the one that is visible at every width.
  const visit = page
    .getByRole("navigation", { name: "Footer" })
    .locator('a[href="/#visit"]');
  await visit.click();
  await page.waitForURL(/\/#visit$/);

  // Landing on the home page is the point: a bare #visit would change the URL
  // here and scroll to nothing, leaving the visitor on the careers page.
  expect(new URL(page.url()).pathname).toBe("/");

  const section = page.locator("#visit");
  await expect(section).toBeInViewport();

  // The page scrolls smoothly, so the target is passed through before it is
  // settled on. What matters is where it comes to rest: clear of the sticky
  // header rather than above the top of the window.
  await expect
    .poll(async () => Math.round((await section.boundingBox())?.y ?? -1), {
      timeout: 5000,
    })
    .toBeGreaterThanOrEqual(0);
});

// A JobPosting describes a real vacancy with a closing date. The switch in
// `school.ts` has to carry the visible block and the markup together, because
// one without the other either hides an open post or advertises a filled one.
test("the open post and its markup appear together", async ({ page }) => {
  await page.goto("/careers");

  const posting = await page.evaluate(() =>
    [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((node) => {
        try {
          return JSON.parse(node.textContent ?? "");
        } catch {
          return null;
        }
      })
      .find((data) => data?.["@type"] === "JobPosting"),
  );

  if (vacancy.active) {
    expect(posting?.title).toBe(vacancy.title);
    expect(posting?.validThrough).toBe(vacancy.validThrough);
    await expect(page.locator("main")).toContainText(vacancy.title);
  } else {
    expect(posting).toBeFalsy();
    await expect(page.locator("main")).not.toContainText("Open now");
  }

  // Applying stays possible either way, which is the point of the page.
  await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
});

// Both channels have to carry a prefilled subject or message, otherwise an
// application is indistinguishable from any other mail in the inbox.
test("the careers page offers both ways to apply", async ({ page }) => {
  await page.goto("/careers");

  const email = page.locator('a[href^="mailto:"]').first();
  await expect(email).toHaveAttribute(
    "href",
    new RegExp(`^mailto:${contact.email}\\?subject=`),
  );

  const whatsapp = page.locator(`a[href^="${contact.whatsappHref}?text="]`);
  await expect(whatsapp).toHaveCount(1);

  // A mailto opens nothing on a phone with no mail app configured, so the
  // address has to be readable and copyable on the page itself.
  await expect(page.locator("main")).toContainText(contact.email);
});

test.describe("mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile only");

  test("call and WhatsApp stay pinned to the viewport", async ({ page }) => {
    await page.goto("/");
    // Matched by destination rather than label, so wording can change without
    // the guard quietly passing against some other link on the page.
    const bar = page.locator("div.fixed.inset-x-0.bottom-0");
    const call = bar.locator('a[href^="tel:"]');
    await expect(call).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await expect(call).toBeVisible();
    await expect(bar.locator('a[href*="wa.me"]')).toBeVisible();
  });

  test("menu covers the viewport, takes focus and restores it", async ({
    page,
  }) => {
    await page.goto("/");

    const opener = page.getByRole("button", { name: "Open menu" });
    await opener.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    // The header uses backdrop-blur, which creates a containing block. If the
    // overlay is ever moved back inside it, this box will be offset by the
    // header height instead of covering the page.
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    expect(box?.y ?? 99).toBeLessThanOrEqual(1);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(
      (viewport?.height ?? 0) - 1,
    );

    await expect(
      page.getByRole("button", { name: "Close menu" }),
    ).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden",
    );

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  test("a menu link closes the menu and reaches the section", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Classes" })
      .click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Play Group through Class 5" }),
    ).toBeInViewport();
  });
});

test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile, "desktop only");

  test("inline nav scrolls the section clear of the sticky header", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Facilities" })
      .click();
    await page.waitForTimeout(600);

    const heading = page.getByRole("heading", {
      name: "What the school provides",
    });
    await expect(heading).toBeInViewport();

    // Landing in the viewport is not enough: the pinned header sits over the
    // top of it, so the section has to clear the whole of that.
    const header = await page.locator("header").boundingBox();
    const box = await heading.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
  });
});
