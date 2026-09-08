import { describe, expect, it } from "vitest";

import { passwordResetRequestSchema, passwordResetSchema } from "./password-reset";

describe("recuperação de senha", () => {
  it("aceita identificador válido sem exigir formato de e-mail", () => {
    expect(passwordResetRequestSchema.safeParse({ loginIdentifier: "rh.sintetico" }).success).toBe(true);
  });

  it("aplica a política de senha e exige confirmação", () => {
    const base = { token: "a".repeat(43), newPassword: "SenhaSegura1!", confirmPassword: "SenhaSegura1!" };
    expect(passwordResetSchema.safeParse(base).success).toBe(true);
    expect(passwordResetSchema.safeParse({ ...base, confirmPassword: "OutraSenha1!" }).success).toBe(false);
    expect(passwordResetSchema.safeParse({ ...base, newPassword: "senha-fraca" }).success).toBe(false);
  });
});
