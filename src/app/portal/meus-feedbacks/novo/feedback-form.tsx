"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { saveFeedbackAction, type FeedbackActionState } from "./actions";
import styles from "../feedback.module.css";

type PersonOption = Readonly<{ id: string; fullName: string; jobTitle: string; companyName: string; departmentName: string }>;
type QuestionOption = Readonly<{ id: string; prompt: string; type: "RATING" | "LONG_TEXT" | "SHORT_TEXT"; required: boolean; minimum: number | null; maximum: number | null }>;
type InitialAnswer = Readonly<{ questionId: string; rating: number | null; text: string | null }>;

const initialState: FeedbackActionState = { message: "", fieldErrors: {} };

const splitPrompt = (prompt: string): readonly [string, string] => {
  const [title, ...description] = prompt.split(" — ");
  return [title, description.join(" — ")];
};

export function FeedbackForm({ cycle, people, questions, initialPersonId = "", initialAnswers = [] }: Readonly<{ cycle: { id: string; name: string }; people: readonly PersonOption[]; questions: readonly QuestionOption[]; initialPersonId?: string; initialAnswers?: readonly InitialAnswer[] }>) {
  const [state, formAction, pending] = useActionState(saveFeedbackAction, initialState);
  const [selectedPersonId, setSelectedPersonId] = useState(initialPersonId);
  const [selectedRatings, setSelectedRatings] = useState<Record<string, string>>(() => {
    const ratings: Record<string, string> = {};
    for (const answer of initialAnswers) {
      if (answer.rating !== null) ratings[answer.questionId] = String(answer.rating);
    }
    return ratings;
  });
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const selectedPerson = people.find(({ id }) => id === selectedPersonId);
  const ratingQuestions = questions.filter(({ type }) => type === "RATING");
  const textQuestions = questions.filter(({ type }) => type !== "RATING");

  const toggleRating = (questionId: string, rating: number) => {
    setSelectedRatings((current) => {
      const next = { ...current };
      const value = String(rating);
      if (next[questionId] === value) delete next[questionId];
      else next[questionId] = value;
      return next;
    });
  };

  useEffect(() => {
    if (state.message) errorSummaryRef.current?.focus();
  }, [state.message]);

  return (
    <form className={styles.feedbackForm} action={formAction}>
      <input type="hidden" name="cycleId" value={cycle.id} />
      {state.message ? <div className={styles.errorSummary} role="alert" tabIndex={-1} ref={errorSummaryRef}><strong>Não foi possível continuar</strong><p>{state.message}</p></div> : null}

      <section className={styles.formSection} aria-labelledby="cycle-person-title">
        <header><h2 id="cycle-person-title">Ciclo e colaborador</h2></header>
        <div className={styles.formGrid}>
          <label><span>Ciclo</span><input value={`${cycle.name} (aberto)`} readOnly aria-readonly="true" /></label>
          <label><span>Liderado</span><select name="subjectPersonId" required value={selectedPersonId} onChange={(event) => setSelectedPersonId(event.target.value)}><option value="">Selecione um colaborador</option>{people.map((person) => <option value={person.id} key={person.id}>{person.fullName}</option>)}</select></label>
          <label><span>Empresa</span><input value={selectedPerson?.companyName ?? "Selecione um colaborador"} readOnly /></label>
          <label><span>Área</span><input value={selectedPerson?.departmentName ?? "Selecione um colaborador"} readOnly /></label>
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby="competencies-title">
        <header><h2 id="competencies-title">Competências</h2></header>
        <div className={styles.scaleHelp}><strong>Escala de notas</strong><p><b>3</b> = padrão esperado · <b>4 e 5</b> = acima do esperado, com evidências · <b>1 e 2</b> = ponto de atenção</p></div>
        <div className={styles.competencyList}>
          {ratingQuestions.map((question) => {
            const [title, description] = splitPrompt(question.prompt);
            const minimum = question.minimum ?? 1;
            const maximum = question.maximum ?? 5;

            return (
              <fieldset
                className={styles.competency}
                key={question.id}
                aria-describedby={state.fieldErrors[question.id] ? `error-${question.id}` : undefined}
              >
                <legend>
                  <strong>{title}{question.required ? " *" : ""}</strong>
                  {description ? <span>{description}</span> : null}
                </legend>
                <div className={styles.ratingOptions} role="group" aria-label={`Selecionar nota para ${title}`}>
                  {Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index).map((rating) => {
                    const selected = selectedRatings[question.id] === String(rating);

                    return (
                      <span className={styles.ratingChoice} key={rating}>
                        <input
                          type="radio"
                          name={`answer.${question.id}`}
                          value={rating}
                          checked={selected}
                          readOnly
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                        <button
                          type="button"
                          className={styles.ratingButton}
                          aria-pressed={selected}
                          disabled={pending}
                          onClick={() => toggleRating(question.id, rating)}
                        >
                          {rating}
                        </button>
                      </span>
                    );
                  })}
                </div>
                {state.fieldErrors[question.id] ? <small className={styles.fieldError} id={`error-${question.id}`}>{state.fieldErrors[question.id]}</small> : null}
              </fieldset>
            );
          })}
        </div>
      </section>

      {textQuestions.length > 0 ? <section className={styles.formSection} aria-labelledby="comments-title"><header><h2 id="comments-title">Comentários</h2></header><div className={styles.commentsGrid}>{textQuestions.map((question) => { const [title, description] = splitPrompt(question.prompt); const initialText = initialAnswers.find((answer) => answer.questionId === question.id)?.text ?? ""; return <label key={question.id} htmlFor={`answer-${question.id}`}><span>{title}{question.required ? " *" : ""}</span>{description ? <small>{description}</small> : null}<textarea id={`answer-${question.id}`} name={`answer.${question.id}`} rows={5} defaultValue={initialText} aria-invalid={Boolean(state.fieldErrors[question.id])} aria-describedby={state.fieldErrors[question.id] ? `error-${question.id}` : undefined} />{state.fieldErrors[question.id] ? <small className={styles.fieldError} id={`error-${question.id}`}>{state.fieldErrors[question.id]}</small> : null}</label>; })}</div></section> : null}

      <footer className={styles.formActions}><button type="submit" name="intent" value="draft" disabled={pending}>Salvar rascunho</button><button className={styles.primaryButton} type="submit" name="intent" value="submit" disabled={pending}>{pending ? "Salvando..." : "Concluir feedback"}</button></footer>
    </form>
  );
}
