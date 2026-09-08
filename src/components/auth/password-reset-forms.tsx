"use client";

import Link from "next/link";
import { useActionState, useId } from "react";

import {
  completePasswordResetAction,
  requestPasswordResetAction,
  type PasswordResetRequestState,
  type PasswordResetState,
} from "@/app/recuperar-senha/actions";

const requestInitialState: PasswordResetRequestState = {
  submitted: false,
  devResetPath: null,
  error: null,
};
const resetInitialState: PasswordResetState = { error: null };

export function PasswordResetRequestForm() {
  const identifierId = useId();
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, requestInitialState);

  return (
    <form className="login-form" action={formAction} aria-busy={isPending}>
      <div className="form-field">
        <label htmlFor={identifierId}>E-mail ou identificador</label>
        <div className="input-frame">
          <input id={identifierId} name="loginIdentifier" type="text" autoComplete="username" maxLength={190} required disabled={isPending} />
        </div>
      </div>
      {state.error ? <p className="login-feedback" role="alert">{state.error}</p> : null}
      {state.submitted && !state.error ? <p className="login-success" role="status">Se o identificador estiver cadastrado, você receberá instruções para redefinir sua senha.</p> : null}
      {state.devResetPath ? <Link className="dev-reset-link" href={state.devResetPath}>Abrir link de recuperação local</Link> : null}
      <button className="submit-button" type="submit" disabled={isPending}><span>{isPending ? "Enviando instruções..." : "Solicitar recuperação"}</span><span aria-hidden="true">→</span></button>
      <Link className="auth-back-link" href="/">Voltar para o login</Link>
    </form>
  );
}

export function PasswordResetForm({ token }: Readonly<{ token: string }>) {
  const passwordId = useId();
  const confirmationId = useId();
  const [state, formAction, isPending] = useActionState(completePasswordResetAction, resetInitialState);

  return (
    <form className="login-form" action={formAction} aria-busy={isPending}>
      <input type="hidden" name="token" value={token} />
      <div className="password-policy" role="note"><strong>Requisitos da nova senha</strong><span>Use pelo menos 9 caracteres, incluindo um número e um caractere especial.</span></div>
      <div className="form-field"><label htmlFor={passwordId}>Nova senha</label><div className="input-frame"><input id={passwordId} name="newPassword" type="password" autoComplete="new-password" minLength={9} maxLength={128} required disabled={isPending} /></div></div>
      <div className="form-field"><label htmlFor={confirmationId}>Confirmar nova senha</label><div className="input-frame"><input id={confirmationId} name="confirmPassword" type="password" autoComplete="new-password" minLength={9} maxLength={128} required disabled={isPending} /></div></div>
      {state.error ? <p className="login-feedback" role="alert">{state.error}</p> : null}
      <button className="submit-button" type="submit" disabled={isPending}><span>{isPending ? "Atualizando senha..." : "Redefinir senha"}</span><span aria-hidden="true">→</span></button>
      <Link className="auth-back-link" href="/">Voltar para o login</Link>
    </form>
  );
}
