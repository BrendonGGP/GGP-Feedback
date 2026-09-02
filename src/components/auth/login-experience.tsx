"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import Image from "next/image";
import { useRef } from "react";

import { LoginForm } from "@/components/auth/login-form";

gsap.registerPlugin(useGSAP);

type MotionConditions = {
  isDesktop: boolean;
  reduceMotion: boolean;
};

export function LoginExperience() {
  const pageRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!pageRef.current) {
        return;
      }

      const media = gsap.matchMedia();

      media.add(
        {
          isDesktop: "(min-width: 56rem)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { isDesktop, reduceMotion } = context.conditions as MotionConditions;
          const animatedElements = "[data-entrance]";

          if (reduceMotion) {
            gsap.set(animatedElements, { clearProps: "all" });
            return;
          }

          const timeline = gsap.timeline({
            defaults: { ease: "power2.out" },
          });

          timeline
            .addLabel("intro", 0)
            .set(animatedElements, { willChange: "transform,opacity" }, "intro")
            .from(
              "[data-entrance='ambient']",
              { autoAlpha: 0, scale: 0.97, duration: 0.55 },
              "intro",
            )
            .from(
              "[data-entrance='brand']",
              { autoAlpha: 0, y: 10, duration: 0.34 },
              "intro+=0.04",
            )
            .from(
              "[data-entrance='copy']",
              { autoAlpha: 0, y: 12, duration: 0.36, stagger: 0.04 },
              "intro+=0.10",
            )
            .from(
              "[data-entrance='card']",
              {
                autoAlpha: 0,
                x: isDesktop ? 22 : 0,
                y: isDesktop ? 0 : 14,
                scale: 0.99,
                duration: 0.44,
              },
              "intro+=0.12",
            )
            .from(
              "[data-entrance='field']",
              { autoAlpha: 0, y: 8, duration: 0.28, stagger: 0.035 },
              "intro+=0.25",
            )
            .from(
              "[data-entrance='footer']",
              { autoAlpha: 0, y: 5, duration: 0.24 },
              "intro+=0.35",
            )
            .set(animatedElements, {
              clearProps: "transform,opacity,visibility,willChange",
            });

          return () => timeline.kill();
        },
        pageRef.current,
      );

      return () => media.revert();
    },
    { scope: pageRef },
  );

  return (
    <main ref={pageRef} className="login-page">
      <div className="login-ambient" data-entrance="ambient" aria-hidden="true">
        <span className="ambient-grid" />
        <span className="ambient-ring ambient-ring--large" />
        <span className="ambient-ring ambient-ring--small" />
        <span className="ambient-line" />
      </div>

      <div className="login-shell">
        <section className="brand-panel" aria-labelledby="page-title">
          <div className="brand-lockup" data-entrance="brand">
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

          <p className="brand-kicker" data-entrance="copy">
            Pessoas &amp; desenvolvimento
          </p>
          <h1 id="page-title" data-entrance="copy">
            Bem-vindo<span aria-hidden="true">.</span>
          </h1>
          <p className="brand-description" data-entrance="copy">
            Um espaço seguro para transformar conversas em desenvolvimento,
            reconhecer trajetórias e construir o próximo passo juntos.
          </p>

          <div className="brand-principles" data-entrance="copy" aria-label="Pilares do portal">
            <span>Feedback contínuo</span>
            <span>Desenvolvimento</span>
            <span>Confiança</span>
          </div>
        </section>

        <section className="login-card" id="login-card" aria-labelledby="login-title" data-entrance="card">
          <header className="login-card-header">
            <div className="access-label">
              <span className="access-label__mark" aria-hidden="true" />
              Acesso interno
            </div>
            <h2 id="login-title">Acesso ao Portal</h2>
            <p>Use suas credenciais corporativas para continuar.</p>
          </header>

          <LoginForm />

          <footer className="login-card-footer" data-entrance="footer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 10V8a5 5 0 0 1 10 0v2" />
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M12 14v2" />
            </svg>
            <span>Ambiente protegido e exclusivo para a equipe GGP.</span>
          </footer>
        </section>
      </div>

      <p className="page-signature" data-entrance="footer">
        GGP Feedback <span aria-hidden="true">/</span> Desenvolvimento que conecta
      </p>
    </main>
  );
}
