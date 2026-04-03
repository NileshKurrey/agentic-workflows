import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabaseClient } from "./client";

const defaultDatabaseUrl = "postgres://workflows:workflows_password@localhost:5432/workflows_db";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
  const databaseClient = createDatabaseClient(databaseUrl);

  try {
    await migrate(databaseClient.db, {
      migrationsFolder: "./migrations",
    });
    console.log("Database migrations applied successfully.");
  } finally {
    await databaseClient.close();
  }
}

main().catch((error) => {
  console.error("Failed to apply database migrations", error);
  process.exit(1);
});
