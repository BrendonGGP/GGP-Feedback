"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import styles from "./administration.module.css";

type FilterOption = Readonly<{
  value: string;
  label: string;
}>;

type AccountFiltersProps = Readonly<{
  initialQuery: string;
  initialStatus: string;
  statusOptions: readonly FilterOption[];
}>;

const SEARCH_DEBOUNCE_MS = 300;

const buildFiltersHref = (
  pathname: string,
  query: string,
  status: string,
): string => {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();
  if (normalizedQuery) params.set("busca", normalizedQuery);
  if (status) params.set("status", status);
  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
};

export function AccountFilters({
  initialQuery,
  initialStatus,
  statusOptions,
}: AccountFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const lastApplied = useRef({
    query: initialQuery.trim(),
    status: initialStatus,
  });

  const applyFilters = useCallback(
    (nextQuery: string, nextStatus: string) => {
      const normalizedQuery = nextQuery.trim();
      if (
        normalizedQuery === lastApplied.current.query &&
        nextStatus === lastApplied.current.status
      ) {
        return;
      }

      lastApplied.current = { query: normalizedQuery, status: nextStatus };
      startTransition(() => {
        router.replace(buildFiltersHref(pathname, normalizedQuery, nextStatus), {
          scroll: false,
        });
      });
    },
    [pathname, router],
  );

  useEffect(() => {
    const timer = window.setTimeout(
      () => applyFilters(query, status),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [applyFilters, query, status]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilters(query, status);
  };

  return (
    <form
      className={styles.filters}
      onSubmit={handleSubmit}
      role="search"
      aria-busy={isPending}
    >
      <label className={styles.filterField}>
        <span>Buscar conta</span>
        <input
          type="search"
          name="busca"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome, usuário ou e-mail"
          maxLength={100}
          autoComplete="off"
          aria-describedby="account-search-hint"
        />
        <small id="account-search-hint" className={styles.filterHint}>
          A lista é filtrada automaticamente enquanto você digita.
        </small>
      </label>
      <label className={styles.filterField}>
        <span>Status</span>
        <select
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Todos os status</option>
          {statusOptions.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">Aplicar filtros</button>
      <a href="/portal/administracao">Limpar</a>
    </form>
  );
}
