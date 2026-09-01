export type ProjectStatus = Readonly<{
  phase: string;
  nextMilestone: string;
}>;

export function getProjectStatus(): ProjectStatus {
  return {
    phase: "Fundação técnica",
    nextMilestone: "Autenticação e autorização",
  };
}
