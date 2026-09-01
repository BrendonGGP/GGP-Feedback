import { describe, expect, it } from "vitest";

import { CURRENT_PROJECT_STATUS } from "./project-status";

describe("CURRENT_PROJECT_STATUS", () => {
  it("descreve a etapa inicial sem prometer funcionalidade pronta", () => {
    expect(CURRENT_PROJECT_STATUS).toEqual({
      phase: "Fundação técnica",
      nextMilestone: "Autenticação e autorização",
    });
  });
});
