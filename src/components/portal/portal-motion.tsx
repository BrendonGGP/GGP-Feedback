"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { COM_MOVIMENTO, CURVA, gsap, useGSAP } from "@/components/motion/gsap";

import { ordemDaRota } from "./portal-nav";

// Fora do React de propósito: cada página renderiza o próprio shell, então
// estado de componente não sobrevive para dizer de onde viemos ou se a
// abertura já rodou neste carregamento.
let ordemAnterior = 0;
let aberturaFeita = false;

/**
 * Abertura do portal (uma vez por carregamento): a ilha se forma, as cápsulas
 * descem e o conteúdo chega. Também marca o logotipo como "chegando" por um
 * instante a cada troca de seção.
 */
export function AberturaPortal({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  const raiz = useRef<HTMLDivElement>(null);
  const [chegando, setChegando] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setChegando(false), aberturaFeita ? 900 : 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useGSAP(
    () => {
      if (aberturaFeita) return;
      aberturaFeita = true;
      const elemento = raiz.current;
      if (!elemento) return;
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const q = (seletor: string) => elemento.querySelectorAll(seletor);
        gsap
          .timeline({ defaults: { ease: CURVA.saida, clearProps: "transform,opacity,filter" } })
          .from(q("[data-abertura-ilha]"), { y: -14, scale: 0.9, opacity: 0, filter: "blur(10px)", duration: 0.9 }, 0.12)
          .from(q("[data-capsula]"), { y: -12, scale: 0.94, opacity: 0, duration: 0.7, ease: "back.out(1.6)", stagger: 0.06 }, 0.42)
          .from(q("[data-abertura-conteudo]"), { y: 18, opacity: 0, duration: 0.76 }, 0.52)
          .from(q("[data-abertura-barra]"), { yPercent: 110, duration: 0.8 }, 0.1);
      });
      return () => mm.revert();
    },
    { scope: raiz },
  );

  return (
    <div ref={raiz} className={`${className ?? ""} ${chegando ? "digitando" : ""}`.trim()}>
      {children}
    </div>
  );
}

/** Painel da rota: entra pelo lado de onde a seção está na navegação. */
export function PainelRota({
  hrefs,
  children,
}: Readonly<{ hrefs: readonly string[]; children: ReactNode }>) {
  const pathname = usePathname();
  const ordem = ordemDaRota(pathname, hrefs);
  const [sentido] = useState(() => (ordem === ordemAnterior ? 0 : ordem > ordemAnterior ? 1 : -1));

  useEffect(() => {
    ordemAnterior = ordem;
  }, [ordem]);

  return (
    <div
      key={pathname}
      className={sentido !== 0 ? "painel-entra" : undefined}
      style={sentido !== 0 ? ({ "--painel-de": `${sentido * 18}px` } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
