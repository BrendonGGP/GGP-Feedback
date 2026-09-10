import type { Prisma } from "@prisma/client";

import type { AuthenticatedActor } from "@/lib/auth/session";
import { withDatabaseActor } from "@/lib/infrastructure/database/actor-context";

export type ManagerTeamMember = Readonly<{
  id: string;
  fullName: string;
  jobTitle: string;
  corporateEmail: string | null;
  companyName: string;
  departmentName: string;
  feedback: Readonly<{
    submitted: number;
    drafts: number;
    lastActivityAt: string | null;
  }>;
}>;

export type ManagerTeamData = Readonly<{
  manager: Readonly<{
    departmentName: string;
    companyName: string;
  }>;
  metrics: Readonly<{
    activeMembers: number;
    submittedFeedbacks: number;
    draftFeedbacks: number;
  }>;
  cycle: Readonly<{
    name: string;
    endsAt: string;
  }> | null;
  members: readonly ManagerTeamMember[];
}>;

const formatDate = (value: Date): string =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(value);

/**
 * Returns only active people directly managed by the authenticated manager.
 * Feedback rows are reduced to counts and dates so this page never loads or
 * exposes answer/comment content.
 */
export const getManagerTeam = async (
  actor: AuthenticatedActor,
): Promise<ManagerTeamData | null> => {
  if (actor.roles.includes("SYSTEM_ADMIN") || !actor.roles.includes("MANAGER")) {
    return null;
  }

  return withDatabaseActor(actor, async (db: Prisma.TransactionClient) => {
    const manager = await db.person.findUnique({
      where: { id: actor.personId },
      select: {
        company: { select: { name: true } },
        department: { select: { name: true } },
      },
    });

    if (!manager) return null;

    const members = await db.person.findMany({
      where: { managerId: actor.personId, active: true },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        jobTitle: true,
        corporateEmail: true,
        company: { select: { name: true } },
        department: { select: { name: true } },
      },
    });

    const memberIds = members.map((member) => member.id);
    const [feedbacks, cycle] = await Promise.all([
      memberIds.length === 0
        ? Promise.resolve([])
        : db.feedback.findMany({
            where: {
              evaluatorPersonId: actor.personId,
              subjectPersonId: { in: memberIds },
              status: { in: ["DRAFT", "SUBMITTED"] },
            },
            orderBy: { updatedAt: "desc" },
            select: {
              subjectPersonId: true,
              status: true,
              updatedAt: true,
              submittedAt: true,
            },
          }),
      db.cycle.findFirst({
        where: { status: "OPEN" },
        orderBy: { endsAt: "asc" },
        select: { name: true, endsAt: true },
      }),
    ]);

    const feedbackByMember = new Map<
    string,
    { submitted: number; drafts: number; lastActivityAt: Date | null }
  >();

    for (const feedback of feedbacks) {
    const current = feedbackByMember.get(feedback.subjectPersonId) ?? {
      submitted: 0,
      drafts: 0,
      lastActivityAt: null,
    };

    if (feedback.status === "SUBMITTED") {
      current.submitted += 1;
    } else if (feedback.status === "DRAFT") {
      current.drafts += 1;
    }

    if (!current.lastActivityAt) {
      current.lastActivityAt = feedback.updatedAt;
    }
    feedbackByMember.set(feedback.subjectPersonId, current);
  }

    const teamMembers = members.map((member) => {
    const feedback = feedbackByMember.get(member.id) ?? {
      submitted: 0,
      drafts: 0,
      lastActivityAt: null,
    };

    return {
      id: member.id,
      fullName: member.fullName,
      jobTitle: member.jobTitle,
      corporateEmail: member.corporateEmail,
      companyName: member.company.name,
      departmentName: member.department.name,
      feedback: {
        submitted: feedback.submitted,
        drafts: feedback.drafts,
        lastActivityAt: feedback.lastActivityAt ? formatDate(feedback.lastActivityAt) : null,
      },
    } satisfies ManagerTeamMember;
  });

    return {
      manager: {
        departmentName: manager.department.name,
        companyName: manager.company.name,
      },
      metrics: {
        activeMembers: teamMembers.length,
        submittedFeedbacks: teamMembers.reduce((total, member) => total + member.feedback.submitted, 0),
        draftFeedbacks: teamMembers.reduce((total, member) => total + member.feedback.drafts, 0),
      },
      cycle: cycle ? { name: cycle.name, endsAt: formatDate(cycle.endsAt) } : null,
      members: teamMembers,
    };
  });
};
