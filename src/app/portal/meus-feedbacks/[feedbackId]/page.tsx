import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";
import { getAuthenticatedActor } from "@/lib/auth/session";
import { getPortalDashboardData } from "@/lib/dashboard/dashboard-data";
import { getFeedbackDetail } from "@/lib/feedback/feedback-service";

import styles from "../feedback.module.css";

type FeedbackDetailPageProps = Readonly<{
  params: Promise<{ feedbackId: string }>;
}>;

const splitPrompt = (prompt: string): readonly [string, string] => {
  const [title, ...description] = prompt.split(" — ");
  return [title, description.join(" — ")];
};

export default async function FeedbackDetailPage({ params }: FeedbackDetailPageProps) {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");
  const { feedbackId } = await params;
  const [dashboard, detail] = await Promise.all([
    getPortalDashboardData(actor),
    getFeedbackDetail(actor, feedbackId),
  ]);
  if (!dashboard || !detail) redirect("/portal/meus-feedbacks?erro=nao-encontrado");

  return (
    <PortalShell activePath="/portal/meus-feedbacks" pageTitle="Feedback" personName={dashboard.profile.fullName} roleLabel={dashboard.roleLabel} roles={actor.roles}>
      <div className={styles.page}>
        <header className={styles.newHeader}>
          <Link href="/portal/meus-feedbacks">← Voltar para Feedback</Link>
          <div className={styles.detailHeading}>
            <div><p className={styles.eyebrow}>Feedback individual</p><h1>{detail.subject.fullName}</h1><p>{detail.cycleName} · {detail.subject.jobTitle} · {detail.subject.departmentName}</p></div>
            <mark className={styles.detailStatus} data-status={detail.status}>{detail.status === "DRAFT" ? "Rascunho" : "Enviado"}</mark>
          </div>
        </header>
        <section className={styles.detailMeta} aria-label="Dados do feedback"><div><span>Avaliador</span><strong>{detail.evaluatorName}</strong></div><div><span>Empresa</span><strong>{detail.subject.companyName}</strong></div><div><span>Atualizado em</span><strong>{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(detail.submittedAt ?? detail.createdAt))}</strong></div></section>
        {detail.canEdit ? <div className={styles.draftNotice} role="status"><span>Este feedback ainda é um rascunho.</span><Link className={styles.primaryButton} href={`/portal/meus-feedbacks/novo?feedback=${detail.id}`}>Continuar rascunho</Link></div> : null}
        <section className={styles.detailSection} aria-labelledby="answers-title"><header><h2 id="answers-title">Competências e comentários</h2><p>Conteúdo disponível conforme seu escopo de acesso.</p></header><div className={styles.answerList}>{detail.answers.map((answer) => { const [title, description] = splitPrompt(answer.prompt); return <article className={styles.answerCard} key={answer.questionId}><div><h3>{title}</h3>{description ? <p>{description}</p> : null}</div>{answer.type === "RATING" ? <strong className={styles.ratingValue} aria-label={`Nota ${answer.rating ?? "não preenchida"}`}>{answer.rating ?? "—"}</strong> : <p className={styles.answerText}>{answer.text || "Não preenchido."}</p>}</article>; })}</div></section>
      </div>
    </PortalShell>
  );
}
