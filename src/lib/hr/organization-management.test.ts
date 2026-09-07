import { describe, expect, it } from "vitest";

import {
  createDepartmentInputSchema,
  createPersonInputSchema,
  updatePersonOrganizationInputSchema,
  wouldCreateHierarchyCycle,
} from "./organization-management";

const PERSON_ID = "10000000-0000-4000-8000-000000000001";
const MANAGER_ID = "10000000-0000-4000-8000-000000000002";
const ROOT_ID = "10000000-0000-4000-8000-000000000003";
const COMPANY_ID = "10000000-0000-4000-8000-000000000004";
const DEPARTMENT_ID = "10000000-0000-4000-8000-000000000005";

describe("regras da estrutura organizacional", () => {
  it("aceita pessoa sem e-mail e sem gestor", () => {
    const result = createPersonInputSchema.safeParse({
      companyId: COMPANY_ID,
      departmentId: DEPARTMENT_ID,
      managerId: "",
      fullName: "Pessoa Sintética",
      corporateEmail: "",
      jobTitle: "Analista",
      employmentRegime: "CLT",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita e-mail e identificadores inválidos", () => {
    expect(createPersonInputSchema.safeParse({
      companyId: "empresa",
      departmentId: DEPARTMENT_ID,
      managerId: "",
      fullName: "Pessoa Sintética",
      corporateEmail: "email-invalido",
      jobTitle: "Analista",
      employmentRegime: "CLT",
    }).success).toBe(false);
    expect(createDepartmentInputSchema.safeParse({ companyId: "empresa", name: "RH" }).success).toBe(false);
  });

  it("detecta uma liderança que retorna à própria pessoa", async () => {
    const hierarchy = new Map<string, string | null>([
      [MANAGER_ID, ROOT_ID],
      [ROOT_ID, PERSON_ID],
    ]);

    await expect(wouldCreateHierarchyCycle(PERSON_ID, MANAGER_ID, async (id) => hierarchy.get(id))).resolves.toBe(true);
  });

  it("aceita uma cadeia hierárquica finita e rejeita referência desconhecida", async () => {
    const hierarchy = new Map<string, string | null>([
      [MANAGER_ID, ROOT_ID],
      [ROOT_ID, null],
    ]);

    await expect(wouldCreateHierarchyCycle(PERSON_ID, MANAGER_ID, async (id) => hierarchy.get(id))).resolves.toBe(false);
    await expect(wouldCreateHierarchyCycle(PERSON_ID, MANAGER_ID, async () => undefined)).resolves.toBe(true);
  });

  it("exige versão positiva na edição concorrente", () => {
    const result = updatePersonOrganizationInputSchema.safeParse({
      personId: PERSON_ID,
      companyId: COMPANY_ID,
      departmentId: DEPARTMENT_ID,
      managerId: "",
      active: true,
      reason: "",
      version: 0,
    });

    expect(result.success).toBe(false);
  });
});
