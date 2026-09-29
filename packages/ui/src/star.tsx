type StarProps = {
  className?: string;
};

/** Five-pointed, drawn on a unit radius about the origin. */
export const STAR_PATH =
  "M0,-1 L0.2245,-0.309 L0.951,-0.309 L0.3633,0.118 L0.5878,0.809 L0,0.382 L-0.5878,0.809 L-0.3633,0.118 L-0.951,-0.309 L-0.2245,-0.309 Z";

export function Star({ className }: StarProps) {
  return (
    <svg
      viewBox="-1 -1 2 2"
      className={className}
      fill="currentColor"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}
