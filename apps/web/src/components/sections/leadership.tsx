import { Section } from "@/components/section";
import { groupHeading } from "@/components/ui";
import { leadership } from "@/content/school";

export function Leadership() {
  return (
    <Section
      eyebrow="Our leadership"
      title="From the people who run the school"
      density="compact"
    >
      {/* The portrait spans both the name and the message so every paragraph
          shares one left edge. Both people are given the same portrait size and
          the same heading scale, so neither is presented more prominently than
          the other. */}
      <div className="divide-y divide-navy/10">
        {leadership.map((person) => (
          <article
            key={person.name}
            className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-5 gap-y-4 py-8 first:pt-0 last:pb-0 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-x-6 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-x-10"
          >
            <img
              src={`${person.imageBase}-360.webp`}
              srcSet={person.imageWidths
                .map((w) => `${person.imageBase}-${w}.webp ${w}w`)
                .join(", ")}
              sizes="(min-width: 1024px) 200px, (min-width: 640px) 128px, 112px"
              alt={`${person.name}, ${person.role} of Walnut Academy`}
              width={360}
              height={480}
              loading="lazy"
              className="aspect-3/4 w-full self-start rounded-2xl object-cover shadow-md lg:row-span-2"
            />
            <div className="self-center lg:self-start">
              <h3 className="text-xl font-extrabold sm:text-2xl">
                {person.name}
              </h3>
              <p className={`${groupHeading} mt-1.5`}>{person.role}</p>
            </div>

            <div className="col-span-2 space-y-4 leading-relaxed text-ink lg:col-span-1">
              {person.message.map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
