import { KavachDatabase, SQLiteKavachDatabase, isProductionEnvironment } from "./adapter";
import { PostgresKavachDatabase } from "./postgres";

declare global {
  // eslint-disable-next-line no-var
  var __kavachDb: KavachDatabase | undefined;
}

export function getDb(): KavachDatabase {
  if (globalThis.__kavachDb) {
    return globalThis.__kavachDb;
  }

  const isProd = isProductionEnvironment();
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (isProd) {
    if (!dbUrl) {
      throw new Error(
        "[Kavach Security Gateway] Production database configuration missing: PostgreSQL connection string (DATABASE_URL or POSTGRES_URL) is required in production environments on Vercel. Local filesystem/tmp SQLite storage is strictly prohibited in production."
      );
    }
    globalThis.__kavachDb = new PostgresKavachDatabase(dbUrl);
    return globalThis.__kavachDb;
  }

  // Local development / testing
  if (dbUrl && process.env.DATABASE_TYPE !== "sqlite") {
    globalThis.__kavachDb = new PostgresKavachDatabase(dbUrl);
  } else {
    globalThis.__kavachDb = new SQLiteKavachDatabase();
  }

  return globalThis.__kavachDb;
}

export function resetDbInstance(): void {
  globalThis.__kavachDb = undefined;
}

export * from "./schema";
export * from "./encryption";
export * from "./adapter";
export * from "./postgres";
