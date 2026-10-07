import { redirect } from "next/navigation";

import { TelaEntrada } from "@/components/auth/entrada/tela-entrada";
import { PasswordChangeForm } from "@/components/auth/password-change-form";
import { resolvePortalDestination } from "@/lib/auth/portal-routing";
import { getAuthenticatedActor } from "@/lib/auth/session";

export default async function ChangePasswordPage() {
  const actor = await getAuthenticatedActor({ allowPasswordChange: true });

  if (!actor) {
    redirect("/");
  }

  if (!actor.mustChangePassword) {
    redirect(resolvePortalDestination(actor.roles) ?? "/");
  }

  return (
    <TelaEntrada>
      <PasswordChangeForm />
    </TelaEntrada>
  );
}
