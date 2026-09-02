import Image from "next/image";

import { LoginForm } from "@/components/auth/login-form";

export default function Home() {
  return (
    <main className="login-page">
      <div className="decorative-orbit decorative-orbit--one" aria-hidden="true" />
      <div className="decorative-orbit decorative-orbit--two" aria-hidden="true" />
      <div className="decorative-orbit decorative-orbit--three" aria-hidden="true" />
      <div className="decorative-bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="login-grid">
        <section className="login-intro" aria-labelledby="page-title">
          <Image
            className="brand-logo"
            src="/brand/ggp-logo-white-blue.png"
            alt="Grupo Gomes Pires"
            width={4800}
            height={4800}
            priority
          />
          <p className="intro-kicker">Portal interno</p>
          <h1 id="page-title">Bem-vindo.</h1>
          <span className="intro-rule" aria-hidden="true" />
          <p className="intro-copy">
            O ponto de encontro do nosso ecossistema: comunicados, documentos e
            chamados, sempre em um só lugar.
          </p>
          <a className="intro-link" href="#login-card">
            Acessar o portal <span aria-hidden="true">→</span>
          </a>
        </section>

        <section className="login-card" id="login-card" aria-labelledby="login-title">
          <div className="card-label">
            <span className="card-label__dot" aria-hidden="true" />
            Ambiente protegido
          </div>
          <h2 id="login-title">Acesso ao Portal</h2>
          <p className="card-copy">
            Entre com suas credenciais corporativas para continuar.
          </p>
          <LoginForm />
          <p className="login-note">
            O acesso é destinado exclusivamente à equipe GGP.
          </p>
        </section>
      </div>

      <p className="login-footer">Grupo Gomes Pires <span aria-hidden="true">•</span> Acesso interno</p>
    </main>
  );
}
