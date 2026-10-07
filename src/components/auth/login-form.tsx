"use client";

import { signIn } from "next-auth/react";
import { FormEvent, KeyboardEvent, useId, useState } from "react";

import { useCena } from "@/components/auth/entrada/tela-entrada";
import { PortalIcon } from "@/components/portal/portal-icon";

const GENERIC_LOGIN_ERROR =
  "Não foi possível entrar. Confira seus dados ou tente novamente mais tarde.";

type Etapa = "idle" | "loading" | "done";

export function LoginForm() {
  const identifierId = useId();
  const passwordId = useId();
  const errorId = useId();
  const cena = useCena();
  const [showPassword, setShowPassword] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmitting = etapa !== "idle";

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
    setEtapa("loading");

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
        setEtapa("idle");
        return;
      }

      setEtapa("done");
      cena.current?.sucesso();
      window.location.assign(result.url ?? "/portal");
    } catch {
      setErrorMessage(GENERIC_LOGIN_ERROR);
      setEtapa("idle");
    }
  }

  return (
    <>
      <h1>Acesso ao portal</h1>
      <p className="sub">Use suas credenciais corporativas para continuar.</p>

      <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <div className="lbl-row">
          <label htmlFor={identifierId}>Nome de usuário</label>
        </div>
        <div className={`inp ${errorMessage ? "invalid" : ""}`.trim()}>
          <span className="ico" aria-hidden="true">
            <PortalIcon name="user" size={17} />
          </span>
          <input
            id={identifierId}
            name="loginIdentifier"
            type="text"
            autoComplete="username"
            placeholder="nome.sobrenome"
            maxLength={64}
            disabled={isSubmitting}
            enterKeyHint="go"
            onKeyDown={submitOnEnter}
            onInput={() => cena.current?.digitando()}
            aria-invalid={errorMessage ? true : undefined}
            aria-describedby={errorMessage ? errorId : undefined}
            required
          />
        </div>
        <p className="err" aria-hidden="true" />

        <div className="lbl-row">
          <label htmlFor={passwordId}>Senha</label>
        </div>
        <div className={`inp pw ${errorMessage ? "invalid" : ""}`.trim()}>
          <span className="ico" aria-hidden="true">
            <PortalIcon name="lock" size={17} />
          </span>
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
            onInput={() => cena.current?.digitando()}
            aria-invalid={errorMessage ? true : undefined}
            aria-describedby={errorMessage ? errorId : undefined}
            required
          />
          <button
            className="toggle"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-controls={passwordId}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
            disabled={isSubmitting}
          >
            <PortalIcon name={showPassword ? "eyeOff" : "eye"} size={18} />
          </button>
        </div>
        <p className="err" id={errorId} role="alert">
          {errorMessage}
        </p>

        <button
          className={`btn ${etapa === "loading" ? "loading" : ""} ${etapa === "done" ? "done" : ""}`.trim()}
          type="submit"
          disabled={isSubmitting}
        >
          <span className="st st-idle">Entrar no portal</span>
          <span className="st st-load" aria-hidden={etapa !== "loading"}>
            <i />
            <i />
            <i />
            <span className="sr-only">Validando acesso</span>
          </span>
          <span className="st st-done" aria-hidden={etapa !== "done"}>
            <PortalIcon name="check" size={18} />
            Tudo certo
          </span>
        </button>
      </form>
    </>
  );
}
