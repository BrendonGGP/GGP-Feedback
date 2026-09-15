"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { FormAudience, QuestionType } from "@prisma/client";

import { PortalIcon } from "@/components/portal/portal-icon";

import {
  createFormTemplateAction,
  deleteFormTemplateAction,
  updateFormTemplateAction,
  type HrCycleActionState,
} from "./actions";
import styles from "./rh.module.css";

type FormQuestion = Readonly<{
  id: string;
  prompt: string;
  type: QuestionType;
  position: number;
  required: boolean;
  minimum: number | null;
  maximum: number | null;
}>;

type FormTemplate = Readonly<{
  id: string;
  name: string;
  version: number;
  audience: FormAudience;
  questions: readonly FormQuestion[];
}>;

type QuestionDraft = {
  id: string;
  prompt: string;
  type: QuestionType;
  required: boolean;
  minimum: number | null;
  maximum: number | null;
};

const initialState: HrCycleActionState = {
  message: "",
  fieldErrors: {},
  success: false,
};

const audienceLabels: Record<FormAudience, string> = {
  MANAGER: "Gestor",
  EMPLOYEE: "Colaborador",
  BOTH: "Ambos os perfis",
};

const questionTypeLabels: Record<QuestionType, string> = {
  RATING: "Escala de notas (1 a 5)",
  LONG_TEXT: "Texto longo",
  SHORT_TEXT: "Texto curto",
};

const createQuestion = (id: string): QuestionDraft => ({
  id,
  prompt: "",
  type: "RATING",
  required: true,
  minimum: 1,
  maximum: 5,
});

const toDraftQuestions = (template?: FormTemplate): QuestionDraft[] =>
  template?.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    type: question.type,
    required: question.required,
    minimum: question.minimum,
    maximum: question.maximum,
  })) ?? [createQuestion("question-1")];

function FormTemplateEditor({
  mode,
  template,
  onClose,
}: Readonly<{
  mode: "create" | "edit";
  template?: FormTemplate;
  onClose?: () => void;
}>) {
  const action = mode === "create" ? createFormTemplateAction : updateFormTemplateAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [audience, setAudience] = useState<FormAudience>(template?.audience ?? "BOTH");
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => toDraftQuestions(template));
  const feedbackRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.message) feedbackRef.current?.focus();
    if (state.success) {
      router.refresh();
      onClose?.();
    }
  }, [onClose, router, state.message, state.success]);

  const updateQuestion = (id: string, changes: Partial<QuestionDraft>) => {
    setQuestions((current) => current.map((question) => (
      question.id === id ? { ...question, ...changes } : question
    )));
  };

  const updateType = (id: string, type: QuestionType) => {
    updateQuestion(id, {
      type,
      minimum: type === "RATING" ? 1 : null,
      maximum: type === "RATING" ? 5 : null,
    });
  };

  const addQuestion = () => {
    setQuestions((current) => [...current, createQuestion(`question-${current.length + 1}-${Date.now()}`)]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((current) => current.filter((question) => question.id !== id));
  };

  return (
    <form className={styles.templateEditorForm} action={formAction}>
      {mode === "edit" ? <input type="hidden" name="templateId" value={template?.id ?? ""} /> : null}
      <input type="hidden" name="questions" value={JSON.stringify(questions)} readOnly />

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

      <div className={styles.templateEditorGrid}>
        <label>
          <span>Nome do formulário <em>Obrigatório</em></span>
          <input
            name="name"
            type="text"
            required
            minLength={3}
            maxLength={160}
            defaultValue={template?.name ?? ""}
            placeholder="Ex.: Feedback de desempenho"
            aria-invalid={Boolean(state.fieldErrors.name)}
          />
          {state.fieldErrors.name ? <small>{state.fieldErrors.name}</small> : null}
        </label>

        <fieldset className={styles.audienceFieldset}>
          <legend>Público do formulário <em>Obrigatório</em></legend>
          <div className={styles.audienceOptions}>
            {(Object.keys(audienceLabels) as FormAudience[]).map((option) => (
              <label className={styles.audienceOption} key={option}>
                <input
                  type="radio"
                  name="audience"
                  value={option}
                  checked={audience === option}
                  onChange={() => setAudience(option)}
                />
                <span>{audienceLabels[option]}</span>
              </label>
            ))}
          </div>
          <small>Define quem poderá responder este formulário no ciclo.</small>
          {state.fieldErrors.audience ? <small>{state.fieldErrors.audience}</small> : null}
        </fieldset>
      </div>

      <div className={styles.questionsHeader}>
        <div>
          <h3>Perguntas e competências</h3>
          <p>Organize as perguntas na ordem em que aparecerão para o avaliador.</p>
        </div>
        <span>{questions.length} {questions.length === 1 ? "pergunta" : "perguntas"}</span>
      </div>

      <div className={styles.questionEditorList}>
        {questions.map((question, index) => (
          <fieldset className={styles.questionEditor} key={question.id}>
            <legend>Pergunta {index + 1}</legend>
            <label className={styles.questionPrompt}>
              <span>Enunciado <em>Obrigatório</em></span>
              <textarea
                name={`question-${index + 1}-prompt`}
                rows={3}
                required
                maxLength={1000}
                value={question.prompt}
                onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
                placeholder="Ex.: Demonstra autonomia e responsabilidade nas entregas."
              />
            </label>
            <div className={styles.questionSettings}>
              <label>
                <span>Tipo de resposta</span>
                <select value={question.type} onChange={(event) => updateType(question.id, event.target.value as QuestionType)}>
                  {(Object.keys(questionTypeLabels) as QuestionType[]).map((type) => <option value={type} key={type}>{questionTypeLabels[type]}</option>)}
                </select>
              </label>
              {question.type === "RATING" ? (
                <div className={styles.ratingRange}>
                  <label><span>Mínimo</span><input type="number" min={1} max={5} value={question.minimum ?? 1} onChange={(event) => updateQuestion(question.id, { minimum: Number(event.target.value) })} /></label>
                  <label><span>Máximo</span><input type="number" min={1} max={5} value={question.maximum ?? 5} onChange={(event) => updateQuestion(question.id, { maximum: Number(event.target.value) })} /></label>
                </div>
              ) : <span className={styles.questionTypeHint}>Resposta em texto</span>}
              <label className={styles.requiredToggle}>
                <input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(question.id, { required: event.target.checked })} />
                <span>Resposta obrigatória</span>
              </label>
              <button className={styles.removeQuestionButton} type="button" onClick={() => removeQuestion(question.id)} disabled={questions.length === 1 || pending}>
                Remover
              </button>
            </div>
          </fieldset>
        ))}
      </div>

      {state.fieldErrors.questions ? <p className={styles.formFieldError}>{state.fieldErrors.questions}</p> : null}

      <div className={styles.templateEditorActions}>
        <button className={styles.secondaryButton} type="button" onClick={addQuestion} disabled={questions.length >= 30 || pending}>+ Adicionar pergunta</button>
        <button className={styles.primaryButton} type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Criar formulário" : "Salvar nova versão"}
        </button>
      </div>
    </form>
  );
}

function FormTemplateDeleteButton({
  templateId,
  templateName,
}: Readonly<{
  templateId: string;
  templateName: string;
}>) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(deleteFormTemplateAction, initialState);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const descriptionId = `delete-template-${templateId}-description`;
  const confirmationId = `delete-template-${templateId}-confirmation`;

  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    if (state.message && !state.success) feedbackRef.current?.focus();
    if (state.success) {
      router.refresh();
    }
  }, [confirming, router, state.message, state.success]);

  if (state.success) {
    return (
      <div className={styles.deleteConfirmation} role="status">
        <p className={styles.successMessage}>{state.message}</p>
      </div>
    );
  }

  if (!confirming) {
    return (
      <button
        className={styles.deleteTemplateButton}
        type="button"
        onClick={() => setConfirming(true)}
        aria-expanded={false}
        aria-controls={confirmationId}
      >
        Excluir formulário
      </button>
    );
  }

  return (
    <div className={styles.deleteConfirmation} id={confirmationId}>
      <p id={descriptionId}>
        Excluir “{templateName}”? O formulário será arquivado e não aparecerá em novos ciclos. Histórico e ciclos existentes serão preservados.
      </p>
      <div className={styles.deleteConfirmationActions}>
        <button
          className={styles.cancelDeleteButton}
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          ref={cancelRef}
        >
          Cancelar
        </button>
        <form action={formAction}>
          <input type="hidden" name="templateId" value={templateId} />
          <button
            className={styles.deleteConfirmButton}
            type="submit"
            disabled={pending}
            aria-describedby={descriptionId}
          >
            {pending ? "Excluindo..." : "Confirmar exclusão"}
          </button>
        </form>
      </div>
      {state.message && !state.success ? (
        <p className={styles.formFieldError} role="alert" tabIndex={-1} ref={feedbackRef}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

export function FormTemplateManager({
  templates,
}: Readonly<{ templates: readonly FormTemplate[] }>) {
  const [creating, setCreating] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const editorPanelRef = useRef<HTMLElement>(null);
  const editingTemplate = templates.find((template) => template.id === editingTemplateId);

  useEffect(() => {
    if (creating || editingTemplate) {
      editorPanelRef.current?.focus();
    }
  }, [creating, editingTemplate]);

  const closeEditor = () => {
    setCreating(false);
    setEditingTemplateId(null);
  };

  const toggleCreateEditor = () => {
    setEditingTemplateId(null);
    setCreating((current) => !current);
  };

  const toggleTemplateEditor = (templateId: string) => {
    setCreating(false);
    setEditingTemplateId((current) => current === templateId ? null : templateId);
  };

  return (
    <div className={styles.templateManager}>
      <div className={styles.templateToolbar}>
        <p>Crie modelos diferentes para avaliações de gestores, colaboradores ou para os dois públicos.</p>
        <button className={styles.secondaryButton} type="button" onClick={toggleCreateEditor} aria-expanded={creating} aria-controls="template-editor-panel">
          {creating ? "Fechar criação" : "+ Novo formulário"}
        </button>
      </div>

      {creating || editingTemplate ? (
        <section
          className={styles.templateEditorPanel}
          id="template-editor-panel"
          aria-labelledby="template-editor-title"
          tabIndex={-1}
          ref={editorPanelRef}
        >
          <div className={styles.editorPanelHeader}>
            <div>
              <p className={styles.eyebrow}>{creating ? "Novo formulário" : "Edição de formulário"}</p>
              <h3 id="template-editor-title">
                {creating ? "Monte o formulário por público" : `Editar ${editingTemplate?.name}`}
              </h3>
            </div>
            <div className={styles.editorPanelMeta}>
              <span>Ao salvar, uma nova versão será criada para preservar o histórico.</span>
              <button className={styles.editorCloseButton} type="button" onClick={closeEditor}>Fechar editor</button>
            </div>
          </div>
          {creating ? (
            <FormTemplateEditor key="create-template" mode="create" onClose={closeEditor} />
          ) : editingTemplate ? (
            <FormTemplateEditor key={editingTemplate.id} mode="edit" template={editingTemplate} onClose={closeEditor} />
          ) : null}
        </section>
      ) : null}

      <div className={styles.templateGrid}>
        {templates.length === 0 ? <p className={styles.emptyState}>Nenhum formulário ativo encontrado.</p> : null}
        {templates.map((template) => (
          <article className={styles.templateCard} key={template.id}>
            <div className={styles.templateTitle}>
              <span><PortalIcon name="feedback" /></span>
              <div><h3>{template.name}</h3><p>Versão {template.version} · {template.questions.length} perguntas</p></div>
            </div>
            <div className={styles.audienceBadge} data-audience={template.audience}>{audienceLabels[template.audience]}</div>
            <ol>{template.questions.slice(0, 5).map((question) => <li key={question.id}><span>{question.position}</span><p>{question.prompt.split(" — ")[0]}</p><small>{question.type === "RATING" ? "Nota" : "Texto"}</small></li>)}</ol>
            {template.questions.length > 5 ? <small className={styles.moreQuestions}>+ {template.questions.length - 5} perguntas adicionais</small> : null}
            <div className={styles.templateCardActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => toggleTemplateEditor(template.id)}
                aria-expanded={editingTemplateId === template.id}
                aria-controls="template-editor-panel"
              >
                {editingTemplateId === template.id ? "Fechar edição" : "Editar formulário"}
              </button>
              <FormTemplateDeleteButton templateId={template.id} templateName={template.name} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
