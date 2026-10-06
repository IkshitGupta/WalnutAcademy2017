"use client";

import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { WhatsappIcon } from "@walnut/ui";
import { careersHref, contact } from "@/content/school";

/**
 * Persistent call and WhatsApp actions. Most visitors arrive on a phone from a
 * local search, and calling is the action nearly all of them want.
 *
 * Someone reading about teaching here wants to send a CV rather than ask a
 * general question, and this bar is the more prominent of the two ways on
 * screen to open WhatsApp, so on that page it opens the message the page is
 * written around.
 */
export function MobileActionBar() {
  const path = usePathname();
  const applying = path?.startsWith("/careers") ?? false;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-px border-t border-navy/10 bg-navy/10 lg:hidden print:hidden">
      {/* Calling is the action nearly all of them want, so it takes two thirds
          of the bar and the only filled treatment. */}
      <a
        href={contact.phoneHref}
        className="col-span-2 flex items-center justify-center gap-2 bg-gold py-4 text-sm font-bold text-navy-deep active:brightness-90"
      >
        <Phone className="h-5 w-5 shrink-0" aria-hidden />
        Call the school
      </a>
      <a
        href={applying ? careersHref.whatsapp : contact.whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-whatsapp py-4 text-sm font-bold text-navy-deep active:brightness-90"
      >
        <WhatsappIcon className="h-5 w-5 shrink-0" />
        {/* Enlarged far enough and the two will not both fit. The mark is what
            identifies the action at a glance, so the word gives way first and
            stays available to a screen reader. The width is written in the
            unit the word is set in: as a pixel count it answered only to the
            size of the screen, and the word ran past the end of its own button
            and off the side of the page wherever a reader had enlarged it. */}
        <span className="max-[20rem]:sr-only">WhatsApp</span>
      </a>
    </div>
  );
}
