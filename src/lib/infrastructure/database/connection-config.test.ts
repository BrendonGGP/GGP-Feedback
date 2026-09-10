import { describe, expect, it } from "vitest";

import { resolveDatabaseConnections } from "./connection-config";

describe("separação das conexões do banco", () => {
  it("prioriza a URL local somente no desenvolvimento", () => {
    expect(
      resolveDatabaseConnections(
        {
          DATABASE_URL: "runtime-url",
          LOCAL_DATABASE_URL: "local-runtime-url",
          DIRECT_URL: "migration-url",
          ADMIN_DATABASE_URL: "admin-url",
        },
        "development",
      ),
    ).toEqual({
      runtimeUrl: "local-runtime-url",
      adminUrl: "admin-url",
      adminSource: "ADMIN_DATABASE_URL",
    });

    expect(
      resolveDatabaseConnections(
        {
          DATABASE_URL: "runtime-url",
          LOCAL_DATABASE_URL: "local-runtime-url",
          DIRECT_URL: "migration-url",
          ADMIN_DATABASE_URL: "admin-url",
        },
        "production",
      ),
    ).toEqual({
      runtimeUrl: "runtime-url",
      adminUrl: "admin-url",
      adminSource: "ADMIN_DATABASE_URL",
    });
  });

  it("usa DIRECT_URL apenas como fallback administrativo compatível com o ambiente atual", () => {
    expect(
      resolveDatabaseConnections(
        {
          DATABASE_URL: "runtime-url",
          DIRECT_URL: "migration-url",
        },
        "production",
      ),
    ).toEqual({
      runtimeUrl: "runtime-url",
      adminUrl: "migration-url",
      adminSource: "DIRECT_URL",
    });
  });

  it("não cria URL a partir de valores vazios", () => {
    expect(
      resolveDatabaseConnections(
        {
          DATABASE_URL: "  ",
          LOCAL_DATABASE_URL: "",
          DIRECT_URL: "\t",
          ADMIN_DATABASE_URL: "",
        },
        "development",
      ),
    ).toEqual({
      runtimeUrl: undefined,
      adminUrl: undefined,
      adminSource: "unset",
    });
  });
});
