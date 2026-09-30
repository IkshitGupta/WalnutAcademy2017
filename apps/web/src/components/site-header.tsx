"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Menu, Phone, X } from "lucide-react";
import { Crest, WhatsappIcon } from "@walnut/ui";
import { SocialIcon } from "@/components/social-icon";
import { contact, navLinks, school, social } from "@/content/school";

const DESKTOP = "(min-width: 1024px)";

/**
 * Compacting shortens the header, and because it sits in the flow, the browser
 * corrects the scroll position to keep the content under it still. That
 * correction is larger than a single threshold's margin, so one threshold puts
 * the scroll position back on the other side of it and the header changes
 * height for as long as the page is left alone. Compacting and expanding at
 * different offsets keeps the correction well inside one state.
 */
const COMPACT_BELOW = 72;
const EXPAND_ABOVE = 24;

export function SiteHeader({ announcement }: { announcement?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onScroll = () =>
      setScrolled((was) =>
        was ? window.scrollY > EXPAND_ABOVE : window.scrollY > COMPACT_BELOW,
      );
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = navLinks
      .map(({ href }) => document.getElementById(href.split("#")[1]))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`/#${visible.target.id}`);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.6, 1] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Close if the viewport grows past the breakpoint, otherwise the panel is
  // hidden by CSS while the page stays locked and inert.
  useEffect(() => {
    const query = window.matchMedia(DESKTOP);
    const onChange = () => query.matches && close();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [close]);

  useEffect(() => {
    if (!open) return;

    const opener = openerRef.current;
    // Restore whatever was set inline rather than assuming it was empty.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [open, close]);

  return (
    <>
      <header
        className={`sticky top-0 z-40 bg-cream/95 backdrop-blur transition-shadow ${
          scrolled
            ? "shadow-[0_1px_0_rgba(48,72,144,0.10),0_6px_16px_-10px_rgba(30,47,92,0.45)]"
            : ""
        }`}
      >
        {announcement}
        {/* Compacts once the page moves: the descriptor and the full crest
            introduce the school, which is only worth the height before the
            visitor has started reading. */}
        <div
          className={`mx-auto flex max-w-6xl items-center gap-3 px-4 transition-[height] duration-200 sm:px-6 ${
            scrolled ? "h-14 lg:h-16" : "h-[4.25rem] lg:h-20"
          }`}
        >
          <Link href="/#top" className="flex shrink-0 items-center gap-3">
            <Crest
              className={`w-auto shrink-0 transition-[height] duration-200 ${
                scrolled ? "h-9 lg:h-10" : "h-10 lg:h-12 xl:h-14"
              }`}
            />
            <span className="leading-tight">
              <span className="block font-heading text-lg font-extrabold tracking-tight whitespace-nowrap text-navy-deep sm:text-xl">
                {school.name}
              </span>
              {scrolled ? null : (
                <span className="block text-[11px] font-medium tracking-wide whitespace-nowrap text-ink-soft sm:text-xs">
                  {school.descriptor}
                </span>
              )}
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="ml-auto hidden shrink-0 items-center gap-0.5 lg:flex"
          >
            {navLinks.map((link) => {
              const current = active === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "location" : undefined}
                  className={`group relative px-2.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors xl:px-3 ${
                    current ? "text-navy-deep" : "text-ink hover:text-navy-deep"
                  }`}
                >
                  {link.label}
                  {/* Navy rather than gold: gold is reserved for the action. */}
                  <span
                    aria-hidden
                    className={`absolute inset-x-2.5 bottom-0.5 h-0.5 rounded-full transition-opacity xl:inset-x-3 ${
                      current
                        ? "bg-navy-deep opacity-100"
                        : "bg-navy/30 opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Ruled off from the navigation, so the bar reads as three things
              rather than one long row: where to go, where else to find the
              school, and how to reach it. */}
          <ul className="ml-2 hidden shrink-0 items-center gap-1 border-l border-navy/15 pl-2 lg:flex">
            {social.map((profile) => (
              <li key={profile.href}>
                <a
                  href={profile.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${school.name} on ${profile.label}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-navy-soft hover:text-navy-deep"
                >
                  <SocialIcon
                    name={profile.icon}
                    className="h-[18px] w-[18px]"
                  />
                </a>
              </li>
            ))}
          </ul>

          <a
            href={contact.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Message the school on WhatsApp"
            className="ml-2 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-whatsapp text-navy-deep transition-transform hover:scale-[1.05] lg:inline-flex"
          >
            <WhatsappIcon className="h-5 w-5" />
          </a>

          <a
            href={contact.phoneHref}
            className="hidden shrink-0 items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold whitespace-nowrap text-navy-deep transition-transform hover:scale-[1.03] lg:ml-2 lg:inline-flex"
          >
            <Phone className="h-4 w-4" aria-hidden />
            <span className="hidden xl:inline">
              Call {contact.phoneDisplay}
            </span>
            <span className="xl:hidden">Call Now</span>
          </a>

          <button
            ref={openerRef}
            type="button"
            onClick={() => setOpen(true)}
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full text-navy-deep hover:bg-navy-soft lg:hidden"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </header>

      {/* Rendered outside the header on purpose: the header's backdrop-blur
          creates a containing block, which would scope this fixed overlay to
          the header strip instead of the viewport. */}
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-50 bg-cream lg:hidden"
        >
          <div className="flex h-[4.25rem] items-center justify-between px-4 sm:px-6">
            <span className="flex items-center gap-3">
              <Crest className="h-10 w-auto shrink-0" title={null} />
              <span className="font-heading text-lg font-extrabold text-navy-deep">
                {school.name}
              </span>
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-navy-deep hover:bg-navy-soft"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" aria-hidden />
            </button>
          </div>

          <nav className="flex flex-col gap-1 px-4 pt-4 sm:px-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="rounded-2xl px-4 py-4 font-heading text-xl font-bold text-navy-deep hover:bg-navy-soft"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/careers"
              onClick={close}
              className="rounded-2xl px-4 py-4 font-heading text-xl font-bold text-navy-deep hover:bg-navy-soft"
            >
              Teaching jobs
            </Link>
            <a
              href={contact.phoneHref}
              onClick={close}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-4 font-heading font-bold text-navy-deep"
            >
              <Phone className="h-5 w-5" aria-hidden />
              Call {contact.phoneDisplay}
            </a>

            <ul className="mt-6 flex justify-center gap-4">
              {social.map((profile) => (
                <li key={profile.href}>
                  <a
                    href={profile.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${school.name} on ${profile.label}`}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full text-navy-deep ring-1 ring-navy/15 hover:bg-navy-soft"
                  >
                    <SocialIcon name={profile.icon} className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </>
  );
}
