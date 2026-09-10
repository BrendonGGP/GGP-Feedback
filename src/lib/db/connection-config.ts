export type DatabaseEnvironment = "development" | "test" | "production";

export type DatabaseConnectionSettings = Readonly<{
  runtimeUrl?: string;
  adminUrl?: string;
  adminSource: "ADMIN_DATABASE_URL" | "DIRECT_URL" | "unset";
}>;

type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

const normalize = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

/**
 * Resolves the two application pools without reading or logging any secret.
 * Local development keeps LOCAL_DATABASE_URL as an explicit opt-in override;
 * production must provision ADMIN_DATABASE_URL separately from DATABASE_URL.
 */
export const resolveDatabaseConnections = (
  env: EnvironmentVariables,
  environment: DatabaseEnvironment,
): DatabaseConnectionSettings => {
  const runtimeUrl = normalize(
    environment === "development"
      ? env.LOCAL_DATABASE_URL ?? env.DATABASE_URL
      : env.DATABASE_URL,
  );
  const configuredAdminUrl = normalize(env.ADMIN_DATABASE_URL);
  const migrationUrl = normalize(env.DIRECT_URL);

  return {
    runtimeUrl,
    adminUrl: configuredAdminUrl ?? migrationUrl,
    adminSource: configuredAdminUrl
      ? "ADMIN_DATABASE_URL"
      : migrationUrl
        ? "DIRECT_URL"
        : "unset",
  };
};
