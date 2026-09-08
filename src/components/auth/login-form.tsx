"use client";

import { signIn } from "next-auth/react";
import { FormEvent, KeyboardEvent, useId, useState } from "react";

const GENERIC_LOGIN_ERROR =
  "Não foi possível entrar. Confira seus dados ou tente novamente mais tarde.";

export function LoginForm() {
  const identifierId = useId();
  const passwordId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.key !== "Enter" ||
      event.nativeEvent.isComposing ||
      event.repeat ||
      isSubmitting
    ) {
      return;
    }

    // Handle the keyboard path explicitly while preserving the form's
    // normal submit lifecycle (validation, loading state and errors).
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

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
    <form className="login-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <div className="form-field" data-entrance="field">
        <label htmlFor={identifierId}>E-mail ou identificador</label>
        <div className="input-frame">
          <input
            id={identifierId}
            name="loginIdentifier"
            type="text"
            autoComplete="username"
            placeholder="nome@ggp.com.br"
            maxLength={190}
            disabled={isSubmitting}
            enterKeyHint="go"
            onKeyDown={submitOnEnter}
            required
          />
        </div>
      </div>

      <div className="form-field" data-entrance="field">
        <label htmlFor={passwordId}>Senha</label>
        <div className="input-frame input-frame--password">
          <input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Digite sua senha"
            maxLength={256}
            disabled={isSubmitting}
            enterKeyHint="go"
            onKeyDown={submitOnEnter}
            required
          />
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-controls={passwordId}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
            disabled={isSubmitting}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m3 3 18 18" />
                <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                <path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5.5 0 9 5.2 9 5.2a15.3 15.3 0 0 1-2.4 2.8" />
                <path d="M6.6 6.6A15.8 15.8 0 0 0 3 9.2S6.5 14.5 12 14.5c1 0 2-.2 2.8-.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 12s3.5-5.2 9-5.2 9 5.2 9 5.2-3.5 5.2-9 5.2S3 12 3 12Z" />
                <circle cx="12" cy="12" r="2.4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className="login-feedback" role="alert" data-entrance="field">
          {errorMessage}
        </p>
      ) : null}

      <button className="submit-button" type="submit" disabled={isSubmitting} data-entrance="field">
        <span>{isSubmitting ? "Validando acesso..." : "Entrar no portal"}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h13" />
          <path d="m14 7 5 5-5 5" />
        </svg>
      </button>
    </form>
  );
}
