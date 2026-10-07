"use client";

import { memo, useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { LogoGgp } from "@/components/portal/logo-ggp";

import { dotGrid } from "./dot-grid";
import "./entrada.css";

/**
 * Moldura da entrada (porte do GGPost): fundo de pontos interativo, logotipo,
 * título com o sublinhado que se desenha e o cartão. O conteúdo do cartão vem
 * de quem usa (login, troca obrigatória de senha).
 */
export function TelaEntrada({ children }: Readonly<{ children: ReactNode }>) {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = raiz.current?.querySelector<HTMLCanvasElement>("canvas.dots");
    if (!canvas) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const escuro = document.documentElement.classList.contains("dark");
    return dotGrid(canvas, reduce, escuro ? { base: [44, 50, 58], active: [110, 170, 200] } : {});
  }, []);

  return (
    <div className="gg-entrada" ref={raiz}>
      <canvas className="dots" aria-hidden="true" />
      <div className="layout">
        <Historia />
        <main className="auth">
          <div className="auth-wrap in-up" style={{ "--d": "120ms" } as CSSProperties}>
            <div className="card">{children}</div>
            <p className="note">Uso exclusivo de colaboradores do Grupo Gomes Pires.</p>
          </div>
        </main>
      </div>
      <p className="assinatura assinatura-rodape">GGP Feedback</p>
    </div>
  );
}

const Historia = memo(function Historia() {
  return (
    <section className="story">
      <span className="brand in-up">
        <LogoGgp largura={176} prioridade rotulo="Grupo Gomes Pires" />
      </span>

      <h2 className="headline in-up" style={{ "--d": "80ms" } as CSSProperties}>
        Feedback que<br />
        <span className="mv">move</span> pessoas.
      </h2>
      <p className="lede in-up" style={{ "--d": "160ms" } as CSSProperties}>
        Onde gestores e equipes conversam sobre desenvolvimento, registram cada
        ciclo e combinam o próximo passo.
      </p>
    </section>
  );
});
