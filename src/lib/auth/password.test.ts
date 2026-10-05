import { beforeEach, describe, expect, it, vi } from "vitest";

const { hashArgon2id, verifyArgon2id } = vi.hoisted(() => ({
  verifyArgon2id: vi.fn(async (digest: string, password: string) =>
    digest.startsWith("$argon2id$") && password === "correct-password",
  ),
  hashArgon2id: vi.fn(async () => "$argon2id$generated-test-hash"),
}));

vi.mock("./argon2id.mjs", () => ({
  hashArgon2id,
  verifyArgon2id,
}));

import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
} from "./password";

describe("password helpers", () => {
  beforeEach(() => {
    verifyArgon2id.mockClear();
    hashArgon2id.mockClear();
  });

  it("solicita Argon2id ao criar um hash", async () => {
    await expect(hashPassword("correct-password")).resolves.toBe(
      "$argon2id$generated-test-hash",
    );
    expect(hashArgon2id).toHaveBeenCalledWith("correct-password");
  });

  it("verifica apenas hashes Argon2id e trata erro como falha", async () => {
    await expect(
      verifyPassword("$argon2id$stored-hash", "correct-password"),
    ).resolves.toBe(true);
    await expect(
      verifyPassword("$argon2i$legacy-hash", "correct-password"),
    ).resolves.toBe(false);
    expect(verifyArgon2id).toHaveBeenCalledTimes(1);

    verifyArgon2id.mockRejectedValueOnce(new Error("invalid digest"));
    await expect(
      verifyPassword(DUMMY_PASSWORD_HASH, "wrong-password"),
    ).resolves.toBe(false);
  });
});
