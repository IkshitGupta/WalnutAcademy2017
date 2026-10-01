import type { Metadata } from "next";
import { Check, Mail, Phone } from "lucide-react";
import { WhatsappIcon } from "@walnut/ui";
import { OpenPost } from "@/components/open-post";
import { Section } from "@/components/section";
import {
  careers,
  contact,
  school,
  siteUrl,
  vacancy,
  vacancyClosesAt,
  vacancyOpen,
} from "@/content/school";

// Exported files carry whatever was true when they were written, and nothing
// here can correct itself afterwards, so none of it names the open post. The
// claim that a post is open is made where the format can also say when it
// stops being true: in the JobPosting below, through `validThrough`, and on
// the page itself, which reads the closing date from the visitor's clock.
const pageTitle = "Teaching jobs";

const pageDescription = `Teaching positions at ${school.name}, an English medium school in ${school.locality} teaching Play Group to Class 5. Send a CV by email or on WhatsApp.`;

// A job reaches most people as a link pasted into a message, where the preview
// is all there is to read. Next replaces these wholesale rather than merging
// them, so the parts worth keeping from the site defaults are repeated here.
const share = {
  title: `${pageTitle} · ${school.name}`,
  description: pageDescription,
  images: [
    {
      url: "/images/share.jpg",
      width: 1200,
      height: 630,
      alt: `The ${school.name} building in ${school.locality}`,
    },
  ],
};

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/careers" },
  openGraph: {
    ...share,
    type: "website",
    locale: "en_IN",
    siteName: school.name,
    url: "/careers",
  },
  twitter: { ...share, card: "summary_large_image" },
};

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
  validThrough: vacancyClosesAt,
  employmentType: vacancy.employmentType,
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
  careers.mailSubject,
)}`;

const whatsappHref = `${contact.whatsappHref}?text=${encodeURIComponent(
  careers.whatsappMessage,
)}`;

export default function CareersPage() {
  return (
    <>
      {vacancy.active ? (
        <>
          <script
            type="application/ld+json"
            // The payload is built above from the content file, not from anything
            // a visitor can reach.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting) }}
          />
          <script
            // Read before anything is painted. The panel below is taken away
            // again once the page comes alive, which on a phone is a second or
            // more after the reader is already looking at it, and long enough
            // for them to have started reading a post that closed.
            dangerouslySetInnerHTML={{
              __html: `if(Date.now()>=${new Date(vacancyClosesAt).getTime()})document.documentElement.dataset.postClosed=""`,
            }}
          />
        </>
      ) : null}

      <Section eyebrow="Work with us" title={careers.title} titleAs="h1">
        {/* One arrangement, whichever state the post is in, so a page that
            outlives its own closing date still reads as it was drawn. The post
            leads, because someone who arrived from a job search on a phone has
            one screenful before they decide to stay. */}
        <OpenPost builtOpen={vacancyOpen()} />

        <p className="max-w-3xl text-lg text-ink-soft">{careers.intro}</p>

        <p className="mt-6 max-w-3xl font-heading text-lg font-bold text-navy-deep">
          {careers.openTo}
        </p>

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
      </Section>

      <Section
        id="apply"
        tone="navy"
        title={careers.channelHeading}
        intro={careers.channelNote}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={mailHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 font-heading font-bold text-navy-deep transition-transform hover:scale-[1.02] active:brightness-90"
          >
            <Mail className="h-5 w-5" aria-hidden />
            Email your CV
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-heading font-bold text-navy-deep transition-transform hover:scale-[1.02] active:brightness-90"
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
            <dd className="[overflow-wrap:anywhere] font-semibold text-white">
              {contact.email}
            </dd>
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
