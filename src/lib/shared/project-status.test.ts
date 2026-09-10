import { describe, expect, it } from "vitest";

import { CURRENT_PROJECT_STATUS } from "./project-status";

describe("CURRENT_PROJECT_STATUS", () => {
  it("descreve a etapa funcional e o próximo marco do MVP", () => {
    expect(CURRENT_PROJECT_STATUS).toEqual({
      phase: "Implementação funcional do MVP",
      nextMilestone: "Homologação funcional do MVP",
    });
  });
});
