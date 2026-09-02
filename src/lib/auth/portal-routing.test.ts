import { describe, expect, it } from "vitest";

import {
  canAccessPortalArea,
  resolvePortalDestination,
} from "./portal-routing";

describe("roteamento autenticado por perfil", () => {
  it.each([
    [["SYSTEM_ADMIN"], "/portal/administracao"],
    [["HR_ADMIN"], "/portal/rh"],
    [["MANAGER"], "/portal/equipe"],
    [["EMPLOYEE"], "/portal/meus-feedbacks"],
  ] as const)("resolve %j para %s", (roles, destination) => {
    expect(resolvePortalDestination(roles)).toBe(destination);
  });

  it("usa precedencia funcional previsivel quando papeis podem ser acumulados", () => {
    expect(
      resolvePortalDestination(["EMPLOYEE", "MANAGER", "HR_ADMIN"]),
    ).toBe("/portal/rh");
    expect(resolvePortalDestination(["EMPLOYEE", "MANAGER"])).toBe(
      "/portal/equipe",
    );
  });

  it("falha fechado para papeis ausentes, desconhecidos ou combinacao tecnica mista", () => {
    expect(resolvePortalDestination([])).toBeNull();
    expect(resolvePortalDestination(["UNKNOWN"])).toBeNull();
    expect(
      resolvePortalDestination(["SYSTEM_ADMIN", "HR_ADMIN"]),
    ).toBeNull();
  });

  it("autoriza somente areas vinculadas aos papeis validos da conta", () => {
    const roles = ["MANAGER", "EMPLOYEE"] as const;

    expect(canAccessPortalArea(roles, "MANAGER")).toBe(true);
    expect(canAccessPortalArea(roles, "EMPLOYEE")).toBe(true);
    expect(canAccessPortalArea(roles, "HR_ADMIN")).toBe(false);
    expect(
      canAccessPortalArea(["SYSTEM_ADMIN", "HR_ADMIN"], "SYSTEM_ADMIN"),
    ).toBe(false);
  });
});
