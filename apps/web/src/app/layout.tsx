import type { Metadata } from "next";
import { Inter, Nunito } from "next/font/google";
import { AnnouncementBar } from "@/components/announcement-bar";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MobileActionBar } from "@/components/mobile-action-bar";
import { contact, school, siteUrl, social, stats } from "@/content/school";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const description = `${school.name} is an English medium school in ${school.locality}, teaching children from Play Group to Class 5 through activity-based, play-way learning. Established ${school.established}.`;

// Most people meet a link to this site pasted into a message rather than in a
// search result, where the picture is most of what they see before deciding
// whether to open it.
const shareImage = {
  url: "/images/share.jpg",
  width: 1200,
  height: 630,
  alt: `The ${school.name} building in ${school.locality}`,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${school.name} · English Medium School in ${school.locality}`,
    template: `%s · ${school.name}`,
  },
  description,
  keywords: [
    "school in Mansarovar Jaipur",
    "English medium school Jaipur",
    "play group Mansarovar",
    "nursery admission Mansarovar",
    "primary school Mansarovar Jaipur",
    "Walnut Academy",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: school.name,
    title: `${school.name} · ${school.tagline}`,
    description,
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${school.name} · ${school.tagline}`,
    description,
    images: [shareImage],
  },
  alternates: { canonical: "/" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "School",
  name: school.name,
  slogan: school.tagline,
  description,
  url: siteUrl,
  foundingDate: String(school.established),
  telephone: contact.phoneDisplay,
  email: contact.email,
  address: { "@type": "PostalAddress", ...contact.postalAddress },
  geo: { "@type": "GeoCoordinates", ...contact.geo },
  areaServed: { "@type": "City", name: "Jaipur" },
  numberOfStudents: stats.find((stat) => stat.label === "Students")?.value,
  parentOrganization: { "@type": "Organization", name: school.society },
  sameAs: social.map((profile) => profile.href),
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [...contact.openingHours.days],
    opens: contact.openingHours.opens,
    closes: contact.openingHours.closes,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-IN"
      className={`${nunito.variable} ${inter.variable} h-full antialiased`}
      // Browser extensions commonly inject attributes onto these two elements
      // before React hydrates, which reports as a mismatch the app cannot fix.
      // Suppression applies only to this element's own attributes, so genuine
      // mismatches anywhere inside the app are still reported.
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col pb-[3.5rem] lg:pb-0 print:pb-0"
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <SiteHeader announcement={<AnnouncementBar />} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <MobileActionBar />
      </body>
    </html>
  );
}
