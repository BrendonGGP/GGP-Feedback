import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardMotion } from "@/components/portal/dashboard-motion";
import { PortalIcon, type PortalIconName } from "@/components/portal/portal-icon";
import { PortalShell } from "@/components/portal/portal-shell";
import { getAuthenticatedActor } from "@/lib/auth/session";
import { getPortalDashboardData } from "@/lib/dashboard/dashboard-data";

import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Dashboard | GGP Feedback",
  description: "Visão geral segura do portal de feedback e desenvolvimento.",
};

type QuickAccess = Readonly<{
  label: string;
  description: string;
  href: string;
  icon: PortalIconName;
}>;

const formatToday = (): string =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

const getGreeting = (): string => {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );

  if (hour < 12) {
    return "Bom dia";
  }

  return hour < 18 ? "Boa tarde" : "Boa noite";
};

const getQuickAccesses = (roles: readonly string[]): QuickAccess[] => {
  const accesses: QuickAccess[] = [];

  if (roles.includes("SYSTEM_ADMIN")) {
    accesses.push({
      label: "Painel admin",
      description: "Contas e papéis",
      href: "/portal/administracao",
      icon: "admin",
    });
  }

  if (roles.includes("HR_ADMIN")) {
    accesses.push({
      label: "Gestão de pessoas",
      description: "Empresas, equipes e ciclos",
      href: "/portal/rh",
      icon: "admin",
    });
  }

  if (roles.includes("MANAGER")) {
    accesses.push({
      label: "Minha equipe",
      description: "Liderados diretos",
      href: "/portal/equipe",
      icon: "team",
    });
  }

  if (roles.includes("EMPLOYEE")) {
    accesses.push({
      label: "Feedback",
      description: "Registros autorizados",
      href: "/portal/meus-feedbacks",
      icon: "feedback",
    });
  }

  return accesses;
};

export default async function DashboardPage() {
  const actor = await getAuthenticatedActor({ allowPasswordChange: true });

  if (!actor) {
    redirect("/");
  }

  if (actor.mustChangePassword) {
    redirect("/portal/alterar-senha");
  }

  const dashboard = await getPortalDashboardData(actor);
  if (!dashboard) {
    redirect("/");
  }

  const quickAccesses = getQuickAccesses(actor.roles);
  const feedbackTotal = dashboard.feedbackSummary
    ? dashboard.feedbackSummary.drafts + dashboard.feedbackSummary.submitted
    : 0;

  return (
    <PortalShell
      activePath="/portal/dashboard"
      pageTitle="Dashboard"
      personName={dashboard.profile.fullName}
      roleLabel={dashboard.roleLabel}
      roles={actor.roles}
    >
      <DashboardMotion>
        <div className={styles.dashboard}>
          <section className={styles.welcome} data-dashboard-reveal aria-labelledby="dashboard-title">
            <div>
              <p className={styles.eyebrow}>Visão geral</p>
              <h1 id="dashboard-title">{getGreeting()}, {dashboard.profile.firstName}</h1>
              <p className={styles.profileLine}>
                <span className={styles.today}>{formatToday()}</span>
                <span aria-hidden="true">•</span>
                <span>{dashboard.profile.jobTitle}</span>
                <span aria-hidden="true">•</span>
                <span>{dashboard.profile.department}</span>
              </p>
            </div>

            <div className={styles.roleCard}>
              <span className={styles.roleIcon} aria-hidden="true">
                <PortalIcon name={dashboard.primaryRole === "SYSTEM_ADMIN" ? "admin" : "user"} />
              </span>
              <span>
                <small>Seu perfil de acesso</small>
                <strong>{dashboard.roleLabel}</strong>
              </span>
            </div>
          </section>

          <div className={styles.companyPill} data-dashboard-reveal>
            <span className={styles.companyMark} aria-hidden="true">GGP</span>
            <span>Você faz parte de <strong>{dashboard.profile.company}</strong></span>
          </div>

          <section className={styles.metrics} aria-label="Indicadores principais">
            {dashboard.metrics.map((metric) => (
              <article
                className={styles.metricCard}
                data-dashboard-reveal
                data-tone={metric.tone}
                key={metric.label}
              >
                <span className={styles.metricAccent} aria-hidden="true" />
                <p>{metric.label}</p>
                <strong>{metric.value}</strong>
                <small>{metric.helper}</small>
              </article>
            ))}
          </section>

          <div className={styles.contentGrid}>
            <section className={styles.mainPanel} data-dashboard-reveal aria-labelledby="overview-title">
              <header className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Acompanhamento</p>
                  <h2 id="overview-title">
                    {dashboard.feedbackSummary ? "Feedbacks do ciclo" : "Limites de acesso"}
                  </h2>
                </div>
                <span className={styles.statusChip}>
                  <PortalIcon name={dashboard.feedbackSummary ? "check" : "admin"} />
                  {dashboard.feedbackSummary ? "Atualizado" : "Protegido"}
                </span>
              </header>

              {dashboard.feedbackSummary ? (
                <div className={styles.feedbackOverview}>
                  <div className={styles.progressSummary}>
                    <span>
                      <strong>{dashboard.feedbackSummary.completionRate}%</strong>
                      <small>concluídos</small>
                    </span>
                    <span className={styles.totalLabel}>{feedbackTotal} registros no escopo</span>
                  </div>
                  <div
                    className={styles.progressTrack}
                    role="img"
                    aria-label={`${dashboard.feedbackSummary.completionRate}% dos feedbacks concluídos`}
                  >
                    <span
                      style={
                        {
                          "--progress": `${dashboard.feedbackSummary.completionRate}%`,
                        } as CSSProperties
                      }
                    />
                  </div>
                  <dl className={styles.feedbackStats}>
                    <div>
                      <dt>Enviados</dt>
                      <dd>{dashboard.feedbackSummary.submitted}</dd>
                    </div>
                    <div>
                      <dt>Rascunhos</dt>
                      <dd>{dashboard.feedbackSummary.drafts}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className={styles.restrictedState}>
                  <span aria-hidden="true"><PortalIcon name="admin" /></span>
                  <div>
                    <h3>Acesso funcional protegido</h3>
                    <p>
                      Este perfil gerencia configurações, contas e papéis. Feedbacks
                      e dados de desenvolvimento permanecem fora do seu escopo.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <aside className={styles.sideColumn} aria-label="Informações complementares">
              <section className={styles.cycleCard} data-dashboard-reveal aria-labelledby="cycle-title">
                <header>
                  <span aria-hidden="true"><PortalIcon name="calendar" /></span>
                  <div>
                    <p className={styles.eyebrow}>Calendário</p>
                    <h2 id="cycle-title">Ciclo atual</h2>
                  </div>
                </header>
                {dashboard.primaryRole === "SYSTEM_ADMIN" ? (
                  <p className={styles.emptyMessage}>Informação funcional restrita para este perfil.</p>
                ) : dashboard.cycle ? (
                  <div className={styles.cycleDetails}>
                    <strong>{dashboard.cycle.name}</strong>
                    <span><PortalIcon name="clock" /> encerra em {dashboard.cycle.endsAt}</span>
                  </div>
                ) : (
                  <p className={styles.emptyMessage}>Nenhum ciclo aberto neste momento.</p>
                )}
              </section>

              <section className={styles.scopeCard} data-dashboard-reveal aria-labelledby="scope-title">
                <p className={styles.eyebrow}>Permissões</p>
                <h2 id="scope-title">Seu escopo</h2>
                <p>{dashboard.roleDescription}</p>
                <span><PortalIcon name="check" /> Validado no servidor</span>
              </section>
            </aside>
          </div>

          <section className={styles.quickSection} data-dashboard-reveal aria-labelledby="quick-title">
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Navegação</p>
                <h2 id="quick-title">Acessos rápidos</h2>
              </div>
            </header>
            <div className={styles.quickGrid}>
              {quickAccesses.map((access) => (
                <Link href={access.href} key={access.href}>
                  <span className={styles.quickIcon} aria-hidden="true">
                    <PortalIcon name={access.icon} />
                  </span>
                  <span>
                    <strong>{access.label}</strong>
                    <small>{access.description}</small>
                  </span>
                  <PortalIcon name="arrow" />
                </Link>
              ))}
            </div>
          </section>

          {dashboard.primaryRole !== "SYSTEM_ADMIN" ? (
            <section className={styles.pdiNotice} data-dashboard-reveal aria-label="Planejamento do PDI">
              <span aria-hidden="true"><PortalIcon name="feedback" /></span>
              <div>
                <p className={styles.eyebrow}>Próxima fase</p>
                <h2>PDI será construído após o fluxo de Feedback</h2>
                <p>O MVP atual prioriza ciclos e feedbacks. Nenhum progresso de PDI é inventado nesta tela.</p>
              </div>
            </section>
          ) : null}
        </div>
      </DashboardMotion>
    </PortalShell>
  );
}
