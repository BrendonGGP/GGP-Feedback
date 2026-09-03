import Image from "next/image";
import { redirect } from "next/navigation";

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
    <main className="login-page password-change-page">
      <div className="login-ambient" aria-hidden="true">
        <span className="ambient-grid" />
        <span className="ambient-ring ambient-ring--large" />
        <span className="ambient-ring ambient-ring--small" />
        <span className="ambient-line" />
      </div>

      <div className="login-shell">
        <section className="brand-panel" aria-labelledby="password-page-title">
          <div className="brand-lockup">
            <div className="brand-logo-canvas">
              <Image
                className="brand-logo-image"
                src="/brand/ggp-logo-white-blue.png"
                alt="Grupo Gomes Pires"
                fill
                sizes="(max-width: 56rem) 220px, 284px"
                priority
              />
            </div>
          </div>
          <p className="brand-kicker">Primeiro acesso</p>
          <h1 id="password-page-title">
            Proteja seu acesso<span aria-hidden="true">.</span>
          </h1>
          <p className="brand-description">
            Defina uma senha pessoal para continuar no portal de desenvolvimento
            da GGP.
          </p>
        </section>

        <section className="login-card password-card" aria-labelledby="password-title">
          <header className="login-card-header">
            <div className="access-label">
              <span className="access-label__mark" aria-hidden="true" />
              Atualização obrigatória
            </div>
            <h2 id="password-title">Crie sua senha</h2>
            <p>
              Esta etapa é necessária antes de acessar as áreas do portal.
            </p>
          </header>

          <PasswordChangeForm />

          <footer className="login-card-footer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 10V8a5 5 0 0 1 10 0v2" />
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M12 14v2" />
            </svg>
            <span>A senha será protegida e as sessões anteriores serão encerradas.</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
