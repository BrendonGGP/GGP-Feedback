import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUniqueMock,
  transactionMock,
  updateAccountMock,
  updateSessionsMock,
  hashPasswordMock,
  verifyPasswordMock,
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  updateAccountMock: vi.fn(),
  updateSessionsMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    accessAccount: { findUnique: findUniqueMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: verifyPasswordMock,
}));

import {
  changeTemporaryPassword,
  passwordChangeSchema,
} from "./password-change";

describe("troca obrigatoria de senha", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    transactionMock.mockReset();
    updateAccountMock.mockReset();
    updateSessionsMock.mockReset();
    hashPasswordMock.mockReset();
    verifyPasswordMock.mockReset();

    updateAccountMock.mockResolvedValue({ count: 1 });
    updateSessionsMock.mockResolvedValue({ count: 2 });
    hashPasswordMock.mockResolvedValue("$argon2id$new-hash");
    verifyPasswordMock.mockResolvedValue(false);
    transactionMock.mockImplementation(async (operation) =>
      operation({
        accessAccount: { updateMany: updateAccountMock },
        userSession: { updateMany: updateSessionsMock },
      }),
    );
  });

  it("exige tamanho minimo e confirmacao igual", () => {
    expect(
      passwordChangeSchema.safeParse({
        newPassword: "curta",
        confirmPassword: "curta",
      }).success,
    ).toBe(false);
    expect(
      passwordChangeSchema.safeParse({
        newPassword: "senha-nova-sintetica",
        confirmPassword: "senha-diferente-sintetica",
      }).success,
    ).toBe(false);
  });

  it("atualiza a conta e revoga as sessoes na mesma transacao", async () => {
    findUniqueMock.mockResolvedValue({
      passwordHash: "$argon2id$temporary-hash",
      mustChangePassword: true,
      status: "ACTIVE",
    });

    await expect(
      changeTemporaryPassword("account-1", "senha-nova-sintetica"),
    ).resolves.toBeUndefined();

    expect(updateAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "account-1",
          mustChangePassword: true,
          passwordHash: "$argon2id$temporary-hash",
        }),
        data: expect.objectContaining({
          passwordHash: "$argon2id$new-hash",
          mustChangePassword: false,
          sessionVersion: { increment: 1 },
        }),
      }),
    );
    expect(updateSessionsMock).toHaveBeenCalledWith({
      where: { accountId: "account-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("nao permite reutilizar a senha temporaria", async () => {
    findUniqueMock.mockResolvedValue({
      passwordHash: "$argon2id$temporary-hash",
      mustChangePassword: true,
      status: "ACTIVE",
    });
    verifyPasswordMock.mockResolvedValue(true);

    await expect(
      changeTemporaryPassword("account-1", "senha-temporaria-sintetica"),
    ).rejects.toThrow("PASSWORD_REUSE_NOT_ALLOWED");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("falha fechado quando a conta mudou antes da confirmacao", async () => {
    findUniqueMock.mockResolvedValue({
      passwordHash: "$argon2id$temporary-hash",
      mustChangePassword: true,
      status: "ACTIVE",
    });
    updateAccountMock.mockResolvedValue({ count: 0 });

    await expect(
      changeTemporaryPassword("account-1", "senha-nova-sintetica"),
    ).rejects.toThrow("PASSWORD_CHANGE_CONFLICT");
    expect(updateSessionsMock).not.toHaveBeenCalled();
  });
});
