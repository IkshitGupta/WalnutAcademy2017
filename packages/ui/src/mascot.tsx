type MascotProps = {
  className?: string;
  title?: string | null;
};

/**
 * An original squirrel drawn for Walnut Academy. The prospectus uses a stock
 * clip-art squirrel which cannot be reused; this is independent artwork and
 * carries the sections of the page that have no photograph.
 */
export function Mascot({ className, title = null }: MascotProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title ?? undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}

      {/* Tail */}
      <path
        d="M74 168 C24 154 16 84 54 56 C90 30 138 50 140 92 C141 118 120 138 100 130 C112 120 120 106 118 92 C114 62 80 50 58 70 C32 94 38 144 80 156 Z"
        fill="#d2601a"
      />
      <path
        d="M72 150 C40 138 38 94 60 74 C82 55 110 66 113 90 C115 104 108 116 99 119 C105 109 108 98 106 89 C102 70 80 64 66 80 C50 98 52 132 78 142 Z"
        fill="#efa76b"
      />

      {/* Body */}
      <path
        d="M104 190 C81 190 66 174 66 152 C66 126 82 108 104 108 C127 108 143 126 143 152 C143 174 128 190 104 190 Z"
        fill="#d2601a"
      />
      <path
        d="M104 182 C90 182 81 171 81 157 C81 139 91 127 105 127 C119 127 129 139 129 157 C129 171 119 182 104 182 Z"
        fill="#fbead7"
      />

      {/* Walnut held in the paws */}
      <ellipse cx="104" cy="152" rx="16" ry="14" fill="#9c6b3f" />
      <path
        d="M104 139 V165 M92 147 Q104 142 116 147 M92 158 Q104 163 116 158"
        stroke="#6f4a2b"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="88" cy="150" rx="8" ry="7" fill="#efa76b" />
      <ellipse cx="120" cy="150" rx="8" ry="7" fill="#efa76b" />

      {/* Ears */}
      <path d="M92 62 L86 30 L114 52 Z" fill="#d2601a" />
      <path d="M96 58 L93 41 L107 52 Z" fill="#efa76b" />
      <path d="M136 56 L152 30 L152 62 Z" fill="#d2601a" />
      <path d="M138 55 L148 41 L148 59 Z" fill="#efa76b" />

      {/* Head */}
      <circle cx="117" cy="86" r="33" fill="#d2601a" />
      <ellipse cx="130" cy="99" rx="21" ry="16" fill="#fbead7" />

      <circle cx="112" cy="80" r="5.5" fill="#304890" />
      <circle cx="114" cy="78" r="1.9" fill="#ffffff" />
      <ellipse cx="143" cy="92" rx="4.4" ry="3.4" fill="#304890" />
      <path
        d="M143 96 Q139 103 132 101"
        stroke="#304890"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
