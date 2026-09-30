import {
  Amphora,
  Blocks,
  Calculator,
  Drama,
  Monitor,
  Music,
  Palette,
  Sprout,
  Volleyball,
} from "lucide-react";
import { Mascot } from "@walnut/ui";
import { Section } from "@/components/section";
import { learningAreas } from "@/content/school";

const icons = {
  science: Sprout,
  math: Calculator,
  computer: Monitor,
  blocks: Blocks,
  art: Palette,
  clay: Amphora,
  drama: Drama,
  music: Music,
  play: Volleyball,
} as const;

export function LearningAreas() {
  return (
    <Section
      id="learning"
      tone="white"
      title="Fun learning areas"
      intro="Young children learn best when a room invites them to try something. These are the areas set up for exactly that."
      aside={<Mascot className="h-24 w-24 lg:h-32 lg:w-32" />}
    >
      <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-12">
        {learningAreas.map((area) => {
          const Icon = icons[area.icon];
          return (
            <li key={area.title} className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-soft">
                <Icon className="h-5 w-5 text-navy" aria-hidden />
              </span>
              <div>
                <h3 className="font-heading font-extrabold text-navy">
                  {area.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {area.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
