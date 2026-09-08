import { describe, expect, it } from "vitest";

import { normalizeUsername, usernameSchema } from "./username";

describe("nome de usuário", () => {
  it("aceita o formato corporativo e normaliza maiúsculas", () => {
    expect(normalizeUsername("Brendon.Nakagawa")).toBe("brendon.nakagawa");
  });

  it.each(["brendon nakagawa", "brendon@empresa.com.br", "-brendon", "a", "nome..sobrenome"]) (
    "rejeita username inválido: %s",
    (value) => {
      expect(usernameSchema.safeParse(value).success).toBe(false);
    },
  );
});
