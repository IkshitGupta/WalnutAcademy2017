import { ArrowRight } from "lucide-react";
import { AdmissionNote } from "@/components/admission-note";
import { admissionSession, stripe } from "@/content/school";

/**
 * The whole bar is the link. The session is written by a client component, so
 * the destination is named in a hidden span rather than an aria-label: a label
 * would have to be built here, at build time, and would then disagree with the
 * session the visitor actually sees.
 */
export function AnnouncementBar() {
  return (
    <div className="bg-navy-deep">
      <a
        href="#visit"
        className="group block transition-colors hover:bg-white/[0.07]"
      >
        <p className="mx-auto flex max-w-6xl items-center justify-center gap-2.5 px-4 py-2 font-heading text-xs font-bold tracking-[0.12em] text-white uppercase sm:px-6 sm:text-sm">
          <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
            <span className="admission-dot absolute inset-0 rounded-full bg-gold" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-gold" />
          </span>
          <AdmissionNote buildSession={admissionSession()} />
          <ArrowRight
            className="h-3.5 w-3.5 shrink-0 text-gold transition-transform group-hover:translate-x-0.5 sm:h-4 sm:w-4"
            aria-hidden
          />
        </p>
        {/* Outside the paragraph, so the line a sighted visitor reads is also
            the whole of that paragraph's text. */}
        <span className="sr-only">{" How to visit the school."}</span>
      </a>

      {/* The same colours, in the same order, as the cap on the hero card. */}
      <div className="flex h-[3px]" aria-hidden>
        {stripe.map((colour) => (
          <span
            key={colour}
            className="flex-1"
            style={{ backgroundColor: colour }}
          />
        ))}
      </div>
    </div>
  );
}
