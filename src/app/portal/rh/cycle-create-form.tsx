"use client";

import { useActionState, useEffect, useRef, type KeyboardEvent } from "react";

import {
  createCycleAction,
  type HrCycleActionState,
} from "./actions";
import styles from "./rh.module.css";

type TemplateOption = Readonly<{
  id: string;
  name: string;
  version: number;
  questions: readonly unknown[];
}>;

const initialState: HrCycleActionState = {
  message: "",
  fieldErrors: {},
  success: false,
};

export function CycleCreateForm({
  templates,
}: Readonly<{ templates: readonly TemplateOption[] }>) {
  const [state, formAction, pending] = useActionState(
    createCycleAction,
    initialState,
  );
  const feedbackRef = useRef<HTMLDivElement>(null);

  const advanceOnEnter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") return;

    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type === "checkbox") return;

    const fields = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), button:not([type="submit"]):not([disabled])',
      ),
    );
    const currentIndex = fields.indexOf(target);
    const nextField = fields[currentIndex + 1];
    if (!nextField) return;

    event.preventDefault();
    nextField.focus();
  };

  useEffect(() => {
    if (state.message) feedbackRef.current?.focus();
  }, [state.message]);

  return (
    <form className={styles.createForm} action={formAction} onKeyDown={advanceOnEnter}>
      <div className={styles.formIntro}>
        <p className={styles.eyebrow}>Novo ciclo</p>
        <h2>Configure uma nova rodada</h2>
        <p>O ciclo é criado como rascunho e só fica disponível após a abertura pelo RH.</p>
        <p className={styles.keyboardHint}>Use Enter para avançar entre os campos ou Tab para navegar.</p>
      </div>

      {state.message ? (
        <div
          className={state.success ? styles.successMessage : styles.errorMessage}
          role={state.success ? "status" : "alert"}
          tabIndex={-1}
          ref={feedbackRef}
        >
          {state.message}
        </div>
      ) : null}

      <label className={styles.nameField}>
        <span>Nome do ciclo <em>Obrigatório</em></span>
        <input
          type="text"
          name="name"
          required
          minLength={3}
          maxLength={160}
          autoFocus
          placeholder="Ex.: Avaliação 2º semestre 2026"
          aria-describedby="cycle-name-help"
          aria-invalid={Boolean(state.fieldErrors.name)}
        />
        <small id="cycle-name-help" className={styles.fieldHint}>Digite um nome que identifique o período e o objetivo da avaliação.</small>
        {state.fieldErrors.name ? <small>{state.fieldErrors.name}</small> : null}
      </label>

      <div className={styles.dateGrid}>
        <label>
          <span>Início</span>
          <input type="date" name="startsAt" required aria-invalid={Boolean(state.fieldErrors.startsAt)} />
          {state.fieldErrors.startsAt ? <small>{state.fieldErrors.startsAt}</small> : null}
        </label>
        <label>
          <span>Fim</span>
          <input type="date" name="endsAt" required aria-invalid={Boolean(state.fieldErrors.endsAt)} />
          {state.fieldErrors.endsAt ? <small>{state.fieldErrors.endsAt}</small> : null}
        </label>
      </div>

      <label>
        <span>Formulário</span>
        <select name="templateId" required defaultValue="">
          <option value="" disabled>Selecione um formulário ativo</option>
          {templates.map((template) => (
            <option value={template.id} key={template.id}>
              {template.name} · v{template.version} ({template.questions.length} perguntas)
            </option>
          ))}
        </select>
        {state.fieldErrors.templateId ? <small>{state.fieldErrors.templateId}</small> : null}
      </label>

      <label className={styles.checkboxLabel}>
        <input type="checkbox" name="selfAssessmentEnabled" />
        <span>Permitir autoavaliação neste ciclo</span>
      </label>

      <button className={styles.primaryButton} type="submit" disabled={pending || templates.length === 0}>
        {pending ? "Criando ciclo..." : "Criar ciclo"}
      </button>
      {templates.length === 0 ? <p className={styles.helperText}>Cadastre um formulário ativo antes de criar um ciclo.</p> : null}
    </form>
  );
}
