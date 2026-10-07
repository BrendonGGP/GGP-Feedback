import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { AuthorizationActor } from "@/lib/authorization/access-control";

import { visibilityWhere } from "./feedback-visibility";

type FeedbackRow = Readonly<{
  id: string;
  subjectPersonId: string;
  evaluatorPersonId: string;
  status: "DRAFT" | "SUBMITTED" | "CANCELLED";
}>;

// Minimal evaluator for the subset of Prisma filters visibilityWhere produces.
const matches = (row: FeedbackRow, where: Prisma.FeedbackWhereInput): boolean =>
  Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Prisma.FeedbackWhereInput[]).some((w) => matches(row, w));
    if (key === "AND") return (value as Prisma.FeedbackWhereInput[]).every((w) => matches(row, w));
    return row[key as keyof FeedbackRow] === value;
  });

const rows: FeedbackRow[] = [
  { id: "manager-draft", subjectPersonId: "ana", evaluatorPersonId: "gestor", status: "DRAFT" },
  { id: "manager-sent", subjectPersonId: "ana", evaluatorPersonId: "gestor", status: "SUBMITTED" },
  { id: "manager-cancelled", subjectPersonId: "ana", evaluatorPersonId: "gestor", status: "CANCELLED" },
  { id: "self-draft", subjectPersonId: "ana", evaluatorPersonId: "ana", status: "DRAFT" },
  { id: "self-sent", subjectPersonId: "ana", evaluatorPersonId: "ana", status: "SUBMITTED" },
  { id: "other-sent", subjectPersonId: "bia", evaluatorPersonId: "gestor", status: "SUBMITTED" },
  { id: "gestor-received-draft", subjectPersonId: "gestor", evaluatorPersonId: "diretor", status: "DRAFT" },
  { id: "gestor-received-sent", subjectPersonId: "gestor", evaluatorPersonId: "diretor", status: "SUBMITTED" },
];

const visibleTo = (actor: AuthorizationActor): string[] =>
  rows.filter((row) => matches(row, visibilityWhere(actor))).map(({ id }) => id);

describe("visibilityWhere", () => {
  it("esconde do avaliado o rascunho e o cancelado escritos pelo gestor", () => {
    expect(visibleTo({ personId: "ana", roles: ["EMPLOYEE"] })).toEqual([
      "manager-sent",
      "self-draft",
      "self-sent",
    ]);
  });

  it("mantém para o gestor tudo o que ele escreveu e só o recebido já enviado", () => {
    expect(visibleTo({ personId: "gestor", roles: ["MANAGER", "EMPLOYEE"] })).toEqual([
      "manager-draft",
      "manager-sent",
      "manager-cancelled",
      "other-sent",
      "gestor-received-sent",
    ]);
  });

  it("dá ao RH acesso a todos os feedbacks", () => {
    expect(visibleTo({ personId: "rh", roles: ["HR_ADMIN"] })).toHaveLength(rows.length);
  });

  it("não expõe nenhum feedback ao administrador do sistema nem a conta sem papel", () => {
    expect(visibleTo({ personId: "admin", roles: ["SYSTEM_ADMIN"] })).toEqual([]);
    expect(visibleTo({ personId: "ana", roles: [] })).toEqual([]);
  });
});
