import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalIcon } from "@/components/portal/portal-icon";
import { PortalShell } from "@/components/portal/portal-shell";
import { getAuthenticatedActor } from "@/lib/auth/session";
import { canAdministerHrDomain } from "@/lib/authorization/access-control";
import { getPortalDashboardData } from "@/lib/dashboard/dashboard-data";
import {
  getHrPeopleDirectory,
  PEOPLE_DIRECTORY_STATUSES,
  PEOPLE_DIRECTORY_VIEWS,
} from "@/lib/hr/people-directory";

import styles from "./pessoas.module.css";

export const metadata: Metadata = {
  title: "Colaboradores | GGP Feedback",
  description: "Base cadastral de colaboradores e gestores da estrutura GGP.",
};

type PeoplePageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

const firstValue = (value: string | string[] | undefined): string =>
  typeof value === "string" ? value : "";

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "G"}${parts.at(-1)?.[0] ?? "G"}`.toUpperCase();
};

const relationshipLabel = (isManager: boolean, hasManager: boolean): string => {
  if (isManager && hasManager) return "Gestor e liderado";
  return isManager ? "Gestor" : "Colaborador";
};

export default async function HrPeoplePage({ searchParams }: PeoplePageProps) {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");
  if (actor.mustChangePassword) redirect("/portal/alterar-senha");
  if (!canAdministerHrDomain(actor)) redirect("/portal/dashboard");

  const params = await searchParams;
  const [dashboard, directory] = await Promise.all([
    getPortalDashboardData(actor),
    getHrPeopleDirectory(actor, {
      query: firstValue(params.busca),
      view: firstValue(params.visao),
      status: firstValue(params.status),
    }),
  ]);
  if (!dashboard || !directory) redirect("/portal/dashboard");

  return (
    <PortalShell
      activePath="/portal/rh/pessoas"
      pageTitle="Colaboradores"
      personName={dashboard.profile.fullName}
      roleLabel={dashboard.roleLabel}
      roles={actor.roles}
    >
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Base cadastral</p>
            <h1>Colaboradores e gestores</h1>
            <p>Consulte o quadro ativo e a relação de liderança sem duplicar pessoas entre as visões.</p>
          </div>
          <div className={styles.heroActions}>
            <Link className={styles.secondaryButton} href="/portal/rh/organizacao#cadastro-pessoa">
              <PortalIcon name="team" />
              Cadastrar pessoa
            </Link>
            <span className={styles.scopeBadge}><PortalIcon name="check" /> Escopo RH validado</span>
          </div>
        </header>

        <section className={styles.metrics} aria-label="Resumo da base cadastral">
          <article data-tone="aqua"><span>Pessoas ativas</span><strong>{directory.metrics.activePeople}</strong><small>cadastros funcionais</small></article>
          <article data-tone="green"><span>Gestores ativos</span><strong>{directory.metrics.activeManagers}</strong><small>com liderados diretos</small></article>
          <article data-tone="amber"><span>Raízes da estrutura</span><strong>{directory.metrics.roots}</strong><small>sem gestor superior</small></article>
          <article data-tone="neutral"><span>Sem conta vinculada</span><strong>{directory.metrics.withoutAccount}</strong><small>provisionamento separado</small></article>
        </section>

        <section className={styles.panel} aria-labelledby="directory-title">
          <header className={styles.panelHeader}>
            <div><p className={styles.eyebrow}>Quadro organizacional</p><h2 id="directory-title">Pessoas cadastradas</h2></div>
            <span>{directory.filteredTotal} {directory.filteredTotal === 1 ? "resultado" : "resultados"}</span>
          </header>

          <form className={styles.filters} method="get" role="search">
            <label className={styles.searchField}>
              <span>Buscar pessoa</span>
              <input name="busca" type="search" defaultValue={directory.filters.query} placeholder="Nome, cargo, empresa ou setor" maxLength={100} />
            </label>
            <label>
              <span>Visão</span>
              <select name="visao" defaultValue={directory.filters.view}>
                <option value={PEOPLE_DIRECTORY_VIEWS[0]}>Todos os colaboradores</option>
                <option value={PEOPLE_DIRECTORY_VIEWS[1]}>Somente gestores</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select name="status" defaultValue={directory.filters.status}>
                <option value={PEOPLE_DIRECTORY_STATUSES[0]}>Somente ativos</option>
                <option value={PEOPLE_DIRECTORY_STATUSES[1]}>Ativos e inativos</option>
              </select>
            </label>
            <button type="submit">Aplicar filtros</button>
            <Link href="/portal/rh/pessoas">Limpar</Link>
          </form>

          {directory.people.length === 0 ? (
            <div className={styles.emptyState} role="status">
              <span aria-hidden="true"><PortalIcon name="team" /></span>
              <h3>Nenhuma pessoa encontrada</h3>
              <p>Revise os filtros ou cadastre uma nova pessoa na estrutura organizacional.</p>
            </div>
          ) : (
            <div className={styles.tableScroller} tabIndex={0}>
              <table>
                <caption className={styles.srOnly}>Base de colaboradores e relação de liderança</caption>
                <thead>
                  <tr><th scope="col">Pessoa</th><th scope="col">Alocação</th><th scope="col">Gestor direto</th><th scope="col">Relação</th><th scope="col">Conta</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {directory.people.map((person) => {
                    const isManager = person.directReportCount > 0;
                    return (
                      <tr key={person.id}>
                        <td data-label="Pessoa">
                          <div className={styles.personCell}>
                            <span className={styles.avatar} aria-hidden="true">{initials(person.fullName)}</span>
                            <div><strong>{person.fullName}</strong><small>{person.jobTitle}</small><small>{person.corporateEmail ?? "Sem e-mail corporativo"}</small></div>
                          </div>
                        </td>
                        <td data-label="Alocação"><div className={styles.allocationCell}><strong>{person.departmentName}</strong><small>{person.companyName}</small></div></td>
                        <td data-label="Gestor direto">{person.managerName ?? "Sem gestor superior"}</td>
                        <td data-label="Relação"><span className={styles.relationship} data-manager={isManager}>{relationshipLabel(isManager, person.hasManager)}</span><small>{isManager ? `${person.directReportCount} liderado(s) ativo(s)` : "Sem liderados ativos"}</small></td>
                        <td data-label="Conta"><span className={styles.accountStatus} data-linked={person.hasAccount}>{person.hasAccount ? "Vinculada" : "Não vinculada"}</span></td>
                        <td data-label="Status"><span className={styles.status} data-active={person.active}>{person.active ? "Ativa" : "Inativa"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {directory.resultLimited ? <p className={styles.resultLimit}>Exibindo os primeiros 200 resultados. Refine a busca para localizar outra pessoa.</p> : null}
        </section>

        <aside className={styles.infoNote} role="note">
          <PortalIcon name="admin" />
          <p><strong>Cadastro e acesso são etapas separadas.</strong> O RH mantém pessoas e vínculos; a conta e o papel de acesso continuam sob responsabilidade do Administrador do Sistema.</p>
        </aside>
      </div>
    </PortalShell>
  );
}
