import { describe, expect, it } from "vitest";

import { getRuntimeTransaction, runWithRuntimeTransaction } from "./runtime-context";

describe("contexto transacional do runtime", () => {
  it("fica disponível somente dentro da execução do ator", async () => {
    const transaction = { marker: "transaction" } as never;

    expect(getRuntimeTransaction()).toBeUndefined();
    await runWithRuntimeTransaction(transaction, async () => {
      expect(getRuntimeTransaction()).toBe(transaction);
    });
    expect(getRuntimeTransaction()).toBeUndefined();
  });
});
