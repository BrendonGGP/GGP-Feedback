import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    accessAccount: { updateMany: vi.fn() },
    userSession: { updateMany: vi.fn() },
    auditEvent: { create: vi.fn() },
  };
  return {
    transaction,
    findUnique: vi.fn(),
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
  };
});

vi.mock("@/lib/infrastructure/database/prisma", () => ({
  adminPrisma: {
    accessAccount: { findUnique: mocks.findUnique },
    $transaction: async (operation: (tx: typeof mocks.transaction) => Promise<unknown>) => operation(mocks.transaction),
  },
}));

vi.mock("@/lib/auth/password", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/password")>("@/lib/auth/password");
  return { ...actual, hashPassword: mocks.hashPassword, verifyPassword: mocks.verifyPassword };
});

import { changeOwnPassword, ownPasswordChangeSchema } from "./password-change";

const admin = {
  accountId: "20000000-0000-4000-8000-000000000001",
  personId: "20000000-0000-4000-8000-000000000002",
  roles: ["SYSTEM_ADMIN"],
  mustChangePassword: false,
} as const;

const input = { currentPassword: "SenhaAtual9!", newPassword: "SenhaNova9!", confirmPassword: "SenhaNova9!" };

describe("troca da própria senha pelo administrador", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue({ id: admin.accountId, passwordHash: "$argon2id$atual", status: "ACTIVE" });
    mocks.hashPassword.mockResolvedValue("$argon2id$nova");
    mocks.transaction.accessAccount.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.userSession.updateMany.mockResolvedValue({ count: 1 });
  });

  it("exige a senha atual no formulário", () => {
    expect(ownPasswordChangeSchema.safeParse({ ...input, currentPassword: "" }).success).toBe(false);
    expect(ownPasswordChangeSchema.safeParse(input).success).toBe(true);
  });

  it("recusa quem não é administrador do sistema", async () => {
    await expect(changeOwnPassword({ ...admin, roles: ["HR_ADMIN"] }, input)).rejects.toThrow("PASSWORD_OWN_NOT_ALLOWED");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("recusa quando a senha atual não confere", async () => {
    mocks.verifyPassword.mockResolvedValueOnce(false);
    await expect(changeOwnPassword(admin, input)).rejects.toThrow("PASSWORD_CURRENT_INVALID");
    expect(mocks.transaction.accessAccount.updateMany).not.toHaveBeenCalled();
  });

  it("recusa reutilizar a senha atual", async () => {
    mocks.verifyPassword.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    await expect(changeOwnPassword(admin, input)).rejects.toThrow("PASSWORD_REUSE_NOT_ALLOWED");
  });

  it("troca a senha, encerra as sessões e registra a auditoria", async () => {
    mocks.verifyPassword.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await changeOwnPassword(admin, input);
    expect(mocks.transaction.accessAccount.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: admin.accountId, passwordHash: "$argon2id$atual" },
      data: expect.objectContaining({ passwordHash: "$argon2id$nova", sessionVersion: { increment: 1 } }),
    }));
    expect(mocks.transaction.userSession.updateMany).toHaveBeenCalled();
    expect(mocks.transaction.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "CHANGE_OWN_PASSWORD" }),
    }));
  });
});
