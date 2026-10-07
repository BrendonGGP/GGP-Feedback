/**
 * Vocabulário de movimento do app (mesmo do GGPost).
 *
 * Molas em vez de duração fixa: o movimento acompanha a distância percorrida.
 * A Motion cuida do que é ESTADO (lente que desliza, modal que abre); o GSAP
 * (`./gsap.ts`) cuida da COREOGRAFIA (abertura do app, revelação por rolagem).
 * As duas nunca animam o mesmo elemento.
 *
 * `semMovimento` é aplicado quando o sistema pede Reduce Motion: a mudança
 * ainda acontece, só que sem percurso.
 */
export const MOLA_PADRAO = { type: "spring", stiffness: 380, damping: 32, mass: 0.9 } as const;
export const MOLA_MACIA = { type: "spring", stiffness: 260, damping: 30, mass: 1 } as const;
export const MOLA_FIRME = { type: "spring", stiffness: 520, damping: 38, mass: 0.7 } as const;
export const SUAVE = { duration: 0.22, ease: [0.22, 0.61, 0.36, 1] } as const;
/** Lente de seleção (lateral, segmentados): passa um pouco do ponto e volta. */
export const MOLA_LENTE = { type: "spring", stiffness: 420, damping: 26, mass: 0.8 } as const;
/** Momentos expressivos: mola com mais corpo. */
export const MOLA_EXPRESSIVA = { type: "spring", stiffness: 300, damping: 22, mass: 0.9 } as const;
export const semMovimento = { duration: 0 } as const;

/** Entrada/saída de sobreposição (modal, menu, painel). */
export const SOBREPOSICAO = {
  initial: { opacity: 0, scale: 0.96, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 4 },
};

/** Entrada/saída de item de lista (aviso, toast). */
export const ITEM_LISTA = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: 24, height: 0, marginBottom: 0 },
};
