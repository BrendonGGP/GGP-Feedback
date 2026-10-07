"use client";

import { useRef } from "react";

import { PortalIcon } from "@/components/portal/portal-icon";

import { alternarTema, useTema } from "./tema";

/** Botão redondo que troca claro/escuro (o círculo da troca nasce dele). */
export function AlternarTema({ className }: Readonly<{ className?: string }>) {
  const tema = useTema();
  const botao = useRef<HTMLButtonElement>(null);
  const rotulo = tema === "escuro" ? "Usar tema claro" : "Usar tema escuro";

  return (
    <button
      ref={botao}
      type="button"
      className={className}
      onClick={() => alternarTema(botao.current)}
      aria-label={rotulo}
      title={rotulo}
    >
      <PortalIcon name={tema === "escuro" ? "sun" : "moon"} />
    </button>
  );
}
