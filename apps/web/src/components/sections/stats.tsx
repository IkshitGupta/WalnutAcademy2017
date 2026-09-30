import {
  CalendarDays,
  GraduationCap,
  UserRoundPen,
  UsersRound,
} from "lucide-react";
import { stats } from "@/content/school";

const icons = {
  calendar: CalendarDays,
  students: UsersRound,
  teachers: UserRoundPen,
  classes: GraduationCap,
} as const;

/**
 * The hairlines run the full cross on a phone, so the four read as one set
 * rather than as two stacked pairs. Cells carry their own padding instead of a
 * grid gap, which puts each rule exactly between its neighbours.
 */
const rules = [
  "",
  "border-l",
  "border-t lg:border-t-0 lg:border-l",
  "border-l border-t lg:border-t-0",
] as const;

export function Stats() {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="rounded-2xl bg-navy-deep px-4 py-6 shadow-xl sm:px-8 sm:py-9">
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => {
              const Icon = icons[stat.icon];
              return (
                <div
                  key={stat.label}
                  className={`border-white/15 px-2 py-5 text-center sm:px-4 lg:py-0 ${rules[i]}`}
                >
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <Icon
                      className="mx-auto mb-2 h-6 w-6 text-white/70"
                      aria-hidden
                    />
                    <span className="block font-heading text-4xl font-extrabold text-gold sm:text-5xl">
                      {stat.value}
                    </span>
                    <span className="mt-2 block text-xs font-medium tracking-wide text-white/70 uppercase sm:text-sm">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}
