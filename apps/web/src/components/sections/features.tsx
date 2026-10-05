import {
  AirVent,
  Backpack,
  BookMarked,
  Bus,
  Cctv,
  Droplets,
  MessagesSquare,
  Monitor,
  Projector,
  ShieldCheck,
  Shovel,
  Stethoscope,
  UserCheck,
  Waves,
} from "lucide-react";
import { Section } from "@/components/section";
import { groupBy, groupHeading } from "@/components/ui";
import { features } from "@/content/school";

const icons = {
  safety: ShieldCheck,
  airCon: AirVent,
  cctv: Cctv,
  water: Droplets,
  medical: Stethoscope,
  transport: Bus,
  staff: UserCheck,
  audioVisual: Projector,
  library: BookMarked,
  computer: Monitor,
  trips: Backpack,
  sandPit: Shovel,
  splash: Waves,
  parents: MessagesSquare,
} as const;

/**
 * Written out by group name rather than taken from position, so reordering the
 * content leaves each group with the colour it was given. The tints are the
 * same three the page already uses for its bands, and the last of them leads
 * into the one that follows this section. Gold is taken at its tile strength,
 * because these sit on cream rather than on white.
 */
const tints: Record<(typeof features)[number]["group"], string> = {
  "Safety and care": "bg-navy-soft",
  Learning: "bg-gold-tile",
  "Play and family": "bg-magenta-soft",
};

export function Features() {
  return (
    <Section
      id="facilities"
      tone="cream"
      density="compact"
      title="What the school provides"
      intro="The practical side of a school day: how children are kept safe, what they learn with, where they play, and how we keep in touch with home."
    >
      {/* The rule marks where one group ends, so the space around it only has
          to let it breathe. Carrying a section's worth of space as well had
          the three groups reading as three sections. */}
      <div className="space-y-5">
        {groupBy(features, (feature) => feature.group).map((group, index) => (
          <div
            key={group.name}
            className={index > 0 ? "border-t border-navy/10 pt-5" : undefined}
          >
            <h3 className={groupHeading}>{group.name}</h3>
            <ul className="mt-3 grid gap-x-10 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-12">
              {group.items.map((feature) => {
                const Icon = icons[feature.icon];
                return (
                  <li key={feature.label} className="flex items-center gap-2.5">
                    {/* The tile carries the group's colour while the mark
                        inside it stays navy, so the three kinds of provision
                        are told apart at a glance without the colour becoming
                        something a reader has to interpret. */}
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tints[group.name]}`}
                    >
                      <Icon className="h-4 w-4 text-navy-deep" aria-hidden />
                    </span>
                    <span className="text-ink">{feature.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
