import { BookOpen, Clock, GraduationCap, MapPin } from "lucide-react";
import { Mascot } from "@walnut/ui";
import { quickFacts, school, stripe } from "@/content/school";

const icons = {
  classes: GraduationCap,
  language: BookOpen,
  clock: Clock,
  pin: MapPin,
} as const;

export function Hero() {
  return (
    <section id="top" className="bg-navy-deep">
      {/* The photograph opens the page directly beneath the header. Neither
          axis can be cropped. The facade reaches both edges of the frame and
          its signage runs from the roof board down to the boundary wall, so it
          is always shown whole and its height follows its width. From lg the
          frame is tall enough to carry the heading over it; below that the
          heading follows underneath, where it has room of its own. */}
      <div className="relative">
        <img
          src="/images/building-1920.webp"
          srcSet="/images/building-800.webp 800w, /images/building-1280.webp 1280w, /images/building-1920.webp 1920w, /images/building-2400.webp 2400w"
          sizes="100vw"
          alt="The Walnut Academy building in Mansarovar, Jaipur"
          width={2400}
          height={1350}
          fetchPriority="high"
          className="block w-full"
        />

        <div
          className="hero-veil pointer-events-none absolute inset-0 hidden lg:block"
          aria-hidden
        />

        {/* Only the name and the tagline sit over the photograph. The building
            carries its own signage and the header repeats the name and the
            descriptor, so anything further here would be read twice. Calling
            and WhatsApp live in the pinned chrome, on the bar on a phone and
            in the header on a desktop. That chrome is on screen here and stays
            on screen for the whole page. The stretch of facade between the roof
            board and the awning is clear of lettering, which is where this
            sits. */}
        <div className="relative z-10 px-4 pt-12 pb-14 text-center sm:px-6 sm:pt-14 sm:pb-16 lg:absolute lg:inset-x-0 lg:top-[28%] lg:py-0">
          <h1 className="hero-title text-4xl font-extrabold text-white sm:text-6xl lg:text-7xl">
            {school.name}
          </h1>
          <p className="hero-title mt-3 font-heading text-2xl font-bold text-white sm:text-3xl">
            {school.tagline}
          </p>
        </div>
      </div>

      {/* Lifted onto the frame rather than set below it, so the page has one
          place where something sits in front of something else. From lg only:
          below that the heading occupies the space this would overlap. */}
      <div className="relative bg-cream pt-6 pb-6 lg:pt-0">
        <div className="mx-auto flow-root max-w-6xl px-4 sm:px-6">
          <div className="relative lg:-mt-14">
            {/* Set behind the card so only its head and shoulders clear the
                edge, and mirrored so it looks in towards the facts rather than
                off the side of the page. */}
            <Mascot className="pointer-events-none absolute -top-15 right-3 h-22 w-22 -scale-x-100 sm:-top-16 sm:right-8 sm:h-24 sm:w-24" />
            <div className="relative z-10 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-navy/10">
              <div className="flex h-3" aria-hidden>
                {stripe.map((colour) => (
                  <span
                    key={colour}
                    className="flex-1"
                    style={{ backgroundColor: colour }}
                  />
                ))}
              </div>
              <ul className="grid gap-x-6 gap-y-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
                {quickFacts.map((fact) => {
                  const Icon = icons[fact.icon];
                  return (
                    <li
                      key={fact.label}
                      className="flex items-center justify-center gap-2"
                    >
                      <Icon
                        className="h-5 w-5 shrink-0 text-magenta-deep"
                        aria-hidden
                      />
                      <span className="font-heading text-sm font-bold text-navy-deep">
                        {fact.label}
                        {fact.detail ? (
                          <span className="block">{fact.detail}</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
