import { Section } from "@/components/section";
import { prePrimary, primary } from "@/content/school";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const roman = (className: string) =>
  ROMAN[Number(className.replace(/\D/g, "")) - 1] ?? className;

/**
 * "Primary" alone is read as Class 1 to 5 in some schools and Class 1 to 8 in
 * others, so the span is named alongside it, in the Roman numerals the school
 * uses on its own signage. Derived from the class list so it stays true to the
 * classes the school runs.
 */
const primaryRange = `${roman(primary.classes[0])}–${roman(
  primary.classes[primary.classes.length - 1],
)}`;

/**
 * Primary closes the same progression as the pre-primary stages rather than
 * sitting in a panel of its own, so the whole path from Play Group to Class 5
 * reads as one sequence.
 */
const stages = [
  ...prePrimary,
  {
    name: `Primary (${primaryRange})`,
    colour: "var(--color-class-primary)",
    textColour: "var(--color-navy-deep)",
    body: primary.body,
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
      title="Play Group through Class 5"
      intro="Children join us at the very beginning and stay with us through the whole of their primary years. Classes stay small enough that every child is known by name."
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
        <span
          aria-hidden
          className="absolute top-6 bottom-6 left-[11px] w-0.5 bg-navy/15 sm:hidden"
        />
        {stages.map((stage) => (
          <li key={stage.name} className="relative pl-8 sm:pl-0">
            <span
              aria-hidden
              className="absolute top-6 left-[6px] h-3 w-3 rounded-full ring-4 ring-white sm:hidden"
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
