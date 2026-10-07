"use client";

/**
 * GSAP do app: registro único dos plugins e as curvas de coreografia.
 *
 * Toda animação daqui termina com `clearProps`: `transform` e `filter`
 * deixados no elemento criam bloco de contenção, e qualquer `position: fixed`
 * lá dentro (menu, véu de modal) passaria a se posicionar pelo cartão.
 */
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Curvas do app. `saida` desacelera longo: chega e assenta. */
export const CURVA = {
  saida: "expo.out",
  suave: "power3.out",
  mola: "back.out(1.7)",
  elastica: "elastic.out(1, 0.45)",
} as const;

/** Media query que decide entre coreografia e corte seco. */
export const COM_MOVIMENTO = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger, useGSAP };
