import { Crest, Star } from "@walnut/ui";
import { Section } from "@/components/section";
import { techniques } from "@/content/school";

export function Techniques() {
  return (
    <Section
      tone="gold"
      split
      eyebrow="Our techniques"
      title="How we teach"
      aside={<Crest title={null} className="h-44 w-44" />}
    >
      {/* The five carry equal weight and map to the five stars on the crest, so
          a star marks each one. */}
      <ul className="border-t border-navy/10">
        {techniques.map((technique) => (
          <li
            key={technique.title}
            className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4 border-b border-navy/10 py-5"
          >
            <Star className="mt-1.5 h-5 w-5 text-navy" />
            <div>
              <h3 className="text-xl font-extrabold">{technique.title}</h3>
              <p className="mt-1 leading-relaxed text-ink-soft xl:text-lg">
                {technique.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
