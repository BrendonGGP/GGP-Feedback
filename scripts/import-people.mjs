import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

import argon2 from "argon2";

import { createAdminPrismaClient } from "./prisma-admin-client.mjs";

const APPLY_FLAG = "--apply";
const repoRoot = resolve(process.cwd());
const privateDataDirectory = resolve(repoRoot, "dados-privados");
const defaultInputPath = resolve(
  privateDataDirectory,
  "MODELO_IMPORTACAO_COLABORADORES.csv",
);
const inputPath = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : defaultInputPath);

const canonicalHeaders = [
  "person_key",
  "full_name",
  "corporate_email",
  "job_title",
  "employment_regime",
  "company_name",
  "department_name",
  "manager_person_key",
];
const acceptedHeaders = new Set([...canonicalHeaders, "username"]);

const usernamePattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const requiredHeaders = [
  "person_key",
  "full_name",
  "job_title",
  "employment_regime",
  "company_name",
  "department_name",
];

const isPathInside = (basePath, candidatePath) => {
  const relativePath = relative(basePath, candidatePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
};

const normalizeHeader = (value) => value.replace(/^\uFEFF/, "").trim().toLowerCase();
const normalizeValue = (value) => value.trim();
const keyOf = (value) => normalizeValue(value).toLowerCase();

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  const pushRow = () => {
    row.push(field);
    field = "";
    if (row.some((value) => value.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      if (text[index + 1] === "\n") index += 1;
      pushRow();
    } else if (char === "\n") pushRow();
    else field += char;
  }

  if (field !== "" || row.length > 0) pushRow();
  return { rows, unclosedQuote: quoted };
};

const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);

const addError = (errors, code, amount = 1) => {
  errors[code] = (errors[code] ?? 0) + amount;
};

const getValidation = (source) => {
  const parsed = parseCsv(source);
  const { rows } = parsed;
  const errors = {};

  let headerRowIndex = -1;
  let headerMap = new Map();
  let duplicateHeaderCount = 0;
  let bestScore = -1;
  for (let index = 0; index < Math.min(rows.length, 5); index += 1) {
    const candidate = new Map();
    let candidateDuplicates = 0;
    rows[index].forEach((value, column) => {
      const header = normalizeHeader(value);
      if (!header) return;
      if (candidate.has(header)) candidateDuplicates += 1;
      candidate.set(header, column);
    });
    const score = canonicalHeaders.filter((header) => candidate.has(header)).length;
    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = index;
      headerMap = candidate;
      duplicateHeaderCount = candidateDuplicates;
    }
    if (score === canonicalHeaders.length && candidateDuplicates === 0) break;
  }

  if (parsed.unclosedQuote) addError(errors, "UNCLOSED_QUOTE");
  const missingHeaders = canonicalHeaders.filter((header) => !headerMap.has(header));
  if (missingHeaders.length > 0) addError(errors, "MISSING_HEADER", missingHeaders.length);
  if (duplicateHeaderCount > 0) addError(errors, "DUPLICATE_HEADER", duplicateHeaderCount);
  const unexpectedHeaderCount = [...headerMap.keys()].filter((header) => !acceptedHeaders.has(header)).length;
  if (unexpectedHeaderCount > 0) addError(errors, "UNEXPECTED_HEADER", unexpectedHeaderCount);
  if (headerRowIndex < 0 || missingHeaders.length > 0 || duplicateHeaderCount > 0 || unexpectedHeaderCount > 0) {
    return { parsed, errors, records: [], headerRowIndex, missingHeaders, unexpectedHeaderCount };
  }

  const headerColumnCount = rows[headerRowIndex].length;
  const records = [];
  let rowWidthMismatch = 0;
  for (const values of rows.slice(headerRowIndex + 1)) {
    if (values.length !== headerColumnCount) rowWidthMismatch += 1;
    const record = {
      personKey: keyOf(values[headerMap.get("person_key")] ?? ""),
      fullName: normalizeValue(values[headerMap.get("full_name")] ?? ""),
      corporateEmail: keyOf(values[headerMap.get("corporate_email")] ?? ""),
      username: keyOf(values[headerMap.get("person_key")] ?? ""),
      jobTitle: normalizeValue(values[headerMap.get("job_title")] ?? ""),
      employmentRegime: normalizeValue(values[headerMap.get("employment_regime")] ?? ""),
      companyName: normalizeValue(values[headerMap.get("company_name")] ?? ""),
      departmentName: normalizeValue(values[headerMap.get("department_name")] ?? ""),
      managerPersonKey: keyOf(values[headerMap.get("manager_person_key")] ?? ""),
    };
    const hasValue = Object.values(record).some((value) => value !== "");
    if (!hasValue) continue;
    records.push(record);
  }
  if (rowWidthMismatch > 0) addError(errors, "ROW_WIDTH_MISMATCH", rowWidthMismatch);
  if (records.length === 0) addError(errors, "EMPTY_DATA");

  for (const header of requiredHeaders) {
    const property = {
      person_key: "personKey",
      full_name: "fullName",
      job_title: "jobTitle",
      employment_regime: "employmentRegime",
      company_name: "companyName",
      department_name: "departmentName",
    }[header];
    const count = records.filter((record) => !record[property]).length;
    if (count > 0) addError(errors, `EMPTY_${header.toUpperCase()}`, count);
  }

  const personKeys = new Set();
  const emails = new Set();
  const managerByPerson = new Map();
  for (const record of records) {
    if (record.personKey) {
      if (personKeys.has(record.personKey)) addError(errors, "DUPLICATE_PERSON_KEY");
      personKeys.add(record.personKey);
      managerByPerson.set(record.personKey, record.managerPersonKey);
    }
    if (record.username) {
      if (!usernamePattern.test(record.username) || record.username.length < 3 || record.username.length > 64) addError(errors, "INVALID_USERNAME_FROM_PERSON_KEY");
    }
    if (record.corporateEmail) {
      if (!emailPattern.test(record.corporateEmail)) addError(errors, "INVALID_EMAIL");
      if (emails.has(record.corporateEmail)) addError(errors, "DUPLICATE_EMAIL");
      emails.add(record.corporateEmail);
    }
  }

  for (const record of records) {
    if (!record.managerPersonKey) continue;
    if (!personKeys.has(record.managerPersonKey)) addError(errors, "MISSING_MANAGER_REFERENCE");
    if (record.managerPersonKey === record.personKey) addError(errors, "SELF_MANAGER_REFERENCE");
  }

  let cycleCount = 0;
  const visited = new Set();
  for (const start of managerByPerson.keys()) {
    if (visited.has(start)) continue;
    const path = [];
    const local = new Set();
    let current = start;
    while (current && managerByPerson.has(current) && !visited.has(current)) {
      if (local.has(current)) {
        cycleCount += 1;
        break;
      }
      local.add(current);
      path.push(current);
      current = managerByPerson.get(current);
    }
    path.forEach((node) => visited.add(node));
  }
  if (cycleCount > 0) addError(errors, "CYCLE", cycleCount);

  return {
    parsed,
    errors,
    records,
    headerRowIndex,
    missingHeaders,
    unexpectedHeaderCount,
    headerColumnCount,
    legacyUsernameColumn: headerMap.has("username"),
    dataRows: records.length,
  };
};

const printValidation = (validation, mode) => {
  const codes = Object.entries(validation.errors).sort(([left], [right]) => left.localeCompare(right));
  console.log(`IMPORT_MODE=${mode}`);
  console.log(`IMPORT_VALIDATION_STATUS=${codes.length === 0 ? "READY_FOR_APPLY" : "NOT_READY"}`);
  console.log(`DATA_ROWS=${validation.dataRows ?? 0}`);
  for (const [code, count] of codes) console.log(`ERROR_${code}=${count}`);
  if (validation.legacyUsernameColumn) console.log("LEGACY_USERNAME_COLUMN_IGNORED=true");
  if (codes.length === 0) {
    console.log(`HEADER_COLUMN_COUNT=${validation.headerColumnCount}`);
    console.log("ACTIVE_MANAGER_CHECK=all_imported_people_active");
    console.log("USERNAME_SOURCE=person_key");
    console.log("ACCOUNT_PROVISIONING=pending_activation_without_roles");
  }
};

const findOrCreateCompany = async (transaction, name) => {
  const slug = slugify(name);
  if (!slug) throw new Error("IMPORT_INVALID_COMPANY");
  const existing = await transaction.company.findFirst({
    where: { OR: [{ slug }, { name: { equals: name, mode: "insensitive" } }] },
    select: { id: true, active: true },
  });
  if (existing) {
    if (!existing.active) await transaction.company.update({ where: { id: existing.id }, data: { active: true } });
    return { id: existing.id, created: false };
  }
  const company = await transaction.company.create({ data: { name, slug }, select: { id: true } });
  return { id: company.id, created: true };
};

const findOrCreateDepartment = async (transaction, companyId, name) => {
  const existing = await transaction.department.findFirst({
    where: { companyId, name: { equals: name, mode: "insensitive" } },
    select: { id: true, active: true },
  });
  if (existing) {
    if (!existing.active) await transaction.department.update({ where: { id: existing.id }, data: { active: true } });
    return { id: existing.id, created: false };
  }
  const department = await transaction.department.create({
    data: { companyId, name },
    select: { id: true },
  });
  return { id: department.id, created: true };
};

const applyImport = async (transaction, records) => {
  const result = {
    companiesCreated: 0,
    departmentsCreated: 0,
    peopleCreated: 0,
    peopleUpdated: 0,
    accountsCreated: 0,
    accountsUpdated: 0,
    hierarchyChanges: 0,
  };
  const companyByName = new Map();
  const departmentByKey = new Map();
  const peopleByKey = new Map();

  for (const record of records) {
    const companyCacheKey = keyOf(record.companyName);
    let company = companyByName.get(companyCacheKey);
    if (!company) {
      company = await findOrCreateCompany(transaction, record.companyName);
      companyByName.set(companyCacheKey, company);
      if (company.created) result.companiesCreated += 1;
    }

    const departmentCacheKey = `${company.id}|${keyOf(record.departmentName)}`;
    let department = departmentByKey.get(departmentCacheKey);
    if (!department) {
      department = await findOrCreateDepartment(transaction, company.id, record.departmentName);
      departmentByKey.set(departmentCacheKey, department);
      if (department.created) result.departmentsCreated += 1;
    }

    const existing = await transaction.person.findUnique({
      where: { sourceKey: record.personKey },
      select: {
        id: true,
        companyId: true,
        departmentId: true,
        managerId: true,
        fullName: true,
        corporateEmail: true,
        jobTitle: true,
        employmentRegime: true,
        active: true,
      },
    });
    const baseData = {
      companyId: company.id,
      departmentId: department.id,
      fullName: record.fullName,
      corporateEmail: record.corporateEmail || null,
      jobTitle: record.jobTitle,
      employmentRegime: record.employmentRegime,
      active: true,
    };
    let person;
    if (existing) {
      const changed = existing.companyId !== baseData.companyId || existing.departmentId !== baseData.departmentId || existing.fullName !== baseData.fullName || existing.corporateEmail !== baseData.corporateEmail || existing.jobTitle !== baseData.jobTitle || existing.employmentRegime !== baseData.employmentRegime || !existing.active;
      person = changed
        ? await transaction.person.update({ where: { id: existing.id }, data: { ...baseData, version: { increment: 1 } }, select: { id: true, managerId: true } })
        : { id: existing.id, managerId: existing.managerId };
      if (changed) result.peopleUpdated += 1;
    } else {
      person = await transaction.person.create({ data: { ...baseData, sourceKey: record.personKey, managerId: null }, select: { id: true, managerId: true } });
      result.peopleCreated += 1;
    }
    peopleByKey.set(record.personKey, { ...person, created: !existing, username: record.username, managerPersonKey: record.managerPersonKey });
  }

  for (const record of records) {
    const person = peopleByKey.get(record.personKey);
    const managerId = record.managerPersonKey ? peopleByKey.get(record.managerPersonKey)?.id ?? null : null;
    if (!person) throw new Error("IMPORT_PERSON_NOT_RESOLVED");
    if (person.managerId !== managerId) {
      const changedAt = new Date();
      await transaction.person.update({ where: { id: person.id }, data: { managerId, version: { increment: 1 } } });
      await transaction.reportingLineHistory.updateMany({ where: { subordinateId: person.id, validUntil: null }, data: { validUntil: changedAt } });
      await transaction.reportingLineHistory.create({ data: { subordinateId: person.id, managerId, validFrom: changedAt, reason: "Importação cadastral" } });
      person.managerId = managerId;
      result.hierarchyChanges += 1;
    } else if (person.created) {
      const currentHistory = await transaction.reportingLineHistory.findFirst({ where: { subordinateId: person.id, validUntil: null }, select: { id: true } });
      if (!currentHistory) await transaction.reportingLineHistory.create({ data: { subordinateId: person.id, managerId, reason: "Importação cadastral" } });
    }

    const existingAccount = await transaction.accessAccount.findUnique({ where: { personId: person.id }, select: { id: true, loginIdentifier: true } });
    const conflictingAccount = await transaction.accessAccount.findFirst({ where: { loginIdentifier: { equals: record.username, mode: "insensitive" }, ...(existingAccount ? { NOT: { personId: person.id } } : {}) }, select: { id: true } });
    if (conflictingAccount) throw new Error("IMPORT_USERNAME_CONFLICT");
    if (existingAccount) {
      if (existingAccount.loginIdentifier !== record.username) {
        const changedAt = new Date();
        await transaction.accessAccount.update({ where: { id: existingAccount.id }, data: { loginIdentifier: record.username, sessionVersion: { increment: 1 } } });
        await transaction.userSession.updateMany({ where: { accountId: existingAccount.id, revokedAt: null }, data: { revokedAt: changedAt } });
        result.accountsUpdated += 1;
      }
    } else {
      const generatedSecret = randomBytes(32).toString("base64url");
      const passwordHash = await argon2.hash(generatedSecret, { type: argon2.argon2id });
      await transaction.accessAccount.create({ data: { personId: person.id, loginIdentifier: record.username, passwordHash, status: "PENDING_ACTIVATION", mustChangePassword: true } });
      result.accountsCreated += 1;
    }
  }

  await transaction.auditEvent.create({
    data: {
      requestId: randomUUID(),
      action: "IMPORT_PEOPLE",
      entityType: "PEOPLE_IMPORT",
      result: "SUCCESS",
      metadata: result,
    },
  });
  return result;
};

const run = async () => {
  if (!isPathInside(privateDataDirectory, inputPath)) throw new Error("IMPORT_PATH_OUTSIDE_PRIVATE_DATA");
  const validation = getValidation(readFileSync(inputPath, "utf8"));
  const apply = process.argv.includes(APPLY_FLAG);
  printValidation(validation, apply ? "apply" : "dry-run");
  if (Object.keys(validation.errors).length > 0) {
    if (apply) process.exitCode = 2;
    return;
  }
  if (!apply) return;

  const prisma = createAdminPrismaClient();
  try {
    const result = await prisma.$transaction(
      (transaction) => applyImport(transaction, validation.records),
      { maxWait: 10_000, timeout: 120_000 },
    );
    console.log(`IMPORT_APPLIED=true`);
    for (const [key, value] of Object.entries(result)) console.log(`APPLIED_${key.toUpperCase()}=${value}`);
  } finally {
    await prisma.$disconnect();
  }
};

run().catch((error) => {
  console.error("IMPORT_APPLY_STATUS=FAILED");
  const prismaCode = typeof error?.code === "string" ? error.code : "";
  const internalCode = typeof error?.message === "string" && /^IMPORT_[A-Z_]+$/.test(error.message) ? error.message : "";
  console.error(`IMPORT_ERROR_CODE=${prismaCode || internalCode || "UNKNOWN"}`);
  process.exitCode = 1;
});
