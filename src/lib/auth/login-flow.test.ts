import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findFirstMock,
  updateMock,
  createSessionMock,
  transactionMock,
  transactionUpdateMock,
  verifyPasswordMock,
} = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  updateMock: vi.fn(),
  createSessionMock: vi.fn(),
  transactionMock: vi.fn(),
  transactionUpdateMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    accessAccount: {
      findFirst: findFirstMock,
      update: updateMock,
    },
    userSession: { create: createSessionMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/auth/password", () => ({
  DUMMY_PASSWORD_HASH: "$argon2id$dummy",
  verifyPassword: verifyPasswordMock,
}));

import { authorizeProvisionedCredentials } from "./credentials";

const expiredLockedAccount = () => ({
  id: "account-1",
  person: { id: "person-1" },
  passwordHash: "$argon2id$stored",
  status: "LOCKED",
  mustChangePassword: false,
  lockedUntil: new Date("2020-01-01T00:00:00.000Z"),
  sessionVersion: 3,
  roles: [{ role: "EMPLOYEE" }],
});

describe("fluxo de login provisionado", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    updateMock.mockReset();
    createSessionMock.mockReset();
    transactionMock.mockReset();
    transactionUpdateMock.mockReset();
    verifyPasswordMock.mockReset();

    updateMock.mockResolvedValue({});
    createSessionMock.mockResolvedValue({});
    transactionMock.mockImplementation(async (operation) => {
      if (typeof operation === "function") {
        return operation({
          accessAccount: { update: transactionUpdateMock },
        });
      }
      return Promise.all(operation);
    });
  });

  it("reativa bloqueio temporario expirado depois de uma senha valida", async () => {
    findFirstMock.mockResolvedValue(expiredLockedAccount());
    verifyPasswordMock.mockResolvedValue(true);

    const authenticatedUser = await authorizeProvisionedCredentials({
      loginIdentifier: "usuario.teste",
      password: "senha-sintetica-segura",
    });

    expect(authenticatedUser).toMatchObject({
      accountId: "account-1",
      personId: "person-1",
      roles: ["EMPLOYEE"],
      sessionVersion: 3,
    });
    expect(authenticatedUser?.sessionNonce).toHaveLength(64);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "account-1" },
        data: expect.objectContaining({
          status: "ACTIVE",
          failedLoginCount: 0,
          lockedUntil: null,
        }),
      }),
    );
    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accountId: "account-1",
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
  });

  it("reinicia a contagem depois de uma tentativa invalida com bloqueio expirado", async () => {
    findFirstMock.mockResolvedValue(expiredLockedAccount());
    verifyPasswordMock.mockResolvedValue(false);
    transactionUpdateMock.mockResolvedValue({ failedLoginCount: 1 });

    await expect(
      authorizeProvisionedCredentials({
        loginIdentifier: "usuario.teste",
        password: "senha-incorreta-sintetica",
      }),
    ).resolves.toBeNull();

    expect(transactionUpdateMock).toHaveBeenCalledWith({
      where: { id: "account-1" },
      data: {
        failedLoginCount: 1,
        status: "ACTIVE",
        lockedUntil: null,
      },
      select: { failedLoginCount: true },
    });
  });

  it("nega acesso com senha temporaria mesmo quando a credencial confere", async () => {
    findFirstMock.mockResolvedValue({
      ...expiredLockedAccount(),
      status: "ACTIVE",
      lockedUntil: null,
      mustChangePassword: true,
    });
    verifyPasswordMock.mockResolvedValue(true);

    await expect(
      authorizeProvisionedCredentials({
        loginIdentifier: "usuario.teste",
        password: "senha-temporaria-sintetica",
      }),
    ).resolves.toBeNull();

    expect(createSessionMock).not.toHaveBeenCalled();
  });
});
