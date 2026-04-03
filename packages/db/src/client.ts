import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { schema } from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

export function createDatabase(connectionString: string): Database {
  const client = postgres(connectionString, { max: 10 });

  return drizzle(client, { schema });
}
