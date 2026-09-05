import { redirect } from "next/navigation";

import { PortalIcon } from "@/components/portal/portal-icon";
import { PortalShell } from "@/components/portal/portal-shell";
import { getAuthenticatedActor } from "@/lib/auth/session";
import { canAdministerHrDomain } from "@/lib/authorization/access-control";
import { getPortalDashboardData } from "@/lib/dashboard/dashboard-data";
import {
  getHrCycleManagement,
  nextCycleStatus,
} from "@/lib/hr/cycle-management";

import { CycleCreateForm } from "./cycle-create-form";
import { updateCycleStatusAction } from "./actions";
import styles from "./rh.module.css";

type HrPortalPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

const cycleStatusLabels = {
  DRAFT: "Rascunho",
  OPEN: "Aberto",
  CLOSED: "Encerrado",
  ARCHIVED: "Arquivado",
} as const;

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

const getFeedbackLabel = (count: number): string =>
  `${count} ${count === 1 ? "feedback" : "feedbacks"}`;

export default async function HrPortalPage({ searchParams }: HrPortalPageProps) {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");
  if (actor.mustChangePassword) redirect("/portal/alterar-senha");
  if (!canAdministerHrDomain(actor)) redirect("/portal/dashboard");

  const params = await searchParams;
  const [dashboard, management] = await Promise.all([
    getPortalDashboardData(actor),
    getHrCycleManagement(actor),
  ]);
  if (!dashboard || !management) redirect("/portal/dashboard");

  const feedbackCreated = params.criado === "1";
  const cycleUpdated = params.atualizado === "1";
  const actionError = typeof params.erro === "string" ? params.erro : "";

  return (
    <PortalShell
      activePath="/portal/rh"
      pageTitle="Ciclos e formulários"
      personName={dashboard.profile.fullName}
      roleLabel={dashboard.roleLabel}
      roles={actor.roles}
    >
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Recursos Humanos</p>
            <h1>Ciclos e formulários</h1>
            <p>Configure as rodadas de Feedback e acompanhe a disponibilidade dos formulários.</p>
          </div>
          <div className={styles.scopeBadge}>
            <PortalIcon name="check" />
            <span>Escopo RH validado no servidor</span>
          </div>
        </header>

        {feedbackCreated ? <p className={styles.successMessage} role="status">Ciclo criado como rascunho.</p> : null}
        {cycleUpdated ? <p className={styles.successMessage} role="status">Status do ciclo atualizado.</p> : null}
        {actionError ? <p className={styles.errorMessage} role="alert">{actionError}</p> : null}

        <section className={styles.metrics} aria-label="Resumo do domínio de RH">
          <article><span>Pessoas ativas</span><strong>{management.metrics.activePeople}</strong><small>cadastros disponíveis</small></article>
          <article><span>Ciclos abertos</span><strong>{management.metrics.openCycles}</strong><small>em acompanhamento</small></article>
          <article><span>Formulários ativos</span><strong>{management.metrics.activeTemplates}</strong><small>prontos para uso</small></article>
          <article><span>Feedbacks no escopo</span><strong>{management.metrics.feedbacks}</strong><small>rascunhos e enviados</small></article>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.panel} aria-labelledby="cycles-title">
            <header className={styles.panelHeader}>
              <div><p className={styles.eyebrow}>Acompanhamento</p><h2 id="cycles-title">Ciclos cadastrados</h2></div>
              <span>{management.cycles.length} {management.cycles.length === 1 ? "ciclo" : "ciclos"}</span>
            </header>
            {management.cycles.length === 0 ? (
              <p className={styles.emptyState}>Nenhum ciclo cadastrado. Crie o primeiro ao lado.</p>
            ) : (
              <div className={styles.cycleList}>
                {management.cycles.map((cycle) => {
                  const nextStatus = nextCycleStatus(cycle.status);
                  const template = cycle.templates[0];
                  return (
                    <article className={styles.cycleRow} key={cycle.id}>
                      <div className={styles.cycleIdentity}>
                        <span className={styles.cycleIcon}><PortalIcon name="calendar" /></span>
                        <div><h3>{cycle.name}</h3><p>{formatDate(cycle.startsAt)} até {formatDate(cycle.endsAt)}</p></div>
                      </div>
                      <div className={styles.cycleDetails}>
                        <span className={styles.status} data-status={cycle.status}>{cycleStatusLabels[cycle.status]}</span>
                        <span>{template ? `${template.name} · ${template.questionCount} perguntas` : "Sem formulário"}</span>
                        <span>{getFeedbackLabel(cycle.feedbackCount)}{cycle.selfAssessmentEnabled ? " · autoavaliação" : ""}</span>
                      </div>
                      {nextStatus ? (
                        <form action={updateCycleStatusAction}>
                          <input type="hidden" name="cycleId" value={cycle.id} />
                          <input type="hidden" name="targetStatus" value={nextStatus} />
                          <button type="submit">{nextStatus === "OPEN" ? "Abrir ciclo" : nextStatus === "CLOSED" ? "Encerrar" : "Arquivar"}</button>
                        </form>
                      ) : <span className={styles.noAction}>Sem ações</span>}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className={styles.createPanel} aria-label="Criar ciclo">
            <CycleCreateForm templates={management.templates} />
          </aside>
        </div>

        <section className={styles.panel} aria-labelledby="templates-title">
          <header className={styles.panelHeader}>
            <div><p className={styles.eyebrow}>Biblioteca</p><h2 id="templates-title">Formulários ativos</h2></div>
            <span>Competências usadas nos ciclos</span>
          </header>
          <div className={styles.templateGrid}>
            {management.templates.length === 0 ? <p className={styles.emptyState}>Nenhum formulário ativo encontrado.</p> : null}
            {management.templates.map((template) => (
              <article className={styles.templateCard} key={template.id}>
                <div className={styles.templateTitle}><span><PortalIcon name="feedback" /></span><div><h3>{template.name}</h3><p>Versão {template.version} · {template.questions.length} perguntas</p></div></div>
                <ol>{template.questions.slice(0, 5).map((question) => <li key={question.id}><span>{question.position}</span><p>{question.prompt.split(" — ")[0]}</p><small>{question.type === "RATING" ? "Nota" : "Texto"}</small></li>)}</ol>
                {template.questions.length > 5 ? <small className={styles.moreQuestions}>+ {template.questions.length - 5} perguntas adicionais</small> : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
