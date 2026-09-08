const FORMULA_PREFIX = /^[=+\-@]/;

export const escapeCsvCell = (value: unknown): string => {
  const text = String(value ?? "");
  const safeText = FORMULA_PREFIX.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

export const serializeCsv = (
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string => {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
};
