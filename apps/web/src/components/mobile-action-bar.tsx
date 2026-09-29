import { MessageCircle, Phone } from "lucide-react";
import { contact } from "@/content/school";

/**
 * Persistent call and WhatsApp actions. Most visitors arrive on a phone from a
 * local search, and calling is the action nearly all of them want.
 */
export function MobileActionBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-px border-t border-navy/10 bg-navy/10 lg:hidden">
      {/* Calling is the action nearly all of them want, so it takes two thirds
          of the bar and the only filled treatment. */}
      <a
        href={contact.phoneHref}
        className="col-span-2 flex items-center justify-center gap-2 bg-gold py-4 text-sm font-bold text-navy-deep"
      >
        <Phone className="h-5 w-5" aria-hidden />
        Call the school
      </a>
      <a
        href={contact.whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-whatsapp py-4 text-sm font-bold text-navy-deep"
      >
        <MessageCircle className="h-5 w-5" aria-hidden />
        WhatsApp
      </a>
    </div>
  );
}
