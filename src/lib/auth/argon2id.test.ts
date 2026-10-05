import { describe, expect, it } from "vitest";

import { hashArgon2id, verifyArgon2id } from "./argon2id.mjs";
import { DUMMY_PASSWORD_HASH } from "./password";

const PHC_PATTERN =
  /^\$argon2id\$v=19\$m=65536,t=3,p=4\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/;

describe("argon2id (node:crypto)", () => {
  it("gera hash PHC com os mesmos parâmetros do pacote argon2", async () => {
    const first = await hashArgon2id("Senha-sintetica-1");
    const second = await hashArgon2id("Senha-sintetica-1");

    expect(first).toMatch(PHC_PATTERN);
    expect(second).not.toBe(first);
  });

  it("valida a senha correta e rejeita a incorreta", async () => {
    const hash = await hashArgon2id("Senha-sintetica-1");

    await expect(verifyArgon2id(hash, "Senha-sintetica-1")).resolves.toBe(true);
    await expect(verifyArgon2id(hash, "Senha-sintetica-2")).resolves.toBe(false);
  });

  it("aceita parâmetros em qualquer ordem, como no hash fictício existente", async () => {
    await expect(verifyArgon2id(DUMMY_PASSWORD_HASH, "qualquer-senha")).resolves.toBe(
      false,
    );
  });

  it("rejeita hashes malformados ou com custo fora dos limites", async () => {
    const valid = await hashArgon2id("Senha-sintetica-1");
    const [, , , , salt, tag] = valid.split("$");
    const invalidHashes = [
      "",
      "$argon2i$v=19$m=65536,t=3,p=4$" + salt + "$" + tag,
      "$argon2id$v=16$m=65536,t=3,p=4$" + salt + "$" + tag,
      "$argon2id$v=19$m=65536,t=3$" + salt + "$" + tag,
      "$argon2id$v=19$m=65536,t=3,p=4,p=4$" + salt + "$" + tag,
      "$argon2id$v=19$m=4194304,t=3,p=4$" + salt + "$" + tag,
      "$argon2id$v=19$m=65536,t=3,p=4$!!$" + tag,
    ];

    for (const invalid of invalidHashes) {
      await expect(verifyArgon2id(invalid, "Senha-sintetica-1")).rejects.toThrow();
    }
  });
});
