import { PortalAreaPage } from "@/components/portal/portal-area-page";

export default function HrPortalPage() {
  return (
    <PortalAreaPage
      eyebrow="RH"
      title="Gestão de pessoas"
      description="Área funcional do RH para as empresas autorizadas."
      requiredRole="HR_ADMIN"
    />
  );
}
