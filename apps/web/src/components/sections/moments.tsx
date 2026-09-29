import { Section } from "@/components/section";
import { moments } from "@/content/school";

/**
 * Runs the full width rather than sitting in the reading column: the
 * photographs carry this section, and nothing else on the page breaks out of
 * that column, which is most of what makes it read differently.
 */
export function Moments() {
  return (
    <Section
      id="moments"
      tone="white"
      eyebrow="Through the year"
      title="What a year here looks like"
      intro="Festivals, theme days and competitions, photographed as they happened."
      bleed
    >
      <ul className="grid grid-cols-2 gap-1 md:grid-cols-5">
        {moments.map((moment) => (
          <li key={moment.src} className="relative">
            <img
              src={`/images/${moment.src}-800.webp`}
              srcSet={`/images/${moment.src}-400.webp 400w, /images/${moment.src}-800.webp 800w, /images/${moment.src}-1200.webp 1200w`}
              sizes="(min-width: 768px) 20vw, 50vw"
              alt={moment.alt}
              width={800}
              height={600}
              loading="lazy"
              className="block aspect-[4/3] w-full object-cover"
            />
            <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pt-8 pb-2 font-heading text-xs font-bold text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.7)] sm:text-sm">
              {moment.caption}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
