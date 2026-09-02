"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useId, useState } from "react";

const GENERIC_LOGIN_ERROR =
  "Não foi possível entrar. Confira seus dados ou tente novamente mais tarde.";

export function LoginForm() {
  const identifierId = useId();
  const passwordId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const loginIdentifier = formData.get("loginIdentifier");
    const password = formData.get("password");

    try {
      const result = await signIn("credentials", {
        loginIdentifier,
        password,
        redirect: false,
        callbackUrl: "/portal",
      });

      if (!result || result.error) {
        setErrorMessage(GENERIC_LOGIN_ERROR);
        return;
      }

      window.location.assign(result.url ?? "/portal");
    } catch {
      setErrorMessage(GENERIC_LOGIN_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor={identifierId}>E-mail ou identificador</label>
        <input
          id={identifierId}
          name="loginIdentifier"
          type="text"
          autoComplete="username"
          placeholder="nome@ggp.com.br"
          maxLength={320}
          required
        />
      </div>

      <div className="form-field">
        <div className="field-label-row">
          <label htmlFor={passwordId}>Senha</label>
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-controls={passwordId}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <input
          id={passwordId}
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Digite sua senha"
          maxLength={256}
          required
        />
      </div>

      <div className="login-feedback" aria-live="polite" role="status">
        {errorMessage}
      </div>

      <button className="submit-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Validando..." : "Entrar"}
        <span className="submit-arrow" aria-hidden="true">→</span>
      </button>
    </form>
  );
}
