import type { DefaultSession } from "next-auth";
import type { AccessRole } from "@/lib/authorization/access-control";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      accountId: string;
      personId: string;
      roles: AccessRole[];
    } & DefaultSession["user"];
  }

  interface User {
    accountId: string;
    personId: string;
    roles: AccessRole[];
    sessionId: string;
    sessionNonce: string;
    sessionVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accountId?: string;
    personId?: string;
    roles?: AccessRole[];
    sessionId?: string;
    sessionNonce?: string;
    sessionVersion?: number;
    revoked?: boolean;
  }
}
