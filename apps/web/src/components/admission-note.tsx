"use client";

import { useSyncExternalStore } from "react";
import { admissions, admissionSession } from "@/content/school";

/** The session holds steady for as long as a visitor has the page open. */
const subscribe = () => () => {};

/**
 * A build freezes whichever session was current when it ran, so the session is
 * read from the browser and stays right however long the exported files serve
 * for. Hydration starts from the value the page was built with, which is what
 * the served markup already shows.
 */
export function AdmissionNote({ buildSession }: { buildSession: string }) {
  const session = useSyncExternalStore(
    subscribe,
    admissionSession,
    () => buildSession,
  );

  return <>{`${admissions.label} ${session}`}</>;
}
