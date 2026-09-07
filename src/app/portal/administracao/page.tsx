import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalIcon } from "@/components/portal/portal-icon";
import { PortalShell } from "@/components/portal/portal-shell";
import {
  MANAGED_ACCOUNT_STATUSES,
  getSystemAccountManagement,
} from "@/lib/administration/account-management";
import { getAuthenticatedActor } from "@/lib/auth/session";
import {
  ACCESS_ROLES,
  canAdministerSystem,
  type AccessRole,
} from "@/lib/authorization/access-control";
import { getPortalDashboardData } from "@/lib/dashboard/dashboard-data";

import { ActionSubmitButton } from "./action-submit-button";
import {
  revokeAccountSessionsAction,
  updateAccountAction,
} from "./actions";
import styles from "./administration.module.css";

type AdministrationPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

const roleLabels: Record<AccessRole, string> = {
  SYSTEM_ADMIN: "Administrador do Sistema",
  HR_ADMIN: "RH",
  MANAGER: "Gestor",
  EMPLOYEE: "Colaborador",
};

const statusLabels = {
  PENDING_ACTIVATION: "Ativação pendente",
  ACTIVE: "Ativa",
  LOCKED: "Bloqueada",
  DISABLED: "Desabilitada",
} as const;

const readParam = (value: string | string[] | undefined): string =>
  typeof value === "string" ? value.slice(0, 240) : "";

const formatLastLogin = (value: string | null): string => {
  if (!value) return "Nunca acessou";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
};

export default async function SystemAdministrationPage({
  searchParams,
}: AdministrationPageProps) {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");
  if (actor.mustChangePassword) redirect("/portal/alterar-senha");
  if (!canAdministerSystem(actor)) redirect("/portal/dashboard");

  const params = await searchParams;
  const query = readParam(params.busca);
  const status = readParam(params.status);
  const [dashboard, management] = await Promise.all([
    getPortalDashboardData(actor),
    getSystemAccountManagement(actor, { query, status }),
  ]);
  if (!dashboard || !management) redirect("/portal/dashboard");

  const successMessage = readParam(params.sucesso);
  const errorMessage = readParam(params.erro);

  return (
    <PortalShell
      activePath="/portal/administracao"
      pageTitle="Painel admin"
      personName={dashboard.profile.fullName}
      roleLabel={dashboard.roleLabel}
      roles={actor.roles}
    >
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Administração técnica</p>
            <h1>Controle de acessos</h1>
            <p>
              Gerencie contas, papéis e sessões. O conteúdo de Feedback e PDI
              permanece isolado deste perfil.
            </p>
          </div>
          <div className={styles.securityBadge}>
            <PortalIcon name="admin" />
            <span>Segregação funcional ativa</span>
          </div>
        </header>

        {successMessage ? <p className={styles.successMessage} role="status">{successMessage}</p> : null}
        {errorMessage ? <p className={styles.errorMessage} role="alert">{errorMessage}</p> : null}

        <section className={styles.metrics} aria-label="Resumo das contas">
          <article><span>Contas cadastradas</span><strong>{management.metrics.totalAccounts}</strong><small>identidades provisionadas</small></article>
          <article><span>Contas ativas</span><strong>{management.metrics.activeAccounts}</strong><small>acessos habilitados</small></article>
          <article><span>Requerem atenção</span><strong>{management.metrics.attentionAccounts}</strong><small>pendentes, bloqueadas ou desabilitadas</small></article>
          <article><span>Sessões ativas</span><strong>{management.metrics.activeSessions}</strong><small>sessões válidas agora</small></article>
        </section>

        <section className={styles.panel} aria-labelledby="accounts-title">
          <header className={styles.panelHeader}>
            <div><p className={styles.eyebrow}>Contas e permissões</p><h2 id="accounts-title">Usuários provisionados</h2></div>
            <span>{management.filteredTotal} resultados</span>
          </header>

          <form className={styles.filters} method="get" role="search">
            <label>
              <span>Buscar conta</span>
              <input type="search" name="busca" defaultValue={management.filters.query} placeholder="Nome, e-mail ou identificador" maxLength={100} />
            </label>
            <label>
              <span>Status</span>
              <select name="status" defaultValue={management.filters.status ?? ""}>
                <option value="">Todos os status</option>
                {MANAGED_ACCOUNT_STATUSES.map((accountStatus) => <option value={accountStatus} key={accountStatus}>{statusLabels[accountStatus]}</option>)}
              </select>
            </label>
            <button type="submit">Aplicar filtros</button>
            <Link href="/portal/administracao">Limpar</Link>
          </form>

          {management.accounts.length === 0 ? (
            <p className={styles.emptyState}>Nenhuma conta encontrada com esses filtros.</p>
          ) : (
            <div className={styles.tableScroller} tabIndex={0}>
              <table>
                <caption className={styles.srOnly}>Contas provisionadas e controles de acesso</caption>
                <thead><tr><th scope="col">Pessoa</th><th scope="col">Conta</th><th scope="col">Papéis</th><th scope="col">Status</th><th scope="col">Sessões</th><th scope="col">Ações</th></tr></thead>
                <tbody>
                  {management.accounts.map((account) => {
                    const updateFormId = `account-${account.id}`;
                    return (
                      <tr key={account.id}>
                        <td data-label="Pessoa">
                          <div className={styles.personCell}>
                            <span aria-hidden="true">{account.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                            <div><strong>{account.fullName}</strong><small>{account.jobTitle}</small><small>{account.companyName} · {account.departmentName}</small></div>
                          </div>
                        </td>
                        <td data-label="Conta"><div className={styles.accountCell}><strong>{account.loginIdentifier}</strong><small>{account.corporateEmail ?? "Sem e-mail corporativo"}</small>{account.mustChangePassword ? <em>Troca de senha pendente</em> : null}</div></td>
                        <td data-label="Papéis">
                          <fieldset className={styles.roleOptions} disabled={account.isCurrent}>
                            <legend className={styles.srOnly}>Papéis de {account.fullName}</legend>
                            {ACCESS_ROLES.map((role) => (
                              <label key={role} title={roleLabels[role]}>
                                <input type="checkbox" name="roles" value={role} defaultChecked={account.roles.includes(role)} form={updateFormId} />
                                <span>{roleLabels[role]}</span>
                              </label>
                            ))}
                          </fieldset>
                        </td>
                        <td data-label="Status">
                          <select className={styles.statusSelect} name="status" defaultValue={account.status} form={updateFormId} disabled={account.isCurrent} aria-label={`Status de ${account.fullName}`}>
                            {MANAGED_ACCOUNT_STATUSES.map((accountStatus) => <option value={accountStatus} key={accountStatus}>{statusLabels[accountStatus]}</option>)}
                          </select>
                          <span className={styles.statusBadge} data-status={account.status}>{statusLabels[account.status]}</span>
                        </td>
                        <td data-label="Sessões"><div className={styles.sessionCell}><strong>{account.activeSessions}</strong><small>{formatLastLogin(account.lastLoginAt)}</small></div></td>
                        <td data-label="Ações">
                          {account.isCurrent ? (
                            <span className={styles.currentAccount}>Conta atual protegida</span>
                          ) : (
                            <div className={styles.actions}>
                              <form id={updateFormId} action={updateAccountAction}>
                                <input type="hidden" name="accountId" value={account.id} />
                                <ActionSubmitButton label="Salvar acesso" pendingLabel="Salvando..." />
                              </form>
                              <form action={revokeAccountSessionsAction}>
                                <input type="hidden" name="accountId" value={account.id} />
                                <ActionSubmitButton label="Revogar sessões" pendingLabel="Revogando..." tone="secondary" disabled={account.activeSessions === 0} />
                              </form>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {management.resultLimited ? <p className={styles.resultLimit}>Exibindo os primeiros 100 resultados. Refine os filtros para localizar outra conta.</p> : null}
        </section>
      </div>
    </PortalShell>
  );
}
