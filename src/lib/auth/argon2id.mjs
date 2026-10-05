// Argon2id on Node's built-in crypto (Node >= 24.7). The native "argon2"
// package ships an unsigned binary that Windows Application Control blocks.
// Hashes use the same PHC format and defaults as that package, so stored
// hashes remain valid in both directions.
import { argon2 as argon2Callback, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(argon2Callback);

const ARGON2_VERSION = 19;
const DEFAULT_PARAMS = Object.freeze({ memory: 65536, passes: 3, parallelism: 4 });
const SALT_LENGTH = 16;
const TAG_LENGTH = 32;

// Upper bounds stop a malformed stored hash from forcing an expensive derivation.
const LIMITS = Object.freeze({ memory: 1 << 20, passes: 10, parallelism: 16 });
const PARAM_KEYS = Object.freeze({ m: "memory", t: "passes", p: "parallelism" });
const BASE64_PATTERN = /^[A-Za-z0-9+/]+$/;

const toBase64 = (buffer) => buffer.toString("base64").replace(/=+$/, "");

const parseHash = (encoded) => {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "" || parts[1] !== "argon2id") return null;
  if (parts[2] !== `v=${ARGON2_VERSION}`) return null;

  const params = {};
  for (const entry of parts[3].split(",")) {
    const [key, value] = entry.split("=");
    const name = PARAM_KEYS[key];
    if (!name || name in params || !/^\d+$/.test(value ?? "")) return null;
    const number = Number(value);
    if (number < 1 || number > LIMITS[name]) return null;
    params[name] = number;
  }
  if (Object.keys(params).length !== 3) return null;
  if (!BASE64_PATTERN.test(parts[4]) || !BASE64_PATTERN.test(parts[5])) return null;

  const nonce = Buffer.from(parts[4], "base64");
  const tag = Buffer.from(parts[5], "base64");
  if (nonce.length < 8 || tag.length < 16 || tag.length > 64) return null;

  return { params, nonce, tag };
};

export const hashArgon2id = async (password) => {
  const nonce = randomBytes(SALT_LENGTH);
  const tag = await deriveKey("argon2id", {
    message: password,
    nonce,
    tagLength: TAG_LENGTH,
    ...DEFAULT_PARAMS,
  });
  const { memory, passes, parallelism } = DEFAULT_PARAMS;
  return `$argon2id$v=${ARGON2_VERSION}$m=${memory},t=${passes},p=${parallelism}$${toBase64(nonce)}$${toBase64(tag)}`;
};

export const verifyArgon2id = async (encoded, password) => {
  const parsed = parseHash(encoded);
  if (!parsed) throw new Error("Invalid Argon2id hash.");

  const derived = await deriveKey("argon2id", {
    message: password,
    nonce: parsed.nonce,
    tagLength: parsed.tag.length,
    ...parsed.params,
  });
  return timingSafeEqual(derived, parsed.tag);
};
