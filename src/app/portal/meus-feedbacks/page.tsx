import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal/portal-shell";
import { getAuthenticatedActor } from "@/lib/auth/session";
import { getPortalDashboardData } from "@/lib/dashboard/dashboard-data";
import { getFeedbackOverview } from "@/lib/feedback/feedback-service";

import styles from "./feedback.module.css";

type FeedbackPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

const readParam = (value: string | string[] | undefined): string =>
  typeof value === "string" ? value.slice(0, 100) : "";

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(value));

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const actor = await getAuthenticatedActor();
  if (!actor) redirect("/");

  const [dashboard, overview, params] = await Promise.all([
    getPortalDashboardData(actor),
    getFeedbackOverview(actor),
    searchParams,
  ]);
  if (!dashboard || !overview) redirect("/portal/dashboard");

  const name = readParam(params.nome).trim().toLocaleLowerCase("pt-BR");
  const status = readParam(params.status);
  const date = readParam(params.data);
  const saved = readParam(params.salvo);
  const rows = overview.rows.filter((row) => {
    const matchesName = !name || `${row.subjectName} ${row.evaluatorName}`.toLocaleLowerCase("pt-BR").includes(name);
    const matchesStatus = !status || row.status === status;
    const matchesDate = !date || row.date.startsWith(date);
    return matchesName && matchesStatus && matchesDate;
  });

  const metrics = [
    ["Total de feedbacks", overview.metrics.total],
    ["Realizados", overview.metrics.submitted],
    ["Rascunhos", overview.metrics.drafts],
    ["Recebidos", overview.metrics.received],
  ] as const;

  return (
    <PortalShell activePath="/portal/meus-feedbacks" pageTitle="Feedback" personName={dashboard.profile.fullName} roleLabel={dashboard.roleLabel} roles={actor.roles}>
      <div className={styles.page}>
        {saved === "enviado" || saved === "rascunho" ? (
          <div className={styles.successMessage} role="status">
            {saved === "enviado"
              ? "Feedback concluído e protegido contra alterações."
              : "Rascunho salvo com sucesso."}
          </div>
        ) : null}
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Desenvolvimento</p>
            <h1>Feedback</h1>
            <p>Acompanhe os feedbacks que você deu e recebeu durante os ciclos.</p>
          </div>
          {overview.canStart ? <Link className={styles.primaryButton} href="/portal/meus-feedbacks/novo">Novo feedback</Link> : null}
        </header>

        <section className={styles.metrics} aria-label="Resumo de feedbacks">
          {metrics.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
        </section>

        <form className={styles.filters} method="get" aria-label="Filtrar feedbacks">
          <label><span>Nome</span><input name="nome" defaultValue={readParam(params.nome)} placeholder="Buscar por pessoa..." /></label>
          <label><span>Data</span><input type="date" name="data" defaultValue={date} /></label>
          <label><span>Status</span><select name="status" defaultValue={status}><option value="">Todos</option><option value="DRAFT">Rascunho</option><option value="SUBMITTED">Enviado</option></select></label>
          <button type="submit">Aplicar filtros</button>
        </form>

        <section className={styles.tableCard} aria-labelledby="feedback-list-title">
          <h2 className={styles.visuallyHidden} id="feedback-list-title">Lista de feedbacks</h2>
          {rows.length === 0 ? (
            <div className={styles.emptyState}><strong>Nenhum feedback encontrado</strong><p>Ajuste os filtros ou aguarde a abertura de um novo ciclo.</p></div>
          ) : (
            <div className={styles.table} role="table">
              <div className={styles.tableHeader} role="row">
                <span role="columnheader">Avaliado</span><span role="columnheader">Avaliador</span><span role="columnheader">Empresa</span><span role="columnheader">Ciclo</span><span role="columnheader">Status</span><span role="columnheader">Data</span>
              </div>
              {rows.map((row) => (
                <div className={styles.tableRow} role="row" key={row.id}>
                  <span role="cell" data-label="Avaliado">{row.subjectName}</span>
                  <span role="cell" data-label="Avaliador">{row.evaluatorName}</span>
                  <span role="cell" data-label="Empresa">{row.companyName}</span>
                  <span role="cell" data-label="Ciclo">{row.cycleName}</span>
                  <span role="cell" data-label="Status"><mark data-status={row.status}>{row.status === "DRAFT" ? "Rascunho" : "Enviado"}</mark></span>
                  <span role="cell" data-label="Data">{formatDate(row.date)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
