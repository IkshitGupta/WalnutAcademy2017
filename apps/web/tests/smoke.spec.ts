import { expect, test, type Page } from "@playwright/test";
import {
  admissions,
  affiliationClaim,
  boardClaim,
  careers,
  contact,
  learningAreas,
  moments,
  navLinks,
  school,
  social,
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

/**
 * Waits for the page to come alive. The served file already carries what the
 * build decided, so anything read before React has taken the page over is a
 * reading of the build rather than of what the visitor is shown.
 *
 * The page having been claimed is not the same as its effects having run. Read
 * on that signal alone it came back with the built-in value about once in
 * twenty, and a frame and a turn later was only a better guess: with the work
 * React does between the two held up, the wait still ended before a single
 * listener had been installed. The header marks the document once its own
 * effects have run, and a commit's effects run together, so that mark is the
 * page itself saying it is ready rather than this guessing at how long ready
 * takes.
 */
const awake = (page: Page) =>
  page.waitForFunction(
    () => document.documentElement.dataset.ready !== undefined,
  );

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
    expect(visible, route).not.toMatch(affiliationClaim);
  }

  await page.goto("/");
  expect(await page.evaluate(() => document.body.innerText)).toContain(
    school.recognition,
  );
});

test("the admissions line names the session the school set", async ({
  page,
}) => {
  await page.goto("/");
  const lines = page.getByText(/^Admissions open for/);

  // The bar at the top and the chip in the Visit panel.
  await expect(lines).toHaveCount(2);
  for (const line of await lines.all()) {
    await expect(line).toHaveText(`${admissions.label} ${admissions.session}`);
  }
});

// The session is the school's to set and not the calendar's. It was worked out
// from the date on the reading that admissions open each November, which
// nobody had confirmed, so the line changed what it claimed on a date the
// school had not chosen.
//
// Every line is read, not the first of them. Asked only of the first, a chip
// that had gone back to working the session out for itself went unseen: the
// bar said 2026–27 while the chip beneath it said 2031–32, which is the very
// fault this is here to catch. Each is read once the page is awake, because
// the served file carries what the build decided and a date creeping back in
// would be written over it a moment later.
test("the admissions line reads the same at any date and in any country", async ({
  page,
  browser,
}) => {
  const expected = `${admissions.label} ${admissions.session}`;

  const readEveryLine = async (on: Page, where: string) => {
    await awake(on);
    const lines = on.getByText(/^Admissions open for/);
    await expect(lines, where).toHaveCount(2);
    for (const line of await lines.all()) {
      await expect(line, where).toHaveText(expected);
    }
  };

  for (const instant of [
    "2026-10-31T18:29:00Z",
    "2026-10-31T18:30:00Z",
    "2027-06-15T06:00:00Z",
    "2031-01-01T00:00:00Z",
  ]) {
    await page.clock.setFixedTime(new Date(instant));
    await page.goto("/");
    await readEveryLine(page, `at ${instant}`);
  }

  for (const timezoneId of ["Asia/Kolkata", "America/Los_Angeles"]) {
    const context = await browser.newContext({
      timezoneId,
      baseURL: page.url().slice(0, page.url().indexOf("/", 8)),
    });
    const elsewhere = await context.newPage();
    await elsewhere.clock.setFixedTime(new Date("2026-10-31T18:35:00Z"));
    await elsewhere.goto("/");
    await readEveryLine(elsewhere, `read in ${timezoneId}`);
    await context.close();
  }
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

// A raised first letter is set beside the lines it shares, and those lines are
// indented past it. In a narrow measure that indent is a fifth of the line and
// the left edge goes ragged, so the letter is only raised where there is room.
test("the opening paragraph keeps a straight left edge on a phone", async ({
  page,
}) => {
  await page.goto("/");

  for (const width of [320, 390, 412, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);

    const indents = await page.evaluate(() => {
      const paragraph = document.querySelector("#about .space-y-5 p");
      if (!paragraph) return null;
      const text = [...paragraph.childNodes].find(
        (node) => node.nodeType === 3,
      );
      if (!text) return null;
      const range = document.createRange();
      range.selectNodeContents(text);
      const left = paragraph.getBoundingClientRect().left;
      return [...range.getClientRects()].map((rect) =>
        Math.round(rect.left - left),
      );
    });

    expect(indents, `the opening paragraph at ${width}px`).not.toBeNull();
    const ragged = indents!.filter((indent) => indent > 1);

    if (width >= 1024) {
      // Where the two columns are, the line is long enough to carry it.
      expect(ragged.length, `the raised letter at ${width}px`).toBeGreaterThan(
        0,
      );
    } else {
      expect(
        ragged,
        `lines indented past a raised letter at ${width}px`,
      ).toEqual([]);
    }
  }
});

// Shutting the fold takes away the words that stood above the control, so the
// page below moves up by as much as was revealed while the scroll position
// stays where it was. A reader who opened a message, read to the end and shut
// it again was left facing whatever the collapse pulled upwards, with the
// person they had been reading off the top of the screen. Shutting returns
// them to that person, and leaves the page alone when they can still see them.
test("shutting a message returns the reader to the person", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);

  const person = (index: number) =>
    page.evaluate((i) => {
      const section = [...document.querySelectorAll("main section")].find(
        (el) =>
          (el.querySelector("h2")?.textContent ?? "").startsWith(
            "From the people",
          ),
      );
      const article = section?.querySelectorAll("article")[i];
      if (!article) return null;
      const box = article.getBoundingClientRect();
      return {
        top: Math.round(box.top),
        scrollY: Math.round(window.scrollY),
        open: Boolean(article.querySelector("details")?.open),
      };
    }, index);

  const act = (index: number, what: "open" | "toEnd" | "close") =>
    page.evaluate(
      ({ i, what }) => {
        const section = [...document.querySelectorAll("main section")].find(
          (el) =>
            (el.querySelector("h2")?.textContent ?? "").startsWith(
              "From the people",
            ),
        );
        const article = section!.querySelectorAll("article")[i];
        const summary = article.querySelector("summary")!;
        if (what === "toEnd") summary.scrollIntoView({ block: "center" });
        else summary.click();
      },
      { i: index, what },
    );

  for (const index of [0, 1]) {
    await page.evaluate((i) => {
      const section = [...document.querySelectorAll("main section")].find(
        (el) =>
          (el.querySelector("h2")?.textContent ?? "").startsWith(
            "From the people",
          ),
      );
      section!
        .querySelectorAll("article")
        [i].scrollIntoView({ block: "start" });
    }, index);
    await page.waitForTimeout(250);

    await act(index, "open");
    await page.waitForTimeout(250);
    await act(index, "toEnd");
    await page.waitForTimeout(250);

    const carriedPast = await person(index);
    // The reader has to have been carried past, or there is nothing to undo.
    expect(
      carriedPast!.top,
      `person ${index} is above the screen`,
    ).toBeLessThan(0);

    await act(index, "close");
    await page.waitForTimeout(400);

    const back = await person(index);
    expect(back!.open, `person ${index}'s message is shut`).toBe(false);
    expect(
      back!.top,
      `person ${index} is back on screen`,
    ).toBeGreaterThanOrEqual(0);
    expect(back!.top, `person ${index} is near the top`).toBeLessThan(200);
  }

  // Shutting it while the person is still in view must not move the page.
  await page.evaluate(() => {
    const section = [...document.querySelectorAll("main section")].find((el) =>
      (el.querySelector("h2")?.textContent ?? "").startsWith("From the people"),
    );
    section!.querySelectorAll("article")[0].scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(250);
  const resting = await person(0);
  await act(0, "open");
  await page.waitForTimeout(250);
  await act(0, "close");
  await page.waitForTimeout(400);
  const stillResting = await person(0);
  expect(
    stillResting!.scrollY,
    "the page stays put when the person is already in view",
  ).toBe(resting!.scrollY);
});

// The fold is opened by a control the reader sees as two words with a line
// under them. It sat inside a column laid out as a flex container, which
// stretches its items, so the box reached the full width while the underline
// stayed around the words: a tap on blank cream a hundred pixels away opened
// the message. A control should be the size it appears to be, and nothing on
// screen shows where its edge is, so the box is measured instead.
test("the read-more control is the size it looks", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);

  const controls = await page.evaluate(() =>
    [...document.querySelectorAll("details.message-fold > summary")].map(
      (summary) => {
        const label = summary.querySelector(".fold-shut") ?? summary;
        const box = summary.getBoundingClientRect();
        const words = label.getBoundingClientRect();
        return {
          beyondTheWords: box.right - words.right,
          height: box.height,
          words: (label.textContent ?? "").trim(),
        };
      },
    ),
  );

  expect(controls.length, "folds on a phone").toBeGreaterThan(0);
  for (const control of controls) {
    expect(
      Math.round(control.beyondTheWords),
      `reach past "${control.words}"`,
    ).toBeLessThanOrEqual(8);
    // Still worth a comfortable tap once it no longer spans the column.
    expect(
      control.height,
      `the height of "${control.words}"`,
    ).toBeGreaterThanOrEqual(44);
  }
});

// A link to the page you are already on is worth following only to find out
// that it goes nowhere. Both the foot of the page and the menu offer one on
// the careers page, and neither said so. In-page anchors are a different
// thing and are left alone: they take the reader somewhere, and the header
// already marks the one in view as a location rather than as the page.
test("a link to the page you are on says so", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const survey = async () =>
    await page.evaluate(() => {
      const look = (el: Element) => {
        const style = getComputedStyle(el);
        return `${style.color}|${style.fontWeight}|${style.boxShadow}`;
      };
      const tidy = (value: string) => value.replace(/\/$/, "");
      const out: {
        label: string;
        self: boolean;
        marked: string | null;
        look: string;
        beside: string[];
      }[] = [];
      for (const link of document.querySelectorAll("a[href]")) {
        const href = link.getAttribute("href") ?? "";
        // An anchor goes somewhere on this page; only a bare path can be the
        // page itself.
        if (href.includes("#") || /^(mailto|tel|https?):/.test(href)) continue;
        const list = link.closest("ul, nav, div");
        out.push({
          label: link.textContent?.trim() ?? "",
          self:
            tidy(new URL(href, location.href).pathname) ===
            tidy(location.pathname),
          marked: link.getAttribute("aria-current"),
          look: look(link),
          beside: [...(list?.querySelectorAll("a[href]") ?? [])]
            .filter((other) => other !== link)
            .map(look),
        });
      }
      return out;
    });

  await page.goto("/careers/");
  await page.locator("header button[aria-expanded]").first().click();
  await expect(page.locator("#mobile-menu")).toBeVisible();
  const onCareers = await survey();
  const selves = onCareers.filter((link) => link.self);
  expect(selves.length, "links to the careers page from itself").toBe(2);
  for (const link of selves) {
    expect(link.marked, `"${link.label}" marked as the page`).toBe("page");
    // Marked for assistive technology alone, the reader looking at the screen
    // is still told nothing, so it also has to look unlike the links it sits
    // with.
    expect(
      link.beside,
      `"${link.label}" looking unlike its neighbours`,
    ).not.toContain(link.look);
  }
  for (const link of onCareers.filter((entry) => !entry.self)) {
    expect(
      link.marked,
      `"${link.label}" is not this page and must not claim to be`,
    ).not.toBe("page");
  }

  await page.goto("/");
  await page.locator("header button[aria-expanded]").first().click();
  await expect(page.locator("#mobile-menu")).toBeVisible();
  for (const link of await survey()) {
    expect(
      link.marked,
      `"${link.label}" on the home page must not claim to be the careers page`,
    ).not.toBe("page");
  }
});

// Taking the fold's control away is only safe because a rule beside it opens
// the words. The two were asked for separately — the control hidden by a
// utility, the words opened under `@supports` — so in a browser without
// `::details-content` the words stayed shut with nothing left to open them.
// That is Safari before 18.4 and Firefox before 143, including an older tablet
// held landscape, and a sheet of paper in portrait.
//
// Only what such a browser drops is taken away here: the `@supports` block and
// any rule naming the pseudo-element. Taking the enclosing `@media` as well
// would carry off the rule that hides the control, handing back the very thing
// whose absence is the fault.
test("no message is left shut with nothing to open it", async ({ page }) => {
  for (const width of [390, 718, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const removed = await page.evaluate(() => {
      let gone = 0;
      const strip = (group: CSSStyleSheet | CSSGroupingRule) => {
        const rules = group.cssRules;
        for (let i = rules.length - 1; i >= 0; i--) {
          const rule = rules[i];
          const unsupported =
            (rule instanceof CSSSupportsRule &&
              rule.conditionText.includes("details-content")) ||
            (rule instanceof CSSStyleRule &&
              rule.selectorText.includes("details-content"));
          if (unsupported) {
            group.deleteRule(i);
            gone++;
            continue;
          }
          if ("cssRules" in rule) strip(rule as CSSGroupingRule);
        }
      };
      for (const sheet of document.styleSheets) {
        try {
          strip(sheet);
        } catch {
          // A stylesheet from elsewhere cannot be read, and carries none of this.
        }
      }
      return gone;
    });
    expect(
      removed,
      `the rule that opens a fold, at ${width}px`,
    ).toBeGreaterThan(0);

    const folds = await page.evaluate(() =>
      [...document.querySelectorAll(".message-fold")].map((fold) => ({
        words: fold.hasAttribute("open"),
        control:
          getComputedStyle(fold.querySelector("summary")!).display !== "none",
        who:
          fold
            .closest("article")
            ?.querySelector("p,h3")
            ?.textContent?.trim()
            .slice(0, 24) ?? "?",
      })),
    );

    expect(folds.length, `messages at ${width}px`).toBeGreaterThan(0);
    for (const fold of folds) {
      expect(
        fold.words || fold.control,
        `the words of "${fold.who}" can be reached at ${width}px`,
      ).toBe(true);
    }
  }
});

// Paper has no way of pressing a control, so the stylesheet opens the folds
// for it. That rests on `::details-content`, and where a browser has not got
// it the same sheet came out with both messages shut and a "Read more" on it
// that nobody can press: 0 of 5 paragraphs reached the page. The compatibility
// check above only asks about the screen, where the control is still there to
// press, so it had nothing to say about this.
test("a browser without the opener still prints every message", async ({
  page,
}) => {
  // What such a browser answers when the page asks whether it has it.
  await page.addInitScript(() => {
    const real = CSS.supports.bind(CSS);
    CSS.supports = ((condition: string, value?: string) =>
      condition.includes("details-content")
        ? false
        : value === undefined
          ? real(condition)
          : real(condition, value)) as typeof CSS.supports;
  });

  await page.setViewportSize({ width: 718, height: 1000 });
  await page.goto("/");

  // This browser does have the opener, so the rules that rest on it are put
  // back to what one without it would do: a shut fold stays shut and keeps its
  // control. The control is restored for every fold, not only the shut ones,
  // because the real rule hides it on all of them in print — which left the
  // count of unpressable controls below unable to rise above zero whatever the
  // page did.
  await page.addStyleTag({
    content: `@media print {
      .message-fold:not([open])::details-content {
        content-visibility: hidden !important;
        block-size: 0 !important;
      }
      .message-fold > summary { display: flex !important; }
    }`,
  });

  const folded = await page.locator(".message-fold").count();
  expect(folded, "messages folded on the screen").toBeGreaterThan(0);
  const shutBefore = await page.locator(".message-fold[open]").count();

  // The fallback is installed when the page comes alive, so asking for paper
  // before that would be asking a page that has not yet had the chance.
  await awake(page);

  await page.emulateMedia({ media: "print" });

  const totalFolded = await page.evaluate(
    () =>
      [...document.querySelectorAll(".message-fold")].flatMap((fold) => [
        ...fold.querySelectorAll("p"),
      ]).length,
  );
  expect(totalFolded, "folded paragraphs").toBeGreaterThan(0);

  // Asking for paper reaches the fallback on its own turn, so this is polled
  // rather than read once. Read immediately, the page still shows the sheet
  // the reader was about to lose.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            [...document.querySelectorAll(".message-fold")]
              .flatMap((fold) => [...fold.querySelectorAll("p")])
              .filter((p) => p.checkVisibility()).length,
        ),
      { message: "folded paragraphs that reach the paper" },
    )
    .toBe(totalFolded);

  const deadControls = await page.evaluate(
    () =>
      [...document.querySelectorAll(".message-fold > summary")].filter((el) =>
        el.checkVisibility(),
      ).length,
  );
  expect(deadControls, "controls printed with nothing to press").toBe(0);

  // The reader gets their page back as they left it.
  await page.emulateMedia({ media: "screen" });
  await expect(page.locator(".message-fold[open]")).toHaveCount(shutBefore);
});

// Printing is something a reader does in passing, and the page they come back
// to should be the one they left. Two ways it was not.
//
// A browser may announce the same print twice, through the event and through
// the media query, and both were acted on: the second found the folds already
// open, recorded that there was nothing to put back, and the messages stayed
// open afterwards. And closing a fold again looked to the page exactly like
// the reader closing it, so it was carried back up to the person it belongs
// to — from the Visit panel at the foot of the page to the principal's message
// in the middle of it.
test("printing leaves the page where the reader left it", async ({ page }) => {
  await page.addInitScript(() => {
    const real = CSS.supports.bind(CSS);
    CSS.supports = ((condition: string, value?: string) =>
      condition.includes("details-content")
        ? false
        : value === undefined
          ? real(condition)
          : real(condition, value)) as typeof CSS.supports;
  });

  await page.setViewportSize({ width: 718, height: 1000 });
  await page.goto("/");
  await awake(page);

  const shutBefore = await page.locator(".message-fold:not([open])").count();
  expect(shutBefore, "messages shut on the screen").toBeGreaterThan(0);

  // Far enough down that a fold being carried back to its own article would
  // take the reader with it.
  await page.locator("#visit").scrollIntoViewIfNeeded();
  const before = await restingScroll(page);
  expect(before, "scrolled away from the messages").toBeGreaterThan(0);

  // Announced twice, which is what the browsers this fallback exists for do:
  // they raise the event and change the media at the same print. The second
  // telling is the one that used to lose the record of what to put back.
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("beforeprint"));
    window.dispatchEvent(new Event("beforeprint"));
  });
  await expect
    .poll(() => page.locator(".message-fold:not([open])").count(), {
      message: "messages opened for the printer",
    })
    .toBe(0);

  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await page.emulateMedia({ media: "screen" });

  await expect(
    page.locator(".message-fold:not([open])"),
    "messages shut again afterwards",
  ).toHaveCount(shutBefore);

  // Returning from paper reflows the page a little, so what is asked is that
  // the reader is still looking at what they printed from, rather than at an
  // identical number. The fault this guards moved them the length of the page,
  // from the Visit panel to a message halfway up it.
  await expect(
    page.locator("#visit"),
    "the section the reader printed from",
  ).toBeInViewport();
  expect(
    Math.abs((await restingScroll(page)) - before),
    "how far the page moved while printing",
  ).toBeLessThan(1000);

  // The mark that tells a script's close apart from the reader's has to be
  // spent when it is read. Left on the fold, every close the reader made for
  // the rest of the visit was taken for the script's, and they were never
  // carried back to the message they had been reading.
  //
  // The mark itself is read rather than the scrolling that follows from it.
  // Collapsing a message this long shortens the page by more than a screen,
  // which drags the scroll up on its own and leaves the message near the top
  // whether or not anything carried the reader there: measured that way, a
  // fold that had kept its mark looked exactly like one that had spent it.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            [...document.querySelectorAll<HTMLElement>(".message-fold")].filter(
              (el) => el.dataset.printRestore !== undefined,
            ).length,
        ),
      { message: "folds still carrying the script's mark" },
    )
    .toBe(0);

  // And spent even when the fold does not stay shut. The notice arrives on
  // its own turn, so a reader who reopens a message just as the sheet comes
  // back finds it already open by the time the notice lands. Read before the
  // handler asks whether the fold is open, the mark is cleared either way;
  // asked the other way round it stayed on, and was spent on the reader's
  // next close instead.
  await page.evaluate(() => {
    window.dispatchEvent(new Event("beforeprint"));
    window.dispatchEvent(new Event("afterprint"));
    for (const fold of document.querySelectorAll(".message-fold")) {
      fold.setAttribute("open", "");
    }
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            [...document.querySelectorAll<HTMLElement>(".message-fold")].filter(
              (el) => el.dataset.printRestore !== undefined,
            ).length,
        ),
      { message: "marks left on folds reopened as the sheet came back" },
    )
    .toBe(0);
});

// A rule between two things divides them. Carried by the last item as well, it
// divides that item from nothing and closes a list the band already closes.
test("the last technique carries no dividing rule", async ({ page }) => {
  await page.goto("/");

  const rules = await page.evaluate(() => {
    const section = [...document.querySelectorAll("main section")].find((el) =>
      (el.querySelector("h2")?.textContent ?? "").startsWith("How we teach"),
    );
    if (!section) return null;
    return [...section.querySelectorAll("li")].map((li) =>
      parseFloat(getComputedStyle(li).borderBottomWidth),
    );
  });

  expect(rules, "the techniques list").not.toBeNull();
  expect(rules!.length, "techniques listed").toBeGreaterThan(1);
  for (const width of rules!.slice(0, -1)) {
    expect(width, "a rule between two techniques").toBeGreaterThan(0);
  }
  expect(rules![rules!.length - 1], "a rule after the last technique").toBe(0);
});

// A phone shows the nine names and a wider screen the nine sentences. The
// sentences are taken off the screen rather than out of the page, so a phone
// reading the page aloud still reaches them; what is guarded is that they are
// hidden the way that keeps them, since the obvious way of writing this hides
// them from everyone and nothing on screen would show the difference.
test("a phone is given the names of the learning areas and a desktop the sentences", async ({
  page,
}) => {
  await page.goto("/");

  const read = async (width: number) => {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(120);
    return page.evaluate(() => {
      const section = document.querySelector("#learning");
      if (!section) return null;
      const items = [...section.querySelectorAll("li")];
      const sentences = items.map((li) => li.querySelector("p"));
      return {
        areas: items.length,
        named: items
          .map((li) => li.querySelector("h3")?.textContent?.trim() ?? "")
          .filter(Boolean).length,
        // Taken off the screen but kept in the page: clipped to nothing, yet
        // still laid out and still read out.
        onScreen: sentences.filter((p) => {
          if (!p) return false;
          const box = p.getBoundingClientRect();
          return box.width > 2 && box.height > 2;
        }).length,
        inThePage: sentences.filter((p) => p?.checkVisibility()).length,
        tall: Math.round(section.getBoundingClientRect().height),
      };
    });
  };

  const phone = await read(390);
  expect(phone, "the learning areas section").not.toBeNull();
  expect(phone!.areas, "areas listed").toBe(learningAreas.length);
  expect(phone!.named, "areas a phone names").toBe(learningAreas.length);
  expect(phone!.onScreen, "sentences a phone shows").toBe(0);
  expect(phone!.inThePage, "sentences a phone still reads out").toBe(
    learningAreas.length,
  );

  const desktop = await read(1280);
  expect(desktop!.areas, "areas listed on a desktop").toBe(
    learningAreas.length,
  );
  expect(desktop!.onScreen, "sentences a desktop shows").toBe(
    learningAreas.length,
  );

  // The point of holding the sentences back was the height they cost a phone.
  expect(phone!.tall, "the section on a phone").toBeLessThan(700);
});

// The stages are drawn as a path, and a path ends at its last point. Drawn
// down the whole list instead, the line ran on past the final stage and
// stopped beside it with nothing to mark the end. Each mark sits on the middle
// of its panel, so the line between two marks is drawn in halves; what matters
// is the ink the reader sees, which must begin at the first mark, reach the
// last, and not break on the way.
test("the classes path runs between the stages and stops at the last", async ({
  page,
}) => {
  await page.goto("/");

  for (const width of [320, 360, 390, 412]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);

    const path = await page.evaluate(() => {
      const items = [...document.querySelectorAll("#classes li")];
      if (items.length < 2) return null;

      const marks: number[] = [];
      const segments: { top: number; bottom: number }[] = [];
      for (const li of items) {
        for (const span of li.querySelectorAll("span")) {
          const box = span.getBoundingClientRect();
          if (box.width < 0.5 || box.height < 0.5) continue;
          if (Math.round(box.width) === 12 && Math.round(box.height) === 12) {
            marks.push(box.top + box.height / 2);
          } else if (box.width <= 3 && box.height > 4) {
            segments.push({ top: box.top, bottom: box.bottom });
          }
        }
      }
      if (!marks.length || !segments.length) return null;

      marks.sort((a, b) => a - b);
      segments.sort((a, b) => a.top - b.top);
      let widestBreak = 0;
      for (let i = 1; i < segments.length; i++) {
        widestBreak = Math.max(
          widestBreak,
          segments[i].top - segments[i - 1].bottom,
        );
      }

      return {
        stages: items.length,
        marks: marks.length,
        firstMark: marks[0],
        lastMark: marks[marks.length - 1],
        inkStarts: segments[0].top,
        inkEnds: Math.max(...segments.map((s) => s.bottom)),
        widestBreak,
      };
    });

    expect(path, `the classes path at ${width}px`).not.toBeNull();
    expect(path!.marks, `a mark for every stage at ${width}px`).toBe(
      path!.stages,
    );
    expect(
      Math.round(path!.inkStarts - path!.firstMark),
      `the path begins at the first stage at ${width}px`,
    ).toBe(0);
    expect(
      Math.round(path!.inkEnds - path!.lastMark),
      `the path stops at the last stage at ${width}px`,
    ).toBe(0);
    expect(
      Math.round(path!.widestBreak),
      `the path runs unbroken at ${width}px`,
    ).toBe(0);
  }
});
// A visitor arriving from a local search gives the page a screen or so before
// deciding whether to stay, and spends the first half of that working out
// whether they are in the right place and the second half learning what the
// school is. The facts are that second half, so they have to be on the screen
// they arrive on, above the bar pinned over the foot of it. On a screen too
// short to hold them all, as many as will fit, so there is something there to
// carry on reading.
const HERO_FACTS = 4;

test("the hero facts are on the first screen of a phone", async ({ page }) => {
  await page.goto("/");

  for (const [width, height, wanted] of [
    [360, 640, 2],
    [360, 800, HERO_FACTS],
    [390, 844, HERO_FACTS],
    [412, 915, HERO_FACTS],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);

    const facts = await page.evaluate(() => {
      const hero = document.querySelector("#top");
      if (!hero) return null;
      const bar = [...document.querySelectorAll("div")].find((el) => {
        const style = getComputedStyle(el);
        return (
          style.position === "fixed" &&
          el.getBoundingClientRect().bottom >= window.innerHeight - 2 &&
          el.querySelector('a[href^="tel:"]')
        );
      });
      const floor = bar ? bar.getBoundingClientRect().top : window.innerHeight;
      const items = [...hero.querySelectorAll("ul li")];
      return {
        total: items.length,
        seen: items.filter((el) => {
          const box = el.getBoundingClientRect();
          return box.top >= 0 && box.bottom <= floor;
        }).length,
      };
    });

    expect(facts, `the hero at ${width}x${height}`).not.toBeNull();
    expect(facts!.total, `facts offered at ${width}x${height}`).toBe(
      HERO_FACTS,
    );
    expect(
      facts!.seen,
      `facts on the first screen at ${width}x${height}`,
    ).toBeGreaterThanOrEqual(wanted);
  }
});

// Each message is folded after its opening paragraph where the two of them
// would stack into a wall, and opened by the stylesheet where there is room.
// Both halves matter: words folded away on a wide screen would be hidden for
// no reason, and a fold that never closes saves nothing.
test("the leadership messages fold on a phone and open on a desktop", async ({
  page,
}) => {
  await page.goto("/");

  for (const width of [320, 390, 1023, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);

    const folds = await page.evaluate(() => {
      const section = [...document.querySelectorAll("section")].find((el) =>
        (el.querySelector("h2")?.textContent ?? "").startsWith(
          "From the people",
        ),
      );
      if (!section) return null;
      const all = [...section.querySelectorAll("details.message-fold")];
      return {
        count: all.length,
        // A hidden control and a box taller than it means the stylesheet has
        // opened the fold; a shown control and a box the height of that
        // control means it is still folded.
        open: all.map((el) => {
          const summary = el.querySelector("summary")!.getBoundingClientRect();
          const box = el.getBoundingClientRect();
          return summary.height === 0 && box.height > summary.height + 40;
        }),
        controls: all.map((el) =>
          Math.round(
            el.querySelector("summary")!.getBoundingClientRect().height,
          ),
        ),
        // Folded or not, every word stays in the page for a reader who
        // searches it and for anything that indexes it.
        words: section.textContent?.replace(/\s+/g, " ").length ?? 0,
      };
    });

    expect(folds, `the leadership section at ${width}px`).not.toBeNull();
    expect(folds!.count, `messages folded at ${width}px`).toBe(2);
    expect(folds!.words, `words kept at ${width}px`).toBeGreaterThan(1100);

    if (width >= 1024) {
      expect(folds!.open, `opened by the stylesheet at ${width}px`).toEqual([
        true,
        true,
      ]);
    } else {
      expect(folds!.open, `still folded at ${width}px`).toEqual([false, false]);
      for (const control of folds!.controls) {
        expect(control, `the control at ${width}px`).toBeGreaterThanOrEqual(44);
      }
    }
  }
});

// A folded message ends at its control. The fold is a column with a gap, and a
// shut `<details>` still lays its content box out as an item of that column, so
// an unconditional gap left a strip of empty space below "Read more" that the
// section's own padding then added to. The gap earns its place once the words
// it separates are on the page, which is what opening the fold checks.
test("a folded message ends where its control ends", async ({ page }) => {
  await page.goto("/");

  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);

    const shut = await page.evaluate(() =>
      [...document.querySelectorAll("details.message-fold")].map((el) => {
        const summary = el.querySelector("summary")!.getBoundingClientRect();
        return Math.round(el.getBoundingClientRect().bottom - summary.bottom);
      }),
    );

    expect(shut.length, `folds at ${width}px`).toBe(2);
    for (const trailing of shut) {
      expect(
        trailing,
        `space below the control at ${width}px`,
      ).toBeLessThanOrEqual(1);
    }
  }

  await page.setViewportSize({ width: 390, height: 900 });
  await page.locator("details.message-fold summary").first().click();
  await page.waitForTimeout(200);

  const opened = await page.evaluate(() => {
    const el = document.querySelector("details.message-fold")!;
    return Math.round(parseFloat(getComputedStyle(el).rowGap));
  });

  expect(opened, "the gap once the words are shown").toBe(16);
});

// The page is a single scroll, so the only thing telling a reader that one
// section has ended and another begun is the join between them: a change of
// surface, and a consistent amount of quiet around it. Measured as the run of
// empty pixels at each boundary, those joins should read as one rhythm rather
// than as holes of differing size. The navy bands are excluded, because a
// strong change of colour carries the break on its own and is set tighter.
test("the joins between sections keep one rhythm", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);

  const joins = await page.evaluate(() => {
    const main = document.querySelector("main")!;
    const width = main.getBoundingClientRect().width;
    const spans: [number, number][] = [];
    const add = (top: number, bottom: number) => {
      if (bottom - top > 0.5) spans.push([top + scrollY, bottom + scrollY]);
    };
    // Computed colours arrive as rgb(), rgba() or color(srgb r g b / a).
    const alphaOf = (value: string) => {
      if (!value || value === "transparent") return 0;
      const rgb = value.match(/^rgba?\(([^)]+)\)/);
      if (rgb) {
        const parts = rgb[1].split(/[,\s/]+/).filter(Boolean);
        return parts.length > 3 ? parseFloat(parts[3]) : 1;
      }
      const fn = value.match(/^color\([a-z-]+\s+([^)]+)\)/);
      if (fn) {
        const parts = fn[1].split("/");
        return parts.length > 1 ? parseFloat(parts[1]) : 1;
      }
      return 1;
    };
    const folded = (el: Element) =>
      el.closest("details:not([open])") && !el.closest("summary");

    for (const el of main.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        parseFloat(style.opacity) < 0.03 ||
        folded(el)
      )
        continue;
      const box = el.getBoundingClientRect();
      if (box.height < 1 || box.width < 1) continue;
      const tag = el.tagName.toLowerCase();
      if (["img", "svg", "hr", "canvas", "video"].includes(tag)) {
        add(box.top, box.bottom);
        continue;
      }
      // A panel the reader sees as a surface, rather than the band itself.
      if (
        alphaOf(style.backgroundColor) > 0.02 &&
        box.width < width - 2 &&
        tag !== "section"
      )
        add(box.top, box.bottom);
      // A rule drawn as a border is ink too, though its element encloses none.
      if (
        parseFloat(style.borderTopWidth) > 0.5 &&
        alphaOf(style.borderTopColor) > 0.02
      )
        add(box.top, box.top + 1);
      if (
        parseFloat(style.borderBottomWidth) > 0.5 &&
        alphaOf(style.borderBottomColor) > 0.02
      )
        add(box.bottom - 1, box.bottom);
    }

    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue?.trim()) continue;
      const parent = node.parentElement!;
      if (folded(parent)) continue;
      const style = getComputedStyle(parent);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const box of range.getClientRects())
        if (box.height > 1 && box.width > 1) add(box.top, box.bottom);
    }

    spans.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const span of spans) {
      const last = merged[merged.length - 1];
      if (last && span[0] <= last[1] + 0.5)
        last[1] = Math.max(last[1], span[1]);
      else merged.push([...span]);
    }

    const sections = [...main.querySelectorAll("section")].filter(
      (el, i, all) => !all.some((other) => other !== el && other.contains(el)),
    );
    const navy = (el: Element) =>
      getComputedStyle(el).backgroundColor.includes("30, 47, 92");

    const out: { name: string; empty: number }[] = [];
    for (let i = 0; i + 1 < sections.length; i++) {
      if (navy(sections[i]) || navy(sections[i + 1])) continue;
      const top = sections[i + 1].getBoundingClientRect().top + scrollY;
      for (let j = 0; j + 1 < merged.length; j++) {
        if (merged[j][1] <= top && merged[j + 1][0] >= top) {
          out.push({
            name:
              (sections[i].id ||
                sections[i].querySelector("h2")?.textContent?.slice(0, 16)) ??
              "?",
            empty: Math.round(merged[j + 1][0] - merged[j][1]),
          });
          break;
        }
      }
    }
    return out;
  });

  expect(
    joins.length,
    "joins measured between pale sections",
  ).toBeGreaterThanOrEqual(6);

  for (const join of joins) {
    expect(join.empty, `the quiet after ${join.name}`).toBeGreaterThanOrEqual(
      40,
    );
    expect(join.empty, `the quiet after ${join.name}`).toBeLessThanOrEqual(76);
  }

  const sizes = joins.map((join) => join.empty);
  expect(
    Math.max(...sizes) - Math.min(...sizes),
    `spread across ${sizes.join(", ")}`,
  ).toBeLessThanOrEqual(24);
});

// Browsers leave background colour out of a printed page unless the reader
// goes looking for the setting, so words set in white on a band were handed
// over as blank paper, the address and the timings among them. What prints is
// the ink, the photographs, and anything that asks for its colour to be
// honoured. Laid out at the width a sheet of A4 actually gives its content
// once the margins are taken, which is narrower than the paper itself and
// narrower than the layout's own middle breakpoint.
test("the page survives being printed", async ({ page }) => {
  await page.setViewportSize({ width: 718, height: 1123 });
  await page.goto("/");
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
  });
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(400);

  const report = await page.evaluate(() => {
    // Computed colours arrive as rgb(), rgba(), color(srgb ...) or oklab();
    // read as plain numbers, a white set through an opacity modifier would
    // look almost black and the page would seem to print when it does not.
    const parse = (value: string): number[] | null => {
      let m = value.match(/^rgba?\(([^)]+)\)/);
      if (m) {
        const p = m[1]
          .split(/[,\s/]+/)
          .filter(Boolean)
          .map(Number);
        return [p[0], p[1], p[2]];
      }
      m = value.match(/^color\(srgb\s+([^)]+)\)/);
      if (m) {
        const p = m[1].split("/")[0].trim().split(/\s+/).map(Number);
        return [p[0] * 255, p[1] * 255, p[2] * 255];
      }
      m = value.match(/^oklab\(([^)]+)\)/);
      if (m) {
        const [lightness, aStar, bStar] = m[1]
          .split("/")[0]
          .trim()
          .split(/\s+/)
          .map(Number);
        const l =
          (lightness + 0.3963377774 * aStar + 0.2158037573 * bStar) ** 3;
        const mid =
          (lightness - 0.1055613458 * aStar - 0.0638541728 * bStar) ** 3;
        const s = (lightness - 0.0894841775 * aStar - 1.291485548 * bStar) ** 3;
        const toByte = (v: number) => {
          const g =
            v <= 0.0031308
              ? 12.92 * v
              : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
          return Math.min(1, Math.max(0, g)) * 255;
        };
        return [
          toByte(4.0767416621 * l - 3.3077115913 * mid + 0.2309699292 * s),
          toByte(-1.2684380046 * l + 2.6097574011 * mid - 0.3413193965 * s),
          toByte(-0.0041960863 * l - 0.7034186147 * mid + 1.707614701 * s),
        ];
      }
      return null;
    };
    const channel = (v: number) => {
      const n = v / 255;
      return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    };
    const onPaper = (rgb: number[]) => {
      const ink =
        0.2126 * channel(rgb[0]) +
        0.7152 * channel(rgb[1]) +
        0.0722 * channel(rgb[2]);
      return 1.05 / (ink + 0.05);
    };
    // A word lying over a photograph keeps its backdrop on paper, because the
    // photograph is content and is printed.
    const overPhotograph = (el: Element) => {
      let node: Element | null = el;
      while (node && node !== document.body) {
        const position = getComputedStyle(node).position;
        if (position === "absolute" || position === "relative") {
          if (node.parentElement?.querySelector(":scope > img")) return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const unreadable: string[] = [];
    const shutOnPaper = new Set<string>();
    let checked = 0;
    let overArt = 0;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue?.trim();
      if (!text) continue;
      const el = node.parentElement!;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const box = el.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) continue;
      // The stylesheet opens a fold without ever setting `open`, so whether a
      // message reaches the paper is a question about what is rendered rather
      // than about the attribute. A fold the paper leaves shut is a message
      // the reader never receives, which the assertion below forbids.
      if (!el.checkVisibility()) {
        if (el.closest("details")) {
          shutOnPaper.add(
            el
              .closest("article")
              ?.querySelector("h3")
              ?.textContent?.trim()
              .slice(0, 24) ?? "a message",
          );
        }
        continue;
      }
      const parts = parse(style.color);
      if (!parts) continue;

      checked++;
      const got = onPaper(parts);
      if (got >= 4.5) continue;
      if (overPhotograph(el)) {
        overArt++;
        continue;
      }
      unreadable.push(`"${text.slice(0, 30)}" at ${got.toFixed(2)}:1`);
    }

    const address = [...document.querySelectorAll("footer *")].find(
      (el) =>
        el.children.length === 0 && /Prajapati/.test(el.textContent ?? ""),
    );
    return {
      unreadable,
      checked,
      overArt,
      shutOnPaper: [...shutOnPaper],
      captionAdjust: (() => {
        const caption = document.querySelector(".moment-caption");
        if (!caption) return "missing";
        const style = getComputedStyle(caption);
        return (
          style.printColorAdjust ||
          style.getPropertyValue("-webkit-print-color-adjust") ||
          "auto"
        );
      })(),
      addressColour: address ? getComputedStyle(address).color : "missing",
    };
  });

  expect(report.checked, "words examined on paper").toBeGreaterThan(80);
  // The reason anyone prints a page like this one.
  expect(report.addressColour, "the address on paper").not.toBe("missing");
  expect(report.addressColour.replace(/\s/g, ""), "the address on paper").toBe(
    "rgb(51,65,85)",
  );
  expect(report.unreadable, "words the paper would lose").toEqual([]);
  // A sheet in portrait is narrower than the width the messages open at, so
  // they were going to the printer shut and the reader never saw them.
  expect(report.shutOnPaper, "messages the paper would leave folded").toEqual(
    [],
  );
  // A caption is white on a veil. Printed without background graphics the veil
  // goes and the white stays, so the words arrive white on white; worse, the
  // strip itself is painted over the foot of the photograph.
  expect(report.captionAdjust, "the caption's veil on paper").toBe("exact");
});

// A caption is white type laid over a photograph, and no photograph can be
// read from the stylesheet. What makes the words legible is therefore not the
// picture but the veil between: dark enough that white clears AA even where
// the photograph behind it is at its lightest, and solid for the whole band
// the words occupy rather than already fading by the time it reaches them.
//
// Both halves are checked here, and the requirement is worked out rather than
// written down, so the figure cannot drift away from the rule it came from.
// The worst photograph is taken to be pure white, which is the most a backdrop
// can ever be, so passing this means the captions hold over any picture the
// school puts behind them rather than only over the ten here.
//
// The direction is checked too. The veil ran the other way once, strongest
// along the top edge where there are no words, and the gradient reads the same
// at a glance either way round.
test("every caption is written on the solid part of its veil", async ({
  page,
}) => {
  const seen: string[] = [];

  for (const width of [320, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.locator("#moments").scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);

    const captions = await page.evaluate(() => {
      const luminance = (r: number, g: number, b: number) => {
        const channel = (value: number) => {
          const n = value / 255;
          return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };

      // Read through the browser rather than out of the text of the value.
      // Tailwind writes a faded colour as `oklab(… / .75)`, and taking the
      // numbers out of that string read near-white as nearly black.
      const paint = document
        .createElement("canvas")
        .getContext("2d", { willReadFrequently: true })!;
      const channels = (colour: string) => {
        paint.clearRect(0, 0, 1, 1);
        paint.fillStyle = colour;
        paint.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = paint.getImageData(0, 0, 1, 1).data;
        return [r, g, b, a / 255];
      };

      return [...document.querySelectorAll("#moments li p")].map((el) => {
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        const image = style.backgroundImage;

        // `to top` is reported as an angle, and 0deg is up. The direction is
        // left out of the computed value when it is the default, which is
        // downwards, so an absent angle means exactly that.
        const angle =
          /^linear-gradient\(\s*(-?[\d.]+deg)/.exec(image)?.[1] ?? "180deg";

        const stops = [
          ...image.matchAll(/rgba?\(([^)]+)\)\s*(-?[\d.]+)(px|%)/g),
        ].map((match) => {
          const parts = match[1].split(",").map((n) => Number.parseFloat(n));
          return {
            rgb: parts.slice(0, 3),
            alpha: parts.length > 3 ? parts[3] : 1,
            at:
              match[3] === "%"
                ? (Number.parseFloat(match[2]) / 100) * box.height
                : Number.parseFloat(match[2]),
          };
        });

        // The veil is at its darkest along the foot and holds that value for a
        // while before it begins to fade. How far it holds is the band the
        // words have to stay inside.
        //
        // The band runs only as far as the colour and the strength both hold.
        // Followed on strength alone, a second stop painted a lighter colour
        // at the same strength still counted as solid, and the words were
        // measured against the first stop's colour over ground the veil had
        // already lightened.
        const strongest = stops[0]?.alpha ?? 0;
        const veilColour = stops[0]?.rgb ?? [0, 0, 0];
        let solidTo = 0;
        for (const stop of stops) {
          const sameStrength = Math.abs(stop.alpha - strongest) <= 0.001;
          const sameColour = stop.rgb.every(
            (channel, i) => Math.abs(channel - veilColour[i]) <= 0.5,
          );
          if (!sameStrength || !sameColour) break;
          solidTo = stop.at;
        }

        // The lightest a photograph can be is white, so the veil is laid over
        // white to find the most the words ever have to cross. Taking the
        // veil's own colour and not only its strength is what makes this a
        // measurement rather than an assumption: a pale veil at the same
        // strength leaves white words on a white band.
        //
        // Opacity is painted once, over the caption and its veil together,
        // and it is applied here the same way. Faded separately, the words
        // were mixed into a backdrop that had already been faded and the pair
        // came out closer than the pixels the browser paints: a caption at
        // four-fifths strength was reported at 4.37:1 where the painted
        // result is 5.74:1, which is a rule objecting to a page that is fine.
        let fade = 1;
        for (let node: Element | null = el; node; node = node.parentElement) {
          fade *= Number(getComputedStyle(node).opacity);
        }

        const colour = channels(style.color);
        const [r, g, b] = colour;
        // Ink can be made see-through by its own colour as well as by an
        // opacity, and the fourth value was being dropped.
        const inkAlpha = colour[3];

        const backdrop = veilColour.map(
          (channel) =>
            fade * strongest * channel + (1 - fade * strongest) * 255,
        );
        const overVeil = inkAlpha + strongest * (1 - inkAlpha);
        const ink = [r, g, b].map(
          (channel, i) =>
            fade *
              (inkAlpha * channel +
                strongest * veilColour[i] * (1 - inkAlpha)) +
            (1 - fade * overVeil) * 255,
        );

        const range = document.createRange();
        range.selectNodeContents(el);
        const glyphs = [...range.getClientRects()].filter(
          (rect) => rect.height > 2,
        );

        return {
          caption: el.textContent?.trim().slice(0, 28) ?? "",
          angle,
          veil: strongest,
          solidTo,
          textLuminance: luminance(ink[0], ink[1], ink[2]),
          backdropLuminance: luminance(backdrop[0], backdrop[1], backdrop[2]),
          // How far the topmost ink sits above the foot of the box, which is
          // where the veil is measured from.
          reach: glyphs.length
            ? Math.max(...glyphs.map((rect) => box.bottom - rect.top))
            : null,
        };
      });
    });

    expect(captions.length, `captions at ${width}px`).toBe(moments.length);

    for (const caption of captions) {
      const where = `"${caption.caption}" at ${width}px`;
      seen.push(where);

      expect(caption.angle, `the veil under ${where} runs upwards`).toBe(
        "0deg",
      );

      // The words over the veil over the lightest photograph there could be.
      const lighter = Math.max(
        caption.textLuminance,
        caption.backdropLuminance,
      );
      const darker = Math.min(caption.textLuminance, caption.backdropLuminance);
      expect(
        (lighter + 0.05) / (darker + 0.05),
        `${where} over the lightest photograph it could sit on`,
      ).toBeGreaterThanOrEqual(4.5);

      expect(caption.reach, `the words of ${where}`).not.toBeNull();
      expect(
        caption.reach!,
        `${where} keeps within the solid part of its veil (${caption.solidTo}px)`,
      ).toBeLessThanOrEqual(caption.solidTo);
    }
  }

  expect(seen.length, "captions checked").toBe(moments.length * 5);
});

// Two things in the contact panel sit beside a line of text rather than in it,
// and both came adrift where the line they belong to wrapped: the mark on the
// admissions note centred itself on the whole chip and dropped into the space
// between two lines, and the address, a pixel wider than the narrowest panel
// can hold, moved to a line of its own and left its mark stranded above. The
// band is swept rather than one width taken, because each fault appears only
// below the width at which the text it belongs to still fits on one line.
test("marks beside a line of text keep to that line", async ({ page }) => {
  await page.goto("/");

  const seen: { width: number; noteLines: number }[] = [];

  for (const width of [320, 330, 336, 360, 390, 412]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(120);

    const panel = await page.evaluate(() => {
      const box = (el: Element) => el.getBoundingClientRect();
      const home = document.querySelector("#visit .rounded-3xl");
      if (!home) return null;

      const chip = [...home.querySelectorAll("p")].find((line) =>
        line.textContent?.includes("Admissions"),
      );
      const dot = chip?.querySelector("span span");
      const words = [...(chip?.childNodes ?? [])].find(
        (node) => node.nodeType === 3 && node.textContent?.trim(),
      );
      if (!chip || !dot || !words) return null;
      const range = document.createRange();
      range.selectNode(words);
      const lines = [...range.getClientRects()]
        .filter((rect) => rect.height > 2)
        .sort((a, b) => a.top - b.top);
      if (!lines.length) return null;

      const row = [...home.querySelectorAll("p")].find((line) =>
        line.querySelector("a[href^='mailto']"),
      );
      const mark = row?.querySelector("svg");
      const address = row?.querySelector("a");
      if (!row || !address) return null;

      return {
        noteLines: new Set(lines.map((rect) => Math.round(rect.top))).size,
        dotOffset:
          box(dot).top +
          box(dot).height / 2 -
          (lines[0].top + lines[0].height / 2),
        markShown: mark ? getComputedStyle(mark).display !== "none" : false,
        markSharesLine:
          mark && getComputedStyle(mark).display !== "none"
            ? Math.abs(box(mark).top - box(address).top) < 6
            : null,
        overflow: box(address).right - box(row).right,
      };
    });

    expect(panel, `the contact panel at ${width}px`).not.toBeNull();
    seen.push({ width, noteLines: panel!.noteLines });

    expect(
      Math.abs(panel!.dotOffset),
      `the mark on the admissions note at ${width}px`,
    ).toBeLessThanOrEqual(3);

    if (panel!.markShown) {
      expect(
        panel!.markSharesLine,
        `the mark beside the address at ${width}px`,
      ).toBe(true);
    }

    expect(
      panel!.overflow,
      `the address past the edge of its row at ${width}px`,
    ).toBeLessThanOrEqual(1);
  }

  // The note has to reach two lines somewhere in the band and the mark has to
  // stand down somewhere in it, or each of these would be passing on a fault
  // it never meets.
  expect(
    seen.some((at) => at.noteLines > 1),
    `the note wraps somewhere in the band (${seen.map((at) => `${at.width}:${at.noteLines}`).join(" ")})`,
  ).toBe(true);
});

// A list set in columns is read down them, and this one is in the order the
// page itself goes in, so the two have to agree. Filled across the rows
// instead, each column held every other section: About, Learning, Moments on
// one side and Classes, Facilities, Visit Us on the other. Nothing about that
// shows up in the markup, where the order was right all along.
test("the footer list runs in the order the page does", async ({ page }) => {
  await page.goto("/");

  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(120);

    const list = await page.evaluate(() => {
      const items = [...document.querySelectorAll("footer nav li a")].map(
        (link) => {
          const box = link.getBoundingClientRect();
          return {
            label: link.textContent?.trim() ?? "",
            x: Math.round(box.left),
            y: Math.round(box.top),
          };
        },
      );
      const columns = [...new Set(items.map((item) => item.x))].sort(
        (a, b) => a - b,
      );
      return {
        markup: items.map((item) => item.label),
        read: columns.flatMap((x) =>
          items
            .filter((item) => item.x === x)
            .sort((a, b) => a.y - b.y)
            .map((item) => item.label),
        ),
        columns: columns.length,
      };
    });

    expect(list.markup.length, `footer links at ${width}px`).toBeGreaterThan(5);
    expect(
      list.read,
      `the footer list read down its columns at ${width}px`,
    ).toEqual(list.markup);
  }

  // In one column the two orders cannot disagree, so the check would hold
  // whatever the flow did.
  const columns = await page.evaluate(
    () =>
      new Set(
        [...document.querySelectorAll("footer nav li a")].map((link) =>
          Math.round(link.getBoundingClientRect().left),
        ),
      ).size,
  );
  expect(columns, "columns the footer list is set in").toBeGreaterThan(1);
});

// Two controls open WhatsApp on the careers page and only one of them belongs
// to that page: the other is the bar pinned to the foot of every phone screen,
// and it is the more prominent of the two. Sending an empty message from it
// loses the one thing the prefilled opening was for, which is that an
// application can be told apart in the inbox. Elsewhere on the site the bar
// has nothing to prefill and must not carry it.
test("both ways to open WhatsApp from the careers page say the same thing", async ({
  page,
}) => {
  const read = async (url: string) => {
    await page.goto(url);
    return page.evaluate(() => {
      const pinned = (el: Element) => {
        let node: Element | null = el;
        while (node && node !== document.body) {
          if (getComputedStyle(node).position === "fixed") return true;
          node = node.parentElement;
        }
        return false;
      };
      const links = [...document.querySelectorAll("a[href*='wa.me']")].filter(
        (link) => link.getBoundingClientRect().width > 2,
      );
      return {
        bar: links.find(pinned)?.getAttribute("href") ?? null,
        page:
          links
            .filter((link) => !pinned(link) && link.closest("main"))
            .map((link) => link.getAttribute("href"))[0] ?? null,
      };
    });
  };

  await page.setViewportSize({ width: 390, height: 844 });

  const careers = await read("/careers/");
  expect(careers.page, "the careers page's own WhatsApp link").toContain(
    "?text=",
  );
  expect(careers.bar, "the pinned WhatsApp link on the careers page").toBe(
    careers.page,
  );

  const home = await read("/");
  expect(home.bar, "the pinned WhatsApp link on the home page").not.toBeNull();
  expect(
    home.bar,
    "the pinned WhatsApp link away from the careers page",
  ).not.toContain("?text=");
});

// The lines of an address and the ways of getting in touch sit in one block in
// the same size and colour, and the ones that go somewhere were told apart by
// nothing at all. A reader cannot try a line to find out. Both blocks on the
// site are read, because the fault was fixed in one and left standing in the
// other. Hovering is not a fix: a phone has no hover.
test("the ways of getting in touch are marked as such", async ({ page }) => {
  const blocks = [
    { url: "/", selector: "footer address", what: "the footer address" },
    { url: "/careers/", selector: "#apply dl", what: "the apply block" },
  ];

  for (const block of blocks) {
    await page.goto(block.url);

    const found = await page.evaluate((selector) => {
      const home = document.querySelector(selector);
      if (!home) return null;
      const look = (el: Element) => {
        const style = getComputedStyle(el);
        return `${style.color}|${style.fontWeight}|${style.textDecorationLine}|${style.fontSize}`;
      };
      const carriesWords = (el: Element) =>
        [...el.childNodes].some(
          (node) => node.nodeType === 3 && node.textContent?.trim(),
        );
      const onScreen = (el: Element) => {
        const box = el.getBoundingClientRect();
        return box.width > 2 && box.height > 2;
      };

      const plain: string[] = [];
      for (const el of home.querySelectorAll("*")) {
        if (el.closest("a") || !carriesWords(el) || !onScreen(el)) continue;
        plain.push(look(el));
      }
      return {
        plain,
        links: [...home.querySelectorAll("a")].map((link) => ({
          label: link.textContent?.trim() ?? "",
          look: look(link),
        })),
      };
    }, block.selector);

    expect(found, block.what).not.toBeNull();
    expect(
      found!.plain.length,
      `plain lines in ${block.what}`,
    ).toBeGreaterThanOrEqual(1);
    expect(
      found!.links.length,
      `ways of getting in touch in ${block.what}`,
    ).toBeGreaterThanOrEqual(1);

    for (const link of found!.links) {
      expect(
        found!.plain,
        `"${link.label}" set apart from the words around it in ${block.what}`,
      ).not.toContain(link.look);
    }
  }
});

// A join between two bands was carried by hue alone, and two of them had drifted
// to the same lightness, so on anything that loses colour the page ran together.
// Each neighbouring pair now has to differ in both, which is what makes the
// difference survive a greyscale rendering or a printed sheet. The one band
// allowed to run into its neighbour is named, so a second cannot appear
// unnoticed.
test("neighbouring bands differ in lightness as well as hue", async ({
  page,
}) => {
  await page.goto("/");

  const bands = await page.evaluate(() => {
    const toLab = ([r, g, b]: number[]) => {
      const lin = (v: number) => {
        const n = v / 255;
        return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
      };
      const R = lin(r);
      const G = lin(g);
      const B = lin(b);
      const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
      const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
      const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
      const f = (t: number) =>
        t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
      return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
    };
    const sections = [...document.querySelectorAll("main section")].filter(
      (el, i, all) => !all.some((other) => other !== el && other.contains(el)),
    );
    return sections.map((el) => ({
      name:
        el.id ||
        el.querySelector("h2")?.textContent?.trim().slice(0, 16) ||
        "(no heading)",
      // The band of figures is the one that carries a list of them under no
      // heading of its own. Every other band opens with one.
      figures: !el.querySelector("h2") && Boolean(el.querySelector("dl")),
      rgb: (getComputedStyle(el).backgroundColor.match(/\d+/g) ?? []).map(
        Number,
      ),
      lab: toLab(
        (getComputedStyle(el).backgroundColor.match(/\d+/g) ?? []).map(Number),
      ),
    }));
  });

  expect(bands.length, "bands found").toBeGreaterThanOrEqual(8);

  // CIE76 is enough here: these are pale, low-chroma surfaces sitting close
  // together, which is where it and the later formulae broadly agree.
  const difference = (a: number[], b: number[]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  const shared: string[] = [];
  for (let i = 0; i + 1 < bands.length; i++) {
    const one = bands[i];
    const two = bands[i + 1];
    const join = `${one.name} / ${two.name}`;

    if (one.rgb.join() === two.rgb.join()) {
      if (!one.figures) shared.push(join);
      continue;
    }

    expect(
      difference(one.lab, two.lab),
      `colour across ${join}`,
    ).toBeGreaterThanOrEqual(3);
    expect(
      Math.abs(one.lab[0] - two.lab[0]),
      `lightness across ${join}`,
    ).toBeGreaterThanOrEqual(1.5);
  }

  // The figures band runs into the section beneath it on purpose. Anywhere
  // else, one surface carried across a join gives the reader two sections they
  // cannot tell apart, so the rule is named rather than a count kept: the
  // allowance holds whether or not the figures are currently on the page.
  expect(shared, "sections sharing one surface without meaning to").toEqual([]);
});

// Which group a facility belongs to is carried by the colour of the mark beside
// it, so each of the three has to be legible for any of them to mean anything.
// They were mixed for bands, and a band separates from the surface next to it
// on area as much as on colour; a mark a few pixels across has only the colour.
// One of the three shared the section's own warm family closely enough to read
// as part of it, at 9.3 on the measure below, against 13.5 and 14.1 for the
// other two. The floor is set between those.
test("every facility carries a mark that reads on the surface behind it", async ({
  page,
}) => {
  await page.goto("/");

  const marks = await page.evaluate(() => {
    const toLab = ([r, g, b]: number[]) => {
      const lin = (v: number) => {
        const n = v / 255;
        return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
      };
      const R = lin(r);
      const G = lin(g);
      const B = lin(b);
      const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
      const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
      const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
      const f = (t: number) =>
        t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
      return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
    };
    const rgb = (value: string) =>
      (value.match(/\d+/g) ?? []).slice(0, 3).map(Number);

    const section = document.querySelector("#facilities");
    if (!section) return null;
    const surface = getComputedStyle(section).backgroundColor;
    const groups = [...section.querySelectorAll("div")].filter(
      (el) =>
        el.querySelector(":scope > h3") !== null &&
        el.querySelector(":scope > ul") !== null,
    );
    return {
      surface: toLab(rgb(surface)),
      groups: groups.map((group) => {
        // The mark is the tinted box; the one beside the first item speaks for
        // the group, every item in it being drawn the same way.
        const mark = group.querySelector("li > span");
        return {
          name: group.querySelector(":scope > h3")?.textContent?.trim() ?? "?",
          fill: getComputedStyle(mark!).backgroundColor,
          lab: toLab(rgb(getComputedStyle(mark!).backgroundColor)),
        };
      }),
    };
  });

  const difference = (a: number[], b: number[]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  expect(marks, "the facilities section").not.toBeNull();
  expect(marks!.groups.length, "groups of facilities").toBeGreaterThanOrEqual(
    3,
  );

  for (const group of marks!.groups) {
    expect(
      difference(marks!.surface, group.lab),
      `the mark for ${group.name} against the surface`,
    ).toBeGreaterThanOrEqual(12);
  }

  // A tint that cleared the surface but matched its neighbour would leave the
  // groups legible and still tell the reader nothing.
  const fills = new Set(marks!.groups.map((group) => group.fill));
  expect(fills.size, "distinct tints across the groups").toBe(
    marks!.groups.length,
  );
});

// The palette's comments claim each colour clears AA on the background it is
// used against, and nothing checked that claim. The bands are pale and the
// muted ink is light, so several pairs pass by a few tenths, and a change to
// one token moves every pair drawn on it at once. This reads the page as a
// browser paints it: the colour behind a word is whatever survives after every
// translucent layer above the band is composited, which the stylesheet states
// nowhere.
test("every word clears AA against the colour behind it", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);

  const report = await page.evaluate(() => {
    type Rgba = { r: number; g: number; b: number; a: number };
    // Computed colours arrive as rgb(), rgba(), color(srgb ...) or oklab().
    const parse = (value: string): Rgba | null => {
      if (!value || value === "transparent") return null;
      let m = value.match(/^rgba?\(([^)]+)\)/);
      if (m) {
        const p = m[1]
          .split(/[,\s/]+/)
          .filter(Boolean)
          .map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      }
      m = value.match(/^color\(srgb\s+([^)]+)\)/);
      if (m) {
        const [head, alpha] = m[1].split("/");
        const p = head.trim().split(/\s+/).map(Number);
        return {
          r: p[0] * 255,
          g: p[1] * 255,
          b: p[2] * 255,
          a: alpha === undefined ? 1 : parseFloat(alpha),
        };
      }
      m = value.match(/^oklab\(([^)]+)\)/);
      if (m) {
        const [head, alpha] = m[1].split("/");
        const [lightness, aStar, bStar] = head.trim().split(/\s+/).map(Number);
        const l =
          (lightness + 0.3963377774 * aStar + 0.2158037573 * bStar) ** 3;
        const mid =
          (lightness - 0.1055613458 * aStar - 0.0638541728 * bStar) ** 3;
        const s = (lightness - 0.0894841775 * aStar - 1.291485548 * bStar) ** 3;
        const toByte = (v: number) => {
          const g =
            v <= 0.0031308
              ? 12.92 * v
              : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
          return Math.min(1, Math.max(0, g)) * 255;
        };
        return {
          r: toByte(4.0767416621 * l - 3.3077115913 * mid + 0.2309699292 * s),
          g: toByte(-1.2684380046 * l + 2.6097574011 * mid - 0.3413193965 * s),
          b: toByte(-0.0041960863 * l - 0.7034186147 * mid + 1.707614701 * s),
          a: alpha === undefined ? 1 : parseFloat(alpha),
        };
      }
      return null;
    };
    const over = (top: Rgba, under: Rgba): Rgba => ({
      r: top.r * top.a + under.r * (1 - top.a),
      g: top.g * top.a + under.g * (1 - top.a),
      b: top.b * top.a + under.b * (1 - top.a),
      a: 1,
    });
    const channel = (v: number) => {
      const n = v / 255;
      return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    };
    const luminance = (c: Rgba) =>
      0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
    const ratio = (one: Rgba, two: Rgba) => {
      const a = luminance(one);
      const b = luminance(two);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };

    // Words set over a photograph or a gradient have no backdrop that can be
    // read from colours alone, so they are counted apart and left to the eye.
    const backdrop = (el: Element): Rgba | "painted" => {
      const layers: Rgba[] = [];
      let node: Element | null = el;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (style.backgroundImage !== "none") return "painted";
        // Words lifted onto a photograph rather than laid on a fill. What the
        // ancestors are coloured says nothing about what is behind these, so
        // the fills below would answer for a backdrop that is not there. Only
        // a box taken out of the flow can be over its sibling picture; one
        // still in the flow sits below it and does take the fill behind.
        if (
          (style.position === "absolute" || style.position === "fixed") &&
          node.parentElement?.querySelector(":scope > img")
        )
          return "painted";
        const own = parse(style.backgroundColor);
        if (own && own.a > 0) {
          layers.push(own);
          if (own.a === 1) break;
        }
        node = node.parentElement;
      }
      let base: Rgba =
        layers.length && layers[layers.length - 1].a === 1
          ? layers.pop()!
          : { r: 255, g: 255, b: 255, a: 1 };
      for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
      return base;
    };

    const failures: string[] = [];
    let checked = 0;
    let overArtwork = 0;
    let tightest = { ratio: Infinity, where: "" };

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue?.trim();
      if (!text) continue;
      const el = node.parentElement!;
      const style = getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        parseFloat(style.opacity) < 0.05
      )
        continue;
      const box = el.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) continue;
      // The stylesheet opens a fold without ever setting `open`, so what is on
      // screen is a question about rendering rather than about the attribute.
      // A mark the page hides from assistive technology is decoration rather
      // than content.
      if (!el.checkVisibility()) continue;
      if (el.closest('[aria-hidden="true"]')) continue;

      const behind = backdrop(el);
      if (behind === "painted") {
        overArtwork++;
        continue;
      }
      let ink = parse(style.color);
      if (!ink) continue;
      if (ink.a < 1) ink = over(ink, behind);

      const size = parseFloat(style.fontSize);
      const weight = parseInt(style.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const needed = large ? 3 : 4.5;
      const got = ratio(ink, behind);
      checked++;

      const where = `"${text.slice(0, 24)}" ${Math.round(size)}px/${weight}`;
      if (got < tightest.ratio)
        tightest = { ratio: got, where: `${where} at ${got.toFixed(2)}:1` };
      if (got < needed)
        failures.push(`${where} is ${got.toFixed(2)}:1, needs ${needed}:1`);
    }
    return { failures, checked, overArtwork, tightest };
  });

  // A sweep that silently matched nothing would pass while checking nothing.
  expect(
    report.checked,
    "text runs whose backdrop could be resolved",
  ).toBeGreaterThan(80);
  expect(report.failures, `tightest was ${report.tightest.where}`).toEqual([]);
});

// The name and the motto are lifted onto the photograph of the building, so
// nothing in the stylesheet says what is behind them and the sweep above has
// to stand aside for them. What keeps them legible is the veil between, and
// that was going unchecked: taking it away altogether left the sweep reading
// the navy band behind the picture and finding nothing wrong.
//
// The veil is measured here the way the caption veils are: over the lightest
// photograph a backdrop could ever be, at its weakest point across the band
// the words occupy, with the requirement worked out from the contrast formula
// rather than written down.
test("the words on the photograph have a veil strong enough to carry them", async ({
  page,
}) => {
  for (const width of [1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(200);

    const report = await page.evaluate(() => {
      const luminance = (r: number, g: number, b: number) => {
        const channel = (value: number) => {
          const n = value / 255;
          return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };

      // A colour is read through the browser rather than out of its text.
      // Tailwind writes a faded colour as `oklab(… / .75)`, and pulling the
      // numbers out of that string read near-white as something close to
      // black, which fails a page that is perfectly legible.
      const paint = document
        .createElement("canvas")
        .getContext("2d", { willReadFrequently: true })!;
      const channels = (colour: string) => {
        paint.clearRect(0, 0, 1, 1);
        paint.fillStyle = colour;
        paint.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = paint.getImageData(0, 0, 1, 1).data;
        return [r, g, b, a / 255];
      };

      const veil = document.querySelector(".hero-veil");
      const words = [...document.querySelectorAll(".hero-title")];
      if (!veil || !words.length) return null;
      if (!veil.checkVisibility())
        return { painted: false, kind: "none", direction: "none", lines: [] };

      const veilBox = veil.getBoundingClientRect();
      const image = getComputedStyle(veil).backgroundImage;

      // Which way the veil runs, and what kind of gradient it is. The stops
      // below are read as fractions from the top of the veil downwards, and
      // anything else puts its strongest part somewhere other than where the
      // arithmetic assumes while every reading still comes out the same.
      //
      // The first argument is reported as it stands rather than matched for
      // an angle. Looked for as a number of degrees and defaulted to
      // downwards when none was found, every other way of writing it —
      // `to bottom right`, or a radial gradient, which has no top edge at
      // all — answered as though it were the one intended.
      const head = /^([a-z-]+)\(\s*([^,]+)/i.exec(image);
      const kind = head?.[1] ?? "none";
      const first = (head?.[2] ?? "").trim();
      const direction = /^(?:rgba?\(|#|[a-z]+\s*\d|transparent)/i.test(first)
        ? "default"
        : first;

      // Every stop as a fraction down the veil, so the strength anywhere can
      // be read off by interpolating between its neighbours.
      const stops = [
        ...image.matchAll(/rgba?\(([^)]+)\)\s*(-?[\d.]+)(px|%)/g),
      ].map((match) => {
        const parts = match[1].split(",").map((n) => Number.parseFloat(n));
        return {
          rgb: parts.slice(0, 3),
          alpha: parts.length > 3 ? parts[3] : 1,
          at:
            match[3] === "%"
              ? Number.parseFloat(match[2]) / 100
              : Number.parseFloat(match[2]) / veilBox.height,
        };
      });

      // Opacity multiplies down the tree and is painted after the gradient,
      // so a veil faded by itself or by anything above it is as weak as one
      // mixed paler, and neither shows in the stops.
      //
      // What they share is held apart from what is theirs alone. A parent
      // fading the veil fades the words with it, and the two are painted
      // together before that fade is applied; counted into each separately,
      // the pair was mixed twice and came out closer than the pixels the
      // browser paints. The caption veil had the same fault, found first.
      const fadeTo = (start: Element | null, stop: Element | null) => {
        let fade = 1;
        let node: Element | null = start;
        while (node && node !== stop) {
          fade *= Number(getComputedStyle(node).opacity);
          node = node.parentElement;
        }
        return fade;
      };
      const shared = (() => {
        const ancestry = new Set<Element>();
        for (let node: Element | null = veil; node; node = node.parentElement) {
          ancestry.add(node);
        }
        for (
          let node: Element | null = words[0];
          node;
          node = node.parentElement
        ) {
          if (ancestry.has(node)) return node;
        }
        return null;
      })();
      const groupFade = fadeTo(shared, null);
      const veilFade = fadeTo(veil, shared);

      const strengthAt = (fraction: number) => {
        if (!stops.length) return { alpha: 0, rgb: [0, 0, 0] };
        if (fraction <= stops[0].at) return stops[0];
        const last = stops[stops.length - 1];
        if (fraction >= last.at) return last;
        for (let i = 1; i < stops.length; i++) {
          const before = stops[i - 1];
          const after = stops[i];
          if (fraction > after.at) continue;
          const span = after.at - before.at || 1;
          const t = (fraction - before.at) / span;
          const alpha = before.alpha + (after.alpha - before.alpha) * t;
          // Colour is carried across the span with the strength multiplied
          // into it, which is how a browser blends two stops. Mixed on its
          // own and divided back out afterwards, the result came out darker
          // than the pixels actually painted: a veil running from a weak
          // black to a solid grey was read as a strong dark one and passed
          // at 3.2:1 where the painted pixels gave 2.5:1.
          //
          // Held at the colour of the stop before, it was wrong in a second
          // way, and a veil turning pale halfway down still answered.
          const mixed = before.rgb.map(
            (channel, c) =>
              channel * before.alpha +
              (after.rgb[c] * after.alpha - channel * before.alpha) * t,
          );
          return {
            alpha,
            rgb: alpha > 0 ? mixed.map((channel) => channel / alpha) : mixed,
          };
        }
        return last;
      };

      return {
        painted: true,
        kind,
        direction,
        lines: words.map((el) => {
          const style = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          // The fourth value when there is one. Ink can be made see-through
          // by its own colour as easily as by an opacity, and discarding it
          // read white at a quarter strength as solid white: about 3.2:1
          // where the painted result is nearer 1.4:1.
          const colour = channels(style.color);
          const [r, g, b] = colour;
          const inkAlpha = colour[3];
          const size = Number.parseFloat(style.fontSize);
          const weight = Number.parseInt(style.fontWeight) || 400;
          const textFade = fadeTo(el, shared) * inkAlpha;

          // The lightest a photograph can ever be is white, so the veil and
          // the words are both laid over white to find the most they ever
          // have to carry. Whatever fades the two together is applied once,
          // at the end, which is where a browser applies it.
          const readability = (stop: { alpha: number; rgb: number[] }) => {
            const veilAlpha = veilFade * stop.alpha;
            const overWhite = (alpha: number, colours: number[], c: number) =>
              groupFade * alpha * colours[c] + (1 - groupFade * alpha) * 255;

            const veiled = stop.rgb.map((_, c) =>
              overWhite(veilAlpha, stop.rgb, c),
            );
            // The words sit on the veil inside the group, so the two are
            // mixed before the shared fade reaches either of them.
            const onVeil = textFade + veilAlpha * (1 - textFade);
            const inked = [r, g, b].map(
              (channel, c) =>
                groupFade *
                  (textFade * channel +
                    veilAlpha * stop.rgb[c] * (1 - textFade)) +
                (1 - groupFade * onVeil) * 255,
            );
            const ink = luminance(inked[0], inked[1], inked[2]);
            const behind = luminance(veiled[0], veiled[1], veiled[2]);
            return (
              (Math.max(ink, behind) + 0.05) / (Math.min(ink, behind) + 0.05)
            );
          };

          const from = (box.top - veilBox.top) / veilBox.height;
          const to = (box.bottom - veilBox.top) / veilBox.height;
          const samples = [
            strengthAt(from),
            strengthAt(to),
            ...stops.filter((stop) => stop.at > from && stop.at < to),
          ];
          // The worst place is the hardest to read rather than the thinnest.
          // A veil can lose strength and gain lightness at the same time, and
          // the two do not reach their worst together.
          const worst = samples.reduce((a, c) =>
            readability(a) <= readability(c) ? a : c,
          );

          return {
            words: el.textContent?.trim().slice(0, 24) ?? "",
            // Large text is held to the lower bar the guidance sets for it.
            needed: size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5,
            got: readability(worst),
            alpha: Number((worst.alpha * veilFade).toFixed(3)),
            onTheVeil:
              box.top >= veilBox.top - 1 && box.bottom <= veilBox.bottom + 1,
          };
        }),
      };
    });

    expect(report, `the hero at ${width}px`).not.toBeNull();
    expect(
      report!.painted,
      `the veil is drawn at ${width}px, where the words sit on the photograph`,
    ).toBe(true);
    expect(
      report!.lines.length,
      `words over the photograph at ${width}px`,
    ).toBe(2);
    // Every reading above is taken as a fraction from the top of the veil
    // downwards, so a veil running any other way would be measured at the
    // wrong end of itself and still answer.
    expect(report!.kind, `the veil is a linear gradient at ${width}px`).toBe(
      "linear-gradient",
    );
    expect(
      ["default", "180deg", "to bottom"].includes(report!.direction),
      `the veil runs down the photograph at ${width}px (${report!.direction})`,
    ).toBe(true);

    for (const line of report!.lines) {
      expect(
        line.onTheVeil,
        `"${line.words}" is within the veil at ${width}px`,
      ).toBe(true);
      expect(
        line.got,
        `"${line.words}" at ${width}px over the lightest photograph it could sit on (veil at ${line.alpha})`,
      ).toBeGreaterThanOrEqual(line.needed);
    }
  }
});

/**
 * Everything above reads the veil out of its own declarations, which says
 * what was asked for rather than what the reader is shown. A veil cut away by
 * a mask, faded to nothing by a filter, or sent behind the photograph by its
 * stacking order declares exactly the same gradient and answers every reading
 * identically while darkening nothing at all.
 *
 * So the pixels are read instead: the words are taken away, the photograph
 * beneath them is photographed with the veil and again without it, and the
 * veil is asked to have made a difference a reader could see.
 *
 * Read at the widths where the words sit on the photograph. A phone sets the
 * heading below it, where there is nothing to carry and no veil drawn.
 */
test("the veil over the hero actually darkens the photograph", async ({
  page,
}) => {
  for (const width of [1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await awake(page);
    await page.waitForLoadState("networkidle");

    // Without the photograph there is nothing for a veil to carry, and the
    // navy behind it is dark enough to pass every reading below on its own.
    // Found through the veil rather than by a class name, so the two cannot
    // come apart.
    const photograph = await page.evaluate(() => {
      const veil = document.querySelector(".hero-veil");
      const image = veil?.parentElement?.querySelector("img");
      return image
        ? { complete: image.complete, width: image.naturalWidth }
        : null;
    });
    expect(
      photograph,
      `the hero carries a photograph at ${width}px`,
    ).not.toBeNull();
    expect(
      photograph!.complete && photograph!.width > 0,
      `the hero photograph has loaded at ${width}px`,
    ).toBe(true);

    // The brightest pixel in a region, which is the worst case for the pale
    // text laid over it.
    const brightest = async (clip: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => {
      const shot = await page.screenshot({ clip });
      return page.evaluate(async (encoded) => {
        const image = new Image();
        image.src = `data:image/png;base64,${encoded}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const paint = canvas.getContext("2d", { willReadFrequently: true })!;
        paint.drawImage(image, 0, 0);
        const { data } = paint.getImageData(0, 0, canvas.width, canvas.height);

        const channel = (value: number) => {
          const n = value / 255;
          return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
        };
        let worst = 0;
        for (let i = 0; i < data.length; i += 4) {
          const l =
            0.2126 * channel(data[i]) +
            0.7152 * channel(data[i + 1]) +
            0.0722 * channel(data[i + 2]);
          if (l > worst) worst = l;
        }
        return worst;
      }, shot.toString("base64"));
    };

    const region = await page.evaluate(() => {
      const words = [...document.querySelectorAll(".hero-title")];
      if (!words.length) return null;
      const boxes = words.map((el) => el.getBoundingClientRect());
      const top = Math.min(...boxes.map((b) => b.top));
      const bottom = Math.max(...boxes.map((b) => b.bottom));
      const left = Math.min(...boxes.map((b) => b.left));
      const right = Math.max(...boxes.map((b) => b.right));
      // The words themselves would be measured as part of the background, so
      // they are taken out of the picture while it is read. Hidden rather
      // than removed, so nothing reflows and the region keeps its place.
      for (const el of words) (el as HTMLElement).style.visibility = "hidden";
      return {
        x: Math.round(left),
        y: Math.round(top),
        width: Math.max(1, Math.round(right - left)),
        height: Math.max(1, Math.round(bottom - top)),
        ink: getComputedStyle(words[0]).color,
      };
    });
    expect(
      region,
      `the hero carries words over the photograph at ${width}px`,
    ).not.toBeNull();

    const veiled = await brightest(region!);

    await page.evaluate(() => {
      const veil = document.querySelector(".hero-veil") as HTMLElement | null;
      if (veil) veil.style.display = "none";
    });
    const bare = await brightest(region!);

    // With the veil already out of the way, the photograph is taken away too.
    // What is behind the words has to change when it goes, which is how the
    // photograph is known to be painted there rather than merely present in
    // the markup.
    await page.evaluate(() => {
      const veil = document.querySelector(".hero-veil");
      const image = veil?.parentElement?.querySelector("img");
      if (image) image.style.visibility = "hidden";
    });
    const withoutPhotograph = await brightest(region!);

    await page.evaluate(() => {
      const veil = document.querySelector(".hero-veil") as HTMLElement | null;
      if (veil) veil.style.removeProperty("display");
      const image = veil?.parentElement?.querySelector("img");
      if (image) image.style.removeProperty("visibility");
      for (const el of document.querySelectorAll(".hero-title")) {
        (el as HTMLElement).style.removeProperty("visibility");
      }
    });

    // The ink is read from the page rather than assumed to be white, so the
    // test goes on meaning something if the heading is ever recoloured.
    const against = async (behind: number) =>
      page.evaluate(
        ({ ink, luminance }) => {
          const paint = document
            .createElement("canvas")
            .getContext("2d", { willReadFrequently: true })!;
          paint.fillStyle = ink;
          paint.fillRect(0, 0, 1, 1);
          const [r, g, b] = paint.getImageData(0, 0, 1, 1).data;
          const channel = (value: number) => {
            const n = value / 255;
            return n <= 0.04045
              ? n / 12.92
              : Math.pow((n + 0.055) / 1.055, 2.4);
          };
          const text =
            0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
          return (
            (Math.max(text, luminance) + 0.05) /
            (Math.min(text, luminance) + 0.05)
          );
        },
        { ink: region!.ink, luminance: behind },
      );

    // The veil is asked to be the thing carrying the words, not a layer that
    // happens to sit there. Asked only to darken something, it passed over
    // the navy band with the photograph blocked, where the words were
    // perfectly legible without it and the veil was doing nothing.
    //
    // Asked instead that the words be illegible without it, the rule refused
    // a darker photograph that needed no veil at all, which is not something
    // this should have an opinion about. What it asks now is that the
    // photograph is what lies behind the words, and that the veil darkens it.
    expect(
      withoutPhotograph,
      `the photograph is what is painted behind the words at ${width}px`,
    ).not.toBeCloseTo(bare, 3);

    expect(
      veiled,
      `the veil darkens the photograph behind the words at ${width}px`,
    ).toBeLessThan(bare);

    // The heading is display-sized, which is the lower bar the guidance sets.
    expect(
      await against(veiled),
      `the heading at ${width}px against the brightest pixel actually painted behind it`,
    ).toBeGreaterThanOrEqual(3);
  }
});

// The mission is set as a quotation, and a quotation's marks are a pair. One
// of them was left at body size while the other was set as display, which read
// as a stray character rather than as the end of the quote. The crest behind
// it is a watermark, which it stops being once it is most of the width the
// words have.
test("the quoted mission is set as a quotation at every width", async ({
  page,
}) => {
  await page.goto("/");

  for (const width of [320, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);

    const quote = await page.evaluate(() => {
      const figure = document.querySelector("#about figure");
      if (!figure) return null;
      const shown = (el: Element | null) =>
        Boolean(el) && getComputedStyle(el!).display !== "none";

      const marks = [...figure.querySelectorAll("[aria-hidden]")].filter(
        (el) =>
          el.tagName !== "svg" && (el.textContent ?? "").trim().length > 0,
      );
      const crest = figure.querySelector("svg");
      return {
        markSizes: marks.map((el) =>
          Math.round(Number.parseFloat(getComputedStyle(el).fontSize)),
        ),
        caption: figure.querySelector("figcaption")?.textContent?.trim() ?? "",
        crestShare: shown(crest)
          ? (crest as SVGElement).getBoundingClientRect().width /
            figure.getBoundingClientRect().width
          : 0,
      };
    });

    expect(quote, `the mission figure at ${width}px`).not.toBeNull();

    // Every decorative mark is set as display, so none of them can be left at
    // the size of the words around it.
    for (const size of quote!.markSizes) {
      expect(size, `a quote mark at ${width}px`).toBeGreaterThanOrEqual(40);
    }
    expect(quote!.caption, `the quote is attributed at ${width}px`).toBe(
      school.name,
    );
    expect(
      Math.round(quote!.crestShare * 100),
      `the crest behind the quote at ${width}px`,
    ).toBeLessThanOrEqual(40);
  }
});

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
  // Each step back can start an animated scroll, and a reading taken while one
  // is still running is of a page in mid-flight rather than where it came to
  // rest. Reduced motion is a setting a reader can hold anyway.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 1600));
  expect(await restingScroll(page)).toBeGreaterThan(1000);

  await page.evaluate(() => {
    const first = document.querySelector<HTMLElement>(
      "main a[href], main button",
    );
    first?.focus({ preventScroll: true });
  });

  // Only the step that crosses into the header is being asked about. The steps
  // before it run between whatever the page offers, which can lie a long way
  // apart, and the browser is right to travel to reach them.
  let before = 0;
  let reached = false;
  for (let step = 0; step < 30 && !reached; step += 1) {
    before = await restingScroll(page);
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
      await expect(
        page.getByRole("navigation", { name: "Menu" }),
      ).toBeVisible();
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

      // A tab left open crosses the closing date without ever loading again,
      // and the panel used to keep whatever it was built with for as long as
      // the page stayed open. A post that had closed went on inviting
      // applications until someone happened to reload it.
      test("stands down in a tab that was already open", async ({ page }) => {
        test.skip(!vacancy.active, "no post is open");

        await page.clock.install({ time: new Date(closes - MINUTE) });
        await page.goto("/careers");
        await awake(page);
        await expect(page.getByText("Open now")).toBeVisible();

        // No second navigation: the page the reader is looking at is the one
        // that has to notice.
        await page.clock.fastForward(2 * MINUTE);

        await expect(page.getByText("Open now")).toHaveCount(0);
        await expect(page.locator("main")).toContainText(careers.openTo);
      });

      // A tab opened well before the closing date waited through it. One
      // timer cannot be asked to hold more than about twenty-five days, and
      // a longer wait was simply not set, so the only thing left to notice
      // was the reader coming back to the tab. Opened a month ahead and left
      // alone, the panel went on inviting applications.
      test("stands down in a tab opened long before the date", async ({
        page,
      }) => {
        test.skip(!vacancy.active, "no post is open");

        const DAY = 24 * 60 * MINUTE;
        // Opened the day the post went up, which is the longest wait the
        // panel is ever asked to hold and the one a reader can really sit
        // through. A lead of forty days needed only a single further timer,
        // so a panel that set one more and then stopped passed; the real
        // window is three months and needs them set again and again.
        const opened = new Date(`${vacancy.datePosted}T00:00:00+05:30`);
        await page.clock.install({ time: opened });
        await page.goto("/careers");
        await awake(page);
        await expect(page.getByText("Open now")).toBeVisible();

        // Carried to a fortnight before the date without the tab being
        // touched, in steps short enough that the longest a single timer can
        // hold runs out inside one of them. Jumped straight past the moment
        // instead, the first timer lands beyond it and stands the post down
        // on its own, which a panel that never sets a second timer passes
        // just as well as one that does.
        const untilFortnightBefore =
          closes - 14 * DAY - opened.getTime() - MINUTE;
        const step = 6 * DAY;
        for (let gone = 0; gone < untilFortnightBefore; gone += step) {
          await page.clock.runFor(Math.min(step, untilFortnightBefore - gone));
        }
        await expect(
          page.getByText("Open now"),
          "the post is still open a fortnight before it closes",
        ).toBeVisible();

        // Brought to just past the moment itself rather than a day beyond it,
        // so that standing down late is not the same as standing down. A
        // second timer set for too long closed the post half a day after it
        // had closed, and a reader in those hours is the one this is for.
        //
        // Run rather than jumped, so each timer falls due at its own moment
        // and a timer that is set once rather than set again cannot be
        // carried to the end of the jump and fire there regardless.
        await page.clock.runFor(14 * DAY + 2 * MINUTE);

        await expect(page.getByText("Open now")).toHaveCount(0);
        await expect(page.locator("main")).toContainText(careers.openTo);
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

  // Scoped to the page's own content. The bar pinned to the foot of a phone
  // carries this same link on this route, so counting across the document
  // would be counting that as well; it is covered on its own terms elsewhere.
  const whatsapp = page.locator(
    `main a[href^="${contact.whatsappHref}?text="]`,
  );
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

  test("the menu sits under the header, takes focus and restores it", async ({
    page,
  }) => {
    await page.goto("/");

    const opener = page.getByRole("button", { name: "Open menu" });
    await opener.click();

    const menu = page.getByRole("navigation", { name: "Menu" });
    await expect(menu).toBeVisible();

    const geometry = await page.evaluate(() => {
      const panel = document.getElementById("mobile-menu")!;
      const header = document.querySelector("header")!;
      const panelBox = panel.getBoundingClientRect();
      const headerBox = header.getBoundingClientRect();
      const scrim = [...document.querySelectorAll("div")].find((el) => {
        const style = getComputedStyle(el);
        return (
          style.position === "fixed" &&
          el !== panel &&
          !panel.contains(el) &&
          Number.parseFloat(style.backgroundColor.split(",")[3] ?? "1") > 0 &&
          el.getBoundingClientRect().height >= window.innerHeight - 1
        );
      });
      return {
        startsAtHeaderFoot: Math.abs(panelBox.top - headerBox.bottom) <= 1,
        clearsTheHeader: panelBox.top >= headerBox.bottom - 1,
        leavesPageVisible: panelBox.bottom < window.innerHeight - 40,
        fullWidth: Math.round(panelBox.width) === Math.round(window.innerWidth),
        // The header uses backdrop-blur, which creates a containing block. The
        // dimming sits outside it so that it covers the page; moved back in,
        // it would be scoped to the header strip.
        scrimCoversPage: Boolean(scrim),
      };
    });

    expect(geometry.startsAtHeaderFoot, "panel hangs off the header").toBe(
      true,
    );
    expect(geometry.clearsTheHeader, "header stays readable").toBe(true);
    expect(geometry.leavesPageVisible, "the page is still behind it").toBe(
      true,
    );
    expect(geometry.fullWidth).toBe(true);
    expect(geometry.scrimCoversPage, "the page behind is dimmed").toBe(true);

    // The control that opened it is the one that closes it, so it keeps its
    // place in the header and only changes what it says.
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveCount(
      1,
    );
    await expect(menu.locator("a").first()).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden",
    );

    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  });

  // The page the menu covers is dimmed and scroll-locked, so a reader who
  // cannot see the dimming has to be stopped from wandering into it. What
  // makes this worth guarding is that the control which closes the menu sits
  // in the header, outside the panel, so whatever puts the page beyond reach
  // has to leave the header within it.
  test("the menu holds the reader without closing the way out", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();

    const closer = page.getByRole("button", { name: "Close menu" });
    await expect(closer).toBeVisible();

    const held = await page.evaluate(() => {
      const panel = document.getElementById("mobile-menu")!;
      const header = document.querySelector("header")!;
      const button = [...document.querySelectorAll("button")].find(
        (el) => el.getAttribute("aria-label") === "Close menu",
      )!;

      const reachable = (el: Element) => !el.closest("[inert]");

      // A promise that everything outside a node is hidden is only kept if the
      // way out is inside that node.
      const sealed = [...document.querySelectorAll('[aria-modal="true"]')];

      return {
        covers: ["main", "footer"].filter((tag) =>
          document.querySelector(tag)?.hasAttribute("inert"),
        ),
        // Whatever else the page grows, the header is the one part the menu
        // leaves alone. The dimming is excused because it carries nothing to
        // read and has to stay pressable.
        leftLoose: [...document.body.children]
          .filter(
            (el) =>
              el.tagName !== "SCRIPT" &&
              el !== header &&
              !el.hasAttribute("inert") &&
              el.getAttribute("aria-hidden") !== "true",
          )
          .map((el) => el.tagName.toLowerCase()),
        wayOutReachable: reachable(button),
        panelReachable: reachable(panel),
        sealedWithoutTheWayOut: sealed.filter((el) => !el.contains(button))
          .length,
      };
    });

    expect(held.covers, "the page under the menu is held").toEqual([
      "main",
      "footer",
    ]);
    expect(held.leftLoose, "nothing under the menu is left reachable").toEqual(
      [],
    );
    expect(held.wayOutReachable, "the way out of the menu is reachable").toBe(
      true,
    );
    expect(held.panelReachable, "the menu itself is reachable").toBe(true);
    expect(
      held.sealedWithoutTheWayOut,
      "nothing claims to hide the way out of the menu",
    ).toBe(0);

    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(() => document.querySelectorAll("[inert]").length),
      "closing the menu gives the page back",
    ).toBe(0);
  });

  // The menu holds things out of reach that stay on screen, and one of them
  // went on looking exactly as it had: the announcement bar kept its arrow,
  // its full brightness and its pointer while swallowing every tap, which on
  // a phone reads as a page that has stopped working. Nothing is lost by it
  // being out of reach, the menu carries its own way to the same section, so
  // what it has to do is stop offering one.
  //
  // Stated as a rule over whatever is on screen rather than over that one
  // bar: anything a reader can see but the menu has taken away has to look
  // taken away.
  test("nothing the menu holds still looks like it can be used", async ({
    page,
  }) => {
    await page.goto("/");

    // Every visible link in the chrome, reported whether it is held or not,
    // so the same elements can be followed through the menu opening and
    // closing again. Listing only the held ones answered with an empty list
    // while the menu was shut, which says nothing about how they look: a
    // page that dimmed them permanently passed on that silence.
    // Effective opacity, multiplied up the tree. Read from the anchor alone,
    // a wrapper dimmed once and for all looked exactly like a link the menu
    // had just taken away, and permanently dimmed chrome passed this.
    const chrome = async () =>
      page.evaluate(() => {
        const fadeOf = (start: Element) => {
          let fade = 1;
          let node: Element | null = start;
          while (node) {
            fade *= Number(getComputedStyle(node).opacity);
            node = node.parentElement;
          }
          return fade;
        };
        return [...document.querySelectorAll<HTMLElement>("header a[href]")]
          .filter((el) => el.checkVisibility())
          .map((el) => ({
            what: (el.textContent ?? "").trim().slice(0, 30),
            held: el.closest("[inert]") !== null,
            opacity: fadeOf(el),
          }));
      });

    const before = await chrome();
    expect(
      before.filter((item) => item.held),
      "nothing is held while the menu is shut",
    ).toEqual([]);
    expect(before.length, "links in the chrome").toBeGreaterThan(0);
    for (const item of before) {
      expect(item.opacity, `"${item.what}" before the menu opens`).toBe(1);
    }

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForTimeout(350);

    const during = await chrome();
    const held = during.filter((item) => item.held);
    expect(
      held.length,
      "something on screen is held by the menu",
    ).toBeGreaterThan(0);
    for (const item of held) {
      expect(
        item.opacity,
        `"${item.what}" is held by the menu and still looks usable`,
      ).toBeLessThan(1);
    }

    // Given back in full the moment the menu closes, in reach and in looks.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);

    const after = await chrome();
    expect(
      after.filter((item) => item.held),
      "the menu gives everything back",
    ).toEqual([]);
    // The same links, not merely the ones still there. Both checks below read
    // what the page happens to show, so chrome that vanished when the menu
    // closed left nothing to hold and nothing to iterate, and answered both.
    expect(
      after.map((item) => item.what),
      "every link in the chrome is back once the menu closes",
    ).toEqual(before.map((item) => item.what));
    for (const item of after) {
      expect(item.opacity, `"${item.what}" after the menu closes`).toBe(1);
    }
  });

  // The panel is hidden by the stylesheet at one width and the page released by
  // a script at another, and the two were written in different units: `lg` is
  // `64rem`, the script said `1024px`. They agree only while the reader has
  // left the default font size alone. Raised to 20px, `lg` moves to 1280px
  // while the script still fired at 1024px, so widening a window from 1100 to
  // 1300 took the panel and its button off screen without ever releasing the
  // page: everything stayed inert and the scroll stayed locked, with nothing
  // left on screen to undo it.
  //
  // The rule is stated rather than the width, so it holds at any font size: a
  // page held for the menu must keep something on screen that releases it.
  test("widening the window never leaves the page held shut", async ({
    page,
  }) => {
    // A reader's own default size, which `rem` in a media query answers to and
    // an author stylesheet cannot move.
    const cdp = await page.context().newCDPSession(page);

    for (const standard of [16, 20, 24]) {
      await cdp.send("Page.setFontSizes", {
        fontSizes: { standard, fixed: standard },
      });

      for (const [from, to] of [
        [1100, 1300],
        [1000, 1600],
        [900, 2000],
      ]) {
        await page.setViewportSize({ width: from, height: 800 });
        await page.goto("/");

        const opener = page.getByRole("button", { name: "Open menu" });
        if (!(await opener.isVisible())) continue;
        await opener.click();
        await expect(
          page.getByRole("navigation", { name: "Menu" }),
        ).toBeVisible();

        await page.setViewportSize({ width: to, height: 800 });
        await page.waitForTimeout(250);

        const state = await page.evaluate(() => {
          const panel = document.getElementById("mobile-menu");
          const button = [...document.querySelectorAll("button")].find((el) =>
            /menu/i.test(el.getAttribute("aria-label") ?? ""),
          );
          return {
            held:
              document.querySelectorAll("[inert]").length > 0 ||
              document.body.style.overflow === "hidden",
            wayOut:
              Boolean(panel?.checkVisibility()) ||
              Boolean(button?.checkVisibility()),
          };
        });

        expect(
          state.held && !state.wayOut,
          `the page is held with no way out at a ${standard}px default, ${from}px widened to ${to}px`,
        ).toBe(false);
      }
    }
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
    await expect(page.getByRole("navigation", { name: "Menu" })).toBeVisible();
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(before);

    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByRole("navigation", { name: "Menu" })).toHaveCount(0);
    expect(await restingScroll(page)).toBe(before);
  });

  // The page behind the menu is locked, so anything the panel does not show is
  // out of reach altogether. Asked on the shortest screens the site supports:
  // upright, where the panel should need no scrolling at all, and turned on
  // its side, where it cannot fit and every item has to be reachable by
  // scrolling the panel instead. The panel hangs from the foot of the header,
  // so a height set against the screen alone overhung the bottom of a short
  // landscape window and left the last item half off it at full scroll.
  test("every menu item can be reached on a short screen", async ({ page }) => {
    for (const [width, height, scrolls] of [
      [320, 568, false],
      [568, 320, true],
      [653, 280, true],
      [740, 360, true],
    ] as const) {
      const where = `${width}x${height}`;
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await page.getByRole("button", { name: "Open menu" }).click();

      const menu = page.getByRole("navigation", { name: "Menu" });
      await expect(menu, where).toBeVisible();

      const links = menu.locator("a");
      const count = await links.count();
      // Every section, the careers page, the phone number and each profile.
      expect(count, `every way out of the menu is present at ${where}`).toBe(
        navLinks.length + 2 + social.length,
      );

      // The panel itself must end on the screen. Running past the bottom puts
      // its last item beyond reach however far the panel is scrolled.
      const overhang = await menu.evaluate(
        (el) =>
          Math.round(el.getBoundingClientRect().bottom) - window.innerHeight,
      );
      expect(
        overhang,
        `the menu ends on the screen at ${where}`,
      ).toBeLessThanOrEqual(0);

      // In full, each of them: a link showing half of itself is one a thumb
      // can miss, and would answer a looser question than this is asking.
      await menu.evaluate((el) => {
        el.scrollTop = 0;
      });
      for (let i = 0; i < count; i += 1) {
        await links.nth(i).scrollIntoViewIfNeeded();
        await expect(links.nth(i), `menu link ${i} at ${where}`).toBeInViewport(
          { ratio: 1 },
        );
      }

      if (!scrolls) {
        // Upright there is room for the whole menu, so nothing is held back
        // behind a scroll the reader has no reason to try.
        const hidden = await menu.evaluate(
          (el) => el.scrollHeight > el.clientHeight + 1,
        );
        expect(hidden, `the menu fits without scrolling at ${where}`).toBe(
          false,
        );
      } else {
        // Where it does not fit, a thumb has to be able to move it. Every
        // item above was brought into view by the script, which moves a panel
        // the reader cannot move at all: with scrolling turned off, each one
        // still arrived and the last item was reachable here and nowhere
        // else. What is asked now is that the panel moves when pushed.
        await menu.evaluate((el) => {
          el.scrollTop = 0;
        });
        const box = (await menu.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(250);
        expect(
          await menu.evaluate((el) => el.scrollTop),
          `the menu can be scrolled at ${where}`,
        ).toBeGreaterThan(0);

        // And by the hand this menu is built for. A wheel reaches a panel a
        // thumb cannot move, so the gesture itself is made: a finger put on
        // the panel, drawn up it, and lifted. A handler that refuses the
        // move, or a `touch-action` anywhere under the finger that forbids
        // panning, stops this where a wheel goes through regardless.
        await menu.evaluate((el) => {
          el.scrollTop = 0;
        });
        const touchBox = (await menu.boundingBox())!;
        const finger = await page.context().newCDPSession(page);
        const atX = Math.round(touchBox.x + touchBox.width / 2);
        const from = Math.round(touchBox.y + touchBox.height * 0.75);
        await finger.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: atX, y: from }],
        });
        for (const step of [0.25, 0.5, 0.75, 1]) {
          await finger.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              { x: atX, y: Math.round(from - touchBox.height * 0.5 * step) },
            ],
          });
        }
        await finger.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await page.waitForTimeout(300);
        expect(
          await menu.evaluate((el) => el.scrollTop),
          `a thumb can move the menu at ${where}`,
        ).toBeGreaterThan(0);
        await finger.detach();

        // Asked of everything beneath the panel rather than of a list of
        // tag names. Asked of `a, button, ul, li, div` alone, a `span` inside
        // a link could refuse the gesture unseen.
        const blocked = await menu.evaluate((el) =>
          [el, ...el.querySelectorAll("*")]
            .filter((node) => {
              const action = getComputedStyle(node).touchAction;
              return !(
                action === "auto" ||
                action === "manipulation" ||
                action.includes("pan-y")
              );
            })
            .map(
              (node) =>
                `${node.tagName.toLowerCase()}:${getComputedStyle(node).touchAction}`,
            ),
        );
        expect(
          blocked,
          `a thumb is allowed to move the menu at ${where}`,
        ).toEqual([]);
      }
    }
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
  //
  // Swept over the reader's own default size as well as the width, and the
  // contents are measured against the button holding them rather than only
  // against the screen. The word beside the mark was held back by a width in
  // pixels, which answers to the screen and not to the size of the word, so
  // enlarged text ran out of its own button and off the side of the page while
  // the button itself stayed put and the older check saw nothing wrong.
  test("the call bar keeps both actions whole however narrow or large", async ({
    page,
  }) => {
    const cdp = await page.context().newCDPSession(page);

    for (const standard of [16, 20, 24]) {
      await cdp.send("Page.setFontSizes", {
        fontSizes: { standard, fixed: standard },
      });

      for (const width of [240, 280, 320, 360, 412]) {
        const where = `${width}px at a ${standard}px default`;
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
            // Everything the button is actually painting, so a word that runs
            // out of it is seen even though the button itself has not moved.
            const spill = [...link.querySelectorAll("*")]
              .map((child) => child.getBoundingClientRect())
              .filter((child) => child.width > 2 && child.height > 2)
              .reduce(
                (worst, child) =>
                  Math.max(
                    worst,
                    child.right - box.right,
                    box.left - child.left,
                  ),
                0,
              );
            return {
              name: (link.textContent ?? "").trim(),
              icon: icon ? icon.getBoundingClientRect().width : 0,
              past: box.right - window.innerWidth,
              spill,
            };
          });
        });

        expect(actions, `call bar at ${where}`).not.toBeNull();
        expect(actions!.length, `actions at ${where}`).toBe(2);
        for (const action of actions!) {
          expect(action.name, `an action is named at ${where}`).not.toBe("");
          expect(
            Math.round(action.icon),
            `${action.name} mark at ${where}`,
          ).toBeGreaterThanOrEqual(20);
          expect(
            Math.round(action.past),
            `${action.name} past the screen at ${where}`,
          ).toBeLessThanOrEqual(0);
          expect(
            Math.round(action.spill),
            `${action.name} runs outside its own button at ${where}`,
          ).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  test("a menu link closes the menu and reaches the section", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page
      .getByRole("navigation", { name: "Menu" })
      .getByRole("link", { name: "Classes" })
      .click();

    await expect(page.getByRole("navigation", { name: "Menu" })).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Play Group through Class 8" }),
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
