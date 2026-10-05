import { Crest } from "@walnut/ui";
import { Section } from "@/components/section";
import { classroom, mission, school, story } from "@/content/school";

const [opening, ...rest] = story;

/**
 * The paragraph describes the rooms, so the photograph of one sits beside it
 * rather than anywhere else on the page. The mission then follows as a
 * statement in its own right, centred under both columns, because it is the
 * school speaking rather than a caption to either.
 */
export function About() {
  return (
    <Section
      id="about"
      eyebrow="About the school"
      title="A place children are glad to arrive at"
    >
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <img
          src={`/images/${classroom.src}-900.webp`}
          srcSet={`/images/${classroom.src}-600.webp 600w, /images/${classroom.src}-900.webp 900w, /images/${classroom.src}-1200.webp 1200w`}
          sizes="(min-width: 1024px) 45vw, 100vw"
          alt={classroom.alt}
          width={900}
          height={596}
          loading="lazy"
          /* Pulled out to the edges by the width of the section's own padding,
             rather than by the width of the window, which would reach past the
             page wherever a scrollbar is taking room of its own. */
          className="-mx-4 w-[calc(100%+2rem)] max-w-none rounded-none shadow-none ring-0 sm:-mx-6 sm:w-[calc(100%+3rem)] lg:mx-0 lg:w-full lg:rounded-3xl lg:shadow-lg lg:ring-1 lg:ring-navy/10"
        />

        <div className="space-y-5 text-lg leading-relaxed text-ink">
          {/* The raised letter needs a line long enough to sit beside without
              taking much of it. Narrower than the two-column layout, it indents
              a fifth of every line it touches, so the opening paragraph leads
              on weight instead. */}
          <p className="text-xl font-semibold text-navy-deep lg:text-lg lg:font-normal lg:text-ink lg:first-letter:float-left lg:first-letter:mt-1 lg:first-letter:mr-3 lg:first-letter:font-heading lg:first-letter:text-[3.25rem] lg:first-letter:leading-[0.8] lg:first-letter:font-extrabold lg:first-letter:text-magenta-deep">
            {opening}
          </p>
          {rest.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
      </div>

      <figure className="relative mx-auto mt-12 max-w-3xl text-left md:mt-16 md:text-center lg:mt-16">
        {/* Held back on a narrow screen, where the mark is most of the width
            the words have and its lettering reads through between the lines. */}
        <Crest
          title={null}
          className="pointer-events-none absolute top-1/2 left-1/2 hidden h-60 w-60 -translate-x-1/2 -translate-y-1/2 opacity-[0.05] grayscale md:block"
        />
        <span
          aria-hidden
          className="relative block font-heading text-5xl leading-none font-semibold text-navy/30"
        >
          &ldquo;
        </span>
        <blockquote className="relative -mt-3 font-heading text-[1.0625rem] leading-relaxed font-medium text-navy-deep sm:text-[1.375rem] sm:font-semibold">
          {mission}
        </blockquote>
        {/* Closes the quote and says who is speaking, which the mark it
            replaces did at a fraction of the size of its opening pair. */}
        <figcaption className="relative mt-4 font-heading text-xs font-bold tracking-[0.14em] text-ink-soft uppercase">
          {school.name}
        </figcaption>
      </figure>
    </Section>
  );
}
