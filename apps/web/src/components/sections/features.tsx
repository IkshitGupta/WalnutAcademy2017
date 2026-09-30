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

export function Features() {
  return (
    <Section
      id="facilities"
      tone="cream"
      density="compact"
      title="What the school provides"
      intro="The practical side of a school day: how children are kept safe, what they learn with, where they play, and how we keep in touch with home."
    >
      <div className="space-y-8">
        {groupBy(features, (feature) => feature.group).map((group, index) => (
          <div
            key={group.name}
            className={index > 0 ? "border-t border-navy/10 pt-8" : undefined}
          >
            <h3 className={groupHeading}>{group.name}</h3>
            <ul className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-12">
              {group.items.map((feature) => {
                const Icon = icons[feature.icon];
                return (
                  <li key={feature.label} className="flex items-start gap-3">
                    <Icon
                      className="mt-0.5 h-5 w-5 shrink-0 text-navy"
                      aria-hidden
                    />
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
