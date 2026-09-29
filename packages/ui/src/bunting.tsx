type BuntingProps = {
  className?: string;
};

/** Flag colours, repeated across the string. */
const flags = ["#d81b76", "#ffc93c", "#304890", "#3ea845", "#ef6c33"];

/**
 * Original decoration for the celebrations section, which has no photograph of
 * its own. Purely presentational, so it is hidden from assistive technology.
 */
export function Bunting({ className }: BuntingProps) {
  const count = 15;
  const span = 1200 / count;
  const dip = 26;

  return (
    <svg
      viewBox="0 0 1200 84"
      className={className}
      preserveAspectRatio="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={`M0 8 Q600 ${8 + dip * 2} 1200 8`}
        stroke="#a01458"
        strokeWidth="3"
        fill="none"
      />
      {Array.from({ length: count }, (_, index) => {
        const centre = span * (index + 0.5);
        const t = centre / 1200;
        // The height of the quadratic at t, so each flag hangs from the point
        // on the string it is tied to.
        const top = 8 + 4 * dip * t * (1 - t);
        return (
          <path
            key={index}
            d={`M${centre - span * 0.34} ${top} L${centre + span * 0.34} ${top} L${centre} ${top + 46} Z`}
            fill={flags[index % flags.length]}
          />
        );
      })}
    </svg>
  );
}
