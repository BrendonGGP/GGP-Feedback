export const ACCESS_ROLES = [
  "SYSTEM_ADMIN",
  "HR_ADMIN",
  "MANAGER",
  "EMPLOYEE",
] as const;

export type AccessRole = (typeof ACCESS_ROLES)[number];

export type AuthorizationActor = Readonly<{
  personId: string;
  roles: readonly AccessRole[];
}>;

export type PersonScope = Readonly<{
  personId: string;
  managerId: string | null;
}>;

export type FeedbackScope = Readonly<{
  subjectPersonId: string;
  evaluatorPersonId: string;
  status: "DRAFT" | "SUBMITTED" | "CANCELLED";
}>;

export type SelfAssessmentScope = Readonly<{
  subjectPersonId: string;
  selfAssessmentEnabled: boolean;
}>;

export type FeedbackReadScope = "NONE" | "ALL" | "SELF_AND_AUTHORED" | "SELF";

export const isAccessRole = (value: unknown): value is AccessRole =>
  typeof value === "string" && ACCESS_ROLES.includes(value as AccessRole);

const hasRole = (actor: AuthorizationActor, role: AccessRole): boolean =>
  actor.roles.includes(role);

/**
 * SYSTEM_ADMIN is an exclusive technical identity. A mixed assignment is
 * rejected so that adding a business role cannot silently expose feedbacks.
 */
export const hasValidRoleCombination = (
  roles: readonly AccessRole[],
): boolean =>
  !roles.includes("SYSTEM_ADMIN") ||
  (roles.length === 1 && roles[0] === "SYSTEM_ADMIN");

const hasUsableRoles = (actor: AuthorizationActor): boolean =>
  actor.roles.length > 0 && hasValidRoleCombination(actor.roles);

/** Papéis que entram no portal. Colaborador sem outro papel não acessa (out/2026). */
export const PORTAL_ACCESS_ROLES = ["SYSTEM_ADMIN", "HR_ADMIN", "MANAGER"] as const satisfies readonly AccessRole[];

/** Só gestores, RH e o administrador do sistema usam o portal. */
export const hasPortalAccess = (roles: readonly AccessRole[]): boolean =>
  roles.length > 0 &&
  hasValidRoleCombination(roles) &&
  roles.some((role) => (PORTAL_ACCESS_ROLES as readonly AccessRole[]).includes(role));

export const canAdministerSystem = (actor: AuthorizationActor): boolean =>
  hasUsableRoles(actor) && hasRole(actor, "SYSTEM_ADMIN");

export const canAdministerHrDomain = (actor: AuthorizationActor): boolean =>
  hasUsableRoles(actor) && hasRole(actor, "HR_ADMIN");

export const canViewPerson = (
  actor: AuthorizationActor,
  person: PersonScope,
): boolean => {
  if (!hasUsableRoles(actor) || hasRole(actor, "SYSTEM_ADMIN")) {
    return false;
  }

  if (hasRole(actor, "HR_ADMIN")) {
    return true;
  }

  if (person.personId === actor.personId) {
    return true;
  }

  return hasRole(actor, "MANAGER") && person.managerId === actor.personId;
};

export const canReadFeedbackContent = (
  actor: AuthorizationActor,
  feedback: FeedbackScope,
): boolean => {
  if (!hasUsableRoles(actor) || hasRole(actor, "SYSTEM_ADMIN")) {
    return false;
  }

  if (hasRole(actor, "HR_ADMIN")) {
    return true;
  }

  const isAuthor = feedback.evaluatorPersonId === actor.personId;
  const isSubject = feedback.subjectPersonId === actor.personId;

  // The author keeps access to their own drafts (including a self-assessment).
  if (isAuthor && (isSubject || hasRole(actor, "MANAGER"))) {
    return true;
  }

  // The person being evaluated only sees a feedback once it was submitted.
  return isSubject && feedback.status === "SUBMITTED";
};

export const resolveFeedbackReadScope = (
  actor: AuthorizationActor,
): FeedbackReadScope => {
  if (!hasUsableRoles(actor) || hasRole(actor, "SYSTEM_ADMIN")) {
    return "NONE";
  }
  if (hasRole(actor, "HR_ADMIN")) {
    return "ALL";
  }
  if (hasRole(actor, "MANAGER")) {
    return "SELF_AND_AUTHORED";
  }
  return hasRole(actor, "EMPLOYEE") ? "SELF" : "NONE";
};

export const canCreateFeedbackForPerson = (
  actor: AuthorizationActor,
  subject: PersonScope,
): boolean => {
  if (!hasUsableRoles(actor) || hasRole(actor, "SYSTEM_ADMIN")) {
    return false;
  }

  return (
    hasRole(actor, "MANAGER") &&
    subject.personId !== actor.personId &&
    subject.managerId === actor.personId
  );
};

/**
 * A autoavaliação foi encerrada por decisão do RH (out/2026): colaboradores não
 * acessam mais o portal e o feedback passa a ser só de gestor para liderado.
 * A política continua existindo para que nenhum caminho do servidor crie ou
 * edite uma autoavaliação; as já enviadas permanecem no histórico.
 */
export const canCreateSelfAssessment = (
  actor: AuthorizationActor,
  assessment: SelfAssessmentScope,
): boolean => {
  void actor;
  void assessment;
  return false;
};

/**
 * PDI is outside the current MVP. This policy records the approved boundary
 * for the future feature without claiming that PDI persistence exists today.
 */
export const canReadPdiContent = (
  actor: AuthorizationActor,
  subject: PersonScope,
): boolean => {
  if (!hasUsableRoles(actor) || hasRole(actor, "SYSTEM_ADMIN")) {
    return false;
  }

  if (hasRole(actor, "HR_ADMIN")) {
    return true;
  }

  if (subject.personId === actor.personId) {
    return true;
  }

  return hasRole(actor, "MANAGER") && subject.managerId === actor.personId;
};
