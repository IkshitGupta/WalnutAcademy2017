"use client";

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
  return (
    <details
      className="message-fold"
      onToggle={(event) => {
        const fold = event.currentTarget;
        if (fold.open) return;
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
