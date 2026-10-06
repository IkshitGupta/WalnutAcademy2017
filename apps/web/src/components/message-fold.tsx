"use client";

import { useEffect } from "react";

/**
 * Paper has no way of opening a fold, so the stylesheet opens them for it.
 * That rests on `::details-content`, which the browsers this site supports do
 * not all have; without it the folds reached the printer shut, with a control
 * on them that cannot be pressed, and the messages were lost from the sheet.
 *
 * Opening them here instead covers every browser, because it works on the
 * element rather than on a selector. Each fold is returned to how the reader
 * left it once the sheet has gone.
 */

/** Held between the two halves of a print, and shared by every fold. */
let printing = false;
let reopened: HTMLDetailsElement[] = [];
let listening = 0;
let printQuery: MediaQueryList | null = null;

/**
 * A browser may announce a print through both the event and the media query,
 * and each fold on the page is listening. Whichever arrives first does the
 * work and the rest are left alone, so the record of what to put back is
 * taken once, from the page as the reader left it.
 */
const openForPrint = () => {
  if (printing) return;
  printing = true;
  reopened = [
    ...document.querySelectorAll<HTMLDetailsElement>(
      "details.message-fold:not([open])",
    ),
  ];
  reopened.forEach((fold) => fold.setAttribute("open", ""));
};

const restoreAfterPrint = () => {
  if (!printing) return;
  printing = false;
  for (const fold of reopened) {
    if (!fold.open) continue;
    // Read and cleared by the toggle handler, which the browser runs on its
    // own turn rather than during this call. Marking the element carries the
    // distinction that far; a variable here would already have been put back.
    fold.dataset.printRestore = "";
    fold.removeAttribute("open");
  }
  reopened = [];
};

const onPrintChange = (event: MediaQueryListEvent) =>
  event.matches ? openForPrint() : restoreAfterPrint();

/**
 * The work is shared, so the listening is too, and it is counted rather than
 * repeated. Every fold asks to listen with the same functions, which a window
 * registers only once however many ask; cleaning up after one fold therefore
 * took the listeners away from all of them, and put the folds back while a
 * print was still under way. The last one out does the clearing up.
 */
function useOpenWhilePrinting() {
  useEffect(() => {
    if (CSS.supports("selector(::details-content)")) return;

    listening += 1;
    if (listening === 1) {
      window.addEventListener("beforeprint", openForPrint);
      window.addEventListener("afterprint", restoreAfterPrint);
      // Some browsers reach print through the media query rather than the
      // events, and some send both.
      printQuery = window.matchMedia("print");
      printQuery.addEventListener("change", onPrintChange);
    }

    return () => {
      listening -= 1;
      if (listening > 0) return;
      window.removeEventListener("beforeprint", openForPrint);
      window.removeEventListener("afterprint", restoreAfterPrint);
      printQuery?.removeEventListener("change", onPrintChange);
      printQuery = null;
      restoreAfterPrint();
    };
  }, []);
}

/**
 * Shutting the fold takes away the words that stood above the control, so
 * everything below it moves up by as much as was revealed while the page stays
 * where it was. A reader who opened a message at one person and shut it again
 * is left somewhere after them, facing whatever the collapse pulled upwards.
 * Closing therefore returns them to the person they were reading, and only
 * when they have been carried past: a reader who can still see them is left
 * where they are. Without script the fold still opens and shuts, which is why
 * the markup carries the behaviour rather than the state.
 */
export function MessageFold({ paragraphs }: { paragraphs: string[] }) {
  useOpenWhilePrinting();

  return (
    <details
      className="message-fold"
      onToggle={(event) => {
        const fold = event.currentTarget;
        // Cleared first, whatever state the fold has reached. The notice
        // arrives on its own turn, by which time a fold the script put back
        // may have been opened again; left on it, the mark would be spent on
        // the reader's next close and carry them nowhere.
        const putBack = fold.dataset.printRestore !== undefined;
        delete fold.dataset.printRestore;
        if (fold.open || putBack) return;
        const person = fold.closest("article");
        if (!person || person.getBoundingClientRect().top >= 0) return;
        person.scrollIntoView({ block: "start" });
      }}
    >
      <summary className="flex min-h-11 items-center self-start font-heading text-[0.9375rem] font-bold text-navy underline underline-offset-4">
        <span className="fold-shut">Read more</span>
        <span className="fold-open">Read less</span>
      </summary>
      <div className="space-y-4">
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
      </div>
    </details>
  );
}
