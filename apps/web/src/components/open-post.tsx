"use client";

import { ArrowDown } from "lucide-react";
import { useSyncExternalStore } from "react";
import { vacancy, vacancyOpen } from "@/content/school";

/** The closing date holds steady for as long as a visitor has the page open. */
const subscribe = () => () => {};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Built from the parts of the date rather than through `Date`, which reads an
 * ISO date as midnight UTC and would print the day before anywhere behind it.
 */
function readableDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/**
 * How the employment type reads to a person. Drawn from the same field the
 * structured data carries, so the page and the posting cannot come to say
 * different things about the same post.
 */
const EMPLOYMENT = {
  FULL_TIME: "Full time",
} as const;

/**
 * Stands down of its own accord once the closing date has passed, so the
 * invitation to apply at any time is what a late visitor is left with.
 * Hydration starts from the value the page was built with, which is what the
 * served markup already shows.
 */
export function OpenPost({ builtOpen }: { builtOpen: boolean }) {
  const open = useSyncExternalStore(subscribe, vacancyOpen, () => builtOpen);
  if (!open) return null;

  return (
    <div className="open-post mb-8 rounded-3xl bg-navy-soft p-6 sm:p-7">
      <p className="font-heading text-sm font-bold tracking-[0.14em] text-navy-deep uppercase">
        Open now
      </p>
      <h2 className="mt-2 font-heading text-2xl font-extrabold">
        {vacancy.title}
      </h2>
      <p className="mt-2.5 max-w-2xl leading-relaxed text-ink">
        {vacancy.summary}
      </p>
      <p className="mt-4 text-sm text-ink-soft">
        {EMPLOYMENT[vacancy.employmentType]} ·{" "}
        <span className="font-semibold text-navy-deep">
          Applications close {readableDate(vacancy.closingDay)}
        </span>
      </p>
      {/* Someone who reads this on a phone is a screen and a half from any way
          of answering it, and the post is the moment they decide to. */}
      <a
        href="#apply"
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 font-heading font-bold text-navy-deep transition-transform hover:scale-[1.02] active:brightness-90"
      >
        How to apply
        <ArrowDown className="h-4 w-4" aria-hidden />
      </a>
    </div>
  );
}
