import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, findUniqueMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    accessAccount: { findUnique: findUniqueMock },
  },
}));

import { getAuthenticatedActor } from "./session";

describe("ator autenticado", () => {
  beforeEach(() => {
    authMock.mockReset();
    findUniqueMock.mockReset();
  });

  it("nao consulta o banco sem identidade valida na sessao", async () => {
    authMock.mockResolvedValue(null);

    await expect(getAuthenticatedActor()).resolves.toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("revalida conta e papeis no servidor", async () => {
    authMock.mockResolvedValue({
      user: { accountId: "account-1", personId: "person-1" },
    });
    findUniqueMock.mockResolvedValue({
      id: "account-1",
      personId: "person-1",
      status: "ACTIVE",
      mustChangePassword: false,
      lockedUntil: null,
      roles: [{ role: "MANAGER" }, { role: "EMPLOYEE" }],
    });

    await expect(getAuthenticatedActor()).resolves.toEqual({
      accountId: "account-1",
      personId: "person-1",
      mustChangePassword: false,
      roles: ["MANAGER", "EMPLOYEE"],
    });
  });

  it("permite identificar uma conta temporaria somente para a troca de senha", async () => {
    authMock.mockResolvedValue({
      user: { accountId: "account-1", personId: "person-1" },
    });
    findUniqueMock.mockResolvedValue({
      id: "account-1",
      personId: "person-1",
      status: "ACTIVE",
      mustChangePassword: true,
      lockedUntil: null,
      roles: [{ role: "EMPLOYEE" }],
    });

    await expect(
      getAuthenticatedActor({ allowPasswordChange: true }),
    ).resolves.toEqual({
      accountId: "account-1",
      personId: "person-1",
      mustChangePassword: true,
      roles: ["EMPLOYEE"],
    });
  });

  it.each([
    {
      status: "DISABLED",
      mustChangePassword: false,
      lockedUntil: null,
      roles: [{ role: "EMPLOYEE" }],
    },
    {
      status: "ACTIVE",
      mustChangePassword: false,
      lockedUntil: new Date("2999-01-01T00:00:00.000Z"),
      roles: [{ role: "EMPLOYEE" }],
    },
    {
      status: "ACTIVE",
      mustChangePassword: false,
      lockedUntil: null,
      roles: [{ role: "SYSTEM_ADMIN" }, { role: "HR_ADMIN" }],
    },
    {
      status: "ACTIVE",
      mustChangePassword: true,
      lockedUntil: null,
      roles: [{ role: "EMPLOYEE" }],
    },
  ])("nega conta ou papeis incompativeis: %j", async (accountState) => {
    authMock.mockResolvedValue({
      user: { accountId: "account-1", personId: "person-1" },
    });
    findUniqueMock.mockResolvedValue({
      id: "account-1",
      personId: "person-1",
      ...accountState,
    });

    await expect(getAuthenticatedActor()).resolves.toBeNull();
  });
});
