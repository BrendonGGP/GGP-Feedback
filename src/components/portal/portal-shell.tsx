import Link from "next/link";
import type { ReactNode } from "react";

import { signOut } from "@/auth";
import type { AccessRole } from "@/lib/authorization/access-control";
import { AlternarTema } from "@/components/theme/alternar-tema";

import { LogoGgp } from "./logo-ggp";
import { AberturaPortal, PainelRota } from "./portal-motion";
import { BarraInferior, NavIlha, type NavGroup, type NavItem } from "./portal-nav";
import { PortalIcon } from "./portal-icon";
import styles from "./portal-shell.module.css";

type PortalShellProps = Readonly<{
  children: ReactNode;
  activePath: string;
  pageTitle: string;
  personName: string;
  roleLabel: string;
  roles: readonly AccessRole[];
}>;

const buildNavigation = (roles: readonly AccessRole[]): NavGroup[] => {
  const overview: NavItem[] = [
    { label: "Dashboard", icon: "dashboard", href: "/portal/dashboard" },
  ];

  if (
    !roles.includes("SYSTEM_ADMIN") &&
    roles.some((role) => ["HR_ADMIN", "MANAGER", "EMPLOYEE"].includes(role))
  ) {
    overview.push({ label: "Feedback", icon: "feedback", href: "/portal/meus-feedbacks" });
    if (roles.includes("HR_ADMIN") || roles.includes("MANAGER")) {
      overview.push({ label: "Análises", icon: "analytics", href: "/portal/meus-feedbacks/analises" });
    }
  }

  if (roles.includes("MANAGER")) {
    overview.push({ label: "Minha equipe", icon: "team", href: "/portal/equipe" });
  }

  if (!roles.includes("SYSTEM_ADMIN")) {
    overview.push({ label: "Calendário", icon: "calendar", badge: "Em breve" });
  }

  const administration: NavItem[] = [];
  if (roles.includes("SYSTEM_ADMIN")) {
    administration.push({ label: "Painel admin", icon: "admin", href: "/portal/administracao" });
  }
  if (roles.includes("HR_ADMIN")) {
    administration.push({ label: "Ciclos e formulários", icon: "cycle", href: "/portal/rh" });
    administration.push({ label: "Colaboradores", icon: "people", href: "/portal/rh/pessoas" });
    administration.push({ label: "Estrutura organizacional", icon: "organization", href: "/portal/rh/organizacao" });
  }

  const groups: NavGroup[] = [{ label: "Visão geral", items: overview }];
  if (administration.length > 0) {
    groups.push({ label: "Gestão", items: administration });
  }
  groups.push({ label: "Conta", items: [{ label: "Meu perfil", icon: "user", badge: "Em breve" }] });
  return groups;
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "G"}${parts.at(-1)?.[0] ?? "G"}`.toUpperCase();
};

function Marca() {
  return (
    <Link className={styles.brand} href="/portal/dashboard" aria-label="GGP Feedback — Dashboard">
      <LogoGgp largura={58} prioridade />
      <span className={styles.brandCopy}>
        <strong>Feedback</strong>
        <small>Portal de desenvolvimento</small>
      </span>
    </Link>
  );
}

function Cracha({ personName, roleLabel }: Readonly<{ personName: string; roleLabel: string }>) {
  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className={styles.cracha}>
      <span className={styles.avatar} aria-hidden="true">
        {getInitials(personName)}
      </span>
      <span className={styles.crachaCopy}>
        <strong>{personName}</strong>
        <small>{roleLabel}</small>
      </span>
      <form action={handleSignOut}>
        <button type="submit" className={styles.iconButton} aria-label="Encerrar sessão" title="Encerrar sessão">
          <PortalIcon name="logout" size={18} />
        </button>
      </form>
    </div>
  );
}

export function PortalShell({ children, pageTitle, personName, roleLabel, roles }: PortalShellProps) {
  const groups = buildNavigation(roles);
  const hrefs = groups.flatMap((group) => group.items.flatMap((item) => (item.href ? [item.href] : [])));
  const atalhos = groups
    .flatMap((group) => group.items)
    .filter((item) => item.href)
    .slice(0, 4);

  return (
    <AberturaPortal className={styles.portalShell}>
      <a className={styles.skipLink} href="#portal-main">
        Ir para o conteúdo principal
      </a>

      {/* Ilha lateral de vidro (desktop) */}
      <aside className={`vidro-painel ${styles.ilha}`} aria-label="Navegação" data-abertura-ilha>
        <Marca />
        <NavIlha groups={groups} />
        <Cracha personName={personName} roleLabel={roleLabel} />
      </aside>

      {/* Topo do celular: a ilha some abaixo de 960px */}
      <header className={`vidro ${styles.mobileHeader}`}>
        <Link href="/portal/dashboard" aria-label="GGP Feedback — Dashboard">
          <LogoGgp largura={52} />
        </Link>
        <span className={styles.mobileTitle}>{pageTitle}</span>
        <AlternarTema className={styles.iconButton} />
        <details className={styles.mobileMenu}>
          <summary className={styles.iconButton} aria-label="Abrir menu de navegação">
            <PortalIcon name="menu" />
          </summary>
          <div className={`vidro-denso vidro-flutuante ${styles.mobileMenuPanel}`}>
            <NavIlha groups={groups} lenteId="lente-menu" />
            <Cracha personName={personName} roleLabel={roleLabel} />
          </div>
        </details>
      </header>

      <div className={styles.workspace}>
        {/* Barra de cápsulas (desktop): flutua sobre o conteúdo */}
        <div className={styles.topbar}>
          <div className={`vidro ${styles.capsuleTitle}`} data-capsula>
            {pageTitle}
          </div>
          <div className={styles.topbarActions}>
            <button type="button" className={`vidro ${styles.capsuleSearch}`} disabled data-capsula aria-label="Busca no portal em breve">
              <PortalIcon name="search" size={18} />
              <span>Buscar</span>
            </button>
            <div className={`vidro ${styles.capsule}`} data-capsula>
              <AlternarTema className={styles.iconButton} />
              <button type="button" className={styles.iconButton} disabled aria-label="Notificações em breve">
                <PortalIcon name="bell" />
              </button>
            </div>
          </div>
        </div>

        <main className={styles.mainContent} id="portal-main" tabIndex={-1} data-abertura-conteudo>
          <PainelRota hrefs={hrefs}>{children}</PainelRota>
        </main>
      </div>

      <BarraInferior items={atalhos} />
    </AberturaPortal>
  );
}
