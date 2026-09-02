import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authorizeProvisionedCredentials, AUTH_SESSION_MAX_AGE_SECONDS } from "@/lib/auth/credentials";
import { revokeSession } from "@/lib/auth/sessions";
import { hasValidRoleCombination, isAccessRole, type AccessRole } from "@/lib/authorization/access-control";
import { prisma } from "@/lib/prisma";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const invalidToken = (token: Record<string, unknown>) => ({
  ...token,
  accountId: undefined,
  personId: undefined,
  roles: [],
  sessionId: undefined,
  revoked: true,
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    updateAge: 15 * 60,
  },
  providers: [
    Credentials({
      credentials: {
        loginIdentifier: {
          label: "Identificador ou e-mail",
          type: "text",
        },
        password: { label: "Senha", type: "password" },
      },
      authorize: authorizeProvisionedCredentials,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accountId = user.accountId;
        token.personId = user.personId;
        token.roles = user.roles;
        token.sessionId = user.sessionId;
        token.sessionVersion = user.sessionVersion;
      }

      if (
        !isNonEmptyString(token.accountId) ||
        !isNonEmptyString(token.sessionId)
      ) {
        return invalidToken(token);
      }

      const persistedSession = await prisma.userSession.findUnique({
        where: { id: token.sessionId },
        include: { account: { include: { roles: { select: { role: true } } } } },
      });

      if (
        !persistedSession ||
        persistedSession.revokedAt !== null ||
        persistedSession.expiresAt <= new Date() ||
        persistedSession.account.status !== "ACTIVE" ||
        persistedSession.account.sessionVersion !== token.sessionVersion
      ) {
        return invalidToken(token);
      }

      const roles = persistedSession.account.roles.map(({ role }) => role);
      if (
        roles.length === 0 ||
        !roles.every(isAccessRole) ||
        !hasValidRoleCombination(roles)
      ) {
        return invalidToken(token);
      }

      return {
        ...token,
        accountId: persistedSession.account.id,
        personId: persistedSession.account.personId,
        roles: roles as AccessRole[],
        revoked: false,
      };
    },
    async session({ session, token }) {
      if (
        token.revoked ||
        !isNonEmptyString(token.accountId) ||
        !isNonEmptyString(token.personId) ||
        !Array.isArray(token.roles)
      ) {
        return {
          ...session,
          user: { ...session.user, id: "", accountId: "", personId: "", roles: [] },
        };
      }

      return {
        ...session,
        user: {
          ...session.user,
          id: token.accountId,
          accountId: token.accountId,
          personId: token.personId,
          roles: token.roles as AccessRole[],
        },
      };
    },
  },
  events: {
    async signOut(event) {
      if (
        "token" in event &&
        event.token?.sessionId &&
        isNonEmptyString(event.token.sessionId)
      ) {
        await revokeSession(event.token.sessionId);
      }
    },
  },
});
