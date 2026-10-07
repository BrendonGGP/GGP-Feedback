"use client";

import {
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { LogoGgp } from "@/components/portal/logo-ggp";
import { PortalIcon } from "@/components/portal/portal-icon";

import { criarCena, type Cena } from "./cena";
import { dotGrid } from "./dot-grid";
import "./entrada.css";

const CenaContext = createContext<{ current: Cena | null }>({ current: null });

/** Controlador da cena para os formulários do cartão (bolha digitando, sucesso). */
export const useCena = () => useContext(CenaContext);

/**
 * Moldura da entrada (porte do GGPost): fundo de pontos interativo, logotipo,
 * título com o sublinhado que se desenha, colagem ao vivo e o cartão. O
 * conteúdo do cartão vem de quem usa (login, troca obrigatória de senha).
 */
export function TelaEntrada({ children }: Readonly<{ children: ReactNode }>) {
  const raiz = useRef<HTMLDivElement>(null);
  const cena = useRef<Cena | null>(null);

  useEffect(() => {
    const elemento = raiz.current;
    if (!elemento) return;
    const q = (seletor: string) => elemento.querySelector<HTMLElement>(seletor);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const escuro = document.documentElement.classList.contains("dark");
    const canvas = q("canvas.dots") as HTMLCanvasElement | null;
    const pararPontos = canvas
      ? dotGrid(canvas, reduce, escuro ? { base: [44, 50, 58], active: [110, 170, 200] } : {})
      : () => {};

    const feed = q(".feed");
    const avs = q(".avs");
    const enviados = q(".enviados");
    const collage = q(".collage");
    if (feed && avs && enviados && collage) {
      cena.current = criarCena({ feed, avs, enviados, collage });
    }

    return () => {
      cena.current?.destruir();
      cena.current = null;
      pararPontos();
    };
  }, []);

  return (
    <CenaContext.Provider value={cena}>
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
    </CenaContext.Provider>
  );
}

const EQUIPE: [string, string][] = [
  ["AM", "#2E6FA3"], ["JP", "#1E6B3A"], ["MH", "#2F6581"], ["PA", "#0C2B5E"],
  ["RL", "#1F4F8C"], ["RS", "#3A6FA6"], ["SE", "#2D6A3E"], ["LC", "#37809D"],
];

/** Lado da história: o React desenha a casca uma vez; a cena anima o resto. */
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

      <div className="collage" aria-hidden="true">
        <div className="piece p-chat">
          <div className="ui">
            <div className="chat-head">
              <span className="ch-ico">
                <PortalIcon name="feedback" size={15} />
              </span>
              <div>
                <b>Conversa de feedback</b>
                <small>Gestor e colaborador · ciclo atual</small>
              </div>
            </div>
            <div className="chat-body">
              <div className="feed" />
            </div>
            <div className="chat-foot">
              <span className="fake-input">Escreva um feedback…</span>
              <span className="send">
                <PortalIcon name="arrow" size={14} />
              </span>
            </div>
          </div>
        </div>

        <div className="piece p-ann">
          <div className="ui">
            <div className="card-h">
              <PortalIcon name="megaphone" size={15} />
              Ciclo aberto
            </div>
            <p>O ciclo de feedback do semestre está aberto até sexta. Leva menos de dez minutos.</p>
            <div className="ann-f">
              <span>Recursos Humanos · hoje</span>
              <span>›</span>
            </div>
          </div>
        </div>

        <div className="piece p-who">
          <div className="ui">
            <div className="card-h">
              <PortalIcon name="team" size={15} />
              Sua equipe
            </div>
            <div className="lbl-mini">
              FEEDBACKS ENVIADOS · <span className="enviados">{EQUIPE.length}</span>
            </div>
            <div className="avs">
              {EQUIPE.map(([iniciais, cor]) => (
                <span key={iniciais} className="av" style={{ "--c": cor } as CSSProperties}>
                  {iniciais}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
