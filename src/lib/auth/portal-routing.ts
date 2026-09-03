import {
  hasValidRoleCombination,
  isAccessRole,
  type AccessRole,
} from "@/lib/authorization/access-control";

export const PORTAL_ROUTES = {
  SYSTEM_ADMIN: "/portal/administracao",
  HR_ADMIN: "/portal/rh",
  MANAGER: "/portal/equipe",
  EMPLOYEE: "/portal/meus-feedbacks",
} as const satisfies Record<AccessRole, string>;

export const PORTAL_HOME_ROUTE = "/portal/dashboard";

const DESTINATION_PRECEDENCE: readonly AccessRole[] = [
  "SYSTEM_ADMIN",
  "HR_ADMIN",
  "MANAGER",
  "EMPLOYEE",
];

const hasUsableRoles = (roles: readonly unknown[]): roles is AccessRole[] =>
  roles.length > 0 &&
  roles.every(isAccessRole) &&
  hasValidRoleCombination(roles);

export const resolvePortalHome = (
  roles: readonly unknown[],
): typeof PORTAL_HOME_ROUTE | null =>
  hasUsableRoles(roles) ? PORTAL_HOME_ROUTE : null;

export const resolvePrimaryPortalRole = (
  roles: readonly unknown[],
): AccessRole | null => {
  if (!hasUsableRoles(roles)) {
    return null;
  }

  return (
    DESTINATION_PRECEDENCE.find((role) => roles.includes(role)) ?? null
  );
};

export const resolvePortalDestination = (
  roles: readonly unknown[],
): string | null => {
  if (!hasUsableRoles(roles)) {
    return null;
  }

  const primaryRole = resolvePrimaryPortalRole(roles);

  return primaryRole ? PORTAL_ROUTES[primaryRole] : null;
};

export const canAccessPortalArea = (
  roles: readonly unknown[],
  requiredRole: AccessRole,
): boolean => hasUsableRoles(roles) && roles.includes(requiredRole);
