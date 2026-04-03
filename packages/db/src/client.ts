import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { schema } from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseClient {
  db: Database;
  close: () => Promise<void>;
}

export function createDatabase(connectionString: string): Database {
  const client = postgres(connectionString, { max: 10, prepare: false });

  return drizzle(client, { schema });
}

export function createDatabaseClient(connectionString: string): DatabaseClient {
  const client = postgres(connectionString, { max: 10, prepare: false });
  const db = drizzle(client, { schema });

  return {
    db,
    close: async () => {
      await client.end({ timeout: 5 });
    },
  };
}
