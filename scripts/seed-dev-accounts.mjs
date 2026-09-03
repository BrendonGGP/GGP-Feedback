import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const APPLY_FLAG = "--apply";
const VERIFY_FLAG = "--verify";
const repoRoot = process.cwd();
const privateDataDirectory = resolve(repoRoot, "dados-privados");
const credentialsFile = resolve(
  privateDataDirectory,
  "contas-sinteticas-dev.txt",
);

if (!isAbsolute(repoRoot) || relative(repoRoot, credentialsFile).startsWith("..")) {
  throw new Error("Caminho de credenciais fora do workspace");
}

const company = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "GGP Desenvolvimento Sintético",
  slug: "ggp-desenvolvimento-sintetico",
};

const departments = [
  {
    id: "00000000-0000-4000-8000-000000000011",
    name: "Administração do Sistema",
  },
  {
    id: "00000000-0000-4000-8000-000000000012",
    name: "Recursos Humanos",
  },
  {
    id: "00000000-0000-4000-8000-000000000013",
    name: "Operações",
  },
];

const people = [
  {
    id: "00000000-0000-4000-8000-000000000021",
    departmentId: departments[0].id,
    managerId: null,
    fullName: "Administrador Sintético",
    corporateEmail: "admin.sintetico@ggp.local",
    jobTitle: "Administrador do Sistema",
    employmentRegime: "Desenvolvimento",
  },
  {
    id: "00000000-0000-4000-8000-000000000022",
    departmentId: departments[1].id,
    managerId: null,
    fullName: "RH Sintético",
    corporateEmail: "rh.sintetico@ggp.local",
    jobTitle: "Analista de Pessoas",
    employmentRegime: "Desenvolvimento",
  },
  {
    id: "00000000-0000-4000-8000-000000000023",
    departmentId: departments[2].id,
    managerId: null,
    fullName: "Gestor Sintético",
    corporateEmail: "gestor.sintetico@ggp.local",
    jobTitle: "Líder de Operações",
    employmentRegime: "Desenvolvimento",
  },
  {
    id: "00000000-0000-4000-8000-000000000024",
    departmentId: departments[2].id,
    managerId: "00000000-0000-4000-8000-000000000023",
    fullName: "Colaborador Sintético",
    corporateEmail: "colaborador.sintetico@ggp.local",
    jobTitle: "Analista de Operações",
    employmentRegime: "Desenvolvimento",
  },
];

const accounts = [
  {
    id: "00000000-0000-4000-8000-000000000031",
    personId: people[0].id,
    loginIdentifier: "admin.sintetico@ggp.local",
    roles: ["SYSTEM_ADMIN"],
    key: "ADMINISTRADOR_SISTEMA",
  },
  {
    id: "00000000-0000-4000-8000-000000000032",
    personId: people[1].id,
    loginIdentifier: "rh.sintetico@ggp.local",
    roles: ["HR_ADMIN"],
    key: "RH",
  },
  {
    id: "00000000-0000-4000-8000-000000000033",
    personId: people[2].id,
    loginIdentifier: "gestor.sintetico@ggp.local",
    roles: ["MANAGER", "EMPLOYEE"],
    key: "GESTOR",
  },
  {
    id: "00000000-0000-4000-8000-000000000034",
    personId: people[3].id,
    loginIdentifier: "colaborador.sintetico@ggp.local",
    roles: ["EMPLOYEE"],
    key: "COLABORADOR",
  },
];

const readStoredPasswords = () => {
  try {
    const content = readFileSync(credentialsFile, "utf8");
    return Object.fromEntries(
      content
        .split(/\r?\n/)
        .map((line) => {
          const separatorIndex = line.indexOf("=");
          if (separatorIndex <= 0) {
            return null;
          }

          const key = line.slice(0, separatorIndex).trim();
          const password = line
            .slice(separatorIndex + 1)
            .trim()
            .replace(/\s+#.*$/, "");

          return key && password ? [key, password] : null;
        })
        .filter(Boolean),
    );
  } catch {
    return {};
  }
};

const getPasswords = () => {
  const storedPasswords = readStoredPasswords();
  return Object.fromEntries(
    accounts.map(({ key }) => [
      key,
      storedPasswords[key] ?? randomBytes(24).toString("base64url"),
    ]),
  );
};

const ensureNoIdentifierConflicts = async (transaction) => {
  const existingCompany = await transaction.company.findUnique({
    where: { slug: company.slug },
    select: { id: true },
  });

  if (existingCompany && existingCompany.id !== company.id) {
    throw new Error("Conflito com empresa fora do conjunto sintético");
  }

  for (const account of accounts) {
    const existingAccount = await transaction.accessAccount.findFirst({
      where: {
        loginIdentifier: { equals: account.loginIdentifier, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (existingAccount && existingAccount.id !== account.id) {
      throw new Error(
        `Conflito com identificador de conta fora do conjunto sintético: ${account.key}`,
      );
    }
  }
};

const upsertSyntheticData = async (transaction, passwords) => {
  await ensureNoIdentifierConflicts(transaction);

  await transaction.company.upsert({
    where: { id: company.id },
    create: { ...company, active: true },
    update: { name: company.name, slug: company.slug, active: true },
  });

  for (const department of departments) {
    await transaction.department.upsert({
      where: { id: department.id },
      create: { ...department, companyId: company.id, active: true },
      update: {
        name: department.name,
        companyId: company.id,
        active: true,
      },
    });
  }

  for (const person of people) {
    await transaction.person.upsert({
      where: { id: person.id },
      create: { ...person, companyId: company.id, active: true },
      update: {
        departmentId: person.departmentId,
        managerId: person.managerId,
        fullName: person.fullName,
        corporateEmail: person.corporateEmail,
        jobTitle: person.jobTitle,
        employmentRegime: person.employmentRegime,
        companyId: company.id,
        active: true,
      },
    });
  }

  const revokedAt = new Date();
  for (const account of accounts) {
    await transaction.userSession.updateMany({
      where: { accountId: account.id, revokedAt: null },
      data: { revokedAt },
    });

    const passwordHash = await argon2.hash(passwords[account.key], {
      type: argon2.argon2id,
    });

    await transaction.accessAccount.upsert({
      where: { id: account.id },
      create: {
        id: account.id,
        personId: account.personId,
        loginIdentifier: account.loginIdentifier,
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: true,
        roles: { create: account.roles.map((role) => ({ role })) },
      },
      update: {
        personId: account.personId,
        loginIdentifier: account.loginIdentifier,
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: true,
        failedLoginCount: 0,
        lockedUntil: null,
        passwordChangedAt: null,
        lastLoginAt: null,
        sessionVersion: { increment: 1 },
        roles: {
          deleteMany: {},
          create: account.roles.map((role) => ({ role })),
        },
      },
    });
  }
};

const writeCredentialsFile = (passwords) => {
  mkdirSync(privateDataDirectory, { recursive: true });
  const content = [
    "# Credenciais sintéticas locais — não versionar nem compartilhar",
    "# As contas estão marcadas para troca obrigatória de senha.",
    "# Formato: CHAVE=senha (não adicione comentários na mesma linha)",
    ...accounts.map(
      ({ key }) => `${key}=${passwords[key]}`,
    ),
    "# Mapeamento das chaves:",
    ...accounts.map(({ key, loginIdentifier }) => `# ${key} -> ${loginIdentifier}`),
    "",
  ].join("\n");
  writeFileSync(credentialsFile, content, { encoding: "utf8", mode: 0o600 });
};

const verifySyntheticData = async () => {
  const prisma = new PrismaClient();
  try {
    const [storedCompany, storedDepartments, storedPeople, storedAccounts] =
      await Promise.all([
        prisma.company.findUnique({
          where: { id: company.id },
          select: { id: true, slug: true, active: true },
        }),
        prisma.department.findMany({
          where: { id: { in: departments.map(({ id }) => id) } },
          select: { id: true, companyId: true, active: true },
        }),
        prisma.person.findMany({
          where: { id: { in: people.map(({ id }) => id) } },
          select: { id: true, companyId: true, active: true },
        }),
        prisma.accessAccount.findMany({
          where: { id: { in: accounts.map(({ id }) => id) } },
          select: {
            id: true,
            passwordHash: true,
            status: true,
            mustChangePassword: true,
            roles: { select: { role: true } },
          },
        }),
      ]);

    if (
      !storedCompany ||
      storedCompany.slug !== company.slug ||
      !storedCompany.active ||
      storedDepartments.length !== departments.length ||
      storedPeople.length !== people.length ||
      storedAccounts.length !== accounts.length ||
      storedDepartments.some(
        ({ companyId, active }) => companyId !== company.id || !active,
      ) ||
      storedPeople.some(
        ({ companyId, active }) => companyId !== company.id || !active,
      )
    ) {
      throw new Error("Verificação das contas sintéticas falhou");
    }

    const accountsById = new Map(storedAccounts.map((account) => [account.id, account]));
    const storedPasswords = readStoredPasswords();
    for (const expectedAccount of accounts) {
      const storedAccount = accountsById.get(expectedAccount.id);
      const storedRoles = storedAccount?.roles.map(({ role }) => role).sort();
      const expectedRoles = [...expectedAccount.roles].sort();
      const storedPassword = storedPasswords[expectedAccount.key];
      const passwordMatches =
        storedAccount && storedPassword
          ? await argon2.verify(storedAccount.passwordHash, storedPassword)
          : false;

      if (
        !storedAccount ||
        !passwordMatches ||
        storedAccount.status !== "ACTIVE" ||
        !storedAccount.mustChangePassword ||
        JSON.stringify(storedRoles) !== JSON.stringify(expectedRoles)
      ) {
        throw new Error(`Verificação falhou para a conta ${expectedAccount.key}`);
      }
    }

    console.log("Verificação concluída: empresa, departamentos, pessoas e contas sintéticas conferidos.");
    console.log("Todas as 4 contas estão ACTIVE, com troca obrigatória de senha e papéis esperados.");
  } finally {
    await prisma.$disconnect();
  }
};

const run = async () => {
  const apply = process.argv.includes(APPLY_FLAG);
  const verify = process.argv.includes(VERIFY_FLAG);
  if (verify) {
    await verifySyntheticData();
    return;
  }

  if (!apply) {
    console.log("DRY RUN — nenhuma alteração será feita no Supabase.");
    console.log("Escopo: 1 empresa, 3 departamentos, 4 pessoas, 4 contas e 5 papéis.");
    console.log("Contas: SYSTEM_ADMIN, HR_ADMIN, MANAGER+EMPLOYEE e EMPLOYEE.");
    console.log("Use --apply somente após confirmar este escopo.");
    return;
  }

  const passwords = getPasswords();
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction((transaction) =>
      upsertSyntheticData(transaction, passwords),
    );
    writeCredentialsFile(passwords);
    console.log("Contas sintéticas criadas/atualizadas com sucesso.");
    console.log("Escopo aplicado: 1 empresa, 3 departamentos, 4 pessoas, 4 contas e 5 papéis.");
    console.log(`Credenciais locais gravadas em ${credentialsFile}.`);
  } finally {
    await prisma.$disconnect();
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha ao provisionar contas sintéticas");
  process.exitCode = 1;
});
