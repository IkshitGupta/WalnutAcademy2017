import { Bunting } from "@walnut/ui";
import { Section } from "@/components/section";
import { celebrations } from "@/content/school";

export function Celebrations() {
  return (
    <Section
      tone="magenta"
      title="The year is full of days worth dressing up for"
      intro="Festivals, national days and a few of the school’s own, all of them reasons for children to take part rather than watch."
    >
      <Bunting className="mb-10 h-14 w-full sm:h-16" />

      <ul className="flex flex-wrap gap-3">
        {celebrations.map((event) => (
          <li
            key={event.name}
            className="rounded-full bg-white px-5 py-2.5 font-heading text-base font-bold text-magenta-deep shadow-sm sm:text-lg"
          >
            {event.name}
          </li>
        ))}
      </ul>
    </Section>
  );
}
