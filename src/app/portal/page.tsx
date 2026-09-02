import { redirect } from "next/navigation";

import { resolvePortalDestination } from "@/lib/auth/portal-routing";
import { getAuthenticatedActor } from "@/lib/auth/session";

export default async function PortalPage() {
  const actor = await getAuthenticatedActor();

  if (!actor) {
    redirect("/");
  }

  const destination = resolvePortalDestination(actor.roles);
  redirect(destination ?? "/");
}
