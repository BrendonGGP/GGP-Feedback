import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction, prismaMock } = vi.hoisted(() => ({
  transaction: {
    $executeRaw: vi.fn(),
  },
  prismaMock: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ runtimePrisma: prismaMock }));

import { withDatabaseActor } from "./actor-context";
import { getRuntimeTransaction } from "./runtime-context";

describe("contexto de RLS do ator", () => {
  beforeEach(() => {
    transaction.$executeRaw.mockReset().mockResolvedValue(1);
    prismaMock.$transaction.mockReset().mockImplementation(async (callback) =>
      callback(transaction),
    );
  });

  it("configura a identidade somente dentro da transação", async () => {
    const actor = {
      accountId: "10000000-0000-4000-8000-000000000001",
      personId: "10000000-0000-4000-8000-000000000002",
      roles: ["MANAGER", "EMPLOYEE"] as const,
      mustChangePassword: false,
    };
    const operation = vi.fn(async () => {
      expect(getRuntimeTransaction()).toBe(transaction);
      return "ok";
    });

    await expect(withDatabaseActor(actor, operation)).resolves.toBe("ok");

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(transaction.$executeRaw).toHaveBeenCalledOnce();
    expect(operation).toHaveBeenCalledWith(transaction);

    const [, accountId, personId, roles] = transaction.$executeRaw.mock.calls[0];
    expect(accountId).toBe(actor.accountId);
    expect(personId).toBe(actor.personId);
    expect(roles).toBe("MANAGER,EMPLOYEE");
  });

  it("rejeita um ator sem papel válido antes de abrir a transação", async () => {
    const actor = {
      accountId: "10000000-0000-4000-8000-000000000001",
      personId: "10000000-0000-4000-8000-000000000002",
      roles: ["SYSTEM_ADMIN", "EMPLOYEE"] as const,
      mustChangePassword: false,
    };

    await expect(withDatabaseActor(actor, vi.fn())).rejects.toThrow(
      "INVALID_DATABASE_ACTOR",
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
