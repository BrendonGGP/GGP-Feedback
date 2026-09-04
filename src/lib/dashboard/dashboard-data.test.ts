import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async (operations: Promise<unknown>[]) =>
    Promise.all(operations),
  ),
  accessAccount: { count: vi.fn() },
  accountRoleAssignment: { count: vi.fn() },
  userSession: { count: vi.fn() },
  person: { count: vi.fn(), findUnique: vi.fn() },
  company: { count: vi.fn() },
  cycle: { count: vi.fn(), findFirst: vi.fn() },
  feedback: { count: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getPortalDashboardData } from "./dashboard-data";

const profile = {
  fullName: "Pessoa Sintética",
  jobTitle: "Analista",
  department: { name: "Operações" },
  company: { name: "GGP Desenvolvimento Sintético" },
};

describe("dados autorizados do dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.person.findUnique.mockResolvedValue(profile);
    prismaMock.cycle.findFirst.mockResolvedValue(null);
  });

  it("não consulta feedback nem ciclo funcional para o administrador do sistema", async () => {
    prismaMock.accessAccount.count.mockResolvedValue(4);
    prismaMock.accountRoleAssignment.count.mockResolvedValue(5);
    prismaMock.userSession.count.mockResolvedValue(1);

    const dashboard = await getPortalDashboardData({
      accountId: "account-system",
      personId: "person-system",
      mustChangePassword: false,
      roles: ["SYSTEM_ADMIN"],
    });

    expect(dashboard?.primaryRole).toBe("SYSTEM_ADMIN");
    expect(dashboard?.feedbackSummary).toBeNull();
    expect(dashboard?.cycle).toBeNull();
    expect(prismaMock.feedback.count).not.toHaveBeenCalled();
    expect(prismaMock.cycle.findFirst).not.toHaveBeenCalled();
  });

  it("limita indicadores do gestor à própria pessoa e aos liderados diretos", async () => {
    prismaMock.person.count.mockResolvedValue(3);
    prismaMock.feedback.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(1);

    const dashboard = await getPortalDashboardData({
      accountId: "account-manager",
      personId: "person-manager",
      mustChangePassword: false,
      roles: ["MANAGER", "EMPLOYEE"],
    });

    expect(dashboard?.primaryRole).toBe("MANAGER");
    expect(dashboard?.feedbackSummary).toEqual({
      drafts: 2,
      submitted: 6,
      completionRate: 75,
    });
    expect(prismaMock.person.count).toHaveBeenCalledWith({
      where: { managerId: "person-manager", active: true },
    });
    expect(prismaMock.feedback.count).toHaveBeenNthCalledWith(1, {
      where: {
        evaluatorPersonId: "person-manager",
        status: "DRAFT",
      },
    });
    expect(prismaMock.feedback.count).toHaveBeenNthCalledWith(3, {
      where: {
        subjectPersonId: "person-manager",
        status: "SUBMITTED",
      },
    });
  });
});
