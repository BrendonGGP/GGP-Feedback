import { redirect } from "next/navigation";

import { LoginExperience } from "@/components/auth/login-experience";
import { resolvePortalDestination } from "@/lib/auth/portal-routing";
import { getAuthenticatedActor } from "@/lib/auth/session";

export default async function Home() {
  const actor = await getAuthenticatedActor({ allowPasswordChange: true });

  if (actor?.mustChangePassword) {
    redirect("/portal/alterar-senha");
  }

  const destination = actor
    ? resolvePortalDestination(actor.roles)
    : null;

  if (destination) {
    redirect(destination);
  }

  return <LoginExperience />;
}
