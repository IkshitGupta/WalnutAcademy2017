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

function Tile({ icon }: { icon: keyof typeof icons }) {
  const Icon = icons[icon];
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy-soft sm:h-10 sm:w-10">
      <Icon className="h-4 w-4 text-navy sm:h-5 sm:w-5" aria-hidden />
    </span>
  );
}

export function LearningAreas() {
  return (
    <Section
      id="learning"
      tone="white"
      title="Fun learning areas"
      intro="Young children learn best when a room invites them to try something. These are the areas set up for exactly that."
      aside={<Mascot className="h-24 w-24 lg:h-32 lg:w-32" />}
    >
      {/* Nine areas each carrying a sentence ran to half again the height of a
          phone screen, and six of those sentences say little their own name
          does not. A phone is given the nine names, which is the part worth
          seeing at a glance; the sentences arrive at the width where the list
          runs in columns and has room for them. They are only taken off the
          screen rather than out of the page, so a phone reading aloud still
          has them. */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-10 sm:gap-y-8 lg:grid-cols-3 lg:gap-x-12">
        {learningAreas.map((area) => (
          <li
            key={area.title}
            className="flex items-center gap-3 sm:items-start sm:gap-4"
          >
            <Tile icon={area.icon} />
            <div>
              <h3 className="font-heading text-sm font-extrabold text-navy sm:text-base">
                {area.title}
              </h3>
              <p className="text-sm leading-relaxed text-ink-soft max-sm:sr-only sm:mt-2">
                {area.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
