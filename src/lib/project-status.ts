export type ProjectStatus = Readonly<{
  phase: string;
  nextMilestone: string;
}>;

export const CURRENT_PROJECT_STATUS = {
  phase: "Fundação técnica",
  nextMilestone: "Autenticação e autorização",
} as const satisfies ProjectStatus;
