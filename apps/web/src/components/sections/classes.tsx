import { Section } from "@/components/section";
import {
  classRangeHeading,
  prePrimary,
  schoolClasses,
  schoolClassesLabel,
} from "@/content/school";

/**
 * The numbered classes close the same progression as the pre-primary stages
 * rather than sitting in a panel of their own, so the whole path from Play
 * Group to Class 8 reads as one sequence.
 */
const stages = [
  ...prePrimary,
  {
    name: schoolClassesLabel,
    colour: "var(--color-class-numbered)",
    textColour: "var(--color-navy-deep)",
    body: schoolClasses.body,
  },
];

/**
 * A wash rather than a fill. None of the five class colours carries body text
 * at AA when used at full strength, and no single text colour clears all five,
 * so the panel is tinted and the existing darkened text colour is kept.
 */
const tint = (colour: string) =>
  `color-mix(in srgb, ${colour} 10%, transparent)`;

/** Half a column, so the rule starts and ends under the outer dots. */
const RULE_INSET = "calc((100% - 4rem) / 10)";

export function Classes() {
  return (
    <Section
      id="classes"
      tone="white"
      eyebrow="Classes"
      title={classRangeHeading}
      intro="Children join us at the very beginning and can stay with us through the whole of their primary and middle years."
    >
      {/* The stages are a path, not a set. The rule carries the eye across them
          in order; on a phone the same rule runs down the left instead. */}
      <div className="relative mb-4 hidden h-3 lg:block" aria-hidden>
        <span
          className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-navy/15"
          style={{ left: RULE_INSET, right: RULE_INSET }}
        />
        <div className="relative grid grid-cols-5 gap-4">
          {stages.map((stage) => (
            <span
              key={stage.name}
              className="mx-auto block h-3 w-3 rounded-full ring-4 ring-white"
              style={{ backgroundColor: stage.colour }}
            />
          ))}
        </div>
      </div>

      <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stages.map((stage, index) => (
          <li key={stage.name} className="relative pl-8 sm:pl-0">
            {/* The mark sits on the middle of the panel it belongs to, so the
                line is drawn in halves: the lower half of one panel and the
                upper half of the next. Two marks are then joined however tall
                either panel happens to be, and the path still stops at the last
                stage rather than trailing past it. Each stretch between two
                marks carries the colour of the stage it leaves, so the spine
                changes as a child moves up the school. */}
            {index > 0 ? (
              <span
                aria-hidden
                className="absolute top-0 bottom-1/2 left-[11px] w-0.5 sm:hidden"
                style={{ backgroundColor: stages[index - 1].colour }}
              />
            ) : null}
            {index < stages.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-1/2 -bottom-4 left-[11px] w-0.5 sm:hidden"
                style={{ backgroundColor: stage.colour }}
              />
            ) : null}
            <span
              aria-hidden
              className="absolute top-1/2 left-[6px] -mt-1.5 h-3 w-3 rounded-full ring-4 ring-white sm:hidden"
              style={{ backgroundColor: stage.colour }}
            />
            <div
              className="h-full rounded-2xl p-5"
              style={{ backgroundColor: tint(stage.colour) }}
            >
              <h3
                className="font-heading text-xl font-extrabold"
                style={{ color: stage.textColour }}
              >
                {stage.name}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-soft lg:text-sm">
                {stage.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
