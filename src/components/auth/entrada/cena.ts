/**
 * A "cena" da tela de entrada (porte do GGPost, sem o Nino): a colagem ao
 * vivo — uma conversa de feedback que chega mensagem a mensagem e a equipe
 * que vai enviando os feedbacks do ciclo.
 *
 * Mexe direto no DOM dos elementos decorativos (que o React renderiza vazios e
 * nunca mais toca), como o GGPost faz: as animações reiniciam por classe sem
 * re-render. Texto entra só por `textContent`; nada de innerHTML.
 *
 * Todo timer, rAF e intervalo fica registrado e sai em `destruir()`.
 */

export interface ElementosCena {
  feed: HTMLElement;
  avs: HTMLElement;
  enviados: HTMLElement;
  collage: HTMLElement;
}

export interface Cena {
  /** Bolha "digitando" da própria pessoa na conversa. */
  digitando(): void;
  /** Login aceito: a mensagem final chega e a conversa registra a entrada. */
  sucesso(): void;
  destruir(): void;
}

const pessoas = {
  rl: { name: "Renata", init: "RL", c: "#1F4F8C" },
  jp: { name: "João", init: "JP", c: "#1E6B3A" },
} as const;
type Pessoa = (typeof pessoas)[keyof typeof pessoas];

// Conversa fictícia de exemplo (nomes e falas ilustrativos).
const roteiro: { who: keyof typeof pessoas; text: string }[] = [
  { who: "rl", text: "Sua condução da reunião com o cliente foi excelente." },
  { who: "jp", text: "Obrigado! Quero evoluir na apresentação dos números." },
  { who: "rl", text: "Combinado. Vamos colocar isso no seu plano deste ciclo." },
  { who: "jp", text: "Fechado. Te mando a autoavaliação até sexta." },
  { who: "rl", text: "Feedback enviado. Bom trabalho neste semestre." },
  { who: "jp", text: "Recebi. Valeu pela conversa de hoje." },
];
const extras: [string, string][] = [["TC", "#2F6581"], ["BF", "#1E6B3A"], ["GS", "#1F4F8C"]];

const relogio = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// ── Construção de DOM (sem innerHTML) ──
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", ...filhos: (Node | string)[]) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.append(...filhos);
  return e;
}
const pontos = (cls: string) => el("div", cls, el("i"), el("i"), el("i"));
const SVG = "http://www.w3.org/2000/svg";
function checks() {
  const s = document.createElementNS(SVG, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("fill", "none");
  s.setAttribute("stroke", "currentColor");
  s.setAttribute("stroke-width", "2");
  s.setAttribute("stroke-linecap", "round");
  s.setAttribute("stroke-linejoin", "round");
  for (const d of ["m2 12.5 4 4L15 7.5", "m10 16.5 1 0L20 7.5"]) {
    const p = document.createElementNS(SVG, "path");
    p.setAttribute("d", d);
    s.append(p);
  }
  return s;
}
function avatar(init: string, cor: string, cls = "av") {
  const a = el("span", cls, init);
  a.style.setProperty("--c", cor);
  return a;
}
const linhaOutro = (p: Pessoa, interno: Node, cls = "") =>
  el("div", `row ${cls}`.trim(), el("div", "row-in", avatar(p.init, p.c), el("div", "msg", el("span", "who", p.name), interno, el("span", "time", relogio()))));
const linhaMinha = (interno: Node, ...hora: (Node | string)[]) =>
  el("div", "row me", el("div", "row-in", el("div", "msg", interno, el("span", "time", ...hora))));
const linhaSeparador = (texto: string, cls = "") =>
  el("div", "row sep", el("div", "row-in", el("div", `sep-line ${cls}`.trim(), texto)));

export function criarCena({ feed, avs, enviados, collage }: ElementosCena): Cena {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let vivo = true;
  let entrou = false;

  const timers = new Set<number>();
  const rafs = new Set<number>();
  const depois = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (vivo) fn();
    }, ms);
    timers.add(id);
    return id;
  };
  const cancelar = (id: number | undefined) => {
    if (id) {
      window.clearTimeout(id);
      timers.delete(id);
    }
  };
  const esperar = (ms: number) => new Promise<void>((r) => { depois(r, ms); });
  const quadro = (fn: () => void) => {
    const id = requestAnimationFrame(() => {
      rafs.delete(id);
      if (vivo) fn();
    });
    rafs.add(id);
  };

  const mostrar = (linha: HTMLElement, antes?: HTMLElement | null) => {
    if (antes && antes.isConnected) feed.insertBefore(linha, antes);
    else feed.appendChild(linha);
    quadro(() => quadro(() => linha.classList.add("in")));
  };
  const aparar = () => {
    while (feed.children.length > 8) feed.firstElementChild?.remove();
  };

  feed.appendChild(linhaSeparador("Ciclo do semestre")).classList.add("in");
  roteiro.slice(0, 2).forEach((m) => feed.appendChild(linhaOutro(pessoas[m.who], el("div", "bub", m.text), "in")));

  // As peças entram uma a uma.
  quadro(() => {
    collage.classList.add("ready");
    [...collage.children].forEach((c, i) => {
      (c as HTMLElement).style.transitionDelay = `${250 + i * 140}ms`;
    });
    depois(() => [...collage.children].forEach((c) => { (c as HTMLElement).style.transitionDelay = ""; }), 1400);
  });

  let minhaLinha: HTMLElement | null = null;
  void (async function laco() {
    if (reduce) return;
    let i = 2;
    await esperar(2400);
    for (;;) {
      if (!vivo) return;
      if (document.hidden || entrou) {
        await esperar(800);
        continue;
      }
      const m = roteiro[i % roteiro.length];
      const linha = linhaOutro(pessoas[m.who], pontos("bub typing"));
      mostrar(linha, minhaLinha);
      await esperar(1000 + Math.random() * 700);
      const bolha = linha.querySelector(".bub");
      if (bolha) {
        bolha.className = "bub pop";
        bolha.textContent = m.text;
      }
      aparar();
      await esperar(2600 + Math.random() * 1200);
      i++;
    }
  })();

  // A equipe vai enviando os feedbacks do ciclo.
  let extraIdx = 0;
  const intervaloEquipe = reduce
    ? 0
    : window.setInterval(() => {
        if (document.hidden || entrou) return;
        if (avs.children.length < 10) {
          const [ini, c] = extras[extraIdx++ % extras.length];
          const a = avatar(ini, c, "av new");
          a.dataset.extra = "1";
          avs.appendChild(a);
        } else {
          avs.lastElementChild?.remove();
          avs.lastElementChild?.remove();
        }
        enviados.textContent = String(avs.children.length);
      }, 6500);

  let timerDigitando: number | undefined;

  return {
    digitando() {
      if (reduce || entrou) return;
      if (!minhaLinha || !minhaLinha.isConnected) {
        minhaLinha = linhaMinha(pontos("bub typing"));
        mostrar(minhaLinha);
      }
      cancelar(timerDigitando);
      timerDigitando = depois(() => {
        if (!minhaLinha) return;
        const linha = minhaLinha;
        minhaLinha = null;
        linha.classList.remove("in");
        depois(() => linha.remove(), 600);
      }, 1800);
    },

    sucesso() {
      entrou = true;
      cancelar(timerDigitando);
      if (minhaLinha && minhaLinha.isConnected) {
        const bolha = minhaLinha.querySelector(".bub");
        if (bolha) {
          bolha.className = "bub pop";
          bolha.textContent = "Entrando no portal.";
        }
        minhaLinha.querySelector(".time")?.replaceChildren(`${relogio()} `, checks());
      } else {
        mostrar(linhaMinha(el("div", "bub pop", "Entrando no portal."), `${relogio()} `, checks()));
      }
      minhaLinha = null;
      depois(() => {
        mostrar(linhaSeparador("Você entrou no portal", "joined"));
        aparar();
      }, 450);
    },

    destruir() {
      vivo = false;
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
      rafs.forEach((id) => cancelAnimationFrame(id));
      rafs.clear();
      if (intervaloEquipe) window.clearInterval(intervaloEquipe);
      // Volta os elementos ao estado inicial (o StrictMode monta duas vezes).
      feed.replaceChildren();
      avs.querySelectorAll("[data-extra]").forEach((a) => a.remove());
      enviados.textContent = String(avs.children.length);
      collage.classList.remove("ready");
    },
  };
}
