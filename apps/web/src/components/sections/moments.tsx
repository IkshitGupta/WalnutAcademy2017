import { Bunting } from "@walnut/ui";
import { Section } from "@/components/section";
import { moments } from "@/content/school";

/**
 * The photographs name the days themselves, so nothing lists them twice. The
 * wall runs the full width rather than sitting in the reading column: the
 * photographs carry this section, and nothing else on the page breaks out of
 * that column, which is most of what makes it read differently.
 */
export function Moments() {
  return (
    <Section
      id="moments"
      tone="magenta"
      eyebrow="Through the year"
      title="What a year here looks like"
      intro="Festivals, national days, competitions and a few of the school’s own, all of them reasons for children to take part rather than watch."
      bleed
    >
      <div className="mx-auto max-w-6xl px-4 pb-5 sm:px-6">
        <Bunting className="h-14 w-full sm:h-16" />
      </div>

      <ul className="grid grid-cols-2 gap-1 md:grid-cols-5">
        {moments.map((moment) => (
          <li key={moment.src} className="relative">
            <img
              src={`/images/${moment.src}-800.webp`}
              srcSet={`/images/${moment.src}-400.webp 400w, /images/${moment.src}-600.webp 600w, /images/${moment.src}-800.webp 800w, /images/${moment.src}-1200.webp 1200w`}
              sizes="(min-width: 768px) 20vw, 50vw"
              alt={moment.alt}
              width={800}
              height={600}
              loading="lazy"
              className="block aspect-[4/3] w-full object-cover"
            />
            <p className="moment-caption absolute inset-x-0 bottom-0 px-3 pt-8 pb-2 font-heading text-xs font-bold text-white sm:text-sm">
              {moment.caption}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
