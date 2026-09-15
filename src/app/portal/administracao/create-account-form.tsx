"use client";

import { useState } from "react";

import type { AccessRole } from "@/lib/authorization/access-control";

import { createAccountAction } from "./actions";
import { ActionSubmitButton } from "./action-submit-button";
import styles from "./administration.module.css";

type OrganizationOption = Readonly<{
  id: string;
  name: string;
  departments: readonly { id: string; name: string }[];
}>;

type RoleOption = Readonly<{
  value: AccessRole;
  label: string;
}>;

type CreateAccountFormProps = Readonly<{
  organizationOptions: readonly OrganizationOption[];
  roleOptions: readonly RoleOption[];
}>;

export function CreateAccountForm({
  organizationOptions,
  roleOptions,
}: CreateAccountFormProps) {
  const [companyId, setCompanyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<AccessRole[]>(["EMPLOYEE"]);
  const selectedCompany = organizationOptions.find((company) => company.id === companyId);

  const toggleRole = (role: AccessRole) => {
    setSelectedRoles((current) => {
      if (role === "SYSTEM_ADMIN") {
        return current.includes(role) ? [] : [role];
      }

      const withoutSystemAdmin = current.filter((item) => item !== "SYSTEM_ADMIN");
      return withoutSystemAdmin.includes(role)
        ? withoutSystemAdmin.filter((item) => item !== role)
        : [...withoutSystemAdmin, role];
    });
  };

  return (
    <form className={styles.createAccountForm} action={createAccountAction}>
      <fieldset className={styles.createAccountSection}>
        <legend>Dados do colaborador</legend>
        <p className={styles.createAccountSectionHint}>
          Cadastre a pessoa nova e defina onde ela ficará alocada na estrutura.
        </p>
        <div className={styles.createAccountGrid}>
          <label>
            <span>Nome completo <em>Obrigatório</em></span>
            <input
              name="fullName"
              type="text"
              required
              minLength={2}
              maxLength={200}
              autoComplete="name"
              placeholder="Ex.: Ana Carolina Silva"
            />
          </label>

          <label>
            <span>E-mail corporativo <em>Obrigatório</em></span>
            <input
              name="corporateEmail"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="Ex.: ana.silva@empresa.com.br"
            />
          </label>

          <label>
            <span>Empresa <em>Obrigatório</em></span>
            <select
              name="companyId"
              value={companyId}
              required
              onChange={(event) => {
                setCompanyId(event.target.value);
                setDepartmentId("");
              }}
            >
              <option value="" disabled>
                Selecione a empresa
              </option>
              {organizationOptions.map((company) => (
                <option value={company.id} key={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Departamento <em>Obrigatório</em></span>
            <select
              name="departmentId"
              value={departmentId}
              required
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="" disabled>
                {selectedCompany ? "Selecione o departamento" : "Escolha a empresa primeiro"}
              </option>
              {selectedCompany?.departments.map((department) => (
                <option value={department.id} key={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Cargo <em>Obrigatório</em></span>
            <input
              name="jobTitle"
              type="text"
              required
              minLength={2}
              maxLength={160}
              autoComplete="organization-title"
              placeholder="Ex.: Analista de Operações"
            />
          </label>

          <label>
            <span>Regime de contratação <em>Obrigatório</em></span>
            <input
              name="employmentRegime"
              type="text"
              required
              minLength={2}
              maxLength={80}
              placeholder="Ex.: CLT"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.createAccountSection}>
        <legend>Dados de acesso</legend>
        <p className={styles.createAccountSectionHint}>
          Esses dados serão usados para o primeiro acesso ao portal.
        </p>
        <div className={styles.createAccountGrid}>
          <label>
            <span>Nome de usuário <em>Obrigatório</em></span>
            <input
              name="loginIdentifier"
              type="text"
              required
              minLength={3}
              maxLength={64}
              autoComplete="username"
              placeholder="Ex.: ana.silva"
            />
            <small className={styles.createAccountHint}>
              Use letras, números e separadores simples, sem espaços.
            </small>
          </label>

          <fieldset className={styles.createRoleFieldset}>
            <legend className={styles.createFieldLabel}>Perfil de acesso <em>Obrigatório</em></legend>
            <div className={styles.createRoleOptions}>
              {roleOptions.map((role) => (
                <label className={styles.createRoleOption} key={role.value}>
                  <input
                    type="checkbox"
                    name="roles"
                    value={role.value}
                    checked={selectedRoles.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                  />
                  <span>{role.label}</span>
                </label>
              ))}
            </div>
            <small className={styles.createAccountHint}>
              O Administrador do Sistema é exclusivo e não pode ser combinado.
            </small>
          </fieldset>

          <label>
            <span>Senha temporária <em>Obrigatório</em></span>
            <div className={styles.passwordInputGroup}>
              <input
                name="temporaryPassword"
                type={showPasswords ? "text" : "password"}
                required
                minLength={9}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Defina uma senha inicial"
              />
              <button
                className={styles.passwordVisibilityButton}
                type="button"
                onClick={() => setShowPasswords((visible) => !visible)}
                aria-pressed={showPasswords}
              >
                {showPasswords ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <small className={styles.createAccountHint}>
              Mínimo de 9 caracteres, com número e caractere especial.
            </small>
          </label>

          <label>
            <span>Confirmar senha <em>Obrigatório</em></span>
            <input
              name="confirmPassword"
              type={showPasswords ? "text" : "password"}
              required
              minLength={9}
              maxLength={128}
              autoComplete="new-password"
              placeholder="Repita a senha inicial"
            />
          </label>
        </div>
      </fieldset>

      <div className={styles.createAccountFooter}>
        <p>
          O acesso será ativado imediatamente e a troca da senha será obrigatória no primeiro login.
        </p>
        <ActionSubmitButton
          label="Criar usuário"
          pendingLabel="Criando usuário..."
          disabled={!companyId || selectedRoles.length === 0}
        />
      </div>
    </form>
  );
}
