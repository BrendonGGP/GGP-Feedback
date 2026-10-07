"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MOLA_LENTE, semMovimento } from "@/components/motion/movimento";
import { PortalIcon, type PortalIconName } from "@/components/portal/portal-icon";

import styles from "./portal-shell.module.css";

export type NavItem = Readonly<{
  label: string;
  icon: PortalIconName;
  href?: string;
  badge?: string;
}>;

export type NavGroup = Readonly<{ label: string; items: readonly NavItem[] }>;

/** O item ativo é o de maior prefixo da rota atual (detalhe e "novo" acendem a seção). */
export const resolverAtivo = (pathname: string, hrefs: readonly string[]): string | null =>
  hrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0] ?? null;

const hrefsDe = (groups: readonly NavGroup[]) =>
  groups.flatMap((group) => group.items.flatMap((item) => (item.href ? [item.href] : [])));

function Lente({ id }: Readonly<{ id: string }>) {
  const semMov = useReducedMotion();
  return (
    <motion.span
      layoutId={id}
      aria-hidden="true"
      className={styles.lente}
      transition={semMov ? semMovimento : MOLA_LENTE}
    />
  );
}

/** Navegação da ilha lateral: a lente viaja até o item ativo com mola. */
export function NavIlha({
  groups,
  lenteId = "lente-lateral",
}: Readonly<{ groups: readonly NavGroup[]; lenteId?: string }>) {
  const pathname = usePathname();
  const ativo = resolverAtivo(pathname, hrefsDe(groups));

  return (
    <nav className={styles.navigation} aria-label="Navegação principal">
      {groups.map((group, index) => (
        <section key={group.label} className={styles.navGroup} aria-labelledby={`${lenteId}-grupo-${index}`}>
          <p className={styles.navGroupTitle} id={`${lenteId}-grupo-${index}`}>
            {group.label}
          </p>
          <ul>
            {group.items.map((item) => {
              const isActive = item.href === ativo;
              const conteudo = (
                <>
                  {isActive ? <Lente id={lenteId} /> : null}
                  <span className={styles.navIcon}>
                    <PortalIcon name={item.icon} ativo={isActive} />
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge ? <small className={styles.navBadge}>{item.badge}</small> : null}
                </>
              );
              return (
                <li key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      draggable={false}
                      className={isActive ? styles.activeNavItem : styles.navItem}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <span className={styles.disabledNavItem} aria-disabled="true">
                      {conteudo}
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

/** Barra inferior do celular: os destinos principais com a mesma lente. */
export function BarraInferior({ items }: Readonly<{ items: readonly NavItem[] }>) {
  const pathname = usePathname();
  const navegaveis = items.filter((item): item is NavItem & { href: string } => Boolean(item.href));
  const ativo = resolverAtivo(pathname, navegaveis.map((item) => item.href));

  return (
    <nav className={`vidro ${styles.bottomBar}`} aria-label="Navegação rápida" data-abertura-barra>
      {navegaveis.map((item) => {
        const isActive = item.href === ativo;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? styles.bottomItemActive : styles.bottomItem}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive ? <Lente id="lente-barra" /> : null}
            <span className={styles.navIcon}>
              <PortalIcon name={item.icon} ativo={isActive} />
            </span>
            <span className={styles.bottomLabel}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Ordem das rotas na navegação: decide de que lado o painel da rota entra. */
export function ordemDaRota(pathname: string, hrefs: readonly string[]): number {
  const ativo = resolverAtivo(pathname, hrefs);
  return ativo ? hrefs.indexOf(ativo) + 1 : 0;
}
