import { describe, expect, it } from "vitest";

import {
  createCycleInputSchema,
  nextCycleStatus,
  parseDateOnly,
} from "./cycle-management";

describe("regras de ciclos do RH", () => {
  it("aceita datas válidas e rejeita intervalo invertido", () => {
    const valid = createCycleInputSchema.safeParse({
      name: "Avaliação 2026",
      startsAt: "2026-09-01",
      endsAt: "2026-09-30",
      templateId: "10000000-0000-4000-8000-000000000002",
      selfAssessmentEnabled: false,
    });
    const invalid = createCycleInputSchema.safeParse({
      name: "Avaliação 2026",
      startsAt: "2026-09-30",
      endsAt: "2026-09-01",
      templateId: "10000000-0000-4000-8000-000000000002",
      selfAssessmentEnabled: false,
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it("rejeita datas de calendário impossíveis", () => {
    expect(parseDateOnly("2026-02-29")).toBeNull();
    expect(parseDateOnly("2026-02-28")).toBeInstanceOf(Date);
  });

  it("mantém a sequência de transições permitidas", () => {
    expect(nextCycleStatus("DRAFT")).toBe("OPEN");
    expect(nextCycleStatus("OPEN")).toBe("CLOSED");
    expect(nextCycleStatus("CLOSED")).toBe("ARCHIVED");
    expect(nextCycleStatus("ARCHIVED")).toBeNull();
  });
});
