import { redirect } from "next/navigation";

import { resolvePortalHome } from "@/lib/auth/portal-routing";
import { getAuthenticatedActor } from "@/lib/auth/session";

export default async function PortalPage() {
  const actor = await getAuthenticatedActor({ allowPasswordChange: true });

  if (!actor) {
    redirect("/");
  }

  if (actor.mustChangePassword) {
    redirect("/portal/alterar-senha");
  }

  const destination = resolvePortalHome(actor.roles);
  redirect(destination ?? "/");
}
