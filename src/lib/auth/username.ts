import { z } from "zod";

/**
 * Canonical username format used by every provisioned access account.
 *
 * Usernames are intentionally ASCII and separator-based so they are easy to
 * communicate and type: `nome.sobrenome`, optionally with digits, `_` or `-`.
 */
export const USERNAME_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 64;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN_LENGTH, "Informe um nome de usuário válido.")
  .max(USERNAME_MAX_LENGTH, "O nome de usuário excede o limite permitido.")
  .regex(
    USERNAME_PATTERN,
    "Use apenas letras, números e separadores simples (ex.: nome.sobrenome).",
  );

export type Username = z.infer<typeof usernameSchema>;

export const normalizeUsername = (value: string): Username =>
  usernameSchema.parse(value);
