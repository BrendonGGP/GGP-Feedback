import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";
import { getAuthenticatedActor } from "@/lib/auth/session";
import { getPortalDashboardData } from "@/lib/dashboard/dashboard-data";
import { getNewFeedbackContext } from "@/lib/feedback/feedback-service";

import { FeedbackForm } from "./feedback-form";
import styles from "../feedback.module.css";

type NewFeedbackPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function NewFeedbackPage({ searchParams }: NewFeedbackPageProps) {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");
  const params = await searchParams;
  const draftId = typeof params.feedback === "string" ? params.feedback.slice(0, 80) : undefined;
  const [dashboard, context] = await Promise.all([
    getPortalDashboardData(actor),
    getNewFeedbackContext(actor, draftId),
  ]);
  if (!dashboard || !context) redirect("/portal/meus-feedbacks");

  const unavailable =
    !context.cycle ||
    context.people.length === 0 ||
    context.questions.length === 0 ||
    (draftId ? !context.draft : false);

  return (
    <PortalShell activePath="/portal/meus-feedbacks" pageTitle="Feedback" personName={dashboard.profile.fullName} roleLabel={dashboard.roleLabel} roles={actor.roles}>
      <div className={styles.page}>
        <header className={styles.newHeader}>
          <Link href="/portal/meus-feedbacks">← Voltar para Feedback</Link>
          <h1>{draftId ? "Continuar avaliação" : "Nova avaliação"}</h1>
          <p>Selecione sua autoavaliação ou um liderado autorizado e responda às competências do ciclo.</p>
        </header>
        {unavailable ? (
          <section className={styles.emptyState}>
            <strong>Formulário indisponível</strong>
            <p>É necessário ter um ciclo aberto, um formulário ativo e uma autoavaliação habilitada ou um liderado direto.</p>
          </section>
        ) : (
          <FeedbackForm
            cycle={context.cycle!}
            people={context.people}
            questions={context.questions}
            initialPersonId={context.draft?.subjectPersonId}
            initialAnswers={context.draft?.answers}
          />
        )}
      </div>
    </PortalShell>
  );
}
