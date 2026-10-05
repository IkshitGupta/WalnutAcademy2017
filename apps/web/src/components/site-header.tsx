"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Menu, Phone, X } from "lucide-react";
import { usePathname } from "next/navigation";
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
  const onCareers = usePathname()?.startsWith("/careers") ?? false;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const panelRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);

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

  // Watching the sections of the page this header was rendered with. Moving
  // between pages loads a document, so this never outlives them.
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

    // What the menu covers is put out of reach as well as out of the light, so
    // moving through the page by keyboard or by screen reader stays within what
    // opening the menu put on screen. The header is left out of this, which is
    // what keeps the control that closes the menu available.
    const covered = [...document.body.children].filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        el !== headerRef.current &&
        el !== scrimRef.current,
    );
    covered.forEach((el) => {
      el.inert = true;
    });

    // Focus moves to the first thing in the panel, so a keyboard reader is
    // taken to what opening it produced. The reader keeps the place they
    // opened it from, which holds wherever the room for the header is
    // reserved.
    panelRef.current
      ?.querySelector<HTMLElement>("a[href], button:not([disabled])")
      ?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;

      // The control that opened the panel also closes it, and it sits in the
      // header rather than in the panel, so the loop has to take it in or
      // there is no way back to it without leaving the menu.
      const within = panelRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      const focusable = [
        ...(opener ? [opener] : []),
        ...Array.from(within ?? []),
      ];
      if (focusable.length === 0) return;

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
      covered.forEach((el) => {
        el.inert = false;
      });
      document.body.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, [open, close]);

  return (
    <>
      <header
        ref={headerRef}
        className={`sticky top-0 bg-cream/95 backdrop-blur transition-shadow ${
          open ? "z-50" : "z-40"
        } ${
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
          className={`mx-auto flex max-w-6xl items-center gap-3 px-4 transition-[height] duration-200 sm:px-6 xl:gap-2 ${
            scrolled ? "h-14 lg:h-16" : "h-[4.25rem] lg:h-20"
          }`}
        >
          <a
            href="/#top"
            className="flex min-w-0 items-center gap-3 lg:shrink-0"
          >
            <Crest
              className={`w-auto shrink-0 transition-[height] duration-200 ${
                scrolled ? "h-9 lg:h-10" : "h-10 lg:h-12 xl:h-14"
              }`}
            />
            {/* The name gives up its room before the menu button does, but only
                where the two compete. Keeping the button wide enough to press
                matters more than showing the name whole, at the point where
                text has been enlarged far enough that both cannot fit. Wide
                enough for both, the name stays whole. */}
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-heading text-lg font-extrabold tracking-tight whitespace-nowrap text-navy-deep sm:text-xl">
                {school.name}
              </span>
              {scrolled ? null : (
                <span className="block truncate text-[11px] font-medium tracking-wide whitespace-nowrap text-ink-soft sm:text-xs">
                  {school.descriptor}
                </span>
              )}
            </span>
          </a>

          <nav
            aria-label="Primary"
            className="ml-auto hidden shrink-0 items-center gap-0.5 lg:flex"
          >
            {navLinks.map((link) => {
              const current = active === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "location" : undefined}
                  className={`group relative px-2 py-2 text-sm font-semibold whitespace-nowrap transition-colors xl:px-2.5 ${
                    current ? "text-navy-deep" : "text-ink hover:text-navy-deep"
                  }`}
                >
                  {link.label}
                  {/* Navy rather than gold: gold is reserved for the action. */}
                  <span
                    aria-hidden
                    className={`absolute inset-x-2 bottom-0.5 h-0.5 rounded-full transition-opacity xl:inset-x-2.5 ${
                      current
                        ? "bg-navy-deep opacity-100"
                        : "bg-navy/30 opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </a>
              );
            })}
          </nav>

          {/* Ruled off from the navigation, so the bar reads as three things
              rather than one long row: where to go, where else to find the
              school, and how to reach it. Held back until there is width to
              spare, since the footer carries the same two links and the
              navigation and the phone number earn the room first. */}
          <ul className="ml-2 hidden shrink-0 items-center gap-1 border-l border-navy/15 pl-2 xl:flex">
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

          {/* "Call Now" at every desktop width. The row is capped at the page's
              own width and so stops growing at 1280, where the navigation, the
              profiles and this button all reach their full size at once; the
              number was being fitted into room that never arrives. It is kept
              for anyone reading the page aloud, and the Visit panel, the footer
              and the bar pinned to a phone all carry it in full. */}
          <a
            href={contact.phoneHref}
            className="hidden shrink-0 items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold whitespace-nowrap text-navy-deep transition-transform hover:scale-[1.03] lg:ml-2 lg:inline-flex"
          >
            <Phone className="h-4 w-4" aria-hidden />
            Call Now <span className="sr-only">{contact.phoneDisplay}</span>
          </a>

          <button
            ref={openerRef}
            type="button"
            onClick={() => setOpen((wasOpen) => !wasOpen)}
            className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-navy-deep hover:bg-navy-soft active:bg-navy-soft lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? (
              <X className="h-6 w-6" aria-hidden />
            ) : (
              <Menu className="h-6 w-6" aria-hidden />
            )}
          </button>
        </div>

        {/* Held inside the header rather than placed below it, so it follows
            the header as that compacts instead of being told where the bottom
            edge is. */}
        {open ? (
          <nav
            id="mobile-menu"
            ref={panelRef}
            aria-label="Menu"
            className="absolute inset-x-0 top-full max-h-[80svh] overflow-y-auto overscroll-contain rounded-b-3xl border-t border-navy/10 bg-cream px-4 pt-3 pb-5 shadow-[0_18px_40px_rgb(30_47_92/0.22)] sm:px-6 lg:hidden"
          >
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className="rounded-2xl bg-navy-soft px-3 py-3.5 text-center font-heading text-base font-bold text-navy-deep active:brightness-95"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/careers/"
                onClick={close}
                aria-current={onCareers ? "page" : undefined}
                className={`col-span-2 rounded-2xl bg-navy-soft px-3 py-3.5 text-center font-heading text-base font-bold text-navy-deep active:brightness-95 ${
                  onCareers ? "ring-2 ring-navy-deep" : ""
                }`}
              >
                Teaching jobs
              </a>
            </div>

            <a
              href={contact.phoneHref}
              onClick={close}
              className="mt-3 flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 font-heading font-bold text-navy-deep active:brightness-90"
            >
              <Phone className="h-5 w-5 shrink-0" aria-hidden />
              Call {contact.phoneDisplay}
            </a>

            <ul className="mt-4 flex justify-center gap-4">
              {social.map((profile) => (
                <li key={profile.href}>
                  <a
                    href={profile.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${school.name} on ${profile.label}`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-navy-deep ring-1 ring-navy/15 active:bg-navy-soft"
                  >
                    <SocialIcon name={profile.icon} className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      {/* Dims the page without reaching the header, so the control that opened
          the menu stays lit and in place for the press that closes it. */}
      {open ? (
        <div
          ref={scrimRef}
          onClick={close}
          aria-hidden
          className="fixed inset-0 z-[45] bg-navy-deep/45 lg:hidden"
        />
      ) : null}
    </>
  );
}
