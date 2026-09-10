import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { AuthenticatedActor } from "@/lib/auth/session";
import { canAdministerHrDomain } from "@/lib/authorization/access-control";
import { withDatabaseActor } from "@/lib/infrastructure/database/actor-context";

export const PEOPLE_DIRECTORY_VIEWS = ["all", "managers"] as const;
export const PEOPLE_DIRECTORY_STATUSES = ["active", "all"] as const;

export type PeopleDirectoryView = (typeof PEOPLE_DIRECTORY_VIEWS)[number];
export type PeopleDirectoryStatus = (typeof PEOPLE_DIRECTORY_STATUSES)[number];

export type PeopleDirectoryFilters = Readonly<{
  query: string;
  view: PeopleDirectoryView;
  status: PeopleDirectoryStatus;
}>;

export type HrPeopleDirectoryData = Readonly<{
  metrics: Readonly<{
    activePeople: number;
    activeManagers: number;
    roots: number;
    withoutAccount: number;
  }>;
  filters: PeopleDirectoryFilters;
  filteredTotal: number;
  resultLimited: boolean;
  people: readonly {
    id: string;
    fullName: string;
    jobTitle: string;
    corporateEmail: string | null;
    active: boolean;
    managerName: string | null;
    hasManager: boolean;
    companyName: string;
    departmentName: string;
    directReportCount: number;
    hasAccount: boolean;
  }[];
}>;

const filtersSchema = z.object({
  query: z.string().trim().max(100).default(""),
  view: z.enum(PEOPLE_DIRECTORY_VIEWS).default("all"),
  status: z.enum(PEOPLE_DIRECTORY_STATUSES).default("active"),
});

export const parsePeopleDirectoryFilters = (input: unknown): PeopleDirectoryFilters => {
  const parsed = filtersSchema.safeParse(input);
  if (!parsed.success) return { query: "", view: "all", status: "active" };
  return parsed.data;
};

const buildWhere = (filters: PeopleDirectoryFilters): Prisma.PersonWhereInput => ({
  ...(filters.status === "active" ? { active: true } : {}),
  ...(filters.view === "managers" ? { directReports: { some: { active: true } } } : {}),
  ...(filters.query
    ? {
        OR: [
          { fullName: { contains: filters.query, mode: "insensitive" } },
          { corporateEmail: { contains: filters.query, mode: "insensitive" } },
          { jobTitle: { contains: filters.query, mode: "insensitive" } },
          { company: { name: { contains: filters.query, mode: "insensitive" } } },
          { department: { name: { contains: filters.query, mode: "insensitive" } } },
        ],
      }
    : {}),
});

export const getHrPeopleDirectory = async (
  actor: AuthenticatedActor,
  input: unknown = {},
): Promise<HrPeopleDirectoryData | null> => {
  if (!canAdministerHrDomain(actor)) return null;

  const filters = parsePeopleDirectoryFilters(input);
  const where = buildWhere(filters);
  const [activePeople, activeManagers, roots, withoutAccount, filteredTotal, people] =
    await withDatabaseActor(actor, async (db) =>
      Promise.all([
        db.person.count({ where: { active: true } }),
        db.person.count({ where: { active: true, directReports: { some: { active: true } } } }),
        db.person.count({ where: { active: true, managerId: null } }),
        db.person.count({ where: { active: true, account: null } }),
        db.person.count({ where }),
        db.person.findMany({
        where,
        take: 200,
        orderBy: [{ active: "desc" }, { fullName: "asc" }],
        select: {
          id: true,
          fullName: true,
          jobTitle: true,
          corporateEmail: true,
          active: true,
          managerId: true,
          company: { select: { name: true } },
          department: { select: { name: true } },
          manager: { select: { fullName: true } },
          account: { select: { id: true } },
          _count: { select: { directReports: { where: { active: true } } } },
        },
        }),
      ]),
    );

  return {
    metrics: { activePeople, activeManagers, roots, withoutAccount },
    filters,
    filteredTotal,
    resultLimited: filteredTotal > people.length,
    people: people.map((person) => ({
      id: person.id,
      fullName: person.fullName,
      jobTitle: person.jobTitle,
      corporateEmail: person.corporateEmail,
      active: person.active,
      managerName: person.manager?.fullName ?? null,
      hasManager: person.managerId !== null,
      companyName: person.company.name,
      departmentName: person.department.name,
      directReportCount: person._count.directReports,
      hasAccount: person.account !== null,
    })),
  };
};
