import { Crest, Mascot } from "@walnut/ui";
import { SocialIcon } from "@/components/social-icon";
import { contact, navLinks, school, social } from "@/content/school";

const columnHeading =
  "font-heading text-sm font-bold tracking-wide text-white uppercase";

/**
 * Contact details repeat the Visit section immediately above, because the foot
 * of a page is where a reader looks for them and where search engines read
 * them. They stay as plain lines so the page does not close on a second copy
 * of that panel.
 */
export function SiteFooter() {
  return (
    <footer className="bg-navy-deep text-white/80">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_auto_auto] lg:gap-12">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <Crest className="h-14 w-auto shrink-0" title={null} />
              <span className="font-heading text-xl font-extrabold text-white">
                {school.name}
              </span>
            </div>
            <p className="mt-5 font-heading text-base font-bold text-gold">
              {school.tagline}
            </p>
            <p className="mt-1.5 text-sm">{school.secondaryTagline}</p>

            <ul className="mt-6 flex gap-3">
              {social.map((profile) => (
                <li key={profile.href}>
                  <a
                    href={profile.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${school.name} on ${profile.label}`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-white/25 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <SocialIcon name={profile.icon} className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={columnHeading}>Contact</h2>
            <address className="mt-4 space-y-3 text-sm not-italic">
              <span className="block leading-relaxed">
                {contact.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
              <a
                href={contact.phoneHref}
                className="block font-heading font-bold text-white transition-colors hover:text-gold"
              >
                {contact.phoneDisplay}
              </a>
              <a
                href={`mailto:${contact.email}`}
                className="block break-words transition-colors hover:text-white"
              >
                {contact.email}
              </a>
            </address>
          </div>

          <nav aria-label="Footer">
            <h2 className={columnHeading}>Explore</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-10 gap-y-2.5 text-sm">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* The page closes on the mascot rather than on small print. */}
          <Mascot className="hidden h-32 w-32 shrink-0 self-end sm:block sm:justify-self-end" />
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/60 sm:flex-row sm:items-end sm:justify-between">
          <p className="leading-relaxed">
            Organised by {school.society}
            <span className="block">
              {school.recognition} · {school.recognitionNo}
            </span>
          </p>
          <p>
            {/* No current year: this is a static export, so a build-time year
                would freeze and go stale until someone happens to rebuild. */}
            © {school.name} · Established {school.established}
          </p>
        </div>
      </div>
    </footer>
  );
}
