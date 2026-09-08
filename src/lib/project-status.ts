export type ProjectStatus = Readonly<{
  phase: string;
  nextMilestone: string;
}>;

export const CURRENT_PROJECT_STATUS = {
  phase: "Implementação funcional do MVP",
  nextMilestone: "Homologação funcional do MVP",
} as const satisfies ProjectStatus;
