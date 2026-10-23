import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const adminTransaction = {
    accountRoleAssignment: { deleteMany: vi.fn(), createMany: vi.fn() },
    accessAccount: { update: vi.fn() },
    userSession: { updateMany: vi.fn() },
    auditEvent: { create: vi.fn() },
  };
  const runtimeTransaction = {
    person: { updateMany: vi.fn() },
    reportingLineHistory: { updateMany: vi.fn(), createMany: vi.fn() },
  };
  return {
    adminTransaction,
    runtimeTransaction,
    adminPrisma: {
      accessAccount: { findUnique: vi.fn(), findMany: vi.fn() },
      accountRoleAssignment: { findMany: vi.fn() },
      $transaction: vi.fn(async (operation: (tx: typeof adminTransaction) => Promise<unknown>) => operation(adminTransaction)),
    },
    runtimePrisma: {
      person: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
      $transaction: vi.fn(async (operation: (tx: typeof runtimeTransaction) => Promise<unknown>) => operation(runtimeTransaction)),
    },
    disableAccountOfPerson: vi.fn(),
    recordAuditEvent: vi.fn(),
    wouldCreateHierarchyCycle: vi.fn(),
  };
});

vi.mock("@/lib/infrastructure/database/prisma", () => ({
  adminPrisma: mocks.adminPrisma,
  runtimePrisma: mocks.runtimePrisma,
}));
vi.mock("@/lib/infrastructure/database/actor-context", () => ({
  withDatabaseActor: async (_actor: unknown, operation: () => Promise<unknown>) => operation(),
}));
vi.mock("@/lib/infrastructure/database/audit", () => ({ recordAuditEvent: mocks.recordAuditEvent }));
vi.mock("./account-access", () => ({ disableAccountOfPerson: mocks.disableAccountOfPerson }));
vi.mock("./organization-management", () => ({ wouldCreateHierarchyCycle: mocks.wouldCreateHierarchyCycle }));

import { deleteHrPerson, transferHrDirectReports, updateHrAccessProfile } from "./person-access";

const HR = {
  accountId: "30000000-0000-4000-8000-000000000001",
  personId: "30000000-0000-4000-8000-000000000002",
  roles: ["HR_ADMIN", "EMPLOYEE"],
  mustChangePassword: false,
} as const;
const MANAGER_ONLY = { ...HR, roles: ["MANAGER", "EMPLOYEE"] } as const;
const PERSON_ID = "30000000-0000-4000-8000-000000000003";
const ACCOUNT_ID = "30000000-0000-4000-8000-000000000004";
const OTHER_MANAGER_ID = "30000000-0000-4000-8000-000000000005";

describe("perfil de acesso definido pelo RH", () => {
  beforeEach(() => vi.clearAllMocks());

  it("só o RH altera perfis", async () => {
    const result = await updateHrAccessProfile(MANAGER_ONLY, { personId: PERSON_ID, profile: "MANAGER" });
    expect(result.ok).toBe(false);
    expect(mocks.adminPrisma.accessAccount.findUnique).not.toHaveBeenCalled();
  });

  it("não aceita perfis de RH ou de administrador", async () => {
    const result = await updateHrAccessProfile(HR, { personId: PERSON_ID, profile: "HR_ADMIN" });
    expect(result.ok).toBe(false);
  });

  it("não altera a própria conta nem a do administrador do sistema", async () => {
    mocks.adminPrisma.accessAccount.findUnique.mockResolvedValueOnce({ id: HR.accountId, roles: [{ role: "HR_ADMIN" }] });
    expect((await updateHrAccessProfile(HR, { personId: PERSON_ID, profile: "MANAGER" })).ok).toBe(false);

    mocks.adminPrisma.accessAccount.findUnique.mockResolvedValueOnce({ id: ACCOUNT_ID, roles: [{ role: "SYSTEM_ADMIN" }] });
    expect((await updateHrAccessProfile(HR, { personId: PERSON_ID, profile: "EMPLOYEE" })).ok).toBe(false);
    expect(mocks.adminPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("promove colaborador a gestor e encerra as sessões da conta", async () => {
    mocks.adminPrisma.accessAccount.findUnique.mockResolvedValue({ id: ACCOUNT_ID, roles: [{ role: "EMPLOYEE" }] });
    const result = await updateHrAccessProfile(HR, { personId: PERSON_ID, profile: "MANAGER" });
    expect(result.ok).toBe(true);
    expect(mocks.adminTransaction.accountRoleAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { accountId: ACCOUNT_ID, role: "EMPLOYEE" },
        { accountId: ACCOUNT_ID, role: "MANAGER" },
      ],
    });
    expect(mocks.adminTransaction.userSession.updateMany).toHaveBeenCalled();
    expect(mocks.adminTransaction.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "UPDATE_ACCESS_PROFILE" }),
    }));
  });

  it("preserva o papel de RH ao rebaixar para colaborador", async () => {
    mocks.adminPrisma.accessAccount.findUnique.mockResolvedValue({
      id: ACCOUNT_ID,
      roles: [{ role: "HR_ADMIN" }, { role: "MANAGER" }, { role: "EMPLOYEE" }],
    });
    await updateHrAccessProfile(HR, { personId: PERSON_ID, profile: "EMPLOYEE" });
    expect(mocks.adminTransaction.accountRoleAssignment.deleteMany).toHaveBeenCalledWith({
      where: { accountId: ACCOUNT_ID, role: { in: ["MANAGER", "EMPLOYEE"] } },
    });
    expect(mocks.adminTransaction.accountRoleAssignment.createMany).toHaveBeenCalledWith({
      data: [{ accountId: ACCOUNT_ID, role: "EMPLOYEE" }],
    });
  });
});

describe("exclusão lógica pelo RH", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtimePrisma.person.findUnique.mockResolvedValue({ id: PERSON_ID, deletedAt: null, _count: { directReports: 0 } });
    mocks.adminPrisma.accountRoleAssignment.findMany.mockResolvedValue([{ role: "EMPLOYEE" }]);
    mocks.disableAccountOfPerson.mockResolvedValue(true);
    mocks.runtimeTransaction.person.updateMany.mockResolvedValue({ count: 1 });
  });

  it("não exclui o próprio cadastro", async () => {
    expect((await deleteHrPerson(HR, { personId: HR.personId, version: 1 })).ok).toBe(false);
  });

  it("exige transferir os liderados antes", async () => {
    mocks.runtimePrisma.person.findUnique.mockResolvedValue({ id: PERSON_ID, deletedAt: null, _count: { directReports: 2 } });
    expect((await deleteHrPerson(HR, { personId: PERSON_ID, version: 1 })).ok).toBe(false);
    expect(mocks.disableAccountOfPerson).not.toHaveBeenCalled();
  });

  it("não exclui contas de RH ou do administrador", async () => {
    mocks.adminPrisma.accountRoleAssignment.findMany.mockResolvedValue([{ role: "HR_ADMIN" }]);
    expect((await deleteHrPerson(HR, { personId: PERSON_ID, version: 1 })).ok).toBe(false);
    expect(mocks.disableAccountOfPerson).not.toHaveBeenCalled();
  });

  it("bloqueia o acesso, marca a exclusão e registra o log", async () => {
    const result = await deleteHrPerson(HR, { personId: PERSON_ID, version: "3", reason: "Desligamento" });
    expect(result.ok).toBe(true);
    expect(mocks.disableAccountOfPerson).toHaveBeenCalledWith(PERSON_ID);
    expect(mocks.runtimeTransaction.person.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: PERSON_ID, version: 3, deletedAt: null },
      data: expect.objectContaining({ active: false, deletedByAccountId: HR.accountId }),
    }));
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(mocks.runtimeTransaction, expect.objectContaining({
      data: expect.objectContaining({ action: "DELETE_PERSON" }),
    }));
  });

  it("informa conflito de versão sem registrar o log", async () => {
    mocks.runtimeTransaction.person.updateMany.mockResolvedValue({ count: 0 });
    expect((await deleteHrPerson(HR, { personId: PERSON_ID, version: 1 })).ok).toBe(false);
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
  });
});

describe("transferência de liderados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtimePrisma.person.findFirst.mockResolvedValue({ id: OTHER_MANAGER_ID });
    mocks.runtimePrisma.person.findMany.mockReset();
    mocks.runtimePrisma.person.findMany
      .mockResolvedValueOnce([{ id: PERSON_ID }])
      .mockResolvedValueOnce([{ id: PERSON_ID, managerId: HR.personId }, { id: OTHER_MANAGER_ID, managerId: null }]);
    mocks.wouldCreateHierarchyCycle.mockResolvedValue(false);
  });

  it("exige gestores diferentes", async () => {
    const result = await transferHrDirectReports(HR, { fromManagerId: OTHER_MANAGER_ID, toManagerId: OTHER_MANAGER_ID });
    expect(result.ok).toBe(false);
  });

  it("recusa transferência que criaria ciclo", async () => {
    mocks.wouldCreateHierarchyCycle.mockResolvedValue(true);
    const result = await transferHrDirectReports(HR, { fromManagerId: HR.personId, toManagerId: OTHER_MANAGER_ID });
    expect(result.ok).toBe(false);
    expect(mocks.runtimePrisma.$transaction).not.toHaveBeenCalled();
  });

  it("move os liderados, fecha o histórico anterior e registra o log", async () => {
    const result = await transferHrDirectReports(HR, { fromManagerId: HR.personId, toManagerId: OTHER_MANAGER_ID });
    expect(result.ok).toBe(true);
    expect(mocks.runtimeTransaction.person.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [PERSON_ID] } },
      data: { managerId: OTHER_MANAGER_ID, version: { increment: 1 } },
    });
    expect(mocks.runtimeTransaction.reportingLineHistory.updateMany).toHaveBeenCalled();
    expect(mocks.runtimeTransaction.reportingLineHistory.createMany).toHaveBeenCalled();
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(mocks.runtimeTransaction, expect.objectContaining({
      data: expect.objectContaining({ action: "TRANSFER_DIRECT_REPORTS" }),
    }));
  });
});
