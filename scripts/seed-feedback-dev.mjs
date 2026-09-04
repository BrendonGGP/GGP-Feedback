import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const verify = process.argv.includes("--verify");

const ids = {
  company: "00000000-0000-4000-8000-000000000001",
  manager: "00000000-0000-4000-8000-000000000023",
  employee: "00000000-0000-4000-8000-000000000024",
  cycle: "10000000-0000-4000-8000-000000000001",
  template: "10000000-0000-4000-8000-000000000002",
};

const questions = [
  ["10000000-0000-4000-8000-000000000011", "Protagonismo — Assume responsabilidade pelas entregas e atua com autonomia no dia a dia.", "RATING", 1],
  ["10000000-0000-4000-8000-000000000012", "Orientação para Resultados — Busca alta performance e entrega resultados com consistência.", "RATING", 2],
  ["10000000-0000-4000-8000-000000000013", "Melhoria Contínua — Propõe melhorias, testa soluções e aprende com erros.", "RATING", 3],
  ["10000000-0000-4000-8000-000000000014", "Trabalho em Equipe — Colabora, respeita e constrói relações de confiança.", "RATING", 4],
  ["10000000-0000-4000-8000-000000000015", "Integridade — Age com honestidade, assume responsabilidades e toma decisões éticas.", "RATING", 5],
  ["10000000-0000-4000-8000-000000000021", "Evidências — Descreva fatos observáveis que sustentam as notas atribuídas.", "LONG_TEXT", 6],
  ["10000000-0000-4000-8000-000000000022", "Comportamento a Manter — Registre os comportamentos positivos que devem continuar.", "LONG_TEXT", 7],
  ["10000000-0000-4000-8000-000000000023", "Comportamento a Melhorar — Indique oportunidades objetivas de desenvolvimento.", "LONG_TEXT", 8],
  ["10000000-0000-4000-8000-000000000024", "Ação Prática Combinada — Defina o próximo passo acordado com o colaborador.", "LONG_TEXT", 9],
  ["10000000-0000-4000-8000-000000000025", "Informações Complementares — Inclua apenas informações relevantes ao desenvolvimento.", "LONG_TEXT", 10],
];

async function assertSyntheticScope(transaction) {
  const company = await transaction.company.findUnique({ where: { id: ids.company }, select: { slug: true } });
  const people = await transaction.person.findMany({ where: { id: { in: [ids.manager, ids.employee] }, companyId: ids.company }, select: { id: true } });
  if (company?.slug !== "ggp-desenvolvimento-sintetico" || people.length !== 2) {
    throw new Error("O conjunto sintético de desenvolvimento não foi encontrado.");
  }
}

async function applySeed() {
  await prisma.$transaction(async (transaction) => {
    await assertSyntheticScope(transaction);
    await transaction.person.update({ where: { id: ids.employee }, data: { managerId: ids.manager } });
    await transaction.cycle.upsert({ where: { id: ids.cycle }, create: { id: ids.cycle, name: "Ciclo Sintético 2026", startsAt: new Date("2026-01-01T03:00:00.000Z"), endsAt: new Date("2027-01-01T02:59:59.000Z"), status: "OPEN" }, update: { status: "OPEN" } });
    await transaction.formTemplate.upsert({ where: { id: ids.template }, create: { id: ids.template, name: "Feedback GGP Sintético", version: 1, active: true }, update: { active: true } });
    for (const [id, prompt, type, position] of questions) {
      await transaction.formQuestion.upsert({ where: { id }, create: { id, templateId: ids.template, prompt, type, position, required: type === "RATING", minimum: type === "RATING" ? 1 : null, maximum: type === "RATING" ? 5 : null, active: true }, update: { prompt, type, position, required: type === "RATING", minimum: type === "RATING" ? 1 : null, maximum: type === "RATING" ? 5 : null, active: true } });
    }
    await transaction.cycleFormTemplate.upsert({ where: { cycleId_templateId: { cycleId: ids.cycle, templateId: ids.template } }, create: { cycleId: ids.cycle, templateId: ids.template }, update: {} });
  });
  console.log("Ciclo, formulário e competências sintéticas foram configurados.");
}

async function verifySeed() {
  const [cycle, template, questionCount, employee] = await Promise.all([
    prisma.cycle.findUnique({ where: { id: ids.cycle }, select: { status: true } }),
    prisma.formTemplate.findUnique({ where: { id: ids.template }, select: { active: true } }),
    prisma.formQuestion.count({ where: { templateId: ids.template, active: true } }),
    prisma.person.findUnique({ where: { id: ids.employee }, select: { managerId: true } }),
  ]);
  if (cycle?.status !== "OPEN" || !template?.active || questionCount !== questions.length || employee?.managerId !== ids.manager) {
    throw new Error("A verificação do conjunto funcional sintético falhou.");
  }
  console.log("Verificação concluída: ciclo aberto, equipe e 10 competências sintéticas válidas.");
}

try {
  if (verify) await verifySeed();
  else if (apply) await applySeed();
  else console.log("Dry-run: 1 ciclo, 1 formulário e 10 competências sintéticas. Use --apply após autorização.");
} finally {
  await prisma.$disconnect();
}
