"use client";

import { useRef, type ReactNode } from "react";

import { COM_MOVIMENTO, CURVA, gsap, ScrollTrigger, useGSAP } from "./gsap";

/**
 * Revela por rolagem os filhos marcados com `data-revelar` (mesmo gesto do
 * GGPost): quem entra na tela no mesmo instante sobe em cascata, uma vez só.
 * Use como invólucro de páginas e listas renderizadas no servidor.
 */
export function Revelar({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  const escopo = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const raiz = escopo.current;
      if (!raiz) return;
      const novos = Array.from(
        raiz.querySelectorAll<HTMLElement>("[data-revelar]:not([data-revelado])"),
      );
      if (novos.length === 0) return;

      // A marca `data-revelado` só entra quando o item de fato aparece: se o
      // efeito for desfeito antes (StrictMode monta duas vezes no
      // desenvolvimento), o revert devolve a opacidade e a segunda execução
      // ainda encontra os itens para animar.
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, (contexto) => {
        gsap.set(novos, { opacity: 0, y: 34, scale: 0.985, transformOrigin: "50% 0%" });
        // `contexto.add`: a animação criada no callback assíncrono também
        // pertence ao contexto, e o revert a desfaz.
        const revelar = contexto.add("revelar", (lote: Element[]) => {
          lote.forEach((el) => el.setAttribute("data-revelado", ""));
          gsap.to(lote, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.9,
            ease: CURVA.saida,
            stagger: 0.07,
            overwrite: true,
            clearProps: "transform,opacity",
          });
        }) as (lote: Element[]) => void;
        ScrollTrigger.batch(novos, {
          scroller: raiz.closest<HTMLElement>("[data-rolagem]") ?? window,
          start: "top 92%",
          once: true,
          onEnter: (lote) => revelar(lote),
        });
      });
      return () => {
        mm.revert();
        novos.forEach((el) => el.removeAttribute("data-revelado"));
        gsap.set(novos, { clearProps: "transform,opacity" });
      };
    },
    { scope: escopo },
  );

  return (
    <div ref={escopo} className={className}>
      {children}
    </div>
  );
}
