import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    formTemplate: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
  };

  return {
    transaction,
    withDatabaseActor: vi.fn(),
  };
});

vi.mock("@/lib/infrastructure/database/actor-context", () => ({
  withDatabaseActor: mocks.withDatabaseActor,
}));

import { deleteHrFormTemplate } from "./form-management";

const actor = {
  accountId: "5f4f74c4-87eb-4f11-80d8-9935e1c0581d",
  personId: "ef97f61c-a79b-4943-8050-f46d778341eb",
  mustChangePassword: false,
  roles: ["HR_ADMIN"] as const,
};
const templateId = "6f4f74c4-87eb-4f11-80d8-9935e1c0581d";

describe("exclusao logica de formularios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withDatabaseActor.mockImplementation(async (_actor, operation) => operation(mocks.transaction));
  });

  it("nega a exclusao para perfis que nao administram o RH", async () => {
    const result = await deleteHrFormTemplate({ ...actor, roles: ["EMPLOYEE"] }, templateId);

    expect(result.ok).toBe(false);
    expect(mocks.withDatabaseActor).not.toHaveBeenCalled();
  });

  it("rejeita um identificador de formulario invalido", async () => {
    const result = await deleteHrFormTemplate(actor, "formulario-invalido");

    expect(result.ok).toBe(false);
    expect(mocks.withDatabaseActor).not.toHaveBeenCalled();
  });

  it("informa quando o formulario nao existe", async () => {
    mocks.transaction.formTemplate.findUnique.mockResolvedValue(null);

    const result = await deleteHrFormTemplate(actor, templateId);

    expect(result.ok).toBe(false);
    expect(mocks.transaction.formTemplate.findUnique).toHaveBeenCalledWith({
      where: { id: templateId },
      select: { id: true, name: true, active: true },
    });
    expect(mocks.transaction.formTemplate.update).not.toHaveBeenCalled();
    expect(mocks.transaction.auditEvent.create).not.toHaveBeenCalled();
  });

  it("arquiva o formulario ativo e registra a auditoria", async () => {
    mocks.transaction.formTemplate.findUnique.mockResolvedValue({
      id: templateId,
      name: "Feedback de desempenho",
      active: true,
    });

    const result = await deleteHrFormTemplate(actor, templateId);

    expect(result.ok).toBe(true);
    expect(mocks.transaction.formTemplate.update).toHaveBeenCalledWith({
      where: { id: templateId },
      data: { active: false },
      select: { id: true },
    });
    expect(mocks.transaction.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorAccountId: actor.accountId,
        action: "ARCHIVE_FORM_TEMPLATE",
        entityType: "FORM_TEMPLATE",
        entityId: templateId,
        result: "SUCCESS",
        metadata: { name: "Feedback de desempenho" },
      }),
    });
  });

  it("mantem a operacao idempotente para um formulario ja excluido", async () => {
    mocks.transaction.formTemplate.findUnique.mockResolvedValue({
      id: templateId,
      name: "Feedback de desempenho",
      active: false,
    });

    const result = await deleteHrFormTemplate(actor, templateId);

    expect(result.ok).toBe(true);
    expect(mocks.transaction.formTemplate.update).not.toHaveBeenCalled();
    expect(mocks.transaction.auditEvent.create).not.toHaveBeenCalled();
  });
});
