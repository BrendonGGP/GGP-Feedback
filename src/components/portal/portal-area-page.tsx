import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import {
  canAccessPortalArea,
  resolvePortalDestination,
} from "@/lib/auth/portal-routing";
import { getAuthenticatedActor } from "@/lib/auth/session";
import type { AccessRole } from "@/lib/authorization/access-control";

type PortalAreaPageProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  requiredRole: AccessRole;
}>;

export async function PortalAreaPage({
  eyebrow,
  title,
  description,
  requiredRole,
}: PortalAreaPageProps) {
  const actor = await getAuthenticatedActor();

  if (!actor) {
    redirect("/");
  }

  if (!canAccessPortalArea(actor.roles, requiredRole)) {
    const destination = resolvePortalDestination(actor.roles);
    redirect(destination ?? "/");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="portal-placeholder">
      <section className="portal-placeholder__card" aria-labelledby="portal-title">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="portal-title">{title}</h1>
        <p>{description}</p>
        <p>
          A estrutura de acesso está protegida. O conteúdo e o visual definitivo
          desta área serão construídos após a validação das referências de tela.
        </p>
        <form action={handleSignOut}>
          <button className="portal-sign-out" type="submit">
            Encerrar sessão
          </button>
        </form>
      </section>
    </main>
  );
}
