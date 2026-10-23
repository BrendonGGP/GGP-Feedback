import { redirect } from "next/navigation";

import { Revelar } from "@/components/motion/revelar";
import { PortalIcon } from "@/components/portal/portal-icon";
import { PortalShell } from "@/components/portal/portal-shell";
import { getAuthenticatedActor } from "@/lib/auth/session";
import { canAdministerHrDomain } from "@/lib/authorization/access-control";
import { getPortalDashboardData } from "@/lib/dashboard/dashboard-data";
import { getHrOrganization } from "@/lib/hr/organization-management";
import { getAccessProfiles } from "@/lib/hr/person-access";

import {
  createCompanyAction,
  createDepartmentAction,
  createPersonAction,
  deletePersonAction,
  transferReportsAction,
  updateAccessProfileAction,
  updatePersonOrganizationAction,
} from "./actions";
import styles from "./organization.module.css";
import { SubmitButton } from "./submit-button";

type OrganizationPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

const firstValue = (value: string | string[] | undefined): string =>
  typeof value === "string" ? value : "";

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? "G"}${parts.at(-1)?.[0] ?? "G"}`.toUpperCase();
};

export default async function HrOrganizationPage({ searchParams }: OrganizationPageProps) {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");
  if (actor.mustChangePassword) redirect("/portal/alterar-senha");
  if (!canAdministerHrDomain(actor)) redirect("/portal/dashboard");

  const params = await searchParams;
  const [dashboard, organization] = await Promise.all([
    getPortalDashboardData(actor),
    getHrOrganization(actor, { search: firstValue(params.busca) }),
  ]);
  if (!dashboard || !organization) redirect("/portal/dashboard");
  const accessProfiles = await getAccessProfiles(actor, organization.people.map((person) => person.id));
  const profileLabel = (personId: string): string => {
    const profile = accessProfiles.get(personId);
    if (!profile) return "Sem conta";
    if (profile.roles.includes("SYSTEM_ADMIN")) return "Administrador";
    if (profile.roles.includes("HR_ADMIN")) return profile.roles.includes("MANAGER") ? "RH · Gestor" : "RH";
    if (profile.roles.includes("MANAGER")) return "Gestor";
    return "Colaborador";
  };

  const success = firstValue(params.sucesso);
  const error = firstValue(params.erro);
  const activeCompanies = organization.companies.filter((company) => company.active);
  const activeDepartments = activeCompanies.flatMap((company) =>
    company.departments
      .filter((department) => department.active)
      .map((department) => ({ ...department, companyId: company.id, companyName: company.name })),
  );
  // Só quem é gestor aparece como opção. Na edição, o gestor atual da pessoa
  // continua na lista mesmo que tenha deixado de ser gestor, para o campo não
  // trocar de valor sozinho ao salvar.
  const managerOptions = (person?: { id: string; managerId: string | null; managerName: string | null }) => {
    const options = organization.managers.filter((manager) => manager.id !== person?.id);
    if (person?.managerId && !options.some((manager) => manager.id === person.managerId)) {
      options.unshift({ id: person.managerId, fullName: person.managerName ?? "Gestor atual", jobTitle: "gestor atual" });
    }
    return options;
  };
  const canCreatePeople = activeCompanies.length > 0 && activeDepartments.length > 0;
  // UMG remains available to the data and cadastro flows; it is intentionally
  // omitted only from the visual structure overview requested by the business.
  const visibleCompanies = organization.companies.filter(
    (company) => company.name.trim().toLocaleLowerCase("pt-BR") !== "umg",
  );

  return (
    <PortalShell
      activePath="/portal/rh/organizacao"
      pageTitle="Estrutura organizacional"
      personName={dashboard.profile.fullName}
      roleLabel={dashboard.roleLabel}
      roles={actor.roles}
    >
      <Revelar className={styles.page}>
        <header className={styles.hero}>
          <div>
            <p className="sobretitulo">Recursos Humanos</p>
            <h1 className="titulo-grande">Estrutura organizacional</h1>
            <p className={styles.heroDescription}>Cadastre empresas, departamentos e pessoas e mantenha a linha de liderança atualizada.</p>
          </div>
          <div className={styles.scopeBadge}>
            <PortalIcon name="check" />
            <span>Histórico e auditoria ativos</span>
          </div>
        </header>

        {success ? <p className={styles.successMessage} role="status">{success}</p> : null}
        {error ? <p className={styles.errorMessage} role="alert">{error}</p> : null}

        <section className={styles.metrics} aria-label="Resumo da estrutura organizacional">
          <article data-revelar><span>Empresas ativas</span><strong>{organization.metrics.activeCompanies}</strong><small>unidades disponíveis</small></article>
          <article data-revelar><span>Departamentos ativos</span><strong>{organization.metrics.activeDepartments}</strong><small>alocações disponíveis</small></article>
          <article data-revelar><span>Pessoas ativas</span><strong>{organization.metrics.activePeople}</strong><small>cadastros funcionais</small></article>
          <article data-revelar><span>Sem gestor</span><strong>{organization.metrics.peopleWithoutManager}</strong><small>raízes da hierarquia</small></article>
        </section>

        <section className={styles.creationPanel} aria-labelledby="register-title">
          <header className={styles.panelHeader}>
            <div><p className="sobretitulo">Cadastros</p><h2 id="register-title">Adicionar à estrutura</h2></div>
            <span>Use Tab para avançar e Enter para enviar</span>
          </header>
          <div className={styles.creationGrid}>
            <details open className={styles.stepCard} data-revelar>
              <summary>
                <span className={styles.stepHeading}>
                  <span className={styles.stepNumber}>1</span>
                  <span><strong>Empresa</strong><small>Unidade principal da estrutura</small></span>
                </span>
                <span className={styles.disclosureText}>Crie a unidade principal</span>
              </summary>
              <form action={createCompanyAction} className={`${styles.form} ${styles.companyForm}`}>
                <label><span>Nome da empresa</span><input name="name" type="text" required minLength={2} maxLength={160} autoComplete="organization" placeholder="Ex.: GGP Desenvolvimento" /></label>
                <SubmitButton>Cadastrar empresa</SubmitButton>
              </form>
            </details>

            <details open className={styles.stepCard} data-revelar>
              <summary>
                <span className={styles.stepHeading}>
                  <span className={styles.stepNumber}>2</span>
                  <span><strong>Departamento</strong><small>Setor vinculado a uma empresa</small></span>
                </span>
                <span className={styles.disclosureText}>Vincule-o a uma empresa</span>
              </summary>
              <form action={createDepartmentAction} className={`${styles.form} ${styles.departmentForm}`}>
                <label><span>Empresa</span><select name="companyId" required defaultValue=""><option value="" disabled>Selecione a empresa</option>{activeCompanies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
                <label><span>Nome do departamento</span><input name="name" type="text" required minLength={2} maxLength={160} placeholder="Ex.: Recursos Humanos" /></label>
                <SubmitButton>Cadastrar departamento</SubmitButton>
              </form>
            </details>

            <details id="cadastro-pessoa" open className={`${styles.stepCard} ${styles.personCreation}`} data-revelar>
              <summary>
                <span className={styles.stepHeading}>
                  <span className={styles.stepNumber}>3</span>
                  <span><strong>Pessoa</strong><small>Cadastro funcional e linha de liderança</small></span>
                </span>
                <span className={styles.disclosureText}>Defina alocação e liderança</span>
              </summary>
              {!canCreatePeople ? <p className={styles.formNotice}>Cadastre uma empresa e um departamento ativos antes de adicionar pessoas.</p> : null}
              <form action={createPersonAction} className={styles.personForm}>
                <label><span>Nome completo</span><input name="fullName" required minLength={2} maxLength={200} autoComplete="name" /></label>
                <label><span>E-mail corporativo <small>opcional</small></span><input name="corporateEmail" type="email" maxLength={254} autoComplete="email" /></label>
                <label><span>Cargo</span><input name="jobTitle" required minLength={2} maxLength={160} autoComplete="organization-title" /></label>
                <label><span>Regime</span><input name="employmentRegime" required minLength={2} maxLength={80} placeholder="Ex.: CLT" /></label>
                <label><span>Empresa</span><select name="companyId" required defaultValue=""><option value="" disabled>Selecione a empresa</option>{activeCompanies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
                <label><span>Departamento</span><select name="departmentId" required defaultValue=""><option value="" disabled>Selecione empresa · departamento</option>{activeDepartments.map((department) => <option value={department.id} key={department.id}>{department.companyName} · {department.name}</option>)}</select></label>
                <label><span>Gestor direto <small>opcional</small></span><select name="managerId" defaultValue=""><option value="">Sem gestor direto</option>{managerOptions().map((manager) => <option value={manager.id} key={manager.id}>{manager.fullName} · {manager.jobTitle}</option>)}</select></label>
                <div className={styles.personSubmit}><p>A conta de acesso é criada separadamente pelo administrador do sistema.</p><SubmitButton>Cadastrar pessoa</SubmitButton></div>
              </form>
            </details>
          </div>
        </section>

        <section className={styles.structureGrid} aria-label="Empresas e departamentos">
          {visibleCompanies.map((company) => (
            <article className={styles.companyCard} key={company.id} data-revelar>
              <header><span><PortalIcon name="admin" /></span><div><h2>{company.name}</h2><p>{company.active ? "Empresa ativa" : "Empresa inativa"}</p></div></header>
              <ul>
                {company.departments.map((department) => <li key={department.id}><span>{department.name}</span><small data-active={department.active}>{department.active ? "Ativo" : "Inativo"}</small></li>)}
                {company.departments.length === 0 ? <li className={styles.emptyItem}>Nenhum departamento cadastrado</li> : null}
              </ul>
            </article>
          ))}
          {visibleCompanies.length === 0 ? <div className={styles.emptyState} data-revelar><span className={styles.emptyIcon}><PortalIcon name="organization" /></span><strong>Nenhuma empresa cadastrada.</strong></div> : null}
        </section>

        <section className={styles.peoplePanel} aria-labelledby="people-title" data-revelar>
          <header className={styles.panelHeader}>
            <div><p className="sobretitulo">Equipe</p><h2 id="people-title">Pessoas e lideranças</h2></div>
            <span>Até 200 cadastros · alterações protegidas por versão</span>
          </header>
          <details className={styles.transferPanel}>
            <summary>Transferir liderados de um gestor para outro</summary>
            <form action={transferReportsAction} className={styles.transferForm}>
              <label><span>Gestor atual</span><select name="fromManagerId" required defaultValue=""><option value="" disabled>Selecione quem tem liderados</option>{organization.managers.map((manager) => <option value={manager.id} key={manager.id}>{manager.fullName} · {manager.jobTitle}</option>)}</select></label>
              <label><span>Novo gestor</span><select name="toManagerId" required defaultValue=""><option value="" disabled>Selecione o novo gestor</option>{organization.managers.map((manager) => <option value={manager.id} key={manager.id}>{manager.fullName} · {manager.jobTitle}</option>)}</select></label>
              <label className={styles.reasonField}><span>Motivo <small>opcional</small></span><input name="reason" maxLength={240} placeholder="Ex.: reorganização da equipe" /></label>
              <SubmitButton>Transferir liderados</SubmitButton>
            </form>
          </details>
          <form method="get" action="/portal/rh/organizacao#people-title" role="search" className={styles.searchForm}>
            <label>
              <span className="sr-only">Pesquisar pessoa pelo nome</span>
              <PortalIcon name="search" size={18} />
              <input
                name="busca"
                type="search"
                defaultValue={organization.search}
                maxLength={120}
                placeholder="Pesquisar pelo nome"
                autoComplete="off"
              />
            </label>
            <button type="submit" className={styles.searchButton}>Pesquisar</button>
            {organization.search ? (
              <a href="/portal/rh/organizacao#people-title" className={styles.clearSearch}>Limpar</a>
            ) : null}
          </form>
          {organization.search ? (
            <p className={styles.searchSummary} role="status">
              {organization.people.length === 0
                ? `Nenhuma pessoa encontrada para “${organization.search}”.`
                : `${organization.people.length} resultado(s) para “${organization.search}”.`}
            </p>
          ) : null}
          <div className={styles.peopleList}>
            {organization.people.map((person) => (
              <details className={styles.personRow} key={person.id}>
                <summary>
                  <span className={styles.avatar}>{initials(person.fullName)}</span>
                  <span className={styles.personIdentity}><strong>{person.fullName}</strong><small>{person.jobTitle} · {person.departmentName}</small></span>
                  <span className={styles.personManager}><small>Gestor direto</small><strong>{person.managerName ?? "Sem gestor"}</strong></span>
                  <span className={styles.profileChip}>{profileLabel(person.id)}</span>
                  <span className={styles.status} data-active={person.active}>{person.active ? "Ativa" : "Inativa"}</span>
                </summary>
                <form action={updatePersonOrganizationAction} className={styles.editForm}>
                  <input type="hidden" name="personId" value={person.id} />
                  <input type="hidden" name="version" value={person.version} />
                  <label><span>Empresa</span><select name="companyId" required defaultValue={person.companyId}>{activeCompanies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
                  <label><span>Departamento</span><select name="departmentId" required defaultValue={person.departmentId}>{activeDepartments.map((department) => <option value={department.id} key={department.id}>{department.companyName} · {department.name}</option>)}</select></label>
                  <label><span>Gestor direto</span><select name="managerId" defaultValue={person.managerId ?? ""}><option value="">Sem gestor direto</option>{managerOptions(person).map((manager) => <option value={manager.id} key={manager.id}>{manager.fullName} · {manager.jobTitle}</option>)}</select></label>
                  <label><span>Status</span><select name="active" defaultValue={String(person.active)}><option value="true">Ativa</option><option value="false">Inativa</option></select></label>
                  <label className={styles.reasonField}><span>Motivo da mudança de gestor <small>opcional</small></span><input name="reason" maxLength={240} placeholder="Ex.: reorganização da equipe" /></label>
                  <div className={styles.personMeta}><span>{person.companyName} · {person.employmentRegime}</span><span>{person.directReportCount} liderado(s) ativo(s)</span><span>{person.hasAccount ? "Conta vinculada" : "Sem conta de acesso"}</span></div>
                  <SubmitButton>Salvar organização</SubmitButton>
                </form>

                <div className={styles.accessArea}>
                  {(() => {
                    const profile = accessProfiles.get(person.id);
                    if (!profile) {
                      return <p className={styles.accessNote}>Sem conta de acesso. A conta é criada pelo administrador do sistema.</p>;
                    }
                    if (profile.roles.includes("SYSTEM_ADMIN")) {
                      return <p className={styles.accessNote}>Conta do administrador do sistema: o perfil não é alterado pelo RH.</p>;
                    }
                    return (
                      <form action={updateAccessProfileAction} className={styles.profileForm}>
                        <input type="hidden" name="personId" value={person.id} />
                        <label>
                          <span>Perfil de acesso</span>
                          <select name="profile" defaultValue={profile.roles.includes("MANAGER") ? "MANAGER" : "EMPLOYEE"}>
                            <option value="MANAGER">Gestor (acessa o portal)</option>
                            <option value="EMPLOYEE">Colaborador (sem acesso ao portal)</option>
                          </select>
                        </label>
                        <p className={styles.accessNote}>
                          Conta {profile.status === "DISABLED" ? "desativada" : "ativa"}
                          {profile.roles.includes("HR_ADMIN") ? " · também é RH (papel alterado só pelo administrador)" : ""}.
                          Salvar encerra as sessões abertas da pessoa.
                        </p>
                        <SubmitButton>Salvar perfil</SubmitButton>
                      </form>
                    );
                  })()}

                  <details className={styles.dangerZone}>
                    <summary>Excluir da plataforma</summary>
                    {person.directReportCount > 0 ? (
                      <p className={styles.accessNote}>Transfira os {person.directReportCount} liderado(s) desta pessoa antes de excluí-la.</p>
                    ) : (
                      <form action={deletePersonAction} className={styles.deleteForm}>
                        <input type="hidden" name="personId" value={person.id} />
                        <input type="hidden" name="version" value={person.version} />
                        <p className={styles.accessNote}>
                          A pessoa some das telas e perde o acesso. O histórico de feedbacks fica preservado,
                          a ação fica registrada com o seu usuário e o administrador do sistema pode restaurar.
                        </p>
                        <label className={styles.reasonField}><span>Motivo <small>opcional</small></span><input name="reason" maxLength={240} placeholder="Ex.: desligamento" /></label>
                        <label className={styles.confirmField}><input type="checkbox" name="confirm" required /> <span>Confirmo a exclusão de {person.fullName}</span></label>
                        <button type="submit" className={styles.dangerButton}>Excluir da plataforma</button>
                      </form>
                    )}
                  </details>
                </div>
              </details>
            ))}
            {organization.people.length === 0 ? <div className={styles.emptyState}><span className={styles.emptyIcon}><PortalIcon name="people" /></span><strong>Nenhuma pessoa cadastrada.</strong></div> : null}
          </div>
        </section>
      </Revelar>
    </PortalShell>
  );
}
