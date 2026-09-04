import { describe, expect, it } from "vitest";

import {
  canAdministerHrDomain,
  canAdministerSystem,
  canCreateFeedbackForPerson,
  canReadFeedbackContent,
  canReadPdiContent,
  canViewPerson,
  hasValidRoleCombination,
  type AuthorizationActor,
} from "./access-control";

const actor = (
  personId: string,
  roles: AuthorizationActor["roles"],
): AuthorizationActor => ({ personId, roles });

describe("limites dos perfis de acesso", () => {
  it("reserva a administracao tecnica ao SYSTEM_ADMIN", () => {
    expect(canAdministerSystem(actor("system", ["SYSTEM_ADMIN"]))).toBe(true);
    expect(canAdministerSystem(actor("rh", ["HR_ADMIN"]))).toBe(false);
    expect(canAdministerHrDomain(actor("system", ["SYSTEM_ADMIN"]))).toBe(false);
    expect(canAdministerHrDomain(actor("rh", ["HR_ADMIN"]))).toBe(true);
  });

  it("nega feedback e PDI ao SYSTEM_ADMIN", () => {
    const systemAdmin = actor("system", ["SYSTEM_ADMIN"]);

    expect(
      canReadFeedbackContent(systemAdmin, {
        subjectPersonId: "employee",
        evaluatorPersonId: "manager",
      }),
    ).toBe(false);
    expect(
      canReadPdiContent(systemAdmin, {
        personId: "employee",
        managerId: "manager",
      }),
    ).toBe(false);
  });

  it("permite ao RH consultar o escopo funcional completo", () => {
    const hr = actor("rh", ["HR_ADMIN"]);

    expect(
      canViewPerson(hr, { personId: "employee", managerId: "manager" }),
    ).toBe(true);
    expect(
      canReadFeedbackContent(hr, {
        subjectPersonId: "employee",
        evaluatorPersonId: "manager",
      }),
    ).toBe(true);
    expect(
      canReadPdiContent(hr, {
        personId: "employee",
        managerId: "manager",
      }),
    ).toBe(true);
  });

  it("limita o gestor a equipe e aos feedbacks que produziu", () => {
    const manager = actor("manager", ["MANAGER", "EMPLOYEE"]);

    expect(
      canViewPerson(manager, {
        personId: "direct-report",
        managerId: "manager",
      }),
    ).toBe(true);
    expect(
      canViewPerson(manager, {
        personId: "other-person",
        managerId: "other-manager",
      }),
    ).toBe(false);
    expect(
      canReadFeedbackContent(manager, {
        subjectPersonId: "direct-report",
        evaluatorPersonId: "manager",
      }),
    ).toBe(true);
    expect(
      canReadFeedbackContent(manager, {
        subjectPersonId: "direct-report",
        evaluatorPersonId: "previous-manager",
      }),
    ).toBe(false);
    expect(
      canCreateFeedbackForPerson(manager, {
        personId: "direct-report",
        managerId: "manager",
      }),
    ).toBe(true);
    expect(
      canCreateFeedbackForPerson(manager, {
        personId: "other-person",
        managerId: "other-manager",
      }),
    ).toBe(false);
  });

  it("limita o colaborador aos proprios conteudos", () => {
    const employee = actor("employee", ["EMPLOYEE"]);

    expect(
      canReadFeedbackContent(employee, {
        subjectPersonId: "employee",
        evaluatorPersonId: "manager",
      }),
    ).toBe(true);
    expect(
      canReadFeedbackContent(employee, {
        subjectPersonId: "another-employee",
        evaluatorPersonId: "manager",
      }),
    ).toBe(false);
    expect(
      canReadPdiContent(employee, {
        personId: "another-employee",
        managerId: "manager",
      }),
    ).toBe(false);
    expect(
      canCreateFeedbackForPerson(employee, {
        personId: "another-employee",
        managerId: "employee",
      }),
    ).toBe(false);
  });

  it("falha fechado para papeis ausentes ou combinacao tecnica mista", () => {
    expect(hasValidRoleCombination([])).toBe(true);
    expect(hasValidRoleCombination(["SYSTEM_ADMIN"])).toBe(true);
    expect(hasValidRoleCombination(["HR_ADMIN", "EMPLOYEE"])).toBe(true);
    expect(
      hasValidRoleCombination(["SYSTEM_ADMIN", "HR_ADMIN"]),
    ).toBe(false);

    expect(
      canReadFeedbackContent(actor("unknown", []), {
        subjectPersonId: "unknown",
        evaluatorPersonId: "unknown",
      }),
    ).toBe(false);
    expect(
      canReadFeedbackContent(actor("mixed", ["SYSTEM_ADMIN", "HR_ADMIN"]), {
        subjectPersonId: "employee",
        evaluatorPersonId: "manager",
      }),
    ).toBe(false);
  });
});
