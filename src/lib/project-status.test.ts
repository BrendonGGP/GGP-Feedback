import { describe, expect, it } from "vitest";

import { getProjectStatus } from "./project-status";

describe("getProjectStatus", () => {
  it("descreve a etapa inicial sem prometer funcionalidade pronta", () => {
    expect(getProjectStatus()).toEqual({
      phase: "Fundação técnica",
      nextMilestone: "Autenticação e autorização",
    });
  });
});
