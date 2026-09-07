import { describe, expect, it } from "vitest";

import {
  getSystemAccountManagement,
  parseManagedAccountUpdate,
  updateManagedAccount,
} from "./account-management";

const accountId = "5f4f74c4-87eb-4f11-80d8-9935e1c0581d";

describe("validação da administração de contas", () => {
  it("normaliza papéis funcionais repetidos na ordem oficial", () => {
    const result = parseManagedAccountUpdate({
      accountId,
      status: "ACTIVE",
      roles: ["EMPLOYEE", "MANAGER", "EMPLOYEE"],
    });

    expect(result).toEqual({
      ok: true,
      data: {
        accountId,
        status: "ACTIVE",
        roles: ["MANAGER", "EMPLOYEE"],
      },
    });
  });

  it("rejeita Administrador do Sistema combinado com papel funcional", () => {
    const result = parseManagedAccountUpdate({
      accountId,
      status: "ACTIVE",
      roles: ["SYSTEM_ADMIN", "HR_ADMIN"],
    });
    expect(result.ok).toBe(false);
  });

  it("rejeita conta sem papel ou com identificador inválido", () => {
    expect(
      parseManagedAccountUpdate({ accountId, status: "ACTIVE", roles: [] }).ok,
    ).toBe(false);
    expect(
      parseManagedAccountUpdate({
        accountId: "invalido",
        status: "ACTIVE",
        roles: ["EMPLOYEE"],
      }).ok,
    ).toBe(false);
  });

  it("falha fechado antes de consultar dados para perfil não autorizado", async () => {
    const result = await getSystemAccountManagement({
      accountId,
      personId: "ef97f61c-a79b-4943-8050-f46d778341eb",
      mustChangePassword: false,
      roles: ["EMPLOYEE"],
    });

    expect(result).toBeNull();
  });

  it("protege a própria conta do administrador antes da mutação", async () => {
    const result = await updateManagedAccount(
      {
        accountId,
        personId: "ef97f61c-a79b-4943-8050-f46d778341eb",
        mustChangePassword: false,
        roles: ["SYSTEM_ADMIN"],
      },
      { accountId, status: "ACTIVE", roles: ["SYSTEM_ADMIN"] },
    );

    expect(result.ok).toBe(false);
    expect(result.message).toContain("própria conta");
  });
});
