import { describe, expect, it } from "vitest";

import { parsePeopleDirectoryFilters } from "./people-directory";

describe("filtros da base de colaboradores", () => {
  it("normaliza filtros válidos para a consulta", () => {
    expect(parsePeopleDirectoryFilters({ query: "  Ana  ", view: "managers", status: "all" })).toEqual({
      query: "Ana",
      view: "managers",
      status: "all",
    });
  });

  it("usa a visão de pessoas ativas quando os parâmetros são inválidos", () => {
    expect(parsePeopleDirectoryFilters({ query: "x".repeat(101), view: "unknown" })).toEqual({
      query: "",
      view: "all",
      status: "active",
    });
  });
});
