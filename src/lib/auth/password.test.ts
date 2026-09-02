import { beforeEach, describe, expect, it, vi } from "vitest";

const { hash, verify } = vi.hoisted(() => ({
  verify: vi.fn(async (digest: string, password: string) =>
    digest.startsWith("$argon2id$") && password === "correct-password",
  ),
  hash: vi.fn(async () => "$argon2id$generated-test-hash"),
}));

vi.mock("argon2", () => ({
  argon2id: 2,
  hash,
  verify,
}));

import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
} from "./password";

describe("password helpers", () => {
  beforeEach(() => {
    verify.mockClear();
    hash.mockClear();
  });

  it("solicita Argon2id ao criar um hash", async () => {
    await expect(hashPassword("correct-password")).resolves.toBe(
      "$argon2id$generated-test-hash",
    );
    expect(hash).toHaveBeenCalledWith("correct-password", { type: 2 });
  });

  it("verifica apenas hashes Argon2id e trata erro como falha", async () => {
    await expect(
      verifyPassword("$argon2id$stored-hash", "correct-password"),
    ).resolves.toBe(true);
    await expect(
      verifyPassword("$argon2i$legacy-hash", "correct-password"),
    ).resolves.toBe(false);

    verify.mockRejectedValueOnce(new Error("invalid digest"));
    await expect(
      verifyPassword(DUMMY_PASSWORD_HASH, "wrong-password"),
    ).resolves.toBe(false);
  });
});
