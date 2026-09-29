import type { ReactNode } from "react";
import { eyebrow as eyebrowClass } from "@/components/ui";

const tones = {
  cream: "bg-cream",
  white: "bg-white",
  navy: "bg-navy-deep text-white",
  gold: "bg-gold-soft",
  magenta: "bg-magenta-soft",
} as const;

/** Eyebrow colour per tone, each clearing AA against that background. */
const eyebrowTone = {
  cream: "text-ink-soft",
  white: "text-ink-soft",
  navy: "text-gold",
  gold: "text-ink-soft",
  magenta: "text-magenta-deep",
} as const;

/**
 * Sections carry different weights of content, so they do not all get the same
 * vertical recipe: a list of facts does not need the room an essay does.
 */
const densities = {
  compact: { pad: "py-8 sm:py-10", gap: "mt-6" },
  default: { pad: "py-10 sm:py-12", gap: "mt-8" },
  spacious: { pad: "py-12 sm:py-16", gap: "mt-10" },
} as const;

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  intro?: string;
  tone?: keyof typeof tones;
  density?: keyof typeof densities;
  /** Lets the children run the full width, outside the reading column. */
  bleed?: boolean;
  /**
   * Sets the heading beside the content rather than above it. Suits a section
   * whose body is a list the eye runs down, where a heading on top leaves the
   * far side of the band with nothing in it.
   */
  split?: boolean;
  /**
   * Sits beside the heading, in the room a heading leaves at the far side of
   * the band, or beneath it when the heading has a column of its own. The
   * narrowest screens have no such room, so it is dropped there.
   */
  aside?: ReactNode;
  children: ReactNode;
};

export function Section({
  id,
  eyebrow,
  title,
  intro,
  tone = "cream",
  density = "default",
  bleed = false,
  split = false,
  aside,
  children,
}: SectionProps) {
  const onNavy = tone === "navy";
  const { pad, gap } = densities[density];
  const hasHeader = Boolean(eyebrow || title || intro);

  const header = hasHeader ? (
    <div className={split ? "max-w-3xl lg:self-center" : "max-w-3xl"}>
      {eyebrow ? (
        <p className={`${eyebrowClass} ${eyebrowTone[tone]}`}>{eyebrow}</p>
      ) : null}
      {title ? (
        <h2
          className={`${eyebrow ? "mt-3" : ""} text-3xl font-extrabold sm:text-4xl ${
            onNavy ? "text-white" : ""
          }`}
        >
          {title}
        </h2>
      ) : null}
      {intro ? (
        <p
          className={`mt-4 text-lg ${onNavy ? "text-white/80" : "text-ink-soft"}`}
        >
          {intro}
        </p>
      ) : null}
    </div>
  ) : null;

  return (
    <section id={id} className={tones[tone]}>
      <div
        className={`mx-auto max-w-6xl px-4 sm:px-6 ${bleed ? "pt-10 pb-8 sm:pt-12" : pad}`}
      >
        <div
          className={
            split
              ? "lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-16"
              : undefined
          }
        >
          {aside && header ? (
            split ? (
              <div className="lg:self-center">
                {header}
                <div className="mt-10 hidden lg:block">{aside}</div>
              </div>
            ) : (
              <div className="sm:flex sm:items-start sm:justify-between sm:gap-10">
                {header}
                <div className="hidden shrink-0 sm:block">{aside}</div>
              </div>
            )
          ) : (
            header
          )}

          <div
            className={
              hasHeader && !bleed
                ? `${gap}${split ? " lg:mt-0" : ""}`
                : undefined
            }
          >
            {bleed ? null : children}
          </div>
        </div>
      </div>
      {bleed ? children : null}
    </section>
  );
}
