"use client";

import { useActionState, useId } from "react";

import {
  changePasswordAction,
  type PasswordChangeState,
} from "@/app/portal/alterar-senha/actions";
import { useCena } from "@/components/auth/entrada/tela-entrada";
import { PortalIcon } from "@/components/portal/portal-icon";

const initialState: PasswordChangeState = { error: null };

export function PasswordChangeForm() {
  const newPasswordId = useId();
  const confirmationId = useId();
  const errorId = useId();
  const cena = useCena();
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState,
  );
  const invalido = Boolean(state.error);

  return (
    <>
      <h1>
        Crie sua <span className="nm">senha</span>
      </h1>
      <p className="sub">Esta etapa é necessária antes de acessar as áreas do portal.</p>

      <form action={formAction} aria-busy={isPending}>
        <div className="aviso" role="note">
          <b>Requisitos da nova senha</b>
          Use pelo menos 9 caracteres, incluindo um número e um caractere especial.
          Não reutilize a senha temporária.
        </div>

        <div className="lbl-row">
          <label htmlFor={newPasswordId}>Nova senha</label>
        </div>
        <div className={`inp ${invalido ? "invalid" : ""}`.trim()}>
          <span className="ico" aria-hidden="true">
            <PortalIcon name="lock" size={17} />
          </span>
          <input
            id={newPasswordId}
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={9}
            maxLength={128}
            required
            disabled={isPending}
            onInput={() => cena.current?.digitando()}
            aria-invalid={invalido || undefined}
            aria-describedby={invalido ? errorId : undefined}
          />
        </div>
        <p className="err" aria-hidden="true" />

        <div className="lbl-row">
          <label htmlFor={confirmationId}>Confirmar nova senha</label>
        </div>
        <div className={`inp ${invalido ? "invalid" : ""}`.trim()}>
          <span className="ico" aria-hidden="true">
            <PortalIcon name="lock" size={17} />
          </span>
          <input
            id={confirmationId}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={9}
            maxLength={128}
            required
            disabled={isPending}
            onInput={() => cena.current?.digitando()}
            aria-invalid={invalido || undefined}
            aria-describedby={invalido ? errorId : undefined}
          />
        </div>
        <p className="err" id={errorId} role="alert">
          {state.error}
        </p>

        <button className={`btn ${isPending ? "loading" : ""}`.trim()} type="submit" disabled={isPending}>
          <span className="st st-idle">Definir nova senha</span>
          <span className="st st-load" aria-hidden={!isPending}>
            <i />
            <i />
            <i />
            <span className="sr-only">Atualizando senha</span>
          </span>
        </button>
      </form>
    </>
  );
}
