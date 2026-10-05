import { Hero } from "@/components/sections/hero";
// import { Stats } from "@/components/sections/stats";
import { About } from "@/components/sections/about";
import { Classes } from "@/components/sections/classes";
import { Techniques } from "@/components/sections/techniques";
import { Leadership } from "@/components/sections/leadership";
import { LearningAreas } from "@/components/sections/learning-areas";
import { Features } from "@/components/sections/features";
import { Moments } from "@/components/sections/moments";
import { Visit } from "@/components/sections/visit";

/**
 * Ordered the way a parent asks: which classes, then how they are taught, then
 * who runs the school. Leadership carries the only portraits, so it also gives
 * the eye a rest between the two longest reading sections. The photographs sit
 * last, so the page reaches the invitation to visit having just shown what
 * there is to come and see.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      {/* Held back until the school confirms the counts are ones it wants
          published. The section itself is left in place, so it returns by
          uncommenting this and the import above, together with the student
          count in the structured data in layout.tsx. */}
      {/* <Stats /> */}
      <About />
      <Classes />
      <Techniques />
      <Leadership />
      <LearningAreas />
      <Features />
      <Moments />
      <Visit />
    </>
  );
}
