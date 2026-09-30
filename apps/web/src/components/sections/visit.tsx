import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { WhatsappIcon } from "@walnut/ui";
import { Section } from "@/components/section";
import { AdmissionNote } from "@/components/admission-note";
import { panelOnNavy } from "@/components/ui";
import { admissionSession, contact } from "@/content/school";

export function Visit() {
  const session = admissionSession();

  return (
    <Section
      id="visit"
      tone="navy"
      eyebrow="Visit us"
      title="Come and see the school"
      intro="A school is best judged by walking through it. Call ahead and we will show you around."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calling is the action nearly every visitor wants, so it leads the
            section on every screen and carries the only filled button here. */}
        <div className={`${panelOnNavy} flex flex-col`}>
          <h3 className="font-heading text-lg font-extrabold text-white">
            Talk to us
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            The quickest answer comes from a phone call. We are happy to show
            you around during office hours.
          </p>

          <p className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-gold/15 px-4 py-2 text-sm font-semibold text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
            <AdmissionNote buildSession={session} />
          </p>

          <a
            href={contact.phoneHref}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-4 font-heading text-lg font-bold text-navy-deep transition-transform hover:scale-[1.02]"
          >
            <Phone className="h-5 w-5" aria-hidden />
            {contact.phoneDisplay}
          </a>

          <a
            href={contact.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-heading font-bold text-navy-deep transition-transform hover:scale-[1.02]"
          >
            <WhatsappIcon className="h-5 w-5" />
            Message on WhatsApp
          </a>

          {/* An ordinary link: as a full-width button the address broke
              mid-word at narrow widths. */}
          <p className="mt-auto flex flex-wrap items-center gap-2 pt-5 text-sm text-white/60">
            <Mail className="h-4 w-4 shrink-0 text-gold" aria-hidden />
            <a
              href={`mailto:${contact.email}`}
              className="text-white/85 underline underline-offset-4 hover:text-white"
            >
              {contact.email}
            </a>
          </p>
        </div>

        <div className={`${panelOnNavy} flex flex-col`}>
          <h3 className="flex items-center gap-3 font-heading text-lg font-extrabold text-white">
            <MapPin className="h-5 w-5 text-gold" aria-hidden />
            Where we are
          </h3>
          {/* The landmark leads: addresses here are navigated by what a place
              sits behind, not by postal code. */}
          <address className="mt-4 not-italic">
            <span className="block font-heading text-lg font-bold text-white">
              {contact.landmark}
            </span>
            <span className="mt-2 block leading-relaxed text-white/75">
              {contact.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
          </address>

          <dl className="mt-6 divide-y divide-white/10 border-y border-white/10">
            {contact.hours.map((slot) => (
              <div key={slot.label} className="flex justify-between py-3">
                <dt className="flex items-center gap-2 text-white/60">
                  <Clock className="h-4 w-4 text-gold" aria-hidden />
                  {slot.label}
                </dt>
                <dd className="font-heading font-bold text-white">
                  {slot.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-white/60">{contact.hoursNote}</p>

          <a
            href={contact.mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 px-6 py-3 font-heading font-bold text-white transition-colors hover:bg-white/10"
          >
            <Navigation className="h-5 w-5" aria-hidden />
            Get Directions
          </a>
        </div>
      </div>
    </Section>
  );
}
