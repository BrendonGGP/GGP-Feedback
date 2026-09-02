import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { hashSessionNonce, sessionNonceMatches } from "./sessions";

describe("vinculo criptografico da sessao", () => {
  it("aceita somente o nonce que originou o hash persistido", () => {
    const nonce = "nonce-sintetico-com-entropia-suficiente";
    const persistedHash = hashSessionNonce(nonce);

    expect(persistedHash).toHaveLength(64);
    expect(sessionNonceMatches(persistedHash, nonce)).toBe(true);
    expect(sessionNonceMatches(persistedHash, "outro-nonce")).toBe(false);
  });

  it("falha fechado para hash persistido malformado", () => {
    expect(sessionNonceMatches("invalido", "nonce")).toBe(false);
  });
});
