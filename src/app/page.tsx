import { getProjectStatus } from "@/lib/project-status";

export default function Home() {
  const status = getProjectStatus();

  return (
    <main>
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">GGP Feedback</p>
        <h1 id="page-title">Uma base segura para conversas que desenvolvem pessoas.</h1>
        <p className="summary">
          A plataforma está sendo preparada para organizar ciclos, avaliações e
          feedbacks com privacidade desde o início.
        </p>
        <dl className="status-card">
          <div>
            <dt>Etapa atual</dt>
            <dd>{status.phase}</dd>
          </div>
          <div>
            <dt>Próximo marco</dt>
            <dd>{status.nextMilestone}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
