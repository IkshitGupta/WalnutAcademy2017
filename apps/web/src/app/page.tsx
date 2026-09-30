import { Hero } from "@/components/sections/hero";
import { Stats } from "@/components/sections/stats";
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
      <Stats />
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
