import { expect, test, type Page } from "@playwright/test";
import {
  boardClaim,
  careers,
  contact,
  moments,
  school,
  vacancy,
  vacancyClosesAt,
} from "../src/content/school";

/**
 * Where the page comes to rest. The header shortens itself once the page
 * moves, which shifts the page under it by a few pixels after the scroll has
 * finished, so reading the position too early measures the tail of that rather
 * than the thing under test.
 */
async function restingScroll(page: Page) {
  let last = -1;
  await expect
    .poll(async () => {
      const now = await page.evaluate(() => Math.round(window.scrollY));
      const stable = now === last;
      last = now;
      return stable;
    })
    .toBe(true);
  return last;
}

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
  for (const route of ["/", "/careers/"]) {
    await page.goto(route);
    const visible = await page.evaluate(() => document.body.innerText);
    expect(visible, route).not.toMatch(boardClaim);
    expect(visible, route).not.toMatch(/affiliat/i);
  }

  await page.goto("/");
  expect(await page.evaluate(() => document.body.innerText)).toContain(
    school.recognition,
  );
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

// The school's own name, whole. Text cut off by its container is still all
// there to anything reading the markup, so this asks what the reader sees.
test("the header shows the school's name in full", async ({ page }) => {
  await page.goto("/");

  const read = async () =>
    page.evaluate(() => {
      const header = document.querySelector("header");
      const all = [...(header?.querySelectorAll("*") ?? [])];

      const visible = (el: Element) => {
        const box = el.getBoundingClientRect();
        return box.width > 4 && box.height > 4;
      };

      // Text hidden for one audience or the other is not what this is about:
      // a screen-reader label is deliberately a pixel wide, and an element the
      // current breakpoint hides has no box at all. Either would read as cut
      // off and neither is something a reader is looking at.
      const shown = all.filter(visible);

      return {
        texts: shown
          .filter((el) => el.children.length === 0 && el.textContent?.trim())
          .map((el) => el.textContent?.trim() ?? ""),
        // Asked of every element that could do the cutting, not only the one
        // holding the text. A container can clip a child that is itself at its
        // full width, and an inline element reports no scroll width at all, so
        // measuring the text's own span would miss both.
        clipping: shown
          .filter((el) => {
            const overflow = getComputedStyle(el).overflowX;
            if (overflow === "visible") return false;
            return el.scrollWidth > el.clientWidth + 1;
          })
          .map(
            (el) => `${el.tagName.toLowerCase()}: ${el.textContent?.trim()}`,
          ),
      };
    });

  for (const width of [320, 412, 1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(250);
    const { texts, clipping } = await read();

    // Asserted before the clipping check, so a selector that stops matching
    // cannot quietly turn this into a test of nothing.
    expect(texts, `name at ${width}px`).toContain(school.name);
    expect(clipping, `clipped at ${width}px`).toEqual([]);
  }
});

// A desktop window hands the page less width than the window itself, because
// the scrollbar takes its share, and a headless browser has no scrollbar to
// take it. So rather than ask whether the row fits here, which is a kinder
// question than a reader's browser asks, this requires room to spare: more
// than the widest scrollbar it will meet. The row is right-aligned, so the
// free space is found by packing it to the left first.
const SCROLLBAR = 16;

test("the header row has room to spare at every desktop width", async ({
  page,
}) => {
  await page.goto("/");

  for (const width of [1024, 1100, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);

    const slack = await page.evaluate(() => {
      const header = document.querySelector("header");
      const row = [...(header?.children ?? [])].find((child) =>
        child.querySelector("nav"),
      ) as HTMLElement | undefined;
      const nav = row?.querySelector("nav") as HTMLElement | null;
      if (!row || !nav) return null;

      const previous = nav.style.marginLeft;
      nav.style.marginLeft = "0px";
      const style = getComputedStyle(row);
      const box = row.getBoundingClientRect();
      const contentRight =
        box.left + row.clientWidth - parseFloat(style.paddingRight);

      let right = -Infinity;
      for (const child of row.children) {
        const childBox = child.getBoundingClientRect();
        if (childBox.width >= 1) right = Math.max(right, childBox.right);
      }
      nav.style.marginLeft = previous;
      return contentRight - right;
    });

    expect(slack, `header row found at ${width}px`).not.toBeNull();
    expect(
      Math.round(slack!),
      `free space in the header row at ${width}px`,
    ).toBeGreaterThanOrEqual(SCROLLBAR);
  }
});

// Walking backwards from the page into the header asks the browser to bring a
// control into view that never left it. Where the room for the header is held
// by the page, it answers by moving the page, and the reader loses their
// place without having asked for anything.
test("stepping back into the header leaves the page where it is", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 1600));
  const before = await restingScroll(page);
  expect(before).toBeGreaterThan(1000);

  await page.evaluate(() => {
    const first = document.querySelector<HTMLElement>(
      "main a[href], main button",
    );
    first?.focus({ preventScroll: true });
  });

  let reached = false;
  for (let step = 0; step < 25 && !reached; step += 1) {
    await page.keyboard.press("Shift+Tab");
    await page.waitForTimeout(120);
    reached = await page.evaluate(() =>
      document.querySelector("header")!.contains(document.activeElement),
    );
  }

  // Without this the walk could stop short of the header and the reading below
  // would be of a page nothing had asked to move.
  expect(reached, "focus reached the header").toBe(true);
  expect(await restingScroll(page)).toBe(before);
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

// Every link in the chrome is a plain anchor, and the two reasons are
// different. Within a page, the router reads a fragment it is already showing
// as no change at all and leaves the page where it is. Between pages, a
// fragment the browser jumped to itself carries no router state, and the
// router then declines to act on the Back button that returns to it.
test("an in-page link still moves the page when pressed again", async ({
  page,
}) => {
  await page.goto("/");

  const section = page.locator("#visit");

  const press = async (link: ReturnType<typeof page.getByRole>) => {
    await link.click();
    await expect(section).toBeInViewport({ timeout: 5000 });
    // The page scrolls smoothly, so where it comes to rest is what counts.
    await page.waitForTimeout(700);
    return page.evaluate(() => Math.round(window.scrollY));
  };

  // Both routes to the same section, because either one reverting would go
  // unnoticed if only the other were pressed.
  for (const link of [
    page.getByRole("link", { name: /Admissions open for/ }),
    page
      .getByRole("navigation", { name: "Footer" })
      .locator('a[href="/#visit"]'),
  ]) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    const first = await press(link);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    expect(await press(link)).toBe(first);
  }
});

test("the Back button returns to the page the visitor came from", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: /Admissions open for/ }).click();
  await page.waitForTimeout(700);

  await page
    .getByRole("navigation", { name: "Footer" })
    .getByRole("link", { name: "Teaching jobs" })
    .click();
  await page.waitForURL(/\/careers\/?$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    careers.title,
  );

  await page.goBack();

  // The address alone proves nothing: the router can leave the page the
  // visitor is trying to leave on screen while the address bar says they have
  // gone back. Where the page is scrolled to is the browser's own business,
  // and it restores the position rather than jumping to the fragment again.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    school.name,
    { timeout: 5000 },
  );
  await expect(page.locator("main")).not.toContainText(careers.sendHeading);
});

// Moving between the two pages loads a document. That is what leaves an entry
// the Back button can act on, and it is the reason the chrome does not use the
// router.
test("crossing between pages loads a document", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    (window as unknown as { marker?: boolean }).marker = true;
  });

  await page
    .getByRole("navigation", { name: "Footer" })
    .getByRole("link", { name: "Teaching jobs" })
    .click();
  await page.waitForURL(/\/careers\/?$/);

  const survived = await page.evaluate(
    () => (window as unknown as { marker?: boolean }).marker === true,
  );
  expect(survived).toBe(false);
});

// Asserted as the rule rather than through sample links. The reason every
// link here is a plain anchor is that the router mishandles both a repeated
// fragment and the Back button, and one link quietly going back to the router
// would otherwise be caught by nothing.
test("no link is handled in the page", async ({ page, isMobile }) => {
  for (const route of ["/", "/careers/"]) {
    await page.goto(route);
    if (isMobile) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }

    const probe = await page.evaluate(() => {
      const links = [...document.querySelectorAll("a")].filter((anchor) =>
        (anchor.getAttribute("href") ?? "").startsWith("/"),
      );

      const handled: string[] = [];
      let reached = false;

      // Read at the window, after anything in the page has had the press and
      // done whatever it was going to do with it. Calling the navigation off
      // any earlier would mask exactly what is being looked for, because a
      // router that finds the press already called off leaves it alone.
      const watch = (event: Event) => {
        reached = true;
        if (event.defaultPrevented) {
          const anchor = (event.target as Element).closest("a");
          handled.push(anchor?.getAttribute("href") ?? "");
        }
        event.preventDefault();
      };

      window.addEventListener("click", watch);
      for (const link of links) {
        reached = false;
        link.click();
        // A press that never arrives was stopped on its way up, which hides
        // the page's handling of it just as effectively.
        if (!reached) {
          handled.push(`${link.getAttribute("href")} (press stopped short)`);
        }
      }
      window.removeEventListener("click", watch);

      return { count: links.length, handled };
    });

    expect(
      probe.count,
      `internal links found on ${route}`,
    ).toBeGreaterThanOrEqual(8);
    expect(probe.handled, `handled in the page on ${route}`).toEqual([]);
  }
});

// A utility class in the wrong place hides a panel at one screen size and
// leaves the markup behind for a static check to find. These are the things a
// visitor came for, so they are asked for at the size they are being read at.
test("the way to reach the school is on screen", async ({ page }) => {
  await page.goto("/");

  const visit = page.locator("#visit");
  await expect(visit.locator('a[href^="tel:"]').first()).toBeVisible();
  await expect(visit.getByText(contact.addressLines[0])).toBeVisible();
  await expect(visit.getByText(contact.hoursNote)).toBeVisible();

  await page.goto("/careers/");
  const main = page.locator("main");
  await expect(main.locator('a[href^="mailto:"]').first()).toBeVisible();
  await expect(main.locator('a[href*="wa.me"]').first()).toBeVisible();
  await expect(main.getByText(contact.email)).toBeVisible();
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
    expect(posting?.validThrough).toBe(vacancyClosesAt);
    await expect(page.locator("main")).toContainText(vacancy.title);
  } else {
    expect(posting).toBeFalsy();
    await expect(page.locator("main")).not.toContainText("Open now");
  }

  // Applying stays possible either way, which is the point of the page.
  await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
});

// The files are written once and may be served for years, so the panel reads
// the closing date from the visitor rather than from whenever the build ran.
// One instant governs it, which is why two distant clocks agree.
test.describe("the open post closes on time", () => {
  const closes = new Date(vacancyClosesAt).getTime();
  const MINUTE = 60_000;

  // The served file already shows the panel, so anything asserted before the
  // page comes alive is a reading of the build rather than of the decision the
  // visitor's clock produced.
  const awake = (page: Page) =>
    page.waitForFunction(() => {
      const main = document.querySelector("main");
      return Boolean(
        main &&
        Object.keys(main).some((key) => key.startsWith("__reactFiber$")),
      );
    });

  for (const timezoneId of ["Asia/Kolkata", "America/Los_Angeles"]) {
    test.describe(`read from ${timezoneId}`, () => {
      test.use({ timezoneId });

      test("stands while the post is open", async ({ page }) => {
        test.skip(!vacancy.active, "no post is open");

        await page.clock.install({ time: new Date(closes - MINUTE) });
        await page.goto("/careers");
        await awake(page);

        await expect(page.getByText("Open now")).toBeVisible();
        await expect(page.locator("main")).toContainText(vacancy.title);

        // The closed test watches this same class from the first paint, and a
        // class matching nothing would show it nothing to object to. Holding
        // the name against what the panel says keeps the two in step.
        await expect(page.locator(".open-post")).toContainText("Open now");
      });

      test("stands down once it has closed", async ({ page }) => {
        test.skip(!vacancy.active, "no post is open");

        await page.clock.install({ time: new Date(closes + MINUTE) });

        // Watched from the first paint rather than from the end of the load.
        // The file still carries the post, and taking it away after the reader
        // has seen it moves everything under their thumb.
        await page.goto("/careers", { waitUntil: "commit" });

        const panel = page.locator(".open-post");
        for (let i = 0; i < 20; i++) {
          expect(
            await panel.evaluateAll((nodes) =>
              nodes.some((node) => node.getBoundingClientRect().height > 0),
            ),
            "a closed post was on screen",
          ).toBe(false);
          await page.waitForTimeout(25);
        }

        await awake(page);
        await expect(page.getByText("Open now")).toHaveCount(0);
        // What a teacher arriving late is left with.
        await expect(page.locator("main")).toContainText(careers.openTo);
        await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
      });
    });
  }
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

  // Located by where the actions come to rest rather than by the class names
  // that put them there, so this is a guard on the thing that matters: the
  // call action reaching the bottom edge of the screen wherever the reader has
  // got to. Scrolling to the end of the page is not enough on its own, because
  // a bar sitting at the end of the document would look the same there.
  test("call and WhatsApp stay pinned to the viewport", async ({ page }) => {
    await page.goto("/");

    const pinned = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]')]
          .filter((anchor) => {
            const box = anchor.getBoundingClientRect();
            return (
              box.width > 0 && Math.abs(box.bottom - window.innerHeight) <= 1
            );
          })
          .map((anchor) => (anchor.getAttribute("href") ?? "").split("?")[0]),
      );

    for (const offset of [0, 1500, 999_999]) {
      await page.evaluate((y) => window.scrollTo(0, y), offset);
      await page.waitForTimeout(400);
      expect(await pinned(), `stopped at ${offset}px`).toEqual([
        contact.phoneHref,
        contact.whatsappHref,
      ]);
    }

    // The page stops above the bar rather than running under it, so the end of
    // the footer is still readable once the reader gets there.
    const clearance = await page.evaluate(() => {
      const bar = [...document.querySelectorAll('a[href^="tel:"]')]
        .map((anchor) => anchor.getBoundingClientRect())
        .find((box) => Math.abs(box.bottom - window.innerHeight) <= 1);
      const footer = document.querySelector("footer")?.getBoundingClientRect();
      if (!bar || !footer) return null;
      return Math.round(bar.top - footer.bottom);
    });
    expect(clearance).not.toBeNull();
    expect(clearance ?? -1).toBeGreaterThanOrEqual(0);
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

  // Opening the menu part-way down the page, which is where a reader on a
  // phone reaches for it. What is guarded is the reader's position across
  // opening and closing, which has to survive both the panel taking focus and
  // the button getting it back.
  test("the menu leaves the page where the reader left it", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 1488));

    // The header shortens itself once the page moves, which shifts the page
    // under it by a few pixels. Waiting for that to finish, so what follows
    // measures the menu rather than the tail of an animation.
    const before = await restingScroll(page);
    expect(before).toBeGreaterThan(1000);

    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(before);

    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await restingScroll(page)).toBe(before);
  });

  // The menu is taller than a small phone, and the page behind it is locked,
  // so anything it cannot scroll to is out of reach altogether. Scrolled by a
  // gesture rather than from code, because a panel that cannot scroll can
  // still be scrolled by a script and would pass while a reader was stuck.
  test("every menu item can be reached on a short screen", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // The panel has to be longer than the screen for this to be asking
    // anything: on a taller screen everything is reachable without scrolling
    // and the reading below would come for free.
    const overflows = await dialog.evaluate(
      (el) => el.scrollHeight > el.clientHeight + 1,
    );
    expect(overflows, "the menu is longer than the screen").toBe(true);

    const box = await dialog.boundingBox();
    await page.mouse.move(
      (box?.x ?? 0) + (box?.width ?? 0) / 2,
      (box?.y ?? 0) + (box?.height ?? 0) / 2,
    );
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);

    // The two that sat past the bottom edge. Asked for in full, because a link
    // already half on screen would answer a looser question without the panel
    // having scrolled at all.
    await expect(dialog.locator('a[href^="tel:"]')).toBeInViewport({
      ratio: 1,
    });
    await expect(dialog.locator("a").last()).toBeInViewport({ ratio: 1 });
  });

  // Tabbing forwards is how a keyboard reader moves through the page, and
  // every stop has to arrive somewhere they can see rather than behind one of
  // the bars pinned over it. Both bars are measured as they are, so this holds
  // whatever height they grow to.
  test("tabbing through the page never lands behind a pinned bar", async ({
    page,
  }) => {
    // Scrolling is animated by default, so a reading taken straight after a
    // key press catches the page in mid-flight. Reduced motion is a setting a
    // reader can hold anyway, and it makes each stop land before it is read.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const covered: string[] = [];
    for (let step = 0; step < 40; step += 1) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(60);

      const stop = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active || active === document.body) return null;
        if (!active.closest("main, footer")) return null;

        const box = active.getBoundingClientRect();
        if (box.width === 0 && box.height === 0) return null;

        // Whatever is pinned over the page right now, measured rather than
        // assumed, so the figures cannot drift from the stylesheet.
        let header = 0;
        let bar = window.innerHeight;
        for (const el of document.querySelectorAll("header, div, nav")) {
          if (
            getComputedStyle(el).position !== "fixed" &&
            getComputedStyle(el).position !== "sticky"
          )
            continue;
          const pinned = el.getBoundingClientRect();
          if (pinned.height === 0 || pinned.height > window.innerHeight / 2)
            continue;
          if (pinned.top <= 0) header = Math.max(header, pinned.bottom);
          if (pinned.bottom >= window.innerHeight - 1)
            bar = Math.min(bar, pinned.top);
        }

        const name = `${active.tagName.toLowerCase()} "${(active.textContent ?? "").trim().slice(0, 24)}"`;
        if (box.top < header - 1) return `${name} is behind the header`;
        if (box.bottom > bar + 1) return `${name} is behind the call bar`;
        return null;
      });

      if (stop) covered.push(stop);
    }

    expect(covered).toEqual([]);
  });

  // Text enlargement widens the layout past the screen, and a bar pinned to
  // the page rather than the screen goes with it, taking the way to call the
  // school off the side.
  test("enlarged text does not push the page wider than the screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 240, height: 640 });

    for (const route of ["/", "/careers/"]) {
      await page.goto(route);
      await page.waitForTimeout(300);
      const width = await page.evaluate(() => ({
        inner: window.innerWidth,
        document: Math.round(document.documentElement.scrollWidth),
      }));
      expect(width.inner, `viewport on ${route}`).toBe(240);
      expect(width.document, `document on ${route}`).toBeLessThanOrEqual(240);
    }
  });

  // A bar pinned to the screen is outside the page's own width, so the check
  // above cannot see it: it stays within 240px while its contents are squeezed
  // to nothing. The mark is what identifies each action at a glance, and a
  // mark squeezed to nothing identifies neither.
  test("the call bar keeps both actions whole however narrow the screen", async ({
    page,
  }) => {
    for (const width of [240, 280, 320, 360, 412]) {
      await page.setViewportSize({ width, height: 640 });
      await page.goto("/");
      await page.waitForTimeout(250);

      const actions = await page.evaluate(() => {
        const bars = [...document.querySelectorAll("div")].filter((el) => {
          const style = getComputedStyle(el);
          return (
            style.position === "fixed" &&
            el.getBoundingClientRect().bottom >= window.innerHeight - 2 &&
            el.querySelector('a[href^="tel:"]')
          );
        });
        const bar = bars.at(-1);
        if (!bar) return null;
        return [...bar.querySelectorAll("a")].map((link) => {
          const icon = link.querySelector("svg");
          const box = link.getBoundingClientRect();
          return {
            name: (link.textContent ?? "").trim(),
            icon: icon ? icon.getBoundingClientRect().width : 0,
            past: box.right - window.innerWidth,
          };
        });
      });

      expect(actions, `call bar at ${width}px`).not.toBeNull();
      expect(actions!.length, `actions at ${width}px`).toBe(2);
      for (const action of actions!) {
        expect(action.name, `an action is named at ${width}px`).not.toBe("");
        expect(
          Math.round(action.icon),
          `${action.name} mark at ${width}px`,
        ).toBeGreaterThanOrEqual(20);
        expect(
          Math.round(action.past),
          `${action.name} past the screen at ${width}px`,
        ).toBeLessThanOrEqual(0);
      }
    }
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
