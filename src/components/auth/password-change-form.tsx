"use client";

import { useActionState, useId } from "react";

import {
  changePasswordAction,
  type PasswordChangeState,
} from "@/app/portal/alterar-senha/actions";

const initialState: PasswordChangeState = { error: null };

export function PasswordChangeForm() {
  const newPasswordId = useId();
  const confirmationId = useId();
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form className="login-form password-change-form" action={formAction} aria-busy={isPending}>
      <div className="password-policy" role="note">
        <strong>Requisitos da nova senha</strong>
        <span>Use pelo menos 12 caracteres e não reutilize a senha temporária.</span>
      </div>

      <div className="form-field">
        <label htmlFor={newPasswordId}>Nova senha</label>
        <div className="input-frame">
          <input
            id={newPasswordId}
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            disabled={isPending}
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor={confirmationId}>Confirmar nova senha</label>
        <div className="input-frame">
          <input
            id={confirmationId}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            disabled={isPending}
          />
        </div>
      </div>

      {state.error ? (
        <p className="login-feedback" role="alert">
          {state.error}
        </p>
      ) : null}

      <button className="submit-button" type="submit" disabled={isPending}>
        <span>{isPending ? "Atualizando senha..." : "Definir nova senha"}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h13" />
          <path d="m14 7 5 5-5 5" />
        </svg>
      </button>
    </form>
  );
}
