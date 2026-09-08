import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PortalIcon } from "@/components/portal/portal-icon";
import { PortalShell } from "@/components/portal/portal-shell";
import { getAuthenticatedActor } from "@/lib/auth/session";
import { getPortalDashboardData } from "@/lib/dashboard/dashboard-data";
import { getManagerTeam } from "@/lib/team/team-service";

import styles from "./equipe.module.css";

export const metadata: Metadata = {
  title: "Minha equipe | GGP Feedback",
  description: "Acompanhamento dos liderados diretos e dos feedbacks sob sua responsabilidade.",
};

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "G"}${parts.at(-1)?.[0] ?? "G"}`.toUpperCase();
};

export default async function ManagerTeamPage() {
  const actor = await getAuthenticatedActor({ allowPasswordChange: true });

  if (!actor) {
    redirect("/");
  }
  if (actor.mustChangePassword) {
    redirect("/portal/alterar-senha");
  }
  if (actor.roles.includes("SYSTEM_ADMIN") || !actor.roles.includes("MANAGER")) {
    redirect("/portal/dashboard");
  }

  const [dashboard, team] = await Promise.all([
    getPortalDashboardData(actor),
    getManagerTeam(actor),
  ]);

  if (!dashboard || !team) {
    redirect("/portal/dashboard");
  }

  return (
    <PortalShell
      activePath="/portal/equipe"
      pageTitle="Minha equipe"
      personName={dashboard.profile.fullName}
      roleLabel={dashboard.roleLabel}
      roles={actor.roles}
    >
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Gestão de pessoas</p>
            <h1>Minha equipe</h1>
            <p>Acompanhe os liderados diretos e os feedbacks sob sua responsabilidade.</p>
          </div>
          <div className={styles.scopeBadge} role="status">
            <PortalIcon name="team" />
            <span>Somente equipe direta</span>
          </div>
        </header>

        <section className={styles.metrics} aria-label="Resumo da equipe">
          <article data-tone="aqua">
            <span>Liderados ativos</span>
            <strong>{team.metrics.activeMembers}</strong>
            <small>pessoas na sua equipe direta</small>
          </article>
          <article data-tone="green">
            <span>Feedbacks enviados</span>
            <strong>{team.metrics.submittedFeedbacks}</strong>
            <small>registros concluídos por você</small>
          </article>
          <article data-tone="amber">
            <span>Rascunhos</span>
            <strong>{team.metrics.draftFeedbacks}</strong>
            <small>feedbacks que precisam de atenção</small>
          </article>
          <article data-tone="neutral">
            <span>Setor principal</span>
            <strong className={styles.metricText}>{team.manager.departmentName}</strong>
            <small>{team.manager.companyName}</small>
          </article>
        </section>

        <section className={styles.teamPanel} aria-labelledby="team-title">
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Equipe direta</p>
              <h2 id="team-title">Colaboradores ativos</h2>
            </div>
            <span>{team.members.length} {team.members.length === 1 ? "pessoa" : "pessoas"}</span>
          </header>

          {team.members.length === 0 ? (
            <div className={styles.emptyState} role="status">
              <span className={styles.emptyIcon} aria-hidden="true"><PortalIcon name="team" /></span>
              <h3>Nenhum liderado ativo vinculado</h3>
              <p>O RH precisa revisar a estrutura organizacional para vincular pessoas à sua equipe.</p>
            </div>
          ) : (
            <div className={styles.memberGrid}>
              {team.members.map((member) => (
                <article className={styles.memberCard} key={member.id}>
                  <header className={styles.memberHeader}>
                    <span className={styles.avatar} aria-hidden="true">{initials(member.fullName)}</span>
                    <div>
                      <h3>{member.fullName}</h3>
                      <p>{member.jobTitle}</p>
                    </div>
                  </header>

                  <dl className={styles.memberDetails}>
                    <div>
                      <dt>Alocação</dt>
                      <dd>{member.departmentName}</dd>
                    </div>
                    <div>
                      <dt>E-mail</dt>
                      <dd>{member.corporateEmail ?? "Não informado"}</dd>
                    </div>
                  </dl>

                  <div className={styles.feedbackSummary}>
                    <div>
                      <span>Feedbacks enviados</span>
                      <strong>{member.feedback.submitted}</strong>
                    </div>
                    <div>
                      <span>Rascunhos</span>
                      <strong data-warning={member.feedback.drafts > 0}>{member.feedback.drafts}</strong>
                    </div>
                  </div>
                  <p className={styles.lastActivity}>
                    <PortalIcon name="clock" />
                    {member.feedback.lastActivityAt
                      ? `Última atividade em ${member.feedback.lastActivityAt}`
                      : "Nenhum feedback iniciado"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className={styles.cyclePanel} aria-label="Ciclo atual">
          <span className={styles.cycleIcon} aria-hidden="true"><PortalIcon name="calendar" /></span>
          <div>
            <p className={styles.eyebrow}>Ciclo atual</p>
            <h2>{team.cycle?.name ?? "Nenhum ciclo aberto"}</h2>
            <p>{team.cycle ? `Encerramento previsto para ${team.cycle.endsAt}.` : "Quando um ciclo for aberto, ele aparecerá aqui para acompanhamento."}</p>
          </div>
        </aside>
      </div>
    </PortalShell>
  );
}
