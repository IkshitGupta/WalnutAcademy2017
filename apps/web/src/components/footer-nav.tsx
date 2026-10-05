"use client";

import { usePathname } from "next/navigation";
import { navLinks } from "@/content/school";

const columnHeading =
  "font-heading text-sm font-bold tracking-wide text-white uppercase";

const here = (path: string | null, href: string) =>
  (path ?? "").replace(/\/$/, "") === href.replace(/\/$/, "");

/**
 * Only the list knows which page it is on, so it is the only part of the foot
 * of the page that has to come alive in the browser.
 */
export function FooterNav() {
  const path = usePathname();
  const links = [...navLinks, { href: "/careers/", label: "Teaching jobs" }];

  return (
    <nav aria-label="Footer">
      <h2 className={columnHeading}>Explore</h2>
      {/* Filled down one column and then the next, so reading the list the way
          the column runs gives the order the page itself goes in. Across the
          rows instead, each column held every other section. */}
      <ul className="mt-4 grid auto-cols-fr grid-flow-col grid-rows-4 gap-x-10 gap-y-2.5 text-sm">
        {links.map((link) => {
          const current = here(path, link.href);
          return (
            <li key={link.href}>
              <a
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "font-semibold text-white"
                    : "transition-colors hover:text-white"
                }
              >
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
