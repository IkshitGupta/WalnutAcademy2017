import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // next/image adds no value under output: "export", which disables the
      // optimiser. Renditions are produced by scripts/optimise-images.mjs and
      // served through srcset on plain img elements.
      "@next/next/no-img-element": "off",

      // The site is two pages of static files, and every link in it is a plain
      // anchor by design. Most point at a section of the home page, where the
      // router treats a fragment it is already showing as no change at all and
      // leaves a second press doing nothing. The rest cross between the two
      // pages, and a fragment jump the browser makes itself carries no router
      // state, so the router then declines to act on the Back button that
      // returns to it. Letting the browser navigate throughout avoids both.
      "@next/next/no-html-link-for-pages": "off",

      // The decision above, enforced where it can be. The rule below this one
      // only sees an href written out in full, and a browser test only sees a
      // link it thought to look for, so neither notices one of these arriving
      // in the middle of a page.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message:
                "Use a plain <a>. The router leaves a repeated fragment where it is and declines to act on the Back button that returns to one.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
