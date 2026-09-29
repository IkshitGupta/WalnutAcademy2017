import { Crest } from "@walnut/ui";
import { Section } from "@/components/section";
import { classroom, mission, story } from "@/content/school";

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
          className="w-full rounded-3xl shadow-lg ring-1 ring-navy/10"
        />

        <div className="space-y-5 text-lg leading-relaxed text-ink">
          <p className="first-letter:float-left first-letter:mt-1 first-letter:mr-3 first-letter:font-heading first-letter:text-[3.25rem] first-letter:leading-[0.8] first-letter:font-extrabold first-letter:text-magenta-deep">
            {opening}
          </p>
          {rest.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
      </div>

      <figure className="relative mx-auto mt-12 max-w-3xl text-left md:mt-16 md:text-center lg:mt-16">
        <Crest
          title={null}
          className="pointer-events-none absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 opacity-[0.05] grayscale"
        />
        <span
          aria-hidden
          className="relative block font-heading text-5xl leading-none font-semibold text-navy/30"
        >
          &ldquo;
        </span>
        <blockquote className="relative -mt-3 font-heading text-xl leading-relaxed font-semibold text-navy-deep sm:text-[1.375rem]">
          {mission}
          <span aria-hidden className="text-navy/30">
            &rdquo;
          </span>
        </blockquote>
      </figure>
    </Section>
  );
}
