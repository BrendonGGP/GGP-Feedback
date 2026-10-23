"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedActor } from "@/lib/auth/session";
import {
  createHrCompany,
  createHrDepartment,
  createHrPerson,
  updateHrPersonOrganization,
  type OrganizationMutationResult,
} from "@/lib/hr/organization-management";
import {
  deleteHrPerson,
  transferHrDirectReports,
  updateHrAccessProfile,
} from "@/lib/hr/person-access";

const getString = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

const finish = (result: OrganizationMutationResult): never => {
  if (!result.ok) {
    const detail = Object.values(result.fieldErrors)[0];
    redirect(`/portal/rh/organizacao?erro=${encodeURIComponent(detail ?? result.message)}`);
  }
  revalidatePath("/portal/rh/organizacao");
  redirect(`/portal/rh/organizacao?sucesso=${encodeURIComponent(result.message)}`);
};

const requireActor = async () => {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");
  return actor;
};

export async function createCompanyAction(formData: FormData): Promise<never> {
  const actor = await requireActor();
  return finish(await createHrCompany(actor, { name: getString(formData, "name") }));
}

export async function createDepartmentAction(formData: FormData): Promise<never> {
  const actor = await requireActor();
  return finish(await createHrDepartment(actor, {
    companyId: getString(formData, "companyId"),
    name: getString(formData, "name"),
  }));
}

export async function createPersonAction(formData: FormData): Promise<never> {
  const actor = await requireActor();
  return finish(await createHrPerson(actor, {
    companyId: getString(formData, "companyId"),
    departmentId: getString(formData, "departmentId"),
    managerId: getString(formData, "managerId"),
    fullName: getString(formData, "fullName"),
    corporateEmail: getString(formData, "corporateEmail"),
    jobTitle: getString(formData, "jobTitle"),
    employmentRegime: getString(formData, "employmentRegime"),
  }));
}

export async function updatePersonOrganizationAction(formData: FormData): Promise<never> {
  const actor = await requireActor();
  return finish(await updateHrPersonOrganization(actor, {
    personId: getString(formData, "personId"),
    companyId: getString(formData, "companyId"),
    departmentId: getString(formData, "departmentId"),
    managerId: getString(formData, "managerId"),
    active: getString(formData, "active") === "true",
    reason: getString(formData, "reason"),
    version: Number(getString(formData, "version")),
  }));
}

export async function updateAccessProfileAction(formData: FormData): Promise<never> {
  const actor = await requireActor();
  return finish(await updateHrAccessProfile(actor, {
    personId: getString(formData, "personId"),
    profile: getString(formData, "profile"),
  }));
}

export async function deletePersonAction(formData: FormData): Promise<never> {
  const actor = await requireActor();
  if (getString(formData, "confirm") !== "on") {
    return finish({ ok: false, message: "Confirme a exclusão marcando a caixa de confirmação.", fieldErrors: {} });
  }
  return finish(await deleteHrPerson(actor, {
    personId: getString(formData, "personId"),
    version: getString(formData, "version"),
    reason: getString(formData, "reason"),
  }));
}

export async function transferReportsAction(formData: FormData): Promise<never> {
  const actor = await requireActor();
  return finish(await transferHrDirectReports(actor, {
    fromManagerId: getString(formData, "fromManagerId"),
    toManagerId: getString(formData, "toManagerId"),
    reason: getString(formData, "reason"),
  }));
}
