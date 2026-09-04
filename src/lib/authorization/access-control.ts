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

  if (feedback.subjectPersonId === actor.personId) {
    return true;
  }

  return (
    hasRole(actor, "MANAGER") &&
    feedback.evaluatorPersonId === actor.personId
  );
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
