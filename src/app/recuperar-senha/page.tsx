import Image from "next/image";

import { PasswordResetForm, PasswordResetRequestForm } from "@/components/auth/password-reset-forms";

type PasswordResetPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

const readToken = (value: string | string[] | undefined): string =>
  typeof value === "string" ? value.slice(0, 100) : "";

export default async function PasswordResetPage({ searchParams }: PasswordResetPageProps) {
  const params = await searchParams;
  const token = readToken(params.token);
  const hasToken = token.length > 0;

  return (
    <main className="login-page password-reset-page">
      <div className="login-ambient" aria-hidden="true"><span className="ambient-grid" /><span className="ambient-ring ambient-ring--large" /><span className="ambient-ring ambient-ring--small" /><span className="ambient-line" /></div>
      <div className="login-shell">
        <section className="brand-panel" aria-labelledby="reset-page-title">
          <div className="brand-lockup"><div className="brand-logo-canvas"><Image className="brand-logo-image" src="/brand/ggp-logo-white-blue.png" alt="Grupo Gomes Pires" fill sizes="(max-width: 56rem) 220px, 284px" priority /></div></div>
          <p className="brand-kicker">Acesso interno</p>
          <h1 id="reset-page-title">Recupere seu acesso<span aria-hidden="true">.</span></h1>
          <p className="brand-description">Crie uma nova senha para voltar ao portal de desenvolvimento da GGP.</p>
        </section>
        <section className="login-card password-card" aria-labelledby="reset-title">
          <header className="login-card-header"><div className="access-label"><span className="access-label__mark" aria-hidden="true" /> Segurança da conta</div><h2 id="reset-title">{hasToken ? "Crie uma nova senha" : "Esqueci minha senha"}</h2><p>{hasToken ? "Escolha uma senha pessoal para continuar." : "Informe seu e-mail ou identificador para receber as instruções."}</p></header>
          {hasToken ? <PasswordResetForm token={token} /> : <PasswordResetRequestForm />}
        </section>
      </div>
    </main>
  );
}
