import type { Metadata } from "next";
import { Check, Mail, Phone } from "lucide-react";
import { WhatsappIcon } from "@walnut/ui";
import { Section } from "@/components/section";
import { careers, contact, school, siteUrl, vacancy } from "@/content/school";

export const metadata: Metadata = {
  title: vacancy.active ? `${vacancy.title} wanted` : "Teaching jobs",
  description: vacancy.active
    ? `${school.name} in ${school.locality} is looking for a ${vacancy.title.toLowerCase()}. Applications by email or WhatsApp.`
    : `Teaching positions at ${school.name}, an English medium school in ${school.locality} teaching Play Group to Class 5. Send a CV by email or on WhatsApp.`,
  alternates: { canonical: "/careers" },
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Built from the parts of the date rather than through `Date`, which reads an
 * ISO date as midnight UTC and would print the day before in any timezone
 * behind it. A build machine's zone is not worth trusting for this.
 */
function readableDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/**
 * Only emitted while a post is genuinely open. A JobPosting describes a real
 * vacancy with a closing date, so a standing invitation must not carry one.
 *
 * No `applicantLocationRequirements`: that says where a remote applicant may
 * live, and this post is taught in a classroom. `jobLocation` alone is what an
 * on-site role carries.
 */
const jobPosting = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: vacancy.title,
  description: `<p>${vacancy.summary}</p><p>${careers.intro}</p>`,
  datePosted: vacancy.datePosted,
  validThrough: vacancy.validThrough,
  employmentType: vacancy.employmentType,
  totalJobOpenings: vacancy.openings,
  hiringOrganization: {
    "@type": "School",
    name: school.name,
    sameAs: siteUrl,
  },
  jobLocation: {
    "@type": "Place",
    address: { "@type": "PostalAddress", ...contact.postalAddress },
  },
};

const mailHref = `mailto:${contact.email}?subject=${encodeURIComponent(
  vacancy.active ? `Application: ${vacancy.title}` : careers.mailSubject,
)}`;

const whatsappHref = `${contact.whatsappHref}?text=${encodeURIComponent(
  careers.whatsappMessage,
)}`;

export default function CareersPage() {
  return (
    <>
      {vacancy.active ? (
        <script
          type="application/ld+json"
          // The payload is built above from the content file, not from anything
          // a visitor can reach.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting) }}
        />
      ) : null}

      <Section
        eyebrow="Work with us"
        title={careers.title}
        titleAs="h1"
        // With a post open the panel below leads instead, so that someone who
        // arrived from a job search meets the post rather than the school.
        intro={vacancy.active ? undefined : careers.intro}
      >
        {vacancy.active ? (
          <>
            <div className="rounded-3xl bg-navy-soft p-6 sm:p-7">
              <p className="font-heading text-sm font-bold tracking-[0.14em] text-navy-deep uppercase">
                Open now
              </p>
              <h2 className="mt-2 font-heading text-2xl font-extrabold">
                {vacancy.title}
              </h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-ink">
                {vacancy.summary}
              </p>
              <p className="mt-4 text-sm text-ink-soft">
                Full time ·{" "}
                <span className="font-semibold text-navy-deep">
                  Applications close {readableDate(vacancy.validThrough)}
                </span>
              </p>
            </div>
            <p className="mt-8 max-w-3xl text-lg text-ink-soft">
              {careers.intro}
            </p>
          </>
        ) : (
          <p className="max-w-3xl font-heading text-lg font-bold text-navy-deep">
            {careers.openTo}
          </p>
        )}

        <h2 className="mt-10 font-heading text-xl font-extrabold">
          {careers.sendHeading}
        </h2>
        <ul className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-2">
          {careers.send.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <Check className="mt-1 h-5 w-5 shrink-0 text-navy" aria-hidden />
              <span className="text-ink">{item}</span>
            </li>
          ))}
        </ul>

        {vacancy.active ? (
          <p className="mt-8 max-w-3xl text-ink-soft">{careers.openTo}</p>
        ) : null}
      </Section>

      <Section
        tone="navy"
        title={careers.channelHeading}
        intro={careers.channelNote}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={mailHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 font-heading font-bold text-navy-deep transition-transform hover:scale-[1.02]"
          >
            <Mail className="h-5 w-5" aria-hidden />
            Email your CV
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-heading font-bold text-navy-deep transition-transform hover:scale-[1.02]"
          >
            <WhatsappIcon className="h-5 w-5" />
            Send it on WhatsApp
          </a>
        </div>

        {/* Written out as well as linked: a mailto opens nothing on a phone with
            no mail app set up, and the address is what someone copies then. */}
        <dl className="mt-8 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <dt className="flex items-center">
              <Mail className="h-4 w-4 shrink-0 text-gold" aria-hidden />
              <span className="sr-only">Email</span>
            </dt>
            <dd className="font-semibold text-white">{contact.email}</dd>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <dt className="flex items-center">
              <Phone className="h-4 w-4 shrink-0 text-gold" aria-hidden />
              <span className="sr-only">Phone</span>
            </dt>
            <dd>
              <a
                href={contact.phoneHref}
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                {contact.phoneDisplay}
              </a>
            </dd>
          </div>
        </dl>

        <p className="mt-8 max-w-2xl text-white/75">{careers.close}</p>
      </Section>
    </>
  );
}
