import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { signOut } from "@/auth";
import type { AccessRole } from "@/lib/authorization/access-control";
import { PortalIcon, type PortalIconName } from "@/components/portal/portal-icon";

import styles from "./portal-shell.module.css";

type NavigationItem = Readonly<{
  label: string;
  icon: PortalIconName;
  href?: string;
  badge?: string;
}>;

type NavigationGroup = Readonly<{
  label: string;
  items: readonly NavigationItem[];
}>;

type PortalShellProps = Readonly<{
  children: ReactNode;
  activePath: string;
  pageTitle: string;
  personName: string;
  roleLabel: string;
  roles: readonly AccessRole[];
}>;

const buildNavigation = (roles: readonly AccessRole[]): NavigationGroup[] => {
  const overview: NavigationItem[] = [
    {
      label: "Dashboard",
      icon: "dashboard",
      href: "/portal/dashboard",
    },
  ];

  if (roles.includes("EMPLOYEE")) {
    overview.push({
      label: "Feedback",
      icon: "feedback",
      href: "/portal/meus-feedbacks",
    });
  }

  if (roles.includes("MANAGER")) {
    overview.push({
      label: "Minha equipe",
      icon: "team",
      href: "/portal/equipe",
    });
  }

  if (!roles.includes("SYSTEM_ADMIN")) {
    overview.push({
      label: "Calendário",
      icon: "calendar",
      badge: "Em breve",
    });
  }

  const administration: NavigationItem[] = [];
  if (roles.includes("SYSTEM_ADMIN")) {
    administration.push({
      label: "Painel admin",
      icon: "admin",
      href: "/portal/administracao",
    });
  }
  if (roles.includes("HR_ADMIN")) {
    administration.push({
      label: "Gestão de pessoas",
      icon: "admin",
      href: "/portal/rh",
    });
  }

  const groups: NavigationGroup[] = [
    { label: "Visão geral", items: overview },
  ];

  if (administration.length > 0) {
    groups.push({ label: "Administração", items: administration });
  }

  groups.push({
    label: "Conta",
    items: [{ label: "Meu perfil", icon: "user", badge: "Em breve" }],
  });

  return groups;
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "G"}${parts.at(-1)?.[0] ?? "G"}`.toUpperCase();
};

function Brand() {
  return (
    <Link className={styles.brand} href="/portal/dashboard" aria-label="GGP Feedback — Dashboard">
      <span className={styles.brandCrop} aria-hidden="true">
        <span className={styles.brandCanvas}>
          <Image
            src="/brand/ggp-logo-white-blue.png"
            alt=""
            fill
            sizes="132px"
            priority
          />
        </span>
      </span>
      <span className={styles.brandCopy}>
        <strong>Feedback</strong>
        <small>Portal de desenvolvimento</small>
      </span>
    </Link>
  );
}

function Navigation({
  groups,
  activePath,
  idPrefix,
}: Readonly<{
  groups: readonly NavigationGroup[];
  activePath: string;
  idPrefix: string;
}>) {
  return (
    <nav className={styles.navigation} aria-label="Navegação principal">
      {groups.map((group, groupIndex) => (
        <section
          className={styles.navGroup}
          key={group.label}
          aria-labelledby={`${idPrefix}-nav-group-${groupIndex}`}
        >
          <p
            className={styles.navGroupTitle}
            id={`${idPrefix}-nav-group-${groupIndex}`}
          >
            {group.label}
          </p>
          <ul>
            {group.items.map((item) => {
              const content = (
                <>
                  <PortalIcon name={item.icon} />
                  <span>{item.label}</span>
                  {item.badge ? <small>{item.badge}</small> : null}
                </>
              );

              return (
                <li key={item.label}>
                  {item.href ? (
                    <Link
                      className={activePath === item.href ? styles.activeNavItem : styles.navItem}
                      href={item.href}
                      aria-current={activePath === item.href ? "page" : undefined}
                    >
                      {content}
                    </Link>
                  ) : (
                    <span className={styles.disabledNavItem} aria-disabled="true">
                      {content}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function AccountFooter({
  personName,
  roleLabel,
}: Readonly<{ personName: string; roleLabel: string }>) {
  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className={styles.accountFooter}>
      <span className={styles.avatar} aria-hidden="true">
        {getInitials(personName)}
      </span>
      <span className={styles.accountCopy}>
        <strong>{personName}</strong>
        <small>{roleLabel}</small>
      </span>
      <form action={handleSignOut}>
        <button type="submit" aria-label="Encerrar sessão" title="Encerrar sessão">
          <PortalIcon name="logout" />
        </button>
      </form>
    </div>
  );
}

export function PortalShell({
  children,
  activePath,
  pageTitle,
  personName,
  roleLabel,
  roles,
}: PortalShellProps) {
  const groups = buildNavigation(roles);

  return (
    <div className={styles.portalShell}>
      <a className={styles.skipLink} href="#portal-main">
        Ir para o conteúdo principal
      </a>

      <aside className={styles.sidebar}>
        <Brand />
        <Navigation groups={groups} activePath={activePath} idPrefix="desktop" />
        <AccountFooter personName={personName} roleLabel={roleLabel} />
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <details className={styles.mobileMenu}>
            <summary aria-label="Abrir menu de navegação">
              <PortalIcon name="menu" />
              <span>Menu</span>
            </summary>
            <div className={styles.mobileMenuPanel}>
              <Brand />
              <Navigation groups={groups} activePath={activePath} idPrefix="mobile" />
              <AccountFooter personName={personName} roleLabel={roleLabel} />
            </div>
          </details>

          <div className={styles.pageIdentity}>
            <p>GGP <span aria-hidden="true">/</span> {pageTitle}</p>
            <strong>{pageTitle}</strong>
          </div>

          <div className={styles.topbarActions}>
            <button type="button" disabled aria-label="Busca no portal em breve">
              <PortalIcon name="search" />
              <span>Buscar no portal...</span>
            </button>
            <button type="button" disabled aria-label="Notificações em breve">
              <PortalIcon name="bell" />
            </button>
          </div>
        </header>

        <main className={styles.mainContent} id="portal-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
