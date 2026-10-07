"use client";

/**
 * Tema claro/escuro (mesmo comportamento do GGPost). A escolha mora no
 * aparelho (localStorage), não na conta. Sem escolha salva, segue o sistema
 * operacional. A classe `.dark` no <html> é a única chave: globals.css
 * redefine os tokens sob ela. `TEMA_SCRIPT` aplica a mesma regra antes da
 * primeira pintura; mantenha os dois em sincronia (chave e critério).
 */
import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import { CHAVE_TEMA } from "./tema-script";

export type Tema = "claro" | "escuro";

const DURACAO_MS = 400;

const ouvintes = new Set<() => void>();
let ouvindoSistema = false;

function salvo(): Tema | null {
  try {
    const valor = localStorage.getItem(CHAVE_TEMA);
    return valor === "claro" || valor === "escuro" ? valor : null;
  } catch {
    return null;
  }
}

function aplicar(tema: Tema) {
  document.documentElement.classList.toggle("dark", tema === "escuro");
  ouvintes.forEach((ouvinte) => ouvinte());
}

function temaAtual(): Tema {
  return document.documentElement.classList.contains("dark") ? "escuro" : "claro";
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  if (!ouvindoSistema) {
    ouvindoSistema = true;
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (evento) => {
      if (!salvo()) aplicar(evento.matches ? "escuro" : "claro");
    });
  }
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function useTema(): Tema {
  return useSyncExternalStore(assinar, temaAtual, () => "claro");
}

/**
 * Troca o tema e salva a escolha. Com `origem`, a página nova se abre num
 * círculo a partir do botão; sem View Transitions ou com movimento reduzido,
 * a troca é imediata.
 */
export function alternarTema(origem?: HTMLElement | null) {
  const novo: Tema = temaAtual() === "escuro" ? "claro" : "escuro";
  try {
    localStorage.setItem(CHAVE_TEMA, novo);
  } catch {
    /* vale só nesta aba */
  }

  const raiz = document.documentElement;
  raiz.classList.add("trocando-tema");
  const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!origem || semMovimento || !document.startViewTransition) {
    aplicar(novo);
    void getComputedStyle(raiz).color;
    raiz.classList.remove("trocando-tema");
    return;
  }

  const { left, top, width, height } = origem.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const raio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  const transicao = document.startViewTransition(() => flushSync(() => aplicar(novo)));
  transicao.ready
    .then(() => {
      raiz.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
        { duration: DURACAO_MS, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {
      /* transição pulada: o tema já foi aplicado */
    });
  transicao.finished.finally(() => raiz.classList.remove("trocando-tema"));
}
