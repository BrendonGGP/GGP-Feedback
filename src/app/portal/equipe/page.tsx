import { PortalAreaPage } from "@/components/portal/portal-area-page";

export default function ManagerPortalPage() {
  return (
    <PortalAreaPage
      eyebrow="Gestor"
      title="Minha equipe"
      description="Área destinada à equipe direta e aos feedbacks em que você é o avaliador."
      requiredRole="MANAGER"
    />
  );
}
