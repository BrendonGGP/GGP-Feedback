import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";
import { getAuthenticatedActor } from "@/lib/auth/session";
import { getPortalDashboardData } from "@/lib/dashboard/dashboard-data";
import { getFeedbackAnalytics } from "@/lib/feedback/feedback-service";

import styles from "../feedback.module.css";

const formatAverage = (value: number): string => value.toFixed(1).replace(".", ",");
const scoreWidth = (value: number): string => `${Math.max(0, Math.min(100, (value / 5) * 100))}%`;

export default async function FeedbackAnalyticsPage() {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");
  if (!actor.roles.includes("HR_ADMIN") && !actor.roles.includes("MANAGER")) {
    redirect("/portal/meus-feedbacks");
  }

  const [dashboard, analytics] = await Promise.all([
    getPortalDashboardData(actor),
    getFeedbackAnalytics(actor),
  ]);
  if (!dashboard || !analytics) redirect("/portal/dashboard");

  return (
    <PortalShell
      activePath="/portal/meus-feedbacks/analises"
      pageTitle="Análises de Feedback"
      personName={dashboard.profile.fullName}
      roleLabel={dashboard.roleLabel}
      roles={actor.roles}
    >
      <div className={styles.page}>
        <header className={styles.newHeader}>
          <Link href="/portal/meus-feedbacks">← Voltar para Feedback</Link>
          <p className={styles.eyebrow}>Desenvolvimento</p>
          <h1>Análises de Feedback</h1>
          <p>Identifique tendências de desempenho sem expor respostas textuais nesta visão.</p>
        </header>

        <section className={styles.metrics} aria-label="Resumo das análises">
          <article><span>Feedbacks enviados</span><strong>{analytics.totalFeedbacks}</strong><small>no seu escopo de acesso</small></article>
          <article><span>Média geral</span><strong>{formatAverage(analytics.average)}<span className={styles.metricSuffix}> / 5</span></strong><small>somente notas respondidas</small></article>
          <article><span>Ciclos avaliados</span><strong>{analytics.cycleCount}</strong><small>com feedback enviado</small></article>
        </section>

        {analytics.totalFeedbacks === 0 ? (
          <section className={styles.emptyState}>
            <strong>Ainda não há dados para analisar</strong>
            <p>As médias aparecerão quando houver feedbacks concluídos no seu escopo.</p>
          </section>
        ) : (
          <div className={styles.analyticsGrid}>
            <section className={styles.analyticsCard} aria-labelledby="cycles-analysis-title">
              <header><div><p className={styles.eyebrow}>Evolução</p><h2 id="cycles-analysis-title">Média por ciclo</h2></div><span>Escala de 1 a 5</span></header>
              <div className={styles.analyticsRows}>
                {analytics.cycles.map((cycle) => (
                  <article key={cycle.name}>
                    <div><strong>{cycle.name}</strong><span>{cycle.count} {cycle.count === 1 ? "feedback" : "feedbacks"}</span></div>
                    <div className={styles.scoreLine}><div className={styles.scoreTrack}><span style={{ width: scoreWidth(cycle.average) }} /></div><strong>{formatAverage(cycle.average)}</strong></div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.analyticsCard} aria-labelledby="competencies-analysis-title">
              <header><div><p className={styles.eyebrow}>Competências</p><h2 id="competencies-analysis-title">Média por competência</h2></div><span>{analytics.competencies.length} itens</span></header>
              <div className={styles.analyticsRows}>
                {analytics.competencies.map((competency) => (
                  <article key={competency.name}>
                    <div><strong>{competency.name}</strong><span>{competency.count} respostas</span></div>
                    <div className={styles.scoreLine}><div className={styles.scoreTrack}><span style={{ width: scoreWidth(competency.average) }} /></div><strong>{formatAverage(competency.average)}</strong></div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {analytics.limited ? <p className={styles.analyticsNote} role="note">Exibindo os 5.000 feedbacks mais recentes. Refinamentos adicionais serão disponibilizados em uma próxima versão.</p> : null}
      </div>
    </PortalShell>
  );
}
