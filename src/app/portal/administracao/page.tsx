import { PortalAreaPage } from "@/components/portal/portal-area-page";

export default function SystemAdministrationPage() {
  return (
    <PortalAreaPage
      eyebrow="Administrador do Sistema"
      title="Administração técnica"
      description="Área exclusiva para configurações, contas e papéis, sem acesso ao conteúdo de feedback ou PDI."
      requiredRole="SYSTEM_ADMIN"
    />
  );
}
