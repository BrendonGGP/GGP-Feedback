import { describe, expect, it } from "vitest";

import { escapeCsvCell, serializeCsv } from "./csv";

describe("serialização CSV", () => {
  it("escapa aspas, quebras de linha e fórmulas", () => {
    expect(escapeCsvCell('=HYPERLINK("https://example.test")')).toBe(
      `"'=HYPERLINK(""https://example.test"")"`,
    );
    expect(escapeCsvCell("linha 1\nlinha 2")).toBe('"linha 1\nlinha 2"');
  });

  it("gera UTF-8 com BOM e termina cada registro", () => {
    expect(serializeCsv(["Nome", "Nota"], [["Ana", 5]])).toBe(
      '\uFEFF"Nome","Nota"\r\n"Ana","5"\r\n',
    );
  });
});
