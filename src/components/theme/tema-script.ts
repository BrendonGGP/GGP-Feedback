/** Chave do tema salvo no aparelho; compartilhada com `tema.ts`. */
export const CHAVE_TEMA = "ggp-feedback:tema";

/**
 * Script inline do <head>: aplica `.dark` antes da primeira pintura, com o
 * mesmo critério de `tema.ts` (escolha salva, senão o sistema operacional).
 */
export const TEMA_SCRIPT = `(function(){try{var t=localStorage.getItem("${CHAVE_TEMA}");var e=t==="escuro"||(t!=="claro"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",e)}catch(_){}})();`;
