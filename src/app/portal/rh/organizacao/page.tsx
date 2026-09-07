import { redirect } from "next/navigation";

import { PortalIcon } from "@/components/portal/portal-icon";
import { PortalShell } from "@/components/portal/portal-shell";
import { getAuthenticatedActor } from "@/lib/auth/session";
import { canAdministerHrDomain } from "@/lib/authorization/access-control";
import { getPortalDashboardData } from "@/lib/dashboard/dashboard-data";
import { getHrOrganization } from "@/lib/hr/organization-management";

import {
  createCompanyAction,
  createDepartmentAction,
  createPersonAction,
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

  const [dashboard, organization, params] = await Promise.all([
    getPortalDashboardData(actor),
    getHrOrganization(actor),
    searchParams,
  ]);
  if (!dashboard || !organization) redirect("/portal/dashboard");

  const success = firstValue(params.sucesso);
  const error = firstValue(params.erro);
  const activeCompanies = organization.companies.filter((company) => company.active);
  const activeDepartments = activeCompanies.flatMap((company) =>
    company.departments
      .filter((department) => department.active)
      .map((department) => ({ ...department, companyId: company.id, companyName: company.name })),
  );
  const activeManagers = organization.people.filter((person) => person.active);
  const canCreatePeople = activeCompanies.length > 0 && activeDepartments.length > 0;

  return (
    <PortalShell
      activePath="/portal/rh/organizacao"
      pageTitle="Estrutura organizacional"
      personName={dashboard.profile.fullName}
      roleLabel={dashboard.roleLabel}
      roles={actor.roles}
    >
      <div className={styles.page}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Recursos Humanos</p>
            <h1>Estrutura organizacional</h1>
            <p>Cadastre empresas, departamentos e pessoas e mantenha a linha de liderança atualizada.</p>
          </div>
          <div className={styles.scopeBadge}>
            <PortalIcon name="check" />
            <span>Histórico e auditoria ativos</span>
          </div>
        </header>

        {success ? <p className={styles.successMessage} role="status">{success}</p> : null}
        {error ? <p className={styles.errorMessage} role="alert">{error}</p> : null}

        <section className={styles.metrics} aria-label="Resumo da estrutura organizacional">
          <article><span>Empresas ativas</span><strong>{organization.metrics.activeCompanies}</strong><small>unidades disponíveis</small></article>
          <article><span>Departamentos ativos</span><strong>{organization.metrics.activeDepartments}</strong><small>alocações disponíveis</small></article>
          <article><span>Pessoas ativas</span><strong>{organization.metrics.activePeople}</strong><small>cadastros funcionais</small></article>
          <article><span>Sem gestor</span><strong>{organization.metrics.peopleWithoutManager}</strong><small>raízes da hierarquia</small></article>
        </section>

        <section className={styles.creationPanel} aria-labelledby="register-title">
          <header className={styles.panelHeader}>
            <div><p className={styles.eyebrow}>Cadastros</p><h2 id="register-title">Adicionar à estrutura</h2></div>
            <span>Use Tab para avançar e Enter para enviar</span>
          </header>
          <div className={styles.creationGrid}>
            <details open className={styles.stepCard}>
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

            <details open className={styles.stepCard}>
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

            <details open className={`${styles.stepCard} ${styles.personCreation}`}>
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
                <label><span>Gestor direto <small>opcional</small></span><select name="managerId" defaultValue=""><option value="">Sem gestor direto</option>{activeManagers.map((manager) => <option value={manager.id} key={manager.id}>{manager.fullName} · {manager.jobTitle}</option>)}</select></label>
                <div className={styles.personSubmit}><p>A conta de acesso é criada separadamente pelo administrador do sistema.</p><SubmitButton>Cadastrar pessoa</SubmitButton></div>
              </form>
            </details>
          </div>
        </section>

        <section className={styles.structureGrid} aria-label="Empresas e departamentos">
          {organization.companies.map((company) => (
            <article className={styles.companyCard} key={company.id}>
              <header><span><PortalIcon name="admin" /></span><div><h2>{company.name}</h2><p>{company.active ? "Empresa ativa" : "Empresa inativa"}</p></div></header>
              <ul>
                {company.departments.map((department) => <li key={department.id}><span>{department.name}</span><small data-active={department.active}>{department.active ? "Ativo" : "Inativo"}</small></li>)}
                {company.departments.length === 0 ? <li className={styles.emptyItem}>Nenhum departamento cadastrado</li> : null}
              </ul>
            </article>
          ))}
          {organization.companies.length === 0 ? <p className={styles.emptyState}>Nenhuma empresa cadastrada.</p> : null}
        </section>

        <section className={styles.peoplePanel} aria-labelledby="people-title">
          <header className={styles.panelHeader}>
            <div><p className={styles.eyebrow}>Equipe</p><h2 id="people-title">Pessoas e lideranças</h2></div>
            <span>Até 200 cadastros · alterações protegidas por versão</span>
          </header>
          <div className={styles.peopleList}>
            {organization.people.map((person) => (
              <details className={styles.personRow} key={person.id}>
                <summary>
                  <span className={styles.avatar}>{initials(person.fullName)}</span>
                  <span className={styles.personIdentity}><strong>{person.fullName}</strong><small>{person.jobTitle} · {person.departmentName}</small></span>
                  <span className={styles.personManager}><small>Gestor direto</small><strong>{person.managerName ?? "Sem gestor"}</strong></span>
                  <span className={styles.status} data-active={person.active}>{person.active ? "Ativa" : "Inativa"}</span>
                </summary>
                <form action={updatePersonOrganizationAction} className={styles.editForm}>
                  <input type="hidden" name="personId" value={person.id} />
                  <input type="hidden" name="version" value={person.version} />
                  <label><span>Empresa</span><select name="companyId" required defaultValue={person.companyId}>{activeCompanies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
                  <label><span>Departamento</span><select name="departmentId" required defaultValue={person.departmentId}>{activeDepartments.map((department) => <option value={department.id} key={department.id}>{department.companyName} · {department.name}</option>)}</select></label>
                  <label><span>Gestor direto</span><select name="managerId" defaultValue={person.managerId ?? ""}><option value="">Sem gestor direto</option>{activeManagers.filter((manager) => manager.id !== person.id).map((manager) => <option value={manager.id} key={manager.id}>{manager.fullName} · {manager.jobTitle}</option>)}</select></label>
                  <label><span>Status</span><select name="active" defaultValue={String(person.active)}><option value="true">Ativa</option><option value="false">Inativa</option></select></label>
                  <label className={styles.reasonField}><span>Motivo da mudança de gestor <small>opcional</small></span><input name="reason" maxLength={240} placeholder="Ex.: reorganização da equipe" /></label>
                  <div className={styles.personMeta}><span>{person.companyName} · {person.employmentRegime}</span><span>{person.directReportCount} liderado(s) ativo(s)</span><span>{person.hasAccount ? "Conta vinculada" : "Sem conta de acesso"}</span></div>
                  <SubmitButton>Salvar organização</SubmitButton>
                </form>
              </details>
            ))}
            {organization.people.length === 0 ? <p className={styles.emptyState}>Nenhuma pessoa cadastrada.</p> : null}
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
