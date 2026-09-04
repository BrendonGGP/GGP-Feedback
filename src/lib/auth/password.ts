import * as argon2 from "argon2";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
} as const;

export const PASSWORD_MIN_LENGTH = 9;
export const PASSWORD_MAX_LENGTH = 128;

const NUMBER_PATTERN = /\p{N}/u;
const SPECIAL_PATTERN = /[^\p{L}\p{N}\s]/u;

export const getPasswordPolicyError = (
  password: string,
  label = "A senha",
): string | null => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `${label} precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (!NUMBER_PATTERN.test(password)) {
    return `${label} precisa conter pelo menos um número.`;
  }
  if (!SPECIAL_PATTERN.test(password)) {
    return `${label} precisa conter pelo menos um caractere especial.`;
  }
  return null;
};

// A fixed hash keeps invalid-account attempts on the same password-verification
// path without storing or logging a real password.
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$w2sak2Q/+T6LUimY00tHaw$7Gdl78RMZNVe0Ijb47p40WrL0O0pzX9EtRFm4RXq6ZM";

export const hashPassword = (password: string): Promise<string> =>
  argon2.hash(password, ARGON2_OPTIONS);

export const verifyPassword = async (
  passwordHash: string,
  password: string,
): Promise<boolean> => {
  if (!passwordHash.startsWith("$argon2id$")) {
    return false;
  }

  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
};
