import { STAR_PATH } from "./star";

type CrestProps = {
  className?: string;
  /** Rendered as the accessible name. Pass null for decorative use. */
  title?: string | null;
};

const STAR_X = [62, 81, 100, 119, 138];

/**
 * The Walnut Academy crest, redrawn as vector art from the printed prospectus
 * cover. The supplied raster logo was 123x112px and unusable at display sizes.
 */
export function Crest({ className, title = "Walnut Academy" }: CrestProps) {
  return (
    <svg
      viewBox="0 0 200 220"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title ?? undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}

      <path
        d="M100 4 L196 31 V124 C196 172 152 204 100 218 C48 204 4 172 4 124 V31 Z"
        fill="#c8102e"
      />
      <path
        d="M100 15 L185 39 V123 C185 166 146 195 100 208 C54 195 15 166 15 123 V39 Z"
        fill="#f2b31a"
      />
      <path
        d="M100 26 L174 47 V121 C174 159 140 185 100 197 C60 185 26 159 26 121 V47 Z"
        fill="#304890"
      />

      <g fill="#f2b31a">
        {STAR_X.map((x) => (
          <path
            key={x}
            d={STAR_PATH}
            transform={`translate(${x} 54) scale(6.6)`}
          />
        ))}
      </g>

      <rect x="31" y="64" width="138" height="27" rx="4" fill="#ffffff" />
      <text
        x="100"
        y="83.5"
        textAnchor="middle"
        fill="#c8102e"
        style={{ fontFamily: "var(--font-sans, Arial, Helvetica, sans-serif)" }}
        fontWeight="800"
        fontSize="15"
        letterSpacing="0.2"
        textLength="122"
        lengthAdjust="spacingAndGlyphs"
      >
        WALNUT ACADEMY
      </text>

      {/* Walnut motif */}
      <ellipse cx="100" cy="128" rx="41" ry="24" fill="#ffffff" />
      <g stroke="#304890" strokeWidth="2.6" fill="none" strokeLinecap="round">
        <path d="M61 128 H139" />
        <path d="M70 117 Q100 103 130 117" />
        <path d="M78 110 Q100 100 122 110" />
        <path d="M70 139 Q100 153 130 139" />
        <path d="M78 146 Q100 156 122 146" />
      </g>

      {/* Sunrise over an open book */}
      <g stroke="#f2b31a" strokeWidth="2.6" fill="none" strokeLinecap="round">
        <path d="M100 152 V162" />
        <path d="M84 156 L89 164" />
        <path d="M116 156 L111 164" />
        <path d="M72 164 L79 170" />
        <path d="M128 164 L121 170" />
      </g>
      <path d="M86 176 A14 14 0 0 1 114 176 Z" fill="#f2b31a" />
      <path
        d="M72 174 C82 168 92 168 100 174 C108 168 118 168 128 174 L128 185 C118 179 108 179 100 184 C92 179 82 179 72 185 Z"
        fill="#ffffff"
      />
      <path d="M100 174 V184" stroke="#304890" strokeWidth="2" fill="none" />
    </svg>
  );
}
