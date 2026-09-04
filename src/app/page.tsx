import { redirect } from "next/navigation";

import { LoginExperience } from "@/components/auth/login-experience";
import { resolvePortalHome } from "@/lib/auth/portal-routing";
import { getAuthenticatedActor } from "@/lib/auth/session";

export default async function Home() {
  const actor = await getAuthenticatedActor({ allowPasswordChange: true });

  if (actor?.mustChangePassword) {
    redirect("/portal/alterar-senha");
  }

  const destination = actor ? resolvePortalHome(actor.roles) : null;

  if (destination) {
    redirect(destination);
  }

  return <LoginExperience />;
}
