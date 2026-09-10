import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    accessAccount: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    accountRoleAssignment: {
      count: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $executeRaw: vi.fn(),
  };

  return {
    transaction,
    prisma: {
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/lib/infrastructure/database/prisma", () => ({ adminPrisma: mocks.prisma }));

import { deleteManagedAccount } from "./account-management";

const actor = {
  accountId: "5f4f74c4-87eb-4f11-80d8-9935e1c0581d",
  personId: "ef97f61c-a79b-4943-8050-f46d778341eb",
  mustChangePassword: false,
  roles: ["SYSTEM_ADMIN"] as const,
};
const targetId = "6f4f74c4-87eb-4f11-80d8-9935e1c0581d";

describe("exclusao de contas no painel administrativo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (callback) =>
      callback(mocks.transaction),
    );
  });

  it("nega a exclusao para perfis que nao sao SYSTEM_ADMIN", async () => {
    const result = await deleteManagedAccount(
      { ...actor, roles: ["EMPLOYEE"] },
      targetId,
    );

    expect(result.ok).toBe(false);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("protege a propria conta do administrador", async () => {
    const result = await deleteManagedAccount(actor, actor.accountId);

    expect(result.ok).toBe(false);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("remove o acesso e preserva o cadastro funcional", async () => {
    mocks.transaction.accessAccount.findUnique.mockResolvedValue({
      id: targetId,
      roles: [{ role: "EMPLOYEE" }],
    });

    const result = await deleteManagedAccount(actor, targetId);

    expect(result.ok).toBe(true);
    expect(mocks.transaction.auditEvent.create).toHaveBeenCalledOnce();
    expect(mocks.transaction.accessAccount.delete).toHaveBeenCalledWith({
      where: { id: targetId },
    });
  });

  it("nao permite remover o ultimo SYSTEM_ADMIN", async () => {
    mocks.transaction.accessAccount.findUnique.mockResolvedValue({
      id: targetId,
      roles: [{ role: "SYSTEM_ADMIN" }],
    });
    mocks.transaction.accountRoleAssignment.count.mockResolvedValue(1);

    const result = await deleteManagedAccount(actor, targetId);

    expect(result.ok).toBe(false);
    expect(mocks.transaction.accessAccount.delete).not.toHaveBeenCalled();
    expect(mocks.transaction.auditEvent.create).not.toHaveBeenCalled();
  });
});
