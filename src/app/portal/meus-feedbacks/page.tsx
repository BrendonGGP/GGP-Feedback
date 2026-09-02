import { PortalAreaPage } from "@/components/portal/portal-area-page";

export default function EmployeePortalPage() {
  return (
    <PortalAreaPage
      eyebrow="Colaborador"
      title="Meus feedbacks"
      description="Área pessoal destinada aos seus próprios feedbacks e, futuramente, ao seu PDI."
      requiredRole="EMPLOYEE"
    />
  );
}
